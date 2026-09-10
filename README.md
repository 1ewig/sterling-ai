# Argus — Autonomous AI Agent Starter Kit

<p align="left">
  <img src="https://img.shields.io/badge/Runtime-Bun%201.4%2B-FBF0DF?style=for-the-badge&logo=bun&logoColor=000000" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-Strict%207-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/AI%20SDK-Vercel%20AI%20v7-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel AI SDK" />
  <img src="https://img.shields.io/badge/Next.js-16%20App%20Router-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/Search-Exa%20AI-4F46E5?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Exa AI" />
</p>

A lightweight, extensible, and high-performance **Autonomous AI Agent Starter Kit** built on Next.js, Vercel AI SDK, and Bun. Features real-time semantic web search powered by Exa AI, a folder-based tool architecture, step-by-step reasoning timelines, live token usage telemetry, and local-first persistence.

---

## Highlights

* 🧠 **Autonomous Multi-Step Reasoning:** Full multi-turn thinking and tool-dispatch loop powered by Vercel AI SDK (`ai@^7`) with Groq and Fireworks AI failover support.
* 🌐 **Real-Time Semantic Web Search:** Live web research via Exa AI with date filters, domain citations, and minimal interactive source pills.
* 📁 **Folder-Based Tool Architecture:** Drop new tool files directly into `src/agent/tools/`—tools are automatically discovered, typed, and rendered in the UI with zero boilerplate.
* ⏱️ **Transparent Reasoning Timeline:** Expandable thinking accordions, intermediate progress updates, and per-step execution timers.
* 📊 **Token Telemetry & Logging:** Real-time token usage tracking per step and total token counts logged in the terminal and attached to response metadata.
* 💾 **Local-First Privacy:** Multi-session chat history, title renaming, and message persistence stored locally in your browser with Dexie IndexedDB.
* 🎨 **Design Token Architecture:** 100% semantic color tokens and Tailwind CSS v4 utility classes with seamless Dark/Light theme switching.

---

## Platform Architecture

```
src/
├── agent/                  # AI Reasoning Engine & Tool Dispatch
│   ├── chat/               # Stream state machine, engine & invocation
│   ├── providers/          # Groq & Fireworks model definitions & failover
│   ├── tools/              # Folder-based tool definitions (e.g. web-search.ts)
│   ├── transforms/         # Sanitizers, session title & follow-up extractors
│   └── instructions.ts     # Core system prompt instructions
├── app/                    # Next.js App Router
│   ├── api/chat/           # Server-Sent Events (SSE) streaming route
│   ├── chat/               # Dedicated chat stage route
│   └── globals.css         # Semantic CSS design tokens
├── components/             # Presentation Components
│   ├── (chat)/             # Domain-organized chat modules
│   │   ├── input/          # Input textarea, hero empty state & action dock
│   │   ├── messages/       # Message bubbles, drafting loaders & list
│   │   ├── reasoning/      # Timeline, thinking accordion & tool cards
│   │   └── chat-client.tsx # Chat client orchestrator
│   ├── sidebar/            # Multi-session conversation drawer & theme toggle
│   └── common/             # Reusable UI primitives (dialogs, loaders, icons)
├── hooks/                  # Custom React Hooks
│   ├── chat/               # useAgentChat, useChatSessions, useChatScroll
│   └── ui/                 # useTheme, useSidebar, useActiveTimer
├── lib/                    # Core Libraries & Utilities
│   ├── chat/               # Client-side SSE transport & history formatting
│   ├── db/                 # Dexie IndexedDB schema & CRUD operations
│   └── exa/                # Exa AI search client
└── stores/                 # Zustand Persistent UI State
```

---

## Adding Custom Tools

Extending the agent is as simple as creating a single file in `src/agent/tools/`:

```ts
// src/agent/tools/my-custom-tool.ts
import { tool } from 'ai';
import { z } from 'zod';

export const myCustomTool = tool({
  description: 'Explain what this tool does so the AI model knows when to invoke it.',
  parameters: z.object({
    query: z.string().describe('The search query or input parameter'),
  }),
  execute: async ({ query }) => {
    // Perform your API call, computation, or database query
    return {
      success: true,
      result: `Data for ${query}`,
    };
  },
});
```

Export it in `src/agent/tools/index.ts`:

```ts
export * from './web-search';
export * from './my-custom-tool';

export const agentTools = {
  web_search: webSearchTool,
  my_custom_tool: myCustomTool,
};
```

Any tool added here is automatically available to the agent and rendered in the reasoning UI without requiring custom card components.

---

## Getting Started

### 1. Prerequisites
* [Bun](https://bun.sh/) `v1.4.0` or higher
* An API key from [Groq](https://console.groq.com/keys) (default model: `qwen/qwen3.8-27b`) or [Fireworks AI](https://fireworks.ai/api-keys)
* *(Optional)* An API key from [Exa AI](https://dashboard.exa.ai/api-keys) for live web search

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

## Quality & Verification

Argus adheres to strict TypeScript and Oxlint verification standards:

```bash
# Typecheck with TypeScript 7 (0 errors)
bun x tsc --noEmit

# Lint with Oxlint (0 warnings, 0 errors)
bun run lint

# Production build
bun run build
```

---

## License

MIT
