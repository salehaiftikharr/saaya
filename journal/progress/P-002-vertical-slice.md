---
id: P-002
title: Phase 2 vertical slice
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - phase-2
  - agent
  - streaming
related:
  - journal/progress/P-001-phase-1-foundation.md
  - journal/decisions/ADR-001-deep-agents-harness.md
  - journal/decisions/ADR-002-own-fastapi-server.md
supersedes: []
---

# P-002: Phase 2 vertical slice

## Objective

The smallest complete experience proving the premise: a web conversation with
streamed responses and one visible tool, durable across a full server restart,
with honest status in the UI.

## Work completed

Server: agent assembly on `create_deep_agent` (model via `init_chat_model`
with the CLAUDE_API_KEY hand-off, one `current_datetime` tool, prompt as a
file); typed wire event union (6 events); the `astream_events` adapter as the
single streaming seam; FastAPI app with lifespan-managed
`AsyncConnectionPool` (typed `AsyncConnection[DictRow]`) feeding
`AsyncPostgresSaver`; SSE chat route; transcript endpoint reading
checkpointed state structurally; LangSmith env hand-off.

Web: wire-event types mirroring the server; a fetch-SSE parser; chat state
hook (thread pointer in localStorage, transcript restore on mount, event
folding); Message, ToolActivityChip, Composer, ChatApp components on shadcn
primitives (textarea, scroll-area installed via CLI); dev proxy rewrite to
port 8000; unit vitest project with path alias.

## Decisions

- The transcript endpoint returns user and assistant text only; tool traffic
  is a live-stream concern, so restored history shows text without chips.
- The reply-stream `raise` after the TurnError frame keeps failures visible
  in server logs instead of swallowing them.
- A connection pool from the start: one psycopg connection cannot serve
  concurrent chat streams.
- deepagents 0.7 ships partially typed generics; two explained per-line
  pyright ignores isolate that at the import and return, keeping strict mode
  on for everything else.

## Verification

- Gates: ruff format/check, pyright strict 0 errors, pytest 12 passed; biome
  clean, tsc clean, vitest 15 passed (4 SSE parser, 11 story tests with the
  axe gate at error), next build passing.
- Live loop over HTTP: SSE frames observed in order (thread.started,
  tool.started, tool.finished with real output, 4 text deltas, turn.done).
- Restart survival: server process killed and restarted; the same thread
  correctly recalled the user's name and their earlier question from the
  Postgres checkpointer.
- Real browser via Playwright MCP: message sent through the UI, tool chip and
  streamed reply rendered, page reloaded, transcript restored from the
  server, follow-up correctly recalled name and profession, both themes
  screenshot-verified.

## Open risks

- No committed automated e2e spec yet; the slice was verified live through
  Playwright MCP. A `@playwright/test` spec in the live ring is the next
  testing increment.
- Assistant text renders as plain text; markdown rendering is deliberate
  future work.
- One conversation per browser (localStorage pointer); a thread list needs a
  server-side thread registry, which arrives with the memory phase's app
  tables.
- `astream_events(version="v2")` pins behavior that langchain may change;
  contained in the adapter.

## Next step

Semantic and procedural memory (scope priorities 6 and 7): pgvector store
with provenance, memory files via the Deep Agents backend, and the staged
reflection pipeline with deterministic validation.
