# Architecture

Two applications, one database, one contract: the interface renders
persisted truth, and everything durable is reconstructable from records.
This document is the map; the decision records in `journal/decisions/`
carry the full reasoning.

## The pieces

- **`server/`** (Python 3.13, FastAPI): one process containing the chat
  agent, the job worker and runner, the schedule ticker, the reflection
  heartbeat, the Slack Socket Mode client, and the MCP server mount. It
  must run as exactly one process: the worker and ticker are in-process,
  and a second instance would double-fire schedules.
- **`web/`** (Next.js, TypeScript strict): the workbench. It proxies
  `/api/*` to the server through a rewrite, so the browser stays
  origin-relative and no CORS surface exists.
- **Postgres + pgvector**: one database owning LangGraph checkpoints,
  the jobs and events ledger, approvals, artifacts, schedules, semantic
  memory with embeddings, thread liveness, heartbeat runs, and the
  dynamic tool registry. Alembic migrates everything except the
  LangGraph-owned tables, which a guard excludes.

## How LangChain is used

- **Deep Agents** (`create_deep_agent`) is the agent harness for chat and
  for each job step: planning conventions, tool orchestration, and the
  system-prompt assembly that loads procedural memory (ADR-001).
- **LangGraph** provides durability: `AsyncPostgresSaver` checkpoints
  every conversation thread, and the job runner is a `StateGraph`
  (plan, execute, finalize) checkpointed under `job:<id>` so a worker
  restart resumes from the last completed step (ADR-005). Streaming uses
  `astream_events`, adapted into one typed SSE wire union.
- **LangChain core** supplies model initialization (`init_chat_model`)
  and typed tools (`StructuredTool`), keeping providers and tool
  interfaces swappable.
- **LangSmith** traces runs when a key is configured; it is optional and
  off by default.

Everything above that layer, the job lifecycle and legality table, the
append-only ledger, approval enforcement, the command policy, workspace
containment, schedules, memory governance, and the reflection validators,
is implemented in this repository.

## The job spine (ADR-003, 005, 009)

`jobs` rows carry goal, state, budgets, and a workspace name; `job_events`
is append-only with `unique (job_id, seq)`, written in the same
transaction as any state change. The worker claims queued jobs with
`FOR UPDATE SKIP LOCKED`, runs the graph, and on boot rescans live states
to resume stranded work, recording `job_recovered`. Failure, blocked, and
cancel paths halt the graph mid-superstep so the checkpoint stays pending
at the halted node; retry re-runs exactly that step. The interrupted step
is at-least-once and the ledger shows both attempts.

## Boundaries that hold (ADR-004, 006, 007)

The workspace guard resolves every candidate path and refuses anything
outside the job directory (traversal, symlinks, absolute paths), with
size caps. The command policy is deny-by-default over argv lists with a
scrubbed environment and no network-capable allowlist entry. Approvals
are rows plus ledger events; the gated code path re-reads the decision at
execution and consumes it.

## Memory (ADR-002 context, reflection design)

Three layers: checkpointed transcripts per thread; semantic memories in
pgvector with provenance and reversal (supersede, forget); procedural
files loaded into the system prompt, changed only through reflection
proposals that deterministic validators accept or reject, with a
version ledger and rollback. The identity file is write-protected and
proven unchanged after every run. No LLM judges anywhere.

## Surfaces

Web (SSE), Slack (Socket Mode, thread identity `slack:<channel>[:<ts>]`),
and MCP (streamable HTTP, bearer token) share the agent and memory while
keeping distinct thread identities. The health endpoint reports each
surface plus worker liveness and job counts.

## Decision records

| ADR | Decision |
| --- | --- |
| 001 | Deep Agents as the primary harness |
| 002 | Own FastAPI server over a hosted runtime |
| 003 | Durable Job model with an append-only ledger |
| 004 | Per-job workspace containment and threat model |
| 005 | Checkpointed execution graph, budgets as data, no judges |
| 006 | Deny-by-default command policy |
| 007 | Backend-enforced approvals with previews |
| 008 | Artifacts as immutable workspace-backed records |
| 009 | In-process worker, restart-safe by checkpoint |
| 010 | User schedules distinct from reflection heartbeats |
