# Sterling — AI Trading Desk & Cross-Asset Intelligence Workbench

<p align="left">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4%2B-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI%20SDK-Vercel%20AI%20v7-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Next.js-16%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Bitget-UTA%20v3%20Market%20Data-00F0FF?style=for-the-badge" alt="Bitget" />
  <img src="https://img.shields.io/badge/Search-Exa%20AI-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Exa AI" />
</p>

A high-performance **AI Trading Desk & Cross-Asset Market Intelligence Workbench** engineered for the **7×24 continuous trading era** across crypto assets and tokenized US equities (rTokens). Built on Next.js 16 (App Router), Vercel AI SDK v7, and Bun.

---

## Highlights

* 📈 **7×24 Cross-Asset Perception:** Real-time spot and futures market data across crypto majors (`BTCUSDT`, `ETHUSDT`) and tokenized US equities (`TSLAUSDT`, `NVDAUSDT`, `SPYUSDT`, `MSTRUSDT`, `COINUSDT`).
* ⚡ **Multiplexed Live WebSocket Streamer:** Persistent, sub-50ms streaming panel directly connected to Bitget Public v2 WebSocket over a single connection (`SPOT` ticker, `books15`, `candle1m`, and `USDT-FUTURES` ticker). Features high-frequency `requestAnimationFrame` (RAF) batching to eliminate DOM layout thrashing during tick bursts. Automatically disconnects on dismissal for zero background CPU/network overhead.
* 🔮 **Live Derivatives Intelligence:** Real-time perpetual metrics squeezed directly between the Ticker and Order Book—displaying 8H funding rates with live settlement countdown timers, open interest ($ Notional & native coin units), mark price, index price, and perpetual basis/premium spread in basis points.
* 🔍 **Instant Symbol Search & Switching:** Interactive popover switcher supporting over 1,720+ Spot and USDT-Margined Futures pairs. Powered by a hybrid Next.js 16 ISR API route (`GET /api/market/symbols` with 1-hour revalidation) and Dexie IndexedDB local caching (`market_symbols` table) for instantaneous, zero-latency multi-attribute prefix and substring searches.
* 📊 **Pure TypeScript Indicator Engine:** Computes 23 quantitative technical indicators across multiple timeframes (RSI 14, MACD, 20/50/200 EMAs, Bollinger Bands, SuperTrend, ATR, Fibonacci retracements) with zero Python or external daemon runtime dependencies.
* 🌐 **Macro & Cross-Asset Correlations:** Real-time yield curve analysis (10Y-2Y spread), Fed funds rate policy expectations, CPI/PCE inflation tracking, and BTC vs DXY / VIX / Gold / Nasdaq correlation matrices.
* 🧠 **Sentiment & Smart Money Divergence:** Live Fear & Greed indexing, retail vs. top-trader Long/Short ratio divergence detection, taker volume ratios, and derivatives squeeze risk alerts.
* ⚡ **Single-Turn Parallel Tool Orchestration:** Dispatches multiple specialized research tools simultaneously in a single turn for low-latency multi-dimensional market briefings.
* 🎨 **Ultra-Modern Neo-Grotesque UI:** Styled with **Geist Sans** and **Geist Mono** typography, obsidian-zinc dark basework (`#09090b`), electric cyan brand accents, full-stage ambient breathing glow with automatic transition management, and morphing `AgentLoader` animations.
* 📱 **Interactive Visual Tool Cards:** Custom presentation widgets for Market Tickers, Technical Indicator Tables, Macro Gauges, Sentiment Meters, and real-time order book depth ladders.
* 💾 **Local-First Privacy:** Multi-session conversation management, title generation, and message history stored locally with Dexie IndexedDB.
* 🛡️ **Zero Authentication Barrier:** All market data, technical calculations, macro indicators, sentiment feeds, and live WebSockets run 100% out-of-the-box with zero API keys required.

---

## Domain Tool Arsenal

Sterling exposes a curated domain tool suite matching institutional research desk standards:

| Tool | Focus & Data Sources | Output Intelligence |
| :--- | :--- | :--- |
| **`market_data`** | Bitget Public REST API (Spot & Futures) | Live prices, 24h high/low ranges, 24h volume, funding rates, open interest, and orderbook depth. |
| **`technical_analysis`** | OHLCV K-lines + Indicator Math | RSI 14, MACD histogram, 20/50/200 EMA alignment, Bollinger Bands, SuperTrend, and Fibonacci zones. |
| **`macro_analyst`** | Fed policy, Treasury yields, Inflation data | Risk-On / Risk-Off regime verdict, 10Y-2Y spread, CPI/PCE prints, DXY/VIX, and Nasdaq correlations. |
| **`sentiment_analyst`** | Fear & Greed index + Derivatives flow | Crowd sentiment score (0–100), Retail vs Top Trader Long/Short divergence, and Squeeze risk rating. |
| **`market_intel`** | DeFi analytics & On-chain metrics | DeFi TVL rankings by chain, stablecoin dry powder liquidity, trending DEX tokens, and gas health. |
| **`web_search`** | Exa AI semantic search | Deep web research, SEC filings, protocol documentation, and external market catalysts. |

---

## Platform Architecture

```
src/
├── agent/                  # AI Reasoning Engine & Tool Dispatch
│   ├── chat/               # Stream state machine, engine & invocation
│   ├── providers/          # Groq & Fireworks model definitions & failover
│   ├── tools/              # Domain-oriented tools (macro, sentiment, technicals, market data)
│   ├── transforms/         # First-turn title extraction & follow-up extractors
│   └── instructions.ts     # AI Trading Desk system directives
├── app/                    # Next.js 16 App Router
│   ├── api/chat/           # Server-Sent Events (SSE) streaming route
│   ├── api/market/symbols/ # ISR cached market symbol catalog endpoint (1h revalidation)
│   ├── chat/               # Trading desk chat stage route
│   ├── globals.css         # Semantic CSS design tokens, animations & KaTeX theme integration
│   └── layout.tsx          # Root layout with Geist typography & theme hydration
├── components/             # Presentation Components
│   ├── (chat)/             # Domain chat UI
│   │   ├── input/          # Input dock, empty state & quick-action templates
│   │   ├── messages/       # Message list, avatar rendering & drafting indicators
│   │   ├── reasoning/      # Process timeline, thinking accordion & visual tool cards
│   │   │   └── tools/      # MarketData, TechnicalAnalysis, Macro, Sentiment cards
│   │   └── chat-client.tsx # Chat client orchestrator
│   ├── market-streamer/    # Live Bitget WebSocket right-side streamer panel
│   │   ├── derivatives-metrics.tsx # Live 8H funding rate, OI, mark price & perp basis
│   │   ├── symbol-search-popover.tsx # 1,720+ pair search & instant switcher popover
│   │   ├── order-book.tsx  # 8-level depth ladder with bid/ask imbalance meters
│   │   └── ticker-card.tsx # Live price, 24h stats, and sparkline trend
│   ├── sidebar/            # Persistent collapsible drawer & theme toggle
│   └── common/             # Reusable UI primitives (AgentLoader, SterlingIcon, ConfirmDialog)
├── hooks/                  # Custom React Hooks
│   ├── chat/               # useAgentChat, useChatSessions, useChatScroll
│   ├── market/             # useBitgetWebSocket (multiplexed WS, RAF batching), useMarketSymbols
│   └── ui/                 # useTheme, useSidebar, useActiveTimer, useIsMobile
├── lib/                    # Core Libraries & Utilities
│   ├── bitget/             # Public Bitget REST & WS clients, types & 23-indicator math engine
│   ├── chat/               # Client-side SSE transport & history formatting
│   ├── db/                 # Dexie IndexedDB schemas (chat sessions & market symbols catalog)
│   └── exa/                # Exa AI search client
├── stores/                 # Zustand Persistent UI State
└── tests/                  # Integration test suites (Bitget WebSocket live stream)
```

---

## UI & Design System

The application is built on an **Ultra-Modern Neo-Grotesque** aesthetic:

* **Typography:** **Geist Sans** (`--font-geist-sans`) for clean editorial reading paired with **Geist Mono** (`--font-geist-mono`) for numerical market metrics, tickers, and code blocks.
* **Palette:** Pure obsidian-zinc basework (`--theme-bg-base: #09090b`), graphite surface cards (`--theme-bg-surface: #121215`), and pure platinum white text (`--theme-text-primary: #fafafa`).
* **Ambient Glow:** Dynamic radial halo centered across the chat stage that breathes in real-time (`scale(0.92)` to `scale(1.08)`) and automatically fades out smoothly via Framer Motion when conversation history is present.
* **Loader Animation:** Custom SVG `eclipse 2.4s ease-in-out` spinner reflecting live thinking and tool-execution stages.

---

## Getting Started

### 1. Prerequisites
* [Bun](https://bun.sh/) `v1.4.0` or higher
* An API key from [Groq](https://console.groq.com/keys) (default: `qwen/qwen3.8-27b`) or [Fireworks AI](https://fireworks.ai/api-keys)
* *(Optional)* An API key from [Exa AI](https://dashboard.exa.ai/api-keys) for web search

### 2. Installation
```bash
git clone https://github.com/1ewig/argus-ai-agent-starter-kit.git
cd argus-ai-agent-starter-kit
bun install
```

### 3. Environment Configuration
```bash
cp .env.example .env.local
```

Configure your `.env.local`:
```env
# Primary AI inference provider ('groq' or 'fireworks')
INFERENCE_PROVIDER=groq
GROQ_API_KEY=gsk_your_groq_api_key_here

# Optional: Exa AI for real-time web search
EXA_API_KEY=your_exa_api_key_here
```

### 4. Run Development Server
```bash
bun run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Quality & Verification Standards

Sterling adheres to strict TypeScript 7 and Oxlint verification standards:

```bash
# Typecheck with TypeScript 7 (0 errors)
bun x tsc --noEmit

# Lint with Oxlint (0 warnings, 0 errors)
bun run lint

# Run live WebSocket & integration test suite
bun test

# Production build test
bun run build
```

---

## License

MIT
