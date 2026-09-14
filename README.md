# Sterling — Institutional AI Trading Desk & Cross-Asset Intelligence Workbench

<p align="left">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4%2B-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16.3%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/AI%20SDK-Vercel%20AI%20v7-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Exchange-Bitget%20Unified%20v3-00F0FF?style=for-the-badge" alt="Bitget Unified v3" />
  <img src="https://img.shields.io/badge/Database-Dexie%20IndexedDB%20v6-10B981?style=for-the-badge" alt="Dexie" />
  <img src="https://img.shields.io/badge/Linter-Oxlint%20v1.81%2B-F59E0B?style=for-the-badge" alt="Oxlint" />
  <img src="https://img.shields.io/badge/Search-Exa%20AI-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Exa AI" />
</p>

Sterling is an **institutional-grade AI trading desk and cross-asset intelligence workbench** engineered for modern market participants. Built on Next.js 16 (App Router), Bun, Vercel AI SDK v7, and Bitget Unified Trading Account (UTA v3), it unifies cryptocurrency derivatives with tokenized US equities (rTokens).

Most trading tools force a compromise: either stare at dozens of fragmented terminal windows with noisy feeds, or interact with superficial chatbots reciting stale summaries. Sterling bridges this gap—combining live quantitative sensory instruments, sub-50ms market feeds, and cryptographic execution safety into an agile desktop trading partner.

---

## The Philosophy: True Sensory Intelligence

Rather than treating AI as a conversational novelty, Sterling equips its reasoning engine with live quantitative and structural market tools:

* **Live Market Perception:** Queries live Bitget L2 order books, funding rate skews, and open interest shifts in real time.
* **In-Process Quantitative Engine:** Calculates multi-timeframe indicators (EMAs, RSI, MACD, Bollinger Bands, Fibonacci levels) in TypeScript without external microservice latency.
* **Macro & Flow Grounding:** Automatically contextualizes single-asset price action against 10Y-2Y Treasury yield spreads, Fed target rate expectations, DXY dynamics, and DeFi liquidity reserves.
* **Cryptographic Human-in-the-Loop Execution:** Staged orders are sealed into tamper-proof HMAC trade tickets with tick-precision snapping, requiring explicit user confirmation before hitting Bitget UTA v3 endpoints.

---

## Core Architecture Pillars

### 1. ⚡ Sub-50ms Bitget V3 WebSocket Streamer (`src/components/(market-streamer)/`)
Connected directly to Bitget Unified v3 public WebSocket (`wss://ws.bitget.com/v3/ws/public`):
* **Multiplexed Market Streams:** Subscribes concurrently to Spot `ticker`, L2 order book depth (`books15`), and 1-minute trend candles (`candle1m`), while multiplexing Perpetual Futures funding rates, mark prices, and open interest over a single socket connection.
* **In-Memory L2 Order Book State Machine:** An independent `L2Orderbook` state machine processes delta packets, tracks depth snapshots, and prunes zero-size levels for a rock-solid top-8 order ladder without DOM flashes.
* **Cross-Market Synthetic Equity Multiplexing:** Bridges tokenized spot equities (e.g. `RTSLAUSDT`, `RNVDAUSDT`, `RAAPLUSDT`) with perpetual futures (`TSLAUSDT`, `NVDAUSDT`), inspecting spot depth alongside 8-hour funding rates, open interest, and contango/discount basis.
* **0ms Cold-Start REST Seeding:** Automatically pre-seeds initial 1-minute trend candles and order book snapshots via REST on mount, ensuring immediate rendering even during equity weekend closures.
* **`requestAnimationFrame` (RAF) Throttling:** Socket frames buffer in memory and commit once per display refresh cycle (60Hz / 120Hz), guaranteeing silky 60fps scrolling during peak volatility.

### 2. 🧠 Multi-Tool AI Reasoning Engine (`src/agent/`)
Powered by Vercel AI SDK v7 with Bitget AI and Fireworks AI, Sterling plans, queries, and synthesizes market intelligence across 12 domain tools with real-time SSE streaming:

| Tool | Category | Focus & Analytical Output |
| :--- | :--- | :--- |
| **`market_data`** | Live Pricing | Real-time Bitget V3 spot and perpetual tickers, 24h stats, funding rates, open interest, and order book depth. |
| **`technical_analysis`** | Quantitative | Multi-timeframe trend structure, 20/50/200 EMAs, RSI 14, MACD histograms, Bollinger Bands, and Fibonacci zones. |
| **`macro_analyst`** | Macro Regime | 10Y-2Y Treasury yield spreads, Fed target rate outlook, CPI/PCE inflation, DXY, and cross-asset correlations. |
| **`sentiment_analyst`** | Crowd & Flow | Fear & Greed indexing, Top-Trader vs Retail Long/Short divergence ratios, and squeeze risk alerts. |
| **`market_intel`** | On-Chain / DeFi | Live DeFiLlama multi-chain TVL rankings (ETH, SOL, TRX, ARB, Base), stablecoin supplies, and gas metrics. |
| **`news_briefing`** | Neural Intel | Exa AI neural search (`bitget-signal` standard): breaking headlines, ETF flows, and protocol catalysts. |
| **`web_search`** | Deep Search | Exa AI semantic search for regulatory filings, exchange announcements, and protocol governance proposals. |
| **`stage_trade_order`** | Execution | Snaps tick/step precision to live exchange rules, validates price bands, computes tiered MMR, and stages tickets. |
| **`get_account_overview`** | Portfolio | Real-time UTA equity balance, available margin, maintenance margin ratio (MMR%), and active cross-market positions. |
| **`get_open_orders`** | Order Flow | Cursor-paginated working orders across Spot and Futures with hedge-mode flags and conditional order detection. |
| **`cancel_order`** | Order Flow | Stages an HMAC-signed cancellation ticket for specific orders or symbol-wide cancellations. |
| **`close_position`** | Risk Management | Stages emergency or target market close (full 100% or partial % de-risk) via reduce-only order. |

### 3. 🛡️ Cryptographic Human-in-the-Loop Execution (`src/components/(chat)/staged-actions/`)
* **No Autonomous Blind Orders:** The AI model never directly places live exchange orders without user interaction. It constructs a formal trade ticket containing symbol, size, order type, price, and TP/SL levels.
* **Tamper-Proof HMAC Tokens:** Staged trade tickets and cancel actions are signed with a 5-minute TTL token (`base64url(payload).expiresAt.signature`). If parameters are tampered with, signature verification fails immediately.
* **UTA v3 Instrument Precision & Tick Snapping:** Accurately maps Bitget metadata (`pricePrecision`, `quantityPrecision`, `priceMultiplier`, `quantityMultiplier`, `minOrderQty`). Snaps limit prices directly to valid multiples to prevent exchange error `45115`.
* **Direct TP/SL Root Presets:** Integrates attached Stop Loss (`stopLoss`, `slTriggerBy`, `slOrderType`) and Take Profit (`takeProfit`, `tpTriggerBy`, `tpOrderType`) root parameters directly on order placement.
* **Hedge & One-Way Mode Isolation:** Correctly handles position sides in Hedge Mode while enforcing Bitget UTA Constraint 25238 (preventing illegal `reduceOnly` alongside `posSide`).
* **Server Clock Drift Auto-Healing:** Employs dynamic server-time synchronization (`syncBitgetServerTime`) within authenticated fetch pipelines to automatically prevent 40008/40017 timestamp errors.

### 4. 📊 Pure TypeScript Quantitative Indicator Suite (`src/lib/bitget/indicators.ts`)
A zero-dependency quantitative mathematics library calculated directly in TypeScript:
* **Trend & Structure:** 20, 50, and 200 Exponential Moving Averages (EMA), Simple Moving Averages (SMA), and SuperTrend ATR multiplier bands.
* **Momentum & Oscillation:** Relative Strength Index (RSI 14 with adaptive history fallback), MACD (12/26/9 with histogram cross detection), Stochastic RSI.
* **Volatility & Range:** Bollinger Bands (Upper, Middle, Lower, Bandwidth, %B) and Average True Range (ATR 14).
* **Key Levels:** Fibonacci Retracement Zones (23.6%, 38.2%, 50.0%, 61.8% Golden Pocket, 78.6%) and Classical Pivot Points.

### 5. 💾 Local-First Persistence & UI State (`src/lib/db/` & `src/stores/`)
* **Dexie IndexedDB v6:** Multi-thread conversations, reasoning steps, tool execution traces, and staged trade tickets persist locally in browser storage, surviving browser restarts and page reloads.
* **Zero Barrier Cold-Start:** Full market streaming, indicator analysis, symbol search, and macro intelligence work out-of-the-box without requiring API keys or exchange logins.
* **Persisted UI State (Zustand):** Manages active session selection, sidebar collapse status, and market streamer drawer states across navigation.

---

## Real-Time SSE Streaming State Machine

The agent communication layer in `src/agent/chat/` streams granular lifecycle events over Server-Sent Events (SSE):

* **`step_start` & `step_update`:** Dispatches real-time thinking progress, tool parameters, and execution telemetry to the accordion UI.
* **`reasoning_delta`:** Streams live internal chain-of-thought tokens before tool invocation.
* **`text_delta`:** Streams finalized markdown analytical perspectives to the message feed with smooth stream buffer flushing.
* **`session_title`:** Dynamically derives concise conversation titles from initial queries using non-blocking stream filters.
* **`clear_text` & `transforms`:** Sanitizes model stream output and strips redundant raw tool payloads from user chat view.
* **`done`:** Finalizes token usage telemetry (`inputTokens`, `outputTokens`, `reasoningTokens`) and commits records to IndexedDB.
* **`error`:** Employs exponential backoff reconnection strategies with fallback model switches (Bitget AI $\leftrightarrow$ Fireworks).

---

## Cross-Asset Scope & Tokenized Equities (rTokens)

Sterling provides unified analytics across three major asset classes on Bitget UTA v3:

* **Cryptocurrency Spot & Derivatives:** High-liquidity majors (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`, `SUIUSDT`) with real-time order books, funding rate differentials, and open interest spikes.
* **Tokenized US Equities (rTokens):** Dual-market spot tokens (`RTSLAUSDT`, `RNVDAUSDT`, `RAAPLUSDT`, `RMSFTUSDT`) multiplexed with equity perpetual futures for round-the-clock macro positioning.
* **Precious Metals & Commodities:** Direct Tether-settled synthetic commodity contracts including Gold (`XAUUSDT`) and Silver (`XAGUSDT`).
* **Neural News & Protocol Catalysts:** Powered by Exa AI neural search (`bitget-signal` standard) for instant narrative shifts, ETF flow updates, and regulatory filings.

---

## Diagnostic & Validation Probes

The repository includes dedicated diagnostic scripts in `scripts/` to verify live exchange endpoints and execution safety:

* **`scripts/orders-placement-probe.ts`:** Tests Spot limit orders, Futures limit buy/sell in Hedge Mode, attached TP/SL, and tick snapping constraints (`45111`, `25238`).
* **`scripts/orders-open-probe.ts`:** Validates unfilled orders queries, cursor pagination, and order lifecycle reconciliation.
* **`scripts/positions-close-probe.ts`:** Tests position queries, market close payloads, and partial de-risking (25%/50%/100%).
* **`scripts/bitget-account-probe.ts`:** Audits Bitget UTA v3 account settings, multi-asset equity balances, and portfolio margin ratios.

---

## Typical Trader Workflow

```
1. Market Query         "Give me a perception briefing on TSLAUSDT tokenized stock with RSI and macro risk."
       │
       ▼
2. Multi-Tool Dispatch  Sterling dispatches market_data + technical_analysis + macro_analyst in parallel.
       │
       ▼
3. Desk Perspective     Renders a structured briefing with bias, pivot levels, indicator tables, and scenario paths.
       │
       ▼
4. Staged Trade Ticket  "Let's stage a long entry with a 3% stop loss." -> Generates signed HMAC ticket card.
       │
       ▼
5. User Confirmation    Trader reviews parameters, clicks [Confirm Order], and executes securely on Bitget UTA v3.
```

---

## Directory Structure

```
sterling-ai/
├── scripts/                          # Live exchange diagnostic & validation probes
│   ├── orders-placement-probe.ts     # Place-order, tick-snapping & TP/SL verification
│   ├── orders-open-probe.ts          # Working orders & cursor pagination probe
│   ├── positions-close-probe.ts      # Position closing & de-risking probe
│   └── bitget-account-probe.ts       # Account settings & portfolio equity probe
├── src/
│   ├── agent/                        # AI Reasoning Engine & Tool Dispatch
│   │   ├── chat/                     # Stream state machine, stream engine & invocation pipeline
│   │   ├── providers/                # Bitget AI & Fireworks LLM provider definitions
│   │   ├── tools/                    # 12 domain tools (macro, sentiment, technicals, trade, intel)
│   │   ├── transforms/               # Stream filters, follow-up extractor & sanitizers
│   │   └── types.ts                  # Centralized agent stream, step, and tool schema types
│   ├── app/                          # Next.js 16 App Router
│   │   ├── api/                      # API routes (chat streaming, symbol cache, trade execution)
│   │   ├── chat/                     # Main trading desk interface route
│   │   ├── assets/                   # Portfolio & assets overview route
│   │   └── globals.css               # Semantic design tokens & Tailwind utilities
│   ├── components/                   # Modular presentation components
│   │   ├── (chat)/                   # Chat client, message list, input bar, and staged-actions modals
│   │   ├── (assets)/                 # Portfolio metric cards, risk meter, and holdings table
│   │   ├── (market-streamer)/        # WebSocket ticker, L2 depth ladder, and sparkline charts
│   │   └── common/                   # Modal dialogs, loaders, and tool badges
│   ├── hooks/                        # Specialized reactive hooks
│   │   ├── chat/                     # useAgentChat, useChatSessions, useStagedActions
│   │   ├── market/                   # useBitgetWebSocket, useMarketSymbols
│   │   └── account/                  # useAccountOverview
│   ├── lib/                          # Core infrastructure & API clients
│   │   ├── bitget/                   # Bitget V3 UTA client, quant engine, L2 book & WebSocket
│   │   │   ├── auth/                 # Request signer, error classifier & HMAC ticket builders
│   │   │   ├── trade/                # Orders, queries, positions, accounts & instrument precisions
│   │   │   ├── types/                # Domain-scoped types (market, orders, account, errors)
│   │   │   └── analysts/             # Dedicated macro, sentiment, and technical engines
│   │   ├── db/                       # Dexie IndexedDB v6 schemas and persistence
│   │   └── exa/                      # Exa AI neural search client
│   └── stores/                       # Zustand persisted global UI state (app-store.ts)
```

---

## Getting Started

### Prerequisites
* **Bun (`bun@1.4.0+`):** Sterling strictly utilizes the Bun runtime and package manager.

### 1. Installation
```bash
git clone https://github.com/your-username/sterling-ai.git
cd sterling-ai
bun install
```

### 2. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# AI Model Providers (At least one required)
BITGET_AI_API_KEY=...
FIREWORKS_API_KEY=fw_...

# Neural Search (Recommended for live news & web research)
EXA_API_KEY=...

# Bitget V3 Trading Account (Optional — needed for live execution & portfolio overview)
BITGET_API_KEY=...
BITGET_API_SECRET=...
BITGET_PASSPHRASE=...
BITGET_DEMO_TRADING=false

# Trade Ticket Cryptographic Signing Secret
TRADE_TICKET_SECRET=sterling_desk_internal_signing_key_2026
```

### 3. Launch Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Design Tokens & Theming

Sterling strictly adheres to semantic design tokens defined in `src/app/globals.css` rather than hardcoded raw hex colors:
* **Surfaces:** `bg-theme-bg-base`, `bg-theme-bg-surface`, `bg-theme-bg-elevated`
* **Typography:** `text-theme-text-primary`, `text-theme-text-secondary`, `text-theme-text-muted`
* **Borders:** `border-theme-border-subtle`, `border-theme-border-strong`
* **Brand Accents:** `text-theme-brand-primary`, `bg-theme-brand-primary`

---

## Engineering Standards & Quality Assurance
 
```bash
# Run repository linter (Zero warnings policy)
bun run lint

# Strict TypeScript type-checking (TS7)
bun x tsc --noEmit

# Production build verification
bun run build

# Run live order placement diagnostic probe
bun run scripts/orders-placement-probe.ts

# Run working orders & pagination audit
bun run scripts/orders-open-probe.ts
```

* **Design Tokens:** Strictly adhere to semantic CSS tokens in `src/app/globals.css` (`bg-theme-bg-surface`, `text-theme-brand-primary`, `p-spacing-md`). Never hardcode raw hex codes.
* **TypeScript 7 & Oxlint:** Strict typing with zero untyped `any` escapes and 0 linter warnings across all modules.
* **Live Market Grounding:** Query live exchange endpoints & Exa AI neural search; no synthetic fallback data.
* **Parallel Tool Execution:** Group independent operations simultaneously to minimize API latency.

---

## License
MIT License. Crafted for the next generation of algorithmic and autonomous traders.
