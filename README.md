# Sterling — Institutional AI Trading Desk & Cross-Asset Intelligence Workbench

<p align="left">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4%2B-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-16.3%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/AI%20SDK-Vercel%20AI%20v7-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Exchange-Bitget%20Unified%20v3-00F0FF?style=for-the-badge" alt="Bitget Unified v3" />
  <img src="https://img.shields.io/badge/Database-Dexie%20IndexedDB%20v4-10B981?style=for-the-badge" alt="Dexie" />
  <img src="https://img.shields.io/badge/Linter-Oxlint%20v1.81%2B-F59E0B?style=for-the-badge" alt="Oxlint" />
  <img src="https://img.shields.io/badge/Search-Exa%20AI-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Exa AI" />
</p>

Sterling is an **institutional-grade AI trading desk and cross-asset intelligence workbench** engineered for modern market participants. Built on Next.js 16 (App Router), Bun, Vercel AI SDK v7, and Bitget's Unified Trading Account (UTA v3), it unifies cryptocurrency derivatives with tokenized US equities (rTokens).

Most trading tools today force a difficult choice: either stare at dozens of disconnected terminal windows and noisy indicator feeds, or rely on simplistic chatbots that can only regurgitate outdated summaries. Sterling provides a third way—a calm, deeply perceptive analytical partner equipped with live sensory instruments, sub-50ms market feeds, and institutional execution safety.

---

## The Philosophy: True Sensory Intelligence

Rather than treating AI as a conversational novelty, Sterling equips its reasoning engine with live quantitative and structural market tools:

* **Live Market Perception:** The AI queries live Bitget L2 order books, funding rate skews, and open interest shifts in real time.
* **Pure TypeScript Quantitative Engine:** Calculates multi-timeframe indicators (EMAs, RSI, MACD, Bollinger Bands, Fibonacci levels) in-process without relying on external calculation microservices.
* **Macro & Flow Grounding:** Automatically contextualizes single-asset price action against 10Y-2Y Treasury yield spreads, Fed interest rate expectations, DXY dynamics, and DeFi liquidity reserves.
* **Human-in-the-Loop Execution:** Maintains strict cryptographic safety. Staged orders are signed into tamper-proof HMAC trade tickets that require explicit user review before hitting Bitget UTA v3 trade endpoints.

---

## Core Architecture & Key Capabilities

### 1. ⚡ Sub-50ms Bitget V3 WebSocket Streamer
A hardware-accelerated market streaming panel connected directly to Bitget's Unified v3 public WebSocket (`wss://ws.bitget.com/v3/ws/public`):
* **Multiplexed Market Streams:** Subscribes concurrently to Spot `ticker`, L2 order book depth (`books15`), and 1-minute trend candles (`candle1m`), while multiplexing Perpetual Futures funding rates, mark prices, and open interest on a single connection.
* **In-Memory L2 Order Book State Machine:** Powered by an independent `L2Orderbook` state machine that handles snapshots, tracks incremental delta updates, and prunes zero-size levels for rock-solid top-8 ladder stability without DOM flashes.
* **Cross-Market Synthetic Equity Multiplexing:** Unifies tokenized spot equities (e.g., `RTSLAUSDT`, `RNVDAUSDT`, `RAAPLUSDT`) with their corresponding perpetual futures (`TSLAUSDT`, `NVDAUSDT`). Simultaneously inspects spot depth alongside 8-hour funding rates, open interest, and contango/backwardation basis.
* **0ms Cold-Start REST Seeding:** Automatically pre-seeds the initial 30 1-minute trend candles and order book snapshot via REST on component mount. This ensures immediate visual rendering even during weekend equity market closures.
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
| **`news_briefing`** | Neural Intel | Exa AI neural search (`bitget-signal` standard): breaking headlines, ETF flows, and protocol catalysts. |
| **`web_search`** | Deep Search | Exa AI semantic search for regulatory filings, exchange announcements, and protocol governance proposals. |
| **`stage_trade_order`** | Execution | Validates exchange constraints, checks price bands, and stages an interactive trade confirmation ticket. |
| **`get_account_overview`** | Portfolio | Real-time UTA equity balance, available margin, maintenance margin ratio (MMR%), and active cross-market positions. |
| **`get_open_orders`** | Order Flow | Cursor-paginated working orders across Spot and Futures with hedge-mode flags and conditional order detection. |
| **`cancel_order`** | Order Flow | Stages an HMAC-signed cancellation ticket for specific orders or symbol-wide cancellations. |
| **`close_position`** | Risk Management | Stages emergency or target market close (full or partial % de-risk) via reduce-only order. |

### 3. 🛡️ Cryptographic Safety & Staged Trade Tickets
* **No Blind Auto-Execution:** The AI model never directly places live exchange orders without user interaction. It constructs a formal trade ticket containing symbol, size, order type, price, and stop-loss/take-profit levels.
* **Tamper-Proof HMAC Tokens:** Staged trade tickets and cancel actions are signed with a 5-minute TTL token (`base64url(payload).expiresAt.signature`). If any parameter is altered between staging and submission, the signature verification fails immediately.
* **Server-Side API Key Secrecy:** Exchange API secrets (`BITGET_API_KEY`, `BITGET_API_SECRET`, `BITGET_PASSPHRASE`) remain securely on the server. Requests are signed using HMAC-SHA256 and sent directly to Bitget UTA v3 trade endpoints.

### 4. 📊 Pure TypeScript Quantitative Indicator Suite
A zero-dependency quantitative mathematics library built directly in TypeScript:
* **Trend & Structure:** 20, 50, and 200 Exponential Moving Averages (EMA), Simple Moving Averages (SMA), and SuperTrend ATR multiplier bands.
* **Momentum & Oscillation:** Relative Strength Index (RSI 14 with adaptive history fallback), MACD (12/26/9 with histogram cross detection), and Stochastic RSI.
* **Volatility & Range:** Bollinger Bands (Upper, Middle, Lower, Bandwidth, %B) and Average True Range (ATR 14).
* **Key Levels:** Fibonacci Retracement Zones (23.6%, 38.2%, 50.0%, 61.8% Golden Pocket, 78.6%) and Classical Pivot Points.

### 5. 💾 Local-First Privacy (Dexie IndexedDB v4)
* **Local Session Storage:** Multi-thread conversations, reasoning steps, tool execution logs, and audit trails are persisted locally in browser IndexedDB.
* **Zero Barrier Cold-Start:** Full market streaming, indicator analysis, symbol search, and macro intelligence work out-of-the-box without requiring API keys or exchange logins.

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
src/
├── agent/                         # AI Reasoning Engine & Tool Dispatch
│   ├── chat/                      # Stream state machine, engine & invocation pipeline
│   ├── providers/                 # Groq & Fireworks LLM provider definitions
│   ├── tools/                     # 12 domain tools (macro, sentiment, technicals, trade, intel)
│   ├── transforms/                # Stream filters, follow-up extractor & sanitizers
│   └── instructions.ts            # Sterling desk personality and system directives
├── app/                           # Next.js 16 App Router
│   ├── api/                       # API routes (chat streaming, symbol cache, trade execution)
│   ├── chat/                      # Main trading desk interface
│   └── globals.css                # Semantic design tokens & Tailwind utilities
├── components/                    # Modular presentation components
│   ├── (chat)/                    # Chat client, message list, input bar, and trade cards
│   ├── market-streamer/           # WebSocket ticker, L2 depth ladder, and sparkline charts
│   └── common/                    # Modal dialogs, loaders, and tool badges
├── hooks/                         # Specialized React hooks
│   ├── chat/                      # useAgentChat, useChatSessions (Dexie IndexedDB)
│   └── market/                    # useBitgetWs, useMarketSymbols (WebSocket & caching)
└── lib/                           # Core infrastructure & API clients
    ├── bitget/                    # Bitget V3 UTA client, quant engine, L2 book & analysts
    │   ├── auth/                  # Request signer, error classifier & HMAC ticket builders
    │   ├── trade/                 # Orders, queries, positions, accounts & instrument precisions
    │   └── analysts/              # Dedicated macro, sentiment, technical & on-chain engines
    ├── db/                        # Dexie IndexedDB schemas and persistence
    ├── exa/                       # Exa AI neural search client
    └── datahub/                   # Market intelligence & on-chain data adapters
```

---

## Getting Started

### Prerequisites
* **Bun (`bun@1.4.0+`):** Sterling uses the Bun runtime and package manager.

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

# Bitget V3 Trading Account (Optional — needed only for live execution & portfolio overview)
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

Sterling uses semantic design tokens defined in `src/app/globals.css` rather than hardcoded colors:
* **Surfaces:** `bg-theme-bg-base`, `bg-theme-bg-surface`, `bg-theme-bg-elevated`
* **Typography:** `text-theme-text-primary`, `text-theme-text-secondary`, `text-theme-text-muted`
* **Borders:** `border-theme-border-subtle`, `border-theme-border-strong`
* **Brand Accents:** `text-theme-brand-primary`, `bg-theme-brand-primary`

---

## Engineering & Quality Standards

Sterling follows strict engineering standards to ensure high execution integrity:

```bash
# Run repository linter (Zero warnings policy)
bun run lint

# Run strict TypeScript type-checking
bun x tsc --noEmit

# Run production build
bun run build
```

* **TypeScript 7:** Strict type safety with zero untyped `any` escapes.
* **Oxlint:** High-speed linting maintaining 0 errors and 0 warnings.
* **Next.js 16 (Turbopack):** App Router architecture with Edge & ISR caching routes.

---

## License
MIT License. Crafted for the next generation of algorithmic and autonomous traders.
