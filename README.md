# Argus — AI Trading Desk & Cross-Asset Intelligence Workbench

<p align="left">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4%2B-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI%20SDK-Vercel%20AI%20v7-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Next.js-16%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Bitget-UTA%20v3%20Market%20Data-00F0FF?style=for-the-badge" alt="Bitget" />
  <img src="https://img.shields.io/badge/Search-Exa%20AI-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Exa AI" />
</p>

A high-performance **AI Trading Desk & Cross-Asset Market Intelligence Workbench** built for the **7×24 continuous trading era** across crypto assets and tokenized US equities (rTokens). Built on Next.js 16 (App Router), Vercel AI SDK v7, and Bun.

---

## Highlights

* 📈 **7×24 Cross-Asset Perception:** Real-time spot and futures market data across crypto majors (`BTCUSDT`, `ETHUSDT`) and tokenized US equities (`TSLAUSDT`, `NVDAUSDT`, `SPYUSDT`, `MSTRUSDT`, `COINUSDT`).
* 📊 **Pure TypeScript Indicator Engine:** Computes 23 technical indicators across multiple timeframes (RSI 14, MACD, 20/50/200 EMAs, Bollinger Bands, SuperTrend, ATR, Fibonacci retracements) with zero Python/daemon runtime dependencies.
* 🌐 **Macro & Cross-Asset Correlations:** Real-time yield curve analysis (10Y-2Y spread), Fed funds rate policy, CPI/PCE inflation tracking, and BTC vs DXY / VIX / Gold / Nasdaq correlation matrices.
* 🧠 **Sentiment & Smart Money Divergence:** Live Fear & Greed indexing, retail vs top-trader Long/Short ratio divergence detection, taker volume ratios, and derivatives squeeze risk alerts.
* ⚡ **Single-Turn Parallel Tool Orchestration:** Dispatches multiple specialized research tools simultaneously in a single turn for low-latency multi-dimensional market briefings.
* 🎨 **Interactive Visual Tool Cards:** Custom-designed presentation widgets for Market Tickers, Technical Indicator Tables, Macro Gauges, Sentiment Meters, and Live News Briefings.
* 💾 **Local-First Privacy:** Multi-session conversation management, title generation, and message history stored locally with Dexie IndexedDB.
* 🛡️ **Zero Authentication Barrier:** All market data, technical calculations, macro indicators, and sentiment feeds run 100% out-of-the-box with zero API keys required.

---

## Domain Tool Arsenal

Argus exposes a curated domain tool suite matching the Bitget Track 3 Research Workbench standards:

| Tool | Focus & Data Sources | Output Intelligence |
| :--- | :--- | :--- |
| **`market_data`** | Bitget Public REST API (Spot & Futures) | Live price, 24h high/low range, 24h volume, funding rates, open interest, and orderbook depth. |
| **`technical_analysis`** | OHLCV K-lines + Indicator Math | RSI 14, MACD histogram, 20/50/200 EMA alignment, Bollinger Bands, SuperTrend, and Fibonacci zones. |
| **`macro_analyst`** | Fed policy, Treasury yields, Inflation data | Risk-On / Risk-Off regime verdict, 10Y-2Y spread, CPI/PCE prints, DXY/VIX, and Nasdaq correlations. |
| **`sentiment_analyst`** | Fear & Greed index + Derivatives flow | Crowd sentiment score (0–100), Retail vs Top Trader Long/Short divergence, and Squeeze risk rating. |
| **`market_intel`** | DeFi analytics & On-chain metrics | DeFi TVL rankings by chain, stablecoin dry powder liquidity, trending DEX tokens, and gas health. |
| **`web_search`** | Exa AI semantic search | Deep web research, SEC filings, protocol documentation, and external market queries. |

---

## Platform Architecture

```
src/
├── agent/                  # AI Reasoning Engine & Tool Dispatch
│   ├── chat/               # Stream state machine, engine & invocation
│   ├── providers/          # Groq & Fireworks model definitions & failover
│   ├── tools/              # Domain-oriented tools (macro, sentiment, technicals, market data)
│   ├── transforms/         # Title generators & follow-up extractors
│   └── instructions.ts     # AI Trading Desk system directives
├── app/                    # Next.js App Router
│   ├── api/chat/           # Server-Sent Events (SSE) streaming route
│   ├── chat/               # Trading desk chat stage route
│   └── globals.css         # Semantic CSS design tokens & KaTeX theme integration
├── components/             # Presentation Components
│   ├── (chat)/             # Domain chat UI
│   │   ├── input/          # Input dock, empty state & action shortcuts
│   │   ├── messages/       # Message list & drafting indicators
│   │   ├── reasoning/      # Timeline, thinking accordion & visual tool cards
│   │   │   └── tools/      # MarketData, TechnicalAnalysis, Macro, Sentiment cards
│   │   └── chat-client.tsx # Chat client orchestrator
│   ├── sidebar/            # Session drawer & theme toggle
│   └── common/             # Reusable UI primitives
├── hooks/                  # Custom React Hooks
│   ├── chat/               # useAgentChat, useChatSessions, useChatScroll
│   └── ui/                 # useTheme, useSidebar, useActiveTimer
├── lib/                    # Core Libraries & Utilities
│   ├── bitget/             # Public Bitget REST client, types & indicator math
│   ├── chat/               # Client-side SSE transport & history formatting
│   ├── db/                 # Dexie IndexedDB schema & CRUD operations
│   └── exa/                # Exa AI search client
└── stores/                 # Zustand Persistent UI State
```

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

Argus adheres to strict TypeScript 7 and Oxlint verification standards:

```bash
# Typecheck with TypeScript 7 (0 errors)
bun x tsc --noEmit

# Lint with Oxlint (0 warnings, 0 errors)
bun run lint

# Production build test
bun run build
```

---

## License

MIT
