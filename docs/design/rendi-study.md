# Rendi study: what Saaya adapts, and why

Source audited: `mcheemaa/rendi` at `04d62d6` (2026-07-23), MIT license, Copyright (c) 2026 Muhammad Ahmed Cheema.
Running it locally requires ClickHouse, Trigger.dev cloud, and Neon Postgres with live credentials, and the hosted instance sits behind a private-preview access code, so this audit reads the source and its Storybook stories instead of a live deployment; only the public gate page was inspected in a browser. No Rendi code has been copied into Saaya so far; if any file is adapted later, the adaptation and the MIT attribution requirement will be recorded here first.

Rendi is an agent harness whose first skin is analytics. Saaya is not an analytics product and adopts none of Rendi's charts, datasets, instruments, or terminology. What Saaya takes is the interaction architecture: the way Rendi makes durable agent work visible, steerable, and honest.

## The shape worth stealing

Rendi's own README names it: the session is the agent's inbox, and the user is only one of three writers. People write to it, finished background work writes to it, and the agent's own schedules write to it. The agent wakes for any of them with full memory, and the conversation state lives in a persisted log instead of in a machine.

Saaya already has the substrate for this (LangGraph checkpoints, one thread identity across web, Slack, and MCP, a reflection heartbeat). What it lacks is the product expression: background work that writes into the conversation, and a client that expects turns it did not initiate. The Jobs phase supplies the missing writer.

## Patterns adapted into Saaya

### 1. Conversation-owned working surface, revealed by activity
`conversation-view.tsx` renders the transcript column plus an optional `aside` panel (44% width, widenable to 72%, closable). The panel opens automatically when the canvas already has blocks, reveals itself the first time the agent touches the board mid-turn, and a user's close wins for the rest of the session (`userClosed` ref). The reopen affordance is a single quiet icon button floating over the transcript.

Saaya adaptation: the Job workbench panel beside the transcript. It opens when the active conversation owns a Job, reveals itself when a Job starts mid-conversation, and respects a user close. Blocks are plan, status, files, artifacts, approvals, and failure records instead of charts and notes.

### 2. Typed tool cards with one prop grammar
`transcript.tsx` maps every tool part type to a dedicated card (`QueryDataCard`, `DatasetCard`, `EmailCard`, and so on), all sharing one contract: `state` (`input-streaming`, `input-available`, `output-available`, `output-error`), `interrupted`, `input`, `output`, `errorText`. Each card is a `Tool` disclosure: header with icon, a human title ("Looked at the data"), and a monospace summary ("42 rows · 120ms", "failed", "interrupted", "running"); the body holds the exact code the agent ran and a preview-limited result table, expandable, never forced open.

Saaya adaptation: replace the current generic tool chips with typed activity cards sharing the same grammar. Repeated identical calls (the duplicated `remember` chips the owner flagged) collapse into one card with a count. Human-readable outcome first, technical payload on expansion.

### 3. Honest interruption instead of eternal spinners
Rendi computes `interrupted` per part: a tool part still waiting for output while no stream is live belongs to a dead turn and says so. Nothing spins after the backend has stopped.

Saaya adaptation: the same predicate over restored transcripts and job event tails. A step that was running when the worker died renders as interrupted with a retry affordance, never as running.

### 4. Merge-based recovery: the client is a reader that can attach
`chat-app.tsx` treats persistence as truth. While idle it polls the transcript endpoint (visible tab only), merges rows this store has not seen (`mergeTranscript`), and if the persisted tail is a user turn it re-attaches to the live stream with a bounded number of attempts. A tail the user explicitly stopped stays stopped. Cold loads that beat the harness self-heal with a bounded refresh loop. Every step is idempotent.

Saaya adaptation: the same idle merge loop against Saaya's transcript endpoint, which also carries turns born on Slack, MCP, schedules, and finished Job work into an open tab without a refresh. Bounded attempts, stopped tails stay stopped.

### 5. State in an op log with actors
`canvas-store.ts` is a client store where every mutation dispatches an `OpEntry` through one shared reducer, tagged with an actor, appended to a log, and handed to a sink that persists it with optimistic concurrency (`baseVersion`); server truth returns and is adopted by version comparison. The agent's own writes arrive through the same document, so both pairs of hands write one history.

Saaya adaptation: the Job event ledger is the server-side twin of this idea. Every state transition, step, tool call, approval, and artifact is one appended row with an actor; the workbench renders the ledger, and the UI never invents state the ledger does not hold.

### 6. Composer as a state machine seat
`composer.tsx` swaps submit and stop in the same footer slot, explains busy state in the placeholder ("Rendi is working…"), and hands focus back to the textarea when the turn ends (`preventScroll: true`). Drafts ride `sessionStorage` keyed by conversation so navigation never loses typed text.

Saaya adaptation: per-thread draft preservation, focus handback after a turn, explained disabled states, and a guard against duplicate submissions. Saaya keeps its own layout and copy.

### 7. Sidebar: server head, deduped tail, instant search
`app-sidebar.tsx` keeps the first page server-fresh (new conversations and renames arrive with `router.refresh()`), appends cursor-paged tail pages locally with dedupe, and searches with a 250ms debounce, a sequence guard, and instant local matches while the server round-trip is in flight. A command palette fronts the same data.

Saaya adaptation: the search and grouping Saaya already has gains the instant-local-match pattern; Jobs join the list with status indicators; selection and scroll position survive navigation.

## Compatibility audit

Rendi and Saaya share the foundation: Base UI (`@base-ui/react`), shadcn conventions, Biome, Storybook with an axe gate, `streamdown`, `lucide-react`, next-themes. Rendi's `components/ai-elements` are vendored shadcn AI Elements (conversation, message, tool, prompt-input, code-block, reasoning, loader, shimmer). Saaya can install the same registry components through its existing base-nova setup and restyle them with Saaya tokens; they are plain files, not a runtime dependency.

Two Rendi choices Saaya does not import:
- Trigger.dev durable sessions. Saaya's durability comes from LangGraph checkpoints plus its own Postgres; the reconnect and merge patterns transfer, the transport does not.
- The freeform draggable canvas with camera and gestures. Saaya's workbench is structured blocks over real Job data, not a spatial board. A canvas without live steerable instruments behind it would be decoration, which the brief forbids.

## What Saaya must not take

Rendi's name, wordmark, brand assets, analytics vocabulary (instruments, boards, pulses, datasets), fixture data, screenshots, and product claims stay in Rendi. The relationship is: Phantom defines the ambition breadth, Rendi defines the experience standard, Saaya keeps its own identity: continuity, explainable memory, reversible learning, Jobs, approvals, safe capabilities.
