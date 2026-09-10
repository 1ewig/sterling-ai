# Argus — Engineering Guidelines

Core rules for AI coding agents working in this repository:

---

### 1. Design Tokens & Styling
* **Design Tokens:** Never hardcode raw hex codes, RGB, HSL, or magic pixel values in JSX or styles. Always use semantic design tokens and Tailwind utility classes defined in `src/app/globals.css` (e.g. `bg-theme-bg-surface`, `text-theme-text-primary`, `p-spacing-md`).

---

### 2. Bun Runtime & Package Management
* **Bun Only (`bun@1.4.0+`):** Never run or suggest `npm`, `pnpm`, `yarn`, or `npx`.
* Use Bun equivalents: `bun add <pkg>`, `bun run dev`, `bun run build`, `bun run lint`, `bun x tsc --noEmit`, `bun x oxlint`.

---

### 3. Tooling Standards: TS7 & Oxlint
* **TypeScript 7:** Strict type-checking via `bun x tsc --noEmit`. No untyped `any` escapes.
* **Oxlint:** Repository linter via `bun run lint`. Maintain zero warnings and zero errors.

---

### 4. Clear Separation of Concerns & Modular Architecture
Respect existing project conventions and modular layers:
* **`src/agent/`:** AI reasoning engine, prompt assembly, and AI SDK tool definitions.
* **`src/lib/`:** External clients (Exa search), Dexie IndexedDB persistence, and Zod schemas.
* **`src/hooks/`:** Specialized reactive hooks for stream handling, sessions, and scroll orchestration.
* **`src/components/`:** Presentation components decoupled from streaming transports.
* **`src/constants/`:** Framer Motion animation tokens (`animation.ts`).
* **`src/stores/`:** Minimal persisted global UI state via Zustand.

---

### 5. Execution Integrity & Tone
* **Authentic Data Only:** Query live tools & Exa AI search. Never generate synthetic fallback data, mock facts, or fabricated answers.
* **Natural Language:** Speak like an approachable, insightful colleague. Avoid pseudo-military or robotic jargon.

---

### 6. Parallel Execution & Tool Call Efficiency
* **Batch Independent Operations:** Always group independent file reads, edits, and searches into a single message with multiple tool calls. Never serialize operations that have no dependencies on each other.
* **Parallel Reads:** When exploring a codebase or reviewing multiple files, launch all `Read`, `Glob`, and `Grep` calls simultaneously in one response.
* **Parallel Writes:** When editing multiple independent files (e.g. updating imports across a component group), issue all `Edit` calls in a single message.
* **Parallel Verification:** Run `bun run lint` and `bun x tsc --noEmit` concurrently — never sequentially.
* **Minimize Round-Trips:** Each serialized tool call costs an API round-trip. A single message with 5 parallel calls is always preferred over 5 sequential messages with 1 call each.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
