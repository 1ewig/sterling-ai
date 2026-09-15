# Sterling — Technical Project Summary

Cross-asset AI trading desk + intelligence workbench. Next.js 16 (App Router) / Bun 1.4+ / Vercel AI SDK v7 / Bitget Unified Trading Account (UTA v3) / Dexie IndexedDB.

---

## 1. System Topology

Sterling is a three-tier system with distinct transport contracts:

```
Browser (hooks + Zustand + Dexie)
   │  POST /api/chat (fetch, SSE reader)
   ▼
API Routes (Next.js 16 App Router)
   ├─ /api/chat                 agent SSE stream (ReadableStream, text/event-stream)
   ├─ /api/trade/execute        verify HMAC ticket → place order (or sandbox)
   ├─ /api/trade/action         verify HMAC ticket → cancel / cancel-symbol / close
   ├─ /api/trade/stream         private-WS position/order push (SSE, long-lived)
   ├─ /api/account/overview│stream   account snapshot + private-WS push
   └─ /api/market/symbols       symbol cache for search
   │
   ├─ Bitget REST   https://api.bitget.com/api/v3/…
   ├─ Bitget WS pub wss://ws.bitget.com/v3/ws/public
   ├─ Bitget WS prv wss://ws.bitget.com/v2/ws/private (+ wspap demo)
   ├─ Fireworks / Bitget AI    HTTP inference (SSE from agent engine)
   ├─ Exa AI      https://api.exa.ai/search
   └─ DataHub MCP https://datahub.noxiaohao.com/mcp (JSON-RPC over SSE)
```

Layers in `src/`: `agent/` (reasoning + SSE semantics), `lib/` (clients, persistence, math, sandbox), `hooks/` (reactive orchestration), `components/` (presentation), `stores/` (UI state), `constants/` (animation/storage/theme tokens).

---

## 2. Runtime & Tooling Contract

- **Package manager:** Bun only (`bun@1.4.0+`), `packageManager: bun@1.4.0`. npm/pnpm/yarn/npx are forbidden.
- **TypeScript 7 strict:** `bun x tsc --noEmit`; zero untyped `any`.
- **Lint:** oxlint (`bun run lint`, v1.81+, plugins: typescript/react/nextjs/unicorn/oxc; correctness → error). Zero-warning policy.
- **Framework:** `next@16.3.4`, React 19.2, App Router, Tailwind v4 (CSS-first `@theme inline`), `transpilePackages: ["shiki"]`, Turbopack root override.
- **Key deps:** `ai@^7` + `@ai-sdk/fireworks`/`@ai-sdk/openai`, `dexie@4` + `dexie-react-hooks`, `zod@4`, `zustand@5`, `framer-motion@13`, `react-markdown@10` + `remark-gfm/math` + `rehype-katex/sanitize` + `shiki@4` + `katex`.

---

## 3. Directory Map

```
src/
├── agent/
│   ├── chat/              stream-engine.ts, stream-state-machine.ts, prepare-invocation.ts, index.ts
│   ├── providers/         config.ts (model IDs/base URLs), models.ts, index.ts
│   ├── tools/             index.ts (12-tool registry) + one file per tool
│   ├── transforms/        sanitizer.ts (tag stripping), title-stream-filter.ts, follow-up-extractor.ts
│   ├── instructions.ts    STERLING_INSTRUCTIONS + FIRST_TURN_SESSION_TITLE_DIRECTIVE
│   └── types.ts           AgentStreamEvent, AgentResult, tool param Zod schemas
├── lib/
│   ├── bitget/
│   │   ├── auth/          signer.ts (HMAC + clock sync), ticket.ts (HMAC tickets), errors.ts
│   │   ├── trade/         fetch.ts, orders.ts, payloads.ts, instruments.ts, queries.ts,
│   │   │                  positions.ts, account.ts, sse.ts, private-ws.ts, index.ts
│   │   ├── analysts/      macro.ts, sentiment.ts, technical.ts, market-intel.ts
│   │   ├── types/          orders, market, account, errors, index
│   │   ├── ws.ts          sub builders + REST cold-start seeders + frame normalizers
│   │   ├── l2-book.ts     L2Orderbook state machine
│   │   ├── indicators.ts, rest.ts, symbols.ts, formatters.ts, constants.ts
│   ├── chat/              chat-stream-client.ts (SSE wire), chat-history.ts
│   ├── datahub/           client.ts (MCP JSON-RPC), index.ts
│   ├── db/                schema.ts (Dexie v6), conversations/messages/market-symbols/
│   │                      instruments/staged-actions/queries/index
│   ├── exa/               client.ts, types.ts
│   ├── markdown/          shiki-highlighter.ts, sanitize-schema.ts
│   └── sandbox/           trading-mode.ts (header routing), sandbox-broker.ts ($100K paper)
├── hooks/                 chat/ market/ orders/ portfolio/ ui/
├── components/            (chat)/ (market-streamer)/ (orders)/ (portfolio)/ common/
├── stores/                app-store.ts, trading-mode-store.ts, staged-trades-store.ts
├── app/                   api/{chat,trade,account,market} · chat/ orders/ portfolio/ · globals.css
└── constants/             animation.ts, storage.ts, theme.ts
```

---

## 4. Market Data & WebSocket Layer

### 4.1 Public Stream (`src/hooks/market/use-bitget-ws.ts` + `src/lib/bitget/ws.ts`)
- Single socket to `wss://ws.bitget.com/v3/ws/public`; subscribes `ticker`, `books`/`books15`, `candle1m` for **both** `spot` and `usdt-futures` instrument sets (`buildWsSubscriptions`).
- **rToken multiplexing:** for `RTSLAUSDT`, the spot stream uses `RTSLAUSDT` while the futures stream uses `TSLAUSDT`; `isWsInstrumentMatch` validates each frame's `instId` against both the clean symbol and the derived dual-market IDs.
- **0ms cold-start:** `seedTickerSnapshot` / `seedCandlesSnapshot` (30×1m) / `seedOrderbookSnapshot` run concurrently via REST on mount; futures endpoints tried first, Spot fallback, 3s per-candidate timeout.
- **Frame hygiene:** `normalizeWsTicker` / `normalizeWsOrderbook` reconcile Spot vs Futures schema drift (`lastPr`/`lastPrice`, `a|b` vs `asks|bids`); `updateCandlesSlidingWindow` maintains a 30-bar window that either replaces (snapshot) or patches in-place the latest bar.
- **Reactivity:** all state mutation goes through a RAF-batched `pendingUpdatesRef` buffer → single React commit per display refresh (60/120Hz), avoiding re-render storms. Tick direction (up/down) auto-decays to neutral after 600ms.
- **Liveness:** 20s ping, exponential reconnect backoff `1500ms × 1.5^retries` capped at 10s.

### 4.2 L2 Order Book State Machine (`src/lib/bitget/l2-book.ts`)
- Two `Map<string, number>` heaps (asks/bids) hold price → size.
- `applyUpdate` treats `size ≤ 0` as level deletion; snapshots call `applySnapshot` (full reset).
- `pruneLevels` caps book at 80 levels and trims to 40 around the spread so `getTop(8)` stays `O(K log K)` during high-frequency ticks.
- Fully detached from React — the hook owns one instance per market (spot + futures).

### 4.3 Private Streams (`src/lib/bitget/trade/private-ws.ts`, `sse.ts`)
- `createBitgetPrivateWsSession` authenticates on the v2 private socket (demo endpoint selected by `resolveDemoMode`), subscribes to position/order/account topics, and mirrors frames through `mapWsRawPosition` (avg price, unrealized PnL, MMR, margin mode, hold mode normalization).
- `createSseStream` wraps this in a long-lived HTTP endpoint: **initial REST snapshot → 2.5s periodic re-sync → push WS deltas → 15s heartbeat comments**, tearing down on client abort. Missing credentials short-circuit to a typed `event: error` SSE response (`isMissingConfig: true`).

---

## 5. Agent Reasoning Engine

### 5.1 Stream Execution (`src/agent/chat/stream-engine.ts`)
`executeAgentStream` wraps `ai/streamText`:

- `stopWhen: isStepCount(maxSteps)` (default 5) bounds multi-step tool loops server-side.
- `experimental_transform: smoothStream({ delayInMs: 15, chunking: 'word' })` on both providers → token pacing for the UI.
- `providerOptions.fireworks.thinking.enabled` enables reasoning tokens; optional `reasoningEffort` propagates to both Fireworks and OpenAI-compatible providers.
- **Failover:** if the primary model errors before any output token, it re-runs on `backupModel` (Fireworks `deepseek-v4p1-flash` → `glm-5p3-flash`; Bitget `qwen3.8-max`), first failing active steps.
- **Telemetry:** per-step usage (`input/output/reasoning`), aggregated `billedUsage` across round-trips, and `usage` = final-step context window — persisted alongside the message.

### 5.2 Stream State Machine (`src/agent/chat/stream-state-machine.ts`)
Incrementally builds an ordered `AgentExecutionStep[]` (`thinking | intermediate_text | tool`):

- Thinking steps auto-materialize on first `reasoning_delta`, accumulate text, and close on tool calls or text; empty thinking steps are pruned.
- Pre-tool text becomes an `intermediate_text` step and a `clear_text` event flushes it from the visible buffer.
- Tool steps keyed by `tool_${toolCallId}` resolve via `step_update` with status/duration/toolArgs/toolResult; failures (tool-error / denied) become `{ success:false, error }` results.

### 5.3 SSE Event Schema (`src/agent/types.ts`)
`AgentStreamEvent` (discriminated union, serialized as `data: {JSON}\n\n`):

| Event | Semantics |
| --- | --- |
| `step_start` | new thinking / intermediate / tool step created |
| `step_update` | step status, duration, usage, toolArgs, toolResult |
| `reasoning_delta` | streaming CoT token |
| `text_delta` | finalized markdown delta |
| `clear_text` | drop buffered pre-tool text |
| `session_title` | extracted `<session_title>` tag (first turn only) |
| `done` | final `AgentResult` (steps, toolCalls, follow-ups, usage) |
| `error` | terminal error payload |

### 5.4 Transforms (`src/agent/transforms/`)
- `sanitizer.ts` strips `SESSION_TITLE_TAG`, `FOLLOW_UP_TAG`, and in-flight incomplete tag variants; `stripIntermediateTextPrefix` removes duplicated pre-tool paragraphs from the final answer.
- `title-stream-filter.ts` + `follow-up-extractor.ts` parse the `FIRST_TURN_SESSION_TITLE_DIRECTIVE` (2–4 word title) and mandatory 3-question `<follow_up_questions>` block from `instructions.ts`.
- `instructions.ts` encodes the desk persona, 12-tool taxonomy, **absolute execution rules**, 4 parallel "sensory clustering" dispatch patterns, and the `DESK PERSPECTIVE` output contract.

---

## 6. Tool Registry & Domains

`src/agent/tools/index.ts` registers 12 tools (7 intel + 5 execution). All tool params are Zod-validated (`types.ts`).

- **Live pricing:** `market_data` — tickers, 24h stats, funding/OI, depth.
- **Quantitative:** `technical_analysis` — EMA(20/50/200), RSI14, MACD(12/26/9), BB(20,2)+%B, SuperTrend, ATR14, Fib zones, pivots (pure-TS, `indicators.ts`).
- **Macro/sentiment/on-chain:** `macro_analyst`, `sentiment_analyst`, `market_intel` — DeepLlama TVL, stablecoins, gas, trending DEX pairs via DataHub MCP.
- **Research:** `news_briefing`, `web_search` — Exa neural search (`bitget-signal`, livecrawl preferred).
- **Execution:** `stage_trade_order`, `get_account_overview`, `get_open_orders`, `cancel_order`, `close_position` — all stage HMAC-signed tickets (never auto-fire).

---

## 7. Account, Order & Position Subsystem

### 7.1 Authentication (`src/lib/bitget/auth/signer.ts`)
- `preHash = timestamp + method + requestPath(+?query + bodyString)` → Base64 HMAC-SHA256; query string sorted alphabetically per Bitget spec.
- **Clock drift mitigation:** `syncBitgetServerTime` computes `offset = serverTime − (t0 + RTT/2)`, caches 5 min, dedupes concurrent sync via a single shared promise, re-syncs on `40008/40017` timestamp errors, and retries exactly once (`safeGetJson` 8s AbortSignal timeout).
- Headers carry `ACCESS-SIGN/TIMESTAMP/PASSPHRASE`; `paptrading: '1'` when demo mode resolves from UI credentials or `BITGET_DEMO_TRADING`.

### 7.2 Error Taxonomy (`auth/errors.ts`, `types/errors.ts`, `trade/fetch.ts`)
Every failure returns structured `BitgetErrorDetails` (category, message, `actionableGuidance`, `canRetry`) — authenticated fetches **never throw** for exchange errors. `classifyBitgetError` maps business codes (e.g. `45111` tick, `25238` illegal reduceOnly, `25204` already-terminal cancel) to guidance; `MISSING_CREDENTIALS_ERROR` short-circuits auth.

### 7.3 Instrument Precision & Orders (`trade/instruments.ts`, `payloads.ts`, `orders.ts`)
- `getInstrument` (memory-cached) merges `/api/v3/market/instruments` metadata: `priceMultiplier`/`quantityMultiplier`, `pricePlace`/`volumePlace`, `minTradeNum`, `minTradeUSDT`, `maxMarketOrderQty`, `maxLeverage`, ratio bands; offline-safe `DEFAULT_INSTRUMENTS` baseline.
- `snapPriceToTick` rounds to tick/decimals; `snapQtyToStep` floors to step; `validateOrderConstraints` enforces status, min qty, max market size, max leverage, min notional, and the ±`buy/sellLimitPriceRatio` limit band.
- `getTierMmr` computes tiered maintenance margin (BTC/ETH: 0.4%→2%; alts: 0.6%→5%).
- `buildPlaceOrderPayload` derives `posSide` (spot `net`; hedge `buy→long`/`sell→short`), converts **spot market-buy size to quote-currency (USDT) amount**, passes `reduceOnly: 'YES'` only when `posSide === 'net'` (avoids constraint 25238), and attaches `stopLoss`/`takeProfit` roots with `slTriggerBy`/`slOrderType`/`tpTriggerBy`/`tpOrderType`.
- `closePositionsV3` auto-resolves size from the active position and snaps to step when none supplied; `cancelOrderV3` treats `25204` as an idempotent success.

### 7.4 Working Orders (`trade/queries.ts`)
`fetchOpenOrdersV3` fans out across all four categories (`USDT-FUTURES`, `SPOT`, `COIN-FUTURES`, `USDC-FUTURES`) via `Promise.allSettled`, cursor-paginates (max 10 pages, 100/page, newer-cursor semantics), maps v3 `qty`/`baseVolume`/`amount` field drift, and reports per-category `sources` diagnostics with graceful degradation — never throws.

---

## 8. Cryptographic Execution Pipeline

### 8.1 Tickets (`auth/ticket.ts`)
- Format: `base64url(JSON payload).expiresAt.signature` (HMAC-SHA256 over `payload.expiresAt`; action tickets domain-separated with `ACTION:` prefix; `timingSafeEqual` verification).
- 5-minute TTL from `TICKET_TTL_MS`; signing secret = `TRADE_TICKET_SECRET` → `BITGET_API_SECRET` → built-in fallback.
- Tickets are minted only by `stage_trade_order`/`cancel_order`/`close_position` tools; a parallel `stageFromToolResult` (hook) persists them into Dexie with the decoded `expiresAt`.

### 8.2 Order Execution (`/api/trade/execute`)
1. Body parsed; honored path takes `ticketToken` → `verifyTradeTicketToken` → server-side `BitgetV3OrderParams` (legacy raw params retained as fallback).
2. `resolveTradingMode(req)` (header `x-trading-mode` wins, else credential presence) routes to the sandbox broker or `placeOrderV3`.
3. Live path short-polls `getOrderInfoV3` after 600ms to capture instant market fills / limit acceptance and fee detail; returns status, avg price, cumExecQty.

### 8.3 Actions (`/api/trade/action`)
- Verifies `actionToken` for `cancel_order` / `cancel_symbol` / `close_position`, then dispatches to sandbox equivalents or the live UTA calls. Sandbox + live share the same response envelope (`orderId`, `message`, `isSandbox`).

---

## 9. Sandbox Paper-Trading Mode (`src/lib/sandbox/`)

- **Routing:** `resolveTradingMode` — explicit `x-trading-mode: sandbox|live` header wins; otherwise presence of all three env credentials selects `live`, anything else falls back to `sandbox`. `isMissingConfigError` lets routes degrade gracefully.
- **Broker (`sandbox-broker.ts`):** in-memory `$100,000 USDT` initial equity; maintains `availableBalance`, `positions`, `openOrders`, `realizedPnl`; implements `executeSandboxOrder` (fills at last price/snapping), `closeSandboxPosition` (incl. partial % de-risk), `cancelSandboxOrder`, `getSandboxAccountOverview` (aggregated margin/uPnL/notional), and `resetSandboxState`. `account/overview` auto-falls back to sandbox when credentials are missing (`isMissingConfig: true`).

---

## 10. DataHub MCP & Exa Intelligence

- **DataHub (`lib/datahub/client.ts`):** JSON-RPC 2.0 over POST/SSE to `datahub.noxiaohao.com/mcp`; `initialize` handshake captures `mcp-session-id`, then `tools/call`; 3.5s/4.5s AbortSignal timeouts with per-tool fast failure. `analysts/macro.ts` fans out 4 tools (`rates_yields`, `macro_indicators`, `cross_asset`, `global_assets`) in parallel and derives the RISK-ON/RISK-OFF regime from yield-curve inversion.
- **Exa (`lib/exa/client.ts`):** `searchExa` with `livecrawl: 'preferred'`, category/domain/date scoping, 2-sentence highlights; strips navigation chrome via `NAVIGATION_CHROME_PATTERNS`, dedupes sentences, filters sub-20-char snippets, and injects domain-aware zero-result warnings.

---

## 11. Client Transport & Reactive Hooks

- **`lib/chat/chat-stream-client.ts`:** fetch to `/api/chat`, streaming reader with byte decoding + newline-incremental `data:` parsing, dispatches each `AgentStreamEvent` to the caller; aborts via injected `AbortSignal`.
- **`useAgentChat` (`hooks/chat/`):** persists user message immediately, streams assistant record with **RAF-throttled** content/step commits, cancels pre-tool text on `clear_text`, renames conversation on `session_title`/fallback, auto-stages every execution tool result via `stageFromToolResult`, and persists the final `AgentResult` (steps, toolCalls, follow-ups) to Dexie. Abort keeps a partial message and resumes UI.
- **`useStagedActions`:** `useLiveQuery` over `db.staged_actions`, 1s TTL clock while actions are active, split into orders/cancels/closes with counts; popup focus via `staged-trades-store`.
- **`useExecuteTrade`:** sends the raw `ticketToken`/`actionToken` plus identity fields with `x-trading-mode`, drives `idle→executing→success|error` status transitions, and auto-closes after 600ms on success.

---

## 12. Persistence & UI State

- **Dexie schema v6 (`lib/db/schema.ts`):** tables `conversations`, `messages`, `market_symbols`, `instruments`, `staged_actions`; migration chain v1→v6 upgrades (backfill `conversationId`, `status`, index additions). Indexes: `messages` by `[conversationId, timestamp]`, `staged_actions` by `[conversationId+status]`, compound `[conversationId+status]`.
- **Stores (`stores/`):**
  - `app-store` — persisted (sessionStorage partialize) `activeConversationId`, sidebar/mobile-sidebar collapse, market panel open + selected symbol, `_hasHydrated`.
  - `trading-mode-store` — sandbox/live toggle consumed by `useExecuteTrade`.
  - `staged-trades-store` — transient popup focus (data lives in Dexie).

---

## 13. Rendering Pipeline (`lib/markdown/`)

`react-markdown` → `remark-gfm` (tables/lists/strikethrough) → `remark-math` + `rehype-katex` (LaTeX) → `rehype-sanitize` (allowlist in `sanitize-schema.ts`) → **Shiki** code highlighting via `createHighlighterCore` with the JavaScript regex engine and 15 bundled grammars (ts/tsx/jsx/python/bash/sql/rust/go/…), zero-network and client-bundled; themes follow the active light/dark mode.

---

## 14. Resilience & Error Taxonomy

- **Agent:** max-step bound, primary→backup provider failover on zero-output errors, per-step error capture, stream-level `error` events, forced `finalizeSteps` on interruption.
- **Exchange:** clock sync + single retry on `40008/40017`, never-throwing authenticated fetch, structured error classification with actionable guidance, idempotent cancel (`25204`), tick/band pre-validation to prevent `45115`/`45111`.
- **Transport:** WS ping/reconnect backoff, SSE heartbeats + 2.5s snapshot re-sync, RAF-combined frame commits, AbortSignal propagation on client stop/unmount.
- **Data:** graceful degradation across all `Promise.allSettled` fan-outs (categories, MCP tools, REST seeders), sandbox fallback on missing credentials, baseline instrument defaults, Exa zero-result diagnostics.

---

## 15. Local Development

```env
BITGET_AI_API_KEY=...      FIREWORKS_API_KEY=fw_...
EXA_API_KEY=...
BITGET_API_KEY=...         BITGET_API_SECRET=...      BITGET_PASSPHRASE=...
BITGET_DEMO_TRADING=false  TRADE_TICKET_SECRET=...
```

```bash
bun install && bun run dev          # http://localhost:3000
bun run lint                        # oxlint, zero warnings
bun x tsc --noEmit                  # TypeScript 7 strict
bun run build                       # production verify
bun run scripts/orders-placement-probe.ts   # live exchange probe
```