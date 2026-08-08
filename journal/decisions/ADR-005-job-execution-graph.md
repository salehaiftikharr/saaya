---
id: ADR-005
title: Checkpointed Job execution graph, budgets as data, no judges
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - langgraph
  - deep-agents
related:
  - journal/decisions/ADR-001-deep-agents-harness.md
  - journal/decisions/ADR-003-job-model.md
supersedes: []
---

# ADR-005: Checkpointed Job execution graph, budgets as data, no judges

## Decision

Job execution is a LangGraph `StateGraph` with three nodes: **plan**,
**execute**, **finalize**, checkpointed by the same `AsyncPostgresSaver` the
chat agent uses, under the thread namespace `job:<job_id>`.

- **plan** produces a structured plan (ordered steps, each with an intent and
  a done condition) using the same model that powers chat, following Deep
  Agents planning conventions. The plan is persisted as a `plan_created`
  event; plan revisions append `plan_updated`, never overwrite.
- **execute** loops one step per iteration. A step runs a bounded Deep Agents
  invocation whose tools are the Job's tools only (workspace files now,
  policy-gated commands with ADR-006). Each iteration writes
  `step_started` and `step_completed` or `step_failed` events with evidence
  (files touched, exit codes, durations).
- **finalize** writes the completion evidence and the terminal transition.

Budgets are data on the Job row (`step_budget`, `wall_clock_budget_s`) and
are enforced deterministically in the execute loop: exceeding a budget
transitions the Job to `blocked` with a `budget_exhausted` event. The user
raises the budget or cancels; the graph never quietly continues.

Resume: a worker restart re-invokes the graph for every Job left in a live
state; LangGraph loads the checkpoint and continues from the last completed
node iteration. The ledger seq guard (`unique (job_id, seq)`) makes replayed
event writes fail loudly instead of duplicating history.

Validation of step outcomes is deterministic only: exit codes, file
existence, parseable output, schema checks. **No LLM judges.** Phantom
validates self-evolution with cross-model judge voting; Saaya rejected judge
architectures at inception (ADR-001 context) because a judgment that cannot
be explained deterministically cannot be audited, and auditability is the
product. A model may be asked to produce work, never to grade its own or
another model's work as a gate.

## Consequences

- Mid-run restart survival is structural, not aspirational: state lives in
  the checkpoint and the ledger, and the demonstration restarts the stack
  mid-execution to prove it.
- Budgets being data means the dashboard can show them, approvals can raise
  them, and tests can set them to 1 to force the blocked path.
- One checkpointer instance serves chat and jobs; the namespace prefix keeps
  the histories apart, and the Alembic guard already protects the
  LangGraph-owned tables.
