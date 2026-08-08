---
id: P-031
title: The first durable Job slice, proven across a kill -9
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - langgraph
  - workbench
related:
  - docs/research/jobs-capability-audit.md
  - docs/design/rendi-study.md
  - journal/decisions/ADR-003-job-model.md
  - journal/decisions/ADR-005-job-execution-graph.md
  - journal/decisions/ADR-009-worker-model.md
supersedes: []
---

# P-031: The first durable Job slice, proven across a kill -9

The Jobs phase opened with its decision layer (capability audit against
Phantom at `f8c7ab4`, Rendi study at `04d62d6`, ADRs 003 through 010,
commit `a4da4fc`) and now has its first working slice: durable Jobs with an
append-only ledger, a checkpointed LangGraph runner, an in-process worker
with boot recovery, per-job contained workspaces, the API, and a Work view
in the product.

## What exists now

- `jobs` and `job_events` tables (Alembic `8aa642582b46`; content inspected
  before upgrade: two `create_table`, one unique constraint, one index).
- `saaya/jobs/`: states with a legality table, a store whose every state
  write appends its event in the same transaction, the ADR-004 workspace
  guard (traversal, absolute, symlink escape, and size caps all refused),
  the plan/execute/finalize graph checkpointed under `job:<id>`, the
  model-backed planner and step executor (Deep Agents with workspace-bound
  file tools), and the worker (claim loop, one job at a time, boot
  recovery scan).
- Failure, blocked, and cancel paths halt the graph mid-superstep
  (`JobHalt`) so the checkpoint stays pending at the halted step; retry
  re-runs exactly that step. Budgets are data and are enforced
  deterministically at every step boundary. No judges anywhere.
- API: create, list, detail (job plus full ledger), cancel, retry, and an
  SSE tail that streams the same persisted rows the detail returns.
- Web: a Work view (list with state badges, detail with the ledger
  timeline, plan disclosure, files, stop and retry controls), wired into
  the shell nav on desktop and mobile. The jobs client is origin-relative
  like every other surface; the first draft broke that convention and CORS
  errors in the rendered app caught it.

## Evidence

- Server gates: ruff format, ruff check, pyright 0 errors, 99 tests (14
  new: store legality and ledger, workspace containment incl. symlink
  escape, runner happy path, budget block and continue, cancel at step
  boundary, worker recovery, and checkpoint resume across a brand-new
  saver and pool). Web gates: biome, tsc, vitest, production build.
- Real job one (`d01e5633`): two-file release note. Model-produced plan,
  two deep-agent steps, both files in the contained workspace, ledger of
  ten events ending `job_completed` then `completed`.
- Real job two (`d3a42152`): four-file planning packet, killed mid-step-3
  with `kill -9` on the uvicorn process (state `running` read straight
  from Postgres while the API was dead). On restart the worker logged
  `job_recovered`, re-ran only the interrupted step (seq 9 started, seq 11
  re-started after recovery; steps 1 and 2 never re-executed), finished
  steps 3 and 4, and completed. All four files exist. The ledger keeps the
  crash visible instead of smoothing it over: sixteen events including the
  recovery row.
- Rendered proof: `work-list.png`, `work-detail.png` (session scratchpad):
  the Work list with both jobs and the timeline with plan, steps, and
  summaries.

This is the property the capability audit called Saaya's structural
differentiator: Phantom's scheduler re-staggers missed fires after a
restart, but a run that dies mid-flight is gone; Saaya's resumes from the
checkpoint and shows the seam in its own ledger.

## Deliberate limits of the slice, tracked

- Steps execute through workspace file tools only; the ADR-006 command
  runner, approvals (ADR-007), artifacts as first-class rows (ADR-008),
  schedules (ADR-010), and the conversation-owned workbench panel are the
  next increments.
- The Work detail polls persistence while live; the SSE tail exists on the
  API and the panel moves to it with the workbench increment.
- Jobs are created through the API today; chat-side creation with explicit
  confirmation (never silent jobification) lands with the workbench.
- An interrupted step re-executes from its beginning after recovery:
  at-least-once semantics for the in-flight step, by design, and the
  ledger shows both attempts.
