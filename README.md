# Sterling — Institutional AI Trading Desk & Cross-Asset Intelligence Workbench

<p align="left">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4%2B-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16.3%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/AI%20SDK-Vercel%20AI%20v7-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Exchange-Bitget%20Unified%20v3%20(UTA)-00F0FF?style=for-the-badge" alt="Bitget Unified v3" />
  <img src="https://img.shields.io/badge/Database-Dexie%20IndexedDB%20v4-10B981?style=for-the-badge" alt="Dexie" />
  <img src="https://img.shields.io/badge/Linter-Oxlint%20v1.81%2B-F59E0B?style=for-the-badge" alt="Oxlint" />
  <img src="https://img.shields.io/badge/Search-Exa%20AI-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Exa AI" />
</p>

Sterling is an **Institutional-Grade AI Trading Desk & Cross-Asset Market Intelligence Workbench** engineered for continuous **7×24 real-time trading**, deep quantitative analytics, and live execution across cryptocurrency markets and tokenized US equities (rTokens). Built on Next.js 16 (App Router), Vercel AI SDK v7, Bun, and Dexie IndexedDB.

---

## Key Capabilities

### 1. ⚡ Sub-50ms Live WebSocket Market Streamer (Bitget V3 UTA)
A persistent, hardware-accelerated streaming panel directly connected to the Bitget Unified v3 (UTA) WebSocket (`wss://ws.bitget.com/v3/ws/public`):

* **Targeted Low-Latency Streams:** Subscribes concurrently to SPOT `ticker`, L2 order book depth (`books15` for standard pairs, `books` for rTokens), and 1-minute trend bars (`candle1m`), while multiplexing `USDT-FUTURES` perpetual metrics on the same connection.
* **In-Memory L2 Order Book State Machine:** Backed by a dedicated `L2Orderbook` state machine that handles snapshots and processes incremental delta updates in real-time, preventing partial-depth flashes and maintaining rock-solid 8-level order book stability with stabilized DOM keys and CSS width transitions.
* **Cross-Market Tokenized Equity / rToken Multiplexing:** Seamlessly unifies tokenized spot equities (e.g. `RTSLAUSDT`, `RNVDAUSDT`, `RAAPLUSDT`) with their corresponding perpetual futures (e.g. `TSLAUSDT`, `NVDAUSDT`, `AAPLUSDT`). Simultaneously multiplexes Spot prices and order book depth alongside Perpetual 8h funding rates, open interest, mark price, and contango/discount basis spread on a single unified pane.
* **0ms Cold-Start REST Seeding & Weekend Resilience:** Asynchronously pre-seeds the initial 30 1-minute candles (`interval=1m` across Spot & Futures) and order book depth snapshot via V3 REST on mount. Guarantees 0ms cold-start paint and ensures the 30-minute Micro Trend sparkline and Order Book render immediately even during weekend market closures when traditional equity exchanges are inactive.
* **`requestAnimationFrame` (RAF) Render Throttling:** Socket frames are buffered in memory and committed to React state once per display refresh cycle (60Hz / 120Hz). This eliminates main-thread starvation and guarantees silky 60fps scrolling even during heavy volatility bursts.
* **8-Level Order Book Depth Mini:** Features an 8-level visual bid/ask ladder, proportional depth volume bars, real-time Bid/Ask depth imbalance ratio meters, and live spread calculations in USD and basis points.
* **30-Minute Micro Trend Sparkline:** Real-time dynamic SVG area chart generated from 30 1-minute OHLCV candles using quadratic Bézier curve geometry (`Q` and `T` SVG paths) and a gradient fill.
* **Derivatives Flow Diagnostics:** Real-time 8-hour perpetual funding rate with an active countdown timer (`HH:MM:SS`) to settlement, notional Open Interest (OI), Mark price liquidation baseline, and Contango/Backwardation basis.
* **Responsive Layout & Full-Screen Mobile Adaptation:** Docks as a 40% panel on desktop viewports and expands to an uncompromised full-screen experience on mobile, driven cleanly by the persistent `Live Market` header control.
* **Zero-Overhead Lifecycle Management:** WebSocket connections, ping heartbeats (20s), and countdown timers automatically terminate when the streamer panel is closed, ensuring 0% idle CPU and network consumption.

### 2. 🛡️ Live Order Execution & Account Management (Bitget V3 UTA)
Institutional order staging and execution workflow with strict safety protocols:

* **Human-in-the-Loop Confirmation:** AI models stage orders with explicit parameters (side, order type, price, size, stop loss, take profit) into interactive visual trade tickets. No trade executes without explicit user confirmation.
* **Server-Side HMAC-SHA256 Signing:** Exchange API secrets never touch client memory. Requests are securely signed server-side using Node crypto (`createHmac('sha256')`) and sent directly to Bitget V3 trade endpoints (`/api/v3/trade/place-order`, `/modify-order`, `/cancel-order`).
* **Unified Account Overview:** Inspect real-time multi-asset balances, margin utilization, unrealized PnL, and open positions across Spot and Perpetual Futures.

### 3. 🔍 Full-Market Symbol Discovery Engine (2,000+ Pairs)
Instant, zero-latency pair switcher covering thousands of crypto assets and tokenized equities:
* **Hybrid ISR / Client Cache Architecture:** Next.js edge route (`/api/market/symbols`) fetches and validates upstream Bitget V3 spot and perpetual tickers with 1-hour Incremental Static Regeneration (ISR) and stale-while-revalidate headers.
* **Cross-Market Dual Badging:** Automatically cross-references tokenized equities and perpetual contracts so pairs with dual-market liquidity illuminate both `[SPOT]` and `[PERP]` badges simultaneously.
* **0ms Local-First Paint & Self-Healing Cache:** Backed by Dexie IndexedDB (Schema v4 `market_symbols`). Cached pairs load instantly on first render while freshness is re-verified asynchronously in the background. Incomplete local caches (`< 1,500` pairs) are automatically self-healed and updated.
* **Progressive Virtualized Batching:** Uses `IntersectionObserver` sentinels to render pairs in progressive 40-item chunks for instantaneous DOM response and minimal memory overhead.
* **Tiered Fuzzy Ranking:** Ranks results intelligently by **Exact Match > Prefix Match > Substring Match**, sorted descending by 24-hour USD turnover so high-liquidity pairs always surface first.

### 4. 📊 Pure TypeScript Quantitative Indicator Engine (23 Indicators)
Institutional mathematical indicator suite written in strict, zero-dependency TypeScript—executing in-process with zero Python, C++ bindings, or external calculation services:
* **Trend:** Exponential Moving Averages (20, 50, 200 EMA), Simple Moving Averages (SMA), and SuperTrend (ATR multiplier bands).
* **Momentum:** Relative Strength Index (RSI 14), Moving Average Convergence Divergence (MACD 12/26/9 with Histogram), and Stochastic RSI.
* **Volatility:** Bollinger Bands (Upper, Middle, Lower, Bandwidth, %B), Average True Range (ATR 14), and Historical Volatility.
* **Levels & Pivots:** Fibonacci Retracement Zones (23.6%, 38.2%, 50.0%, 61.8%, 78.6%) and Standard Pivot Points.

### 5. 🌐 Macroeconomic & Cross-Asset Regime Modeling
Dynamic cross-asset risk analysis contextualizing single-asset moves against macro liquidity:
* **Treasury Yield Curve Spread:** Real-time 10Y-2Y yield inversion tracking for institutional recession probability modeling.
* **Policy Expectations:** Fed funds target rate expectations, CPI/PCE inflation tracking, and liquidity cycle positioning.
* **Cross-Asset Correlation Matrix:** Live correlation coefficients calculating BTC sensitivity against the US Dollar Index (DXY), Volatility Index (VIX), Gold (XAU), and the Nasdaq 100 (QQQ).

### 6. 🧠 Smart Money & Sentiment Intelligence
Derivatives and crowd positioning analytics for detecting market turning points:
* **Fear & Greed Indexing:** Live sentiment thermometer (0–100 scale).
* **Smart Money vs. Retail Divergence:** Compares Top-Trader Long/Short account ratios against Retail crowd positioning to expose traps.
* **Liquidation & Squeeze Risk Alerts:** Detects extreme funding rate skews, aggressive taker volume imbalances, and crowded perpetual positioning.

### 7. 💾 Local-First Privacy Architecture (Dexie IndexedDB)
* **Multi-Session Chat Threads:** Multi-conversation switching with automatic first-turn LLM title generation and intelligent follow-up suggestions.
* **Full Audit Trail:** Every reasoning timeline, thinking step, executed tool payload, and duration timestamp is persisted locally in the browser's IndexedDB.
* **Zero Authentication Barrier for Market Intel:** Real-time market streaming, indicator mathematics, symbol discovery, and macro data operate 100% out-of-the-box with zero exchange API keys or account sign-ups.

---

## Domain Tool Arsenal

Sterling provides a purpose-built domain tool suite matching quantitative desk standards:

| Tool | Focus & Data Sources | Output Intelligence |
| :--- | :--- | :--- |
| **`market_data`** | Bitget V3 Public REST API (`/api/v3/market/*`) | Real-time prices, 24h ranges, quote turnover, funding rates, open interest, and order book depth. |
| **`technical_analysis`** | OHLCV K-lines + Pure TS Indicator Engine | Multi-timeframe trend alignment, 20/50/200 EMAs, RSI 14, MACD histogram, Bollinger Bands, and Fibonacci zones. |
| **`macro_analyst`** | Fed policy, Treasury yields, Inflation data | Risk-On / Risk-Off regime verdicts, 10Y-2Y spread, CPI/PCE prints, DXY, VIX, and equity correlations. |
| **`sentiment_analyst`** | Fear & Greed index + Derivatives flow | Sentiment scores (0–100), retail vs. top-trader positioning divergence, and short squeeze risk modeling. |
| **`market_intel`** | DeFiLlama Public Endpoints + DataHub MCP | Real-time multi-chain TVL rankings (ETH, SOL, TRX, ARB, Base), circulating stablecoin reserves, and gas health. |
| **`news_briefing`** | Exa AI Neural Search (`bitget-signal` standard) | Breaking market headlines, ETF flows, protocol catalysts, and regulatory filings with structured sources. |
| **`web_search`** | Exa AI semantic search | Institutional research, SEC filings, protocol governance proposals, and catalyst tracking. |
| **`stage_trade_order`** | Bitget V3 Unified Trading Account | Stages limit/market buy/sell orders with optional TP/SL for user confirmation via interactive trade ticket. |
| **`get_account_overview`** | Bitget V3 Authenticated Balance & Position APIs | Real-time UTA equity, available margin, maintenance margin ratio, and active cross-market positions. |

---

## Platform Architecture

```
src/
├── agent/                         # AI Reasoning Engine & Tool Dispatch
│   ├── chat/                      # Stream state machine, tool invocation & engine
│   ├── providers/                 # Groq & Fireworks LLM provider configurations
│   ├── tools/                     # Domain tools (macro, sentiment, technicals, market, news, trade, account)
│   │   ├── account-positions.ts   # Live UTA balance & positions tool
│   │   ├── trade-order.ts         # Staged trade order tool with parameter validation
│   │   ├── macro-analyst.ts       # Macroeconomic regime tool
│   │   ├── market-data.ts         # Real-time Bitget V3 market data tool
│   │   ├── market-intel.ts        # Live DeFi TVL & on-chain metrics tool (DeFiLlama + DataHub)
│   │   ├── news-briefing.ts       # Breaking market news & narrative briefing tool (Exa AI)
│   │   ├── sentiment-analyst.ts   # Sentiment & crowd positioning tool
│   │   ├── technical-analysis.ts  # Quantitative technical indicator tool
│   │   └── web-search.ts          # Exa AI search tool
│   ├── transforms/                # Automated title extraction & follow-up suggestions
│   ├── instructions.ts            # Institutional AI desk system prompt directives
│   └── types.ts                   # Agent execution steps, tool schemas & stream events
├── app/                           # Next.js 16 App Router
│   ├── api/chat/                  # Server-Sent Events (SSE) AI streaming route
│   ├── api/market/symbols/        # Full-market ISR symbol discovery route (2,000+ pairs)
│   ├── api/trade/execute/         # Secure server-side trade execution endpoint (HMAC-SHA256)
│   ├── chat/                      # Trading desk chat stage route
│   ├── globals.css                # Semantic CSS tokens, typography, KaTeX & animations
│   └── layout.tsx                 # Root layout with Geist font hydration & metadata
├── components/                    # Decoupled Presentation Layer
│   ├── chat-page.client.tsx       # Trading desk stage orchestrator (composes chat & market streamer)
│   ├── left-sidebar.tsx           # Navigation drawer orchestrator (desktop sidebar & mobile drawer)
│   ├── (chat)/                    # Conversational desk interface
│   │   ├── input/                 # Chat input dock & prompt templates
│   │   ├── messages/              # Streaming message list & markdown renderers
│   │   ├── reasoning/             # Process timeline, thinking accordions & tool cards
│   │   │   └── tools/             # Visual cards (TradeTicket, AccountOverview, NewsBriefing, etc.)
│   │   ├── chat-client.tsx        # Stage coordinator
│   │   └── chat-header.tsx        # Dynamic title & live streamer toggle button
│   ├── market-streamer/           # Live WebSocket Market Streamer Panel (Bitget V3)
│   │   ├── market-streamer-panel.tsx  # Unified desktop panel & full-screen mobile canvas
│   │   ├── ticker-display.tsx     # Tick-by-tick price, range bar & 30m quadratic SVG sparkline
│   │   ├── symbol-search-popover.tsx  # Virtualized symbol search popover modal
│   │   ├── derivatives-metrics.tsx    # Live funding countdown, open interest, mark price & basis
│   │   ├── orderbook-depth-mini.tsx   # 8-level visual depth ladder with stabilized DOM keys & imbalance meter
│   │   └── micro-trend.tsx        # 30m quadratic Bézier curve sparkline component
│   ├── sidebar/                   # Collapsible session drawer & theme controls
│   └── common/                    # AgentLoader, SterlingIcon, ConfirmDialog
├── hooks/                         # Specialized React Hooks
│   ├── chat/                      # useAgentChat, useChatSessions, useChatScroll
│   ├── market/                    # useBitgetWebSocket (V3 RAF batching), useMarketSymbols
│   └── ui/                        # useTheme, useSidebar, useActiveTimer, useIsMobile, useCountdownTimer
├── lib/                           # Core Libraries & Utilities
│   ├── bitget/                    # Bitget V3 REST & WS clients, L2 state machine, symbols & trade client
│   │   ├── analysts.ts            # Technical, macro, sentiment, and market intel calculators
│   │   ├── client.ts              # Unified client facade
│   │   ├── formatters.ts          # Centralized price, volume, spread formatters & asset pair parsing
│   │   ├── indicators.ts          # Pure TS quantitative indicator engine (23 indicators)
│   │   ├── l2-book.ts             # In-memory L2 order book state machine (snapshot & delta merging)
│   │   ├── rest.ts                # Dedicated Bitget Public REST API V3 client
│   │   ├── symbols.ts             # Symbol & timeframe normalization & alias table
│   │   ├── trade.ts               # Authenticated V3 trade client with HMAC-SHA256 signing
│   │   ├── types.ts               # Exchange payloads, indicators & tool schemas
│   │   └── ws.ts                  # Consolidated Bitget V3 WebSocket engine (topics, seeding & wire reducers)
│   ├── chat/                      # Client-side SSE transport parser & message formatting
│   ├── db/                        # Dexie IndexedDB (conversations, messages, market_symbols)
│   └── exa/                       # Exa AI semantic search client
└── stores/                        # Zustand Persistent UI State
    └── app-store.ts               # Session ID, streamer visibility & active symbol
```

---

## UI & Design System

The visual design is grounded in an **Ultra-Modern Neo-Grotesque** institutional trading aesthetic:

* **Typography:** **Geist Sans** (`--font-geist-sans`) for crisp editorial clarity, paired with **Geist Mono** (`--font-geist-mono`) for numerical market statistics, spreads, and order book metrics.
* **Color Palette:** Pure obsidian-zinc basework (`--theme-bg-base: #09090b`), graphite surface cards (`--theme-bg-surface: #121215`), interactive elevation layers (`--theme-bg-elevated: #18181b`), and pure platinum white text (`--theme-text-primary: #fafafa`).
* **Electric Accents:** Signature electric cyan (`--theme-brand-primary: #00f0ff`) with vibrant aqua highlights (`--theme-brand-accent: #00dfea`).
* **Hardware-Accelerated Compositing:** Scroll containers use `overscroll-contain`, `transform-gpu`, and `will-change: scroll-position` to isolate layout repaints to the GPU compositor.
* **Atmospheric Glow:** Ambient radial halos that smoothly breathe during idle stage states and fade out upon conversation initialization.

---

## Getting Started

### Prerequisites
* [Bun](https://bun.sh/) `v1.4.0` or higher
* An API key from [Groq](https://console.groq.com/keys) (default: `qwen/qwen3.8-27b`) or [Fireworks AI](https://fireworks.ai/api-keys) (default: `accounts/fireworks/models/deepseek-v4p1-flash`)
* *(Optional)* An API key from [Exa AI](https://dashboard.exa.ai/api-keys) for real-time web search
* *(Optional)* Bitget API credentials for live account balances and staged trade order execution

### 1. Clone & Install
```bash
git clone https://github.com/1ewig/argus-ai-agent-starter-kit.git
cd argus-ai-agent-starter-kit
bun install
```

### 2. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env.local
```

Configure `.env.local`:
```env
# Primary AI Inference Provider ('groq' or 'fireworks')
INFERENCE_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: Fireworks AI fallback/primary provider
FIREWORKS_API_KEY=your_fireworks_api_key_here
FIREWORKS_MODEL=accounts/fireworks/models/deepseek-v4p1-flash
FIREWORKS_BACKUP_MODEL=accounts/fireworks/models/glm-5p3-flash

# Optional: Exa AI for real-time institutional web search
EXA_API_KEY=your_exa_api_key_here

# Optional: Bitget V3 (UTA) Trading Account Credentials
# Required ONLY for live order placement and account balance inspection.
# Public market streaming, symbol discovery, and quantitative analytics work out-of-the-box without keys.
BITGET_API_KEY=your_bitget_api_key_here
BITGET_API_SECRET=your_bitget_api_secret_here
BITGET_PASSPHRASE=your_bitget_passphrase_here
```

### 3. Start Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality & Tooling Standards

Sterling enforces strict typing and linting standards with zero tolerances for warnings or errors:

```bash
# 1. Typecheck with TypeScript 7 (0 errors)
bun x tsc --noEmit

# 2. Lint with Oxlint (0 warnings, 0 errors across 145+ files)
bun run lint

# 3. Production build verification
bun run build
```

---

## License

MIT
