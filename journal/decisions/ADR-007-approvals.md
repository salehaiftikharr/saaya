---
id: ADR-007
title: Backend-enforced approvals with previews
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - security
  - ux
related:
  - journal/decisions/ADR-003-job-model.md
  - journal/decisions/ADR-006-command-policy.md
supersedes: []
---

# ADR-007: Backend-enforced approvals with previews

## Decision

Consequential actions inside a Job (initially: any write-class command the
ADR-006 policy marks gated, and applying a produced patch) require a recorded
human approval before the runner will execute them.

Mechanics:

- The runner writes an `approvals` row (id, job_id, kind, payload with a
  human-readable preview of exactly what will happen, requested_at) plus an
  `approval_requested` event, transitions the Job to `waiting_approval`, and
  interrupts the graph at a checkpoint.
- `POST /api/jobs/{id}/approvals/{approval_id}` records the decision
  (approved or rejected, decided_at, decided_by) and resumes the graph.
- The gated code path executes only after re-reading the approval row and
  verifying `decision = approved` for the exact pending action. The check
  lives next to the execution, not in the UI, so no client can skip it and
  neither can the model.
- Rejection is a first-class outcome: the runner receives it as data,
  records `approval_rejected`, and plans around it or finishes honestly.

The tools panel's draft-tool activation flow already embodies this
philosophy; it keeps its own storage for now and joins the same visual
language in the workbench. Unifying the storage is deliberately deferred
until both flows are stable.

## Consequences

- "Waiting on you" becomes a visible product state with a preview of the
  action, satisfying the trust requirement that the user sees what will
  happen before confirming.
- Approvals are auditable forever: the ledger holds request, preview,
  decision, and actor.
- Graph interrupts make waiting free: a Job can wait for days without a
  process alive.
