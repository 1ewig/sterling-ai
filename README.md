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

Sterling is an **institutional-grade AI trading desk and cross-asset intelligence workbench** engineered for modern market participants. Built on Next.js 16 (App Router), Bun, Vercel AI SDK v7, and Bitget's Unified Trading Account (UTA v3), it unifies cryptocurrency derivatives with tokenized US equities (rTokens).

Most trading tools today force a difficult choice: either stare at dozens of disconnected terminal windows and noisy indicator feeds, or rely on simplistic chatbots that can only regurgitate outdated summaries. Sterling provides a third way—a calm, deeply perceptive analytical partner equipped with live sensory instruments, sub-50ms market feeds, and institutional execution safety.

---

## The Philosophy: True Sensory Intelligence

Rather than treating AI as a conversational novelty, Sterling equips its reasoning engine with live quantitative and structural market tools:

* **Live Market Perception:** The AI queries live Bitget L2 order books, funding rate skews, and open interest shifts in real time.
* **Pure TypeScript Quantitative Engine:** Calculates multi-timeframe indicators (EMAs, RSI, MACD, Bollinger Bands, Fibonacci levels) in-process without external microservice latency.
* **Macro & Flow Grounding:** Automatically contextualizes single-asset price action against 10Y-2Y Treasury yield spreads, Fed interest rate expectations, DXY dynamics, and DeFi liquidity reserves.
* **Cryptographic Human-in-the-Loop Execution:** Staged orders are sealed into tamper-proof HMAC trade tickets with tick-precision snapping, requiring explicit user confirmation before hitting Bitget UTA v3 trade endpoints.

---

## Core Architecture & Key Capabilities

### 1. ⚡ Sub-50ms Bitget V3 WebSocket Streamer
A hardware-accelerated market streaming panel connected directly to Bitget's Unified v3 public WebSocket (`wss://ws.bitget.com/v3/ws/public`):
* **Multiplexed Market Streams:** Subscribes concurrently to Spot `ticker`, L2 order book depth (`books15`), and 1-minute trend candles (`candle1m`), while multiplexing Perpetual Futures funding rates, mark prices, and open interest on a single connection.
* **In-Memory L2 Order Book State Machine:** Powered by an independent `L2Orderbook` state machine that handles snapshots, tracks incremental delta updates, and prunes zero-size levels for rock-solid top-8 ladder stability without DOM flashes.
* **Cross-Market Synthetic Equity Multiplexing:** Unifies tokenized spot equities (e.g., `RTSLAUSDT`, `RNVDAUSDT`, `RAAPLUSDT`) with their corresponding perpetual futures (`TSLAUSDT`, `NVDAUSDT`). Simultaneously inspects spot depth alongside 8-hour funding rates, open interest, and contango/backwardation basis.
* **0ms Cold-Start REST Seeding:** Automatically pre-seeds the initial 30 1-minute trend candles and order book snapshot via unified REST endpoints on component mount. This ensures immediate visual rendering even during weekend equity market closures.
* **`requestAnimationFrame` (RAF) Throttling:** Socket frames are buffered in memory and committed once per display refresh cycle (60Hz / 120Hz), eliminating thread contention and maintaining silky 60fps scrolling during high volatility.

### 2. 🧠 Multi-Tool AI Reasoning Engine
Powered by Vercel AI SDK v7 with Groq and Fireworks AI, Sterling dynamically plans, queries, and synthesizes market intelligence across 12 domain tools:

| Tool | Category | Focus & Analytical Output |
| :--- | :--- | :--- |
| **`market_data`** | Live Pricing | Real-time Bitget V3 spot and perpetual tickers, 24h ranges, funding rates, open interest, and order book depth. |
| **`technical_analysis`** | Quantitative | Multi-timeframe trend structure, 20/50/200 EMAs, RSI 14, MACD histograms, Bollinger Bands, and Fibonacci zones. |
| **`macro_analyst`** | Macro Regime | 10Y-2Y Treasury yield spreads, Fed target rate outlook, CPI/PCE inflation prints, DXY, and cross-asset correlations. |
| **`sentiment_analyst`** | Crowd & Flow | Fear & Greed indexing, Top-Trader vs Retail Long/Short divergence ratios, and squeeze risk alerts. |
| **`market_intel`** | On-Chain / DeFi | Live DeFiLlama multi-chain TVL rankings (ETH, SOL, TRX, ARB, Base), circulating stablecoins, and ETH gas fees. |
| **`news_briefing`** | Neural Intel | Exa AI neural search (`bitget-signal` standard): breaking headlines, ETF flows, and protocol catalysts with 7-day time decay. |
| **`web_search`** | Deep Search | Exa AI semantic search for regulatory filings, exchange announcements, and protocol governance proposals. |
| **`stage_trade_order`** | Execution | Snaps tick/step precision to live exchange rules, validates price bands, calculates dynamic tiered MMR & liquidation, and stages an interactive trade ticket. |
| **`get_account_overview`** | Portfolio | Real-time UTA equity balance, available margin, maintenance margin ratio (MMR%), and active cross-market positions. |
| **`get_open_orders`** | Order Flow | Cursor-paginated working orders across Spot and Futures with hedge-mode flags and conditional order detection. |
| **`cancel_order`** | Order Flow | Stages an HMAC-signed cancellation ticket for specific orders or symbol-wide cancellations. |
| **`close_position`** | Risk Management | Stages emergency or target market close (full 100% or partial % de-risk) via reduce-only order. |

### 3. 🛡️ Bitget UTA v3 Execution & Cryptographic Safety
* **No Autonomous Blind Orders:** The AI model never directly places live exchange orders without user interaction. It constructs a formal trade ticket containing symbol, size, order type, price, and stop-loss/take-profit levels.
* **Tamper-Proof HMAC Tokens:** Staged trade tickets and cancel actions are signed with a 5-minute TTL token (`base64url(payload).expiresAt.signature`). If any parameter is altered between staging and submission, the signature verification fails immediately.
* **UTA v3 Instrument Precision & Tick Snapping:** Accurately maps Bitget Unified Trading Account metadata (`pricePrecision`, `quantityPrecision`, `priceMultiplier`, `quantityMultiplier`, `minOrderQty`, `minOrderAmount`). Snaps limit prices directly to valid multiples of `priceMultiplier` (e.g. 0.1 for BTC futures) and sizes to step increments, preventing exchange error `45115`.
* **Direct TP/SL Root Presets:** Integrates attached Stop Loss (`stopLoss`, `slTriggerBy`, `slOrderType`) and Take Profit (`takeProfit`, `tpTriggerBy`, `tpOrderType`) root parameters directly on order placement.
* **Hedge & One-Way Mode Isolation:** Correctly handles position sides (`long` and `short`) in Hedge Mode while enforcing Bitget UTA Constraint 25238 (preventing illegal `reduceOnly` alongside `posSide`).
* **Instant Terminal Execution Polling:** Once confirmed, `/api/trade/execute` polls order-info to capture instant fills, actual execution price (`avgPrice`), and execution fee breakdowns (`feeDetail`).
* **Automated Server Clock Drift Synchronization:** Employs dynamic server-time synchronization (`syncBitgetServerTime`) within authenticated fetch pipelines to automatically prevent and self-heal 40008/40017 timestamp errors caused by local system clock drift.

### 4. 📊 Pure TypeScript Quantitative Indicator Suite
A zero-dependency quantitative mathematics library built directly in TypeScript:
* **Trend & Structure:** 20, 50, and 200 Exponential Moving Averages (EMA), Simple Moving Averages (SMA), and SuperTrend ATR multiplier bands.
* **Momentum & Oscillation:** Relative Strength Index (RSI 14 with adaptive history fallback), MACD (12/26/9 with histogram cross detection), and Stochastic RSI.
* **Volatility & Range:** Bollinger Bands (Upper, Middle, Lower, Bandwidth, %B) and Average True Range (ATR 14).
* **Key Levels:** Fibonacci Retracement Zones (23.6%, 38.2%, 50.0%, 61.8% Golden Pocket, 78.6%) and Classical Pivot Points.

### 5. 💾 Local-First Privacy & Action Persistence (Dexie IndexedDB v6)
* **Local Session & Action Storage:** Multi-thread conversations, reasoning steps, tool execution logs, and staged trade tickets are persisted locally in browser IndexedDB.
* **Survives Browser Restarts:** Staged action cards and trade tickets retain their state across page reloads without losing signature validity.
* **Zero Barrier Cold-Start:** Full market streaming, indicator analysis, symbol search, and macro intelligence work out-of-the-box without requiring API keys or exchange logins.

---

### 6. 🔬 Diagnostic & Verification Probes
The repository includes dedicated diagnostic scripts in `scripts/` to verify live exchange endpoints, API schema stability, and execution safety against live/demo accounts:

* **`scripts/orders-placement-probe.ts`:** Comprehensive round-trip tests covering Spot limit orders, Futures limit buy/sell in Hedge Mode, attached preset TP/SL, tick snapping, and constraint error boundaries (`45111`, `25238`).
* **`scripts/orders-open-probe.ts`:** Validates unfilled orders queries, cursor pagination, field audits, and order lifecycle reconciliation.
* **`scripts/positions-close-probe.ts`:** Tests position queries, market close payloads, partial de-risking (25%/50%/100%), and liquidation safety checks.
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
├── scripts/                       # Live exchange diagnostic & validation probes
│   ├── orders-placement-probe.ts  # Place-order, tick-snapping & TP/SL verification
│   ├── orders-open-probe.ts       # Working orders & cursor pagination probe
│   ├── positions-close-probe.ts   # Position closing & de-risking probe
│   └── bitget-account-probe.ts    # Account settings & portfolio equity probe
├── src/
│   ├── agent/                     # AI Reasoning Engine & Tool Dispatch
│   │   ├── chat/                  # Stream state machine, engine & invocation pipeline
│   │   ├── providers/             # Groq & Fireworks LLM provider definitions
│   │   ├── tools/                 # 12 domain tools (macro, sentiment, technicals, trade, intel)
│   │   ├── transforms/            # Stream filters, follow-up extractor & sanitizers
│   │   └── instructions.ts        # Sterling desk personality, perception matrix & system directives
│   ├── app/                       # Next.js 16 App Router
│   │   ├── api/                   # API routes (chat streaming, symbol cache, trade execution)
│   │   ├── chat/                  # Main trading desk interface
│   │   └── globals.css            # Semantic design tokens & Tailwind utilities
│   ├── components/                # Modular presentation components
│   │   ├── (chat)/                # Chat client, message list, input bar, and trade cards
│   │   ├── market-streamer/       # WebSocket ticker, L2 depth ladder, and sparkline charts
│   │   └── common/                # Modal dialogs, loaders, and tool badges
│   ├── hooks/                     # Specialized React hooks
│   │   ├── chat/                  # useAgentChat, useChatSessions, useStagedActions (Dexie)
│   │   └── market/                # useBitgetWs, useMarketSymbols (WebSocket & caching)
│   └── lib/                       # Core infrastructure & API clients
│       ├── bitget/                # Bitget V3 UTA client, quant engine, L2 book & analysts
│       │   ├── auth/              # Request signer, error classifier & HMAC ticket builders
│       │   ├── trade/             # Orders, queries, positions, accounts & instrument precisions
│       │   └── analysts/          # Dedicated macro, sentiment, technical & on-chain engines
│       ├── db/                    # Dexie IndexedDB v6 schemas and persistence
│       ├── exa/                   # Exa AI neural search client
│       └── datahub/               # Market intelligence & on-chain data adapters
```

---

## Getting Started

### Prerequisites
* **Bun (`bun@1.4.0+`):** Sterling strictly uses the Bun runtime and package manager.

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/sterling-ai.git
cd sterling-ai
bun install
```

### 2. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# AI Model Providers (At least one required)
GROQ_API_KEY=gsk_...
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
Open [http://localhost:3000](http://localhost:3000) in your browser to start using the trading desk.

---

## Design System & Theming Tokens

Sterling strictly adheres to semantic design tokens defined in `src/app/globals.css` rather than hardcoded raw hex colors:
* **Surfaces:** `bg-theme-bg-base`, `bg-theme-bg-surface`, `bg-theme-bg-elevated`
* **Typography:** `text-theme-text-primary`, `text-theme-text-secondary`, `text-theme-text-muted`
* **Borders:** `border-theme-border-subtle`, `border-theme-border-strong`
* **Brand Accents:** `text-theme-brand-primary`, `bg-theme-brand-primary`

---

## Engineering & Quality Standards

Sterling follows strict engineering standards to ensure execution safety and performance:

```bash
# Run repository linter (Zero warnings policy)
bun run lint

# Run strict TypeScript type-checking
bun x tsc --noEmit

# Run production build
bun run build

# Run live order placement diagnostic probe
bun run scripts/orders-placement-probe.ts
```

* **TypeScript 7:** Strict type safety with zero untyped `any` escapes.
* **Oxlint:** High-speed linting maintaining 0 errors and 0 warnings.
* **Next.js 16 (Turbopack):** App Router architecture with Edge & ISR caching routes.

---

## License
MIT License. Crafted for the next generation of algorithmic and autonomous traders.
