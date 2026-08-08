---
id: ADR-010
title: User schedules are not reflection heartbeats
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - scheduling
related:
  - journal/decisions/ADR-003-job-model.md
supersedes: []
---

# ADR-010: User schedules are not reflection heartbeats

## Decision

Two clocks, two tables, two meanings:

- **Reflection heartbeats** (existing `heartbeat_runs`) remain Saaya's
  internal metabolism: scheduled self-review of settled conversations,
  silent when nothing durable happened, never user-configured, never
  produce Jobs.
- **User schedules** (new `user_schedules`, phase J3) are owned by the
  user: a name, a task description, a schedule (`at` and `every` kinds
  first; cron and natural-language parsing later), enabled flag, and run
  bookkeeping. A schedule fire creates a normal Job with
  `source = schedule`, so scheduled work inherits the ledger, budgets,
  approvals, workspace containment, and recovery for free, and appears on
  the same dashboard as everything else.

Misfire policy: on boot, a past-due schedule fires once and advances;
missed occurrences never pile up. Fires are skipped, with a recorded event,
while the same schedule's previous Job is still live, mirroring the
busy-skip Phantom's executor uses.

## Context

Phantom's scheduler is its strongest work feature (at, every, cron with
timezones, natural-language parsing, delivery targets, backoff), but its
fires are stateless prompt sessions. Saaya routes fires through the Job
model instead so the fifth firing of a weekly schedule has the same
auditability as a hand-created Job. Keeping heartbeats separate protects
the quiet-by-design property: user schedules are allowed to be noisy,
reflection never is.

## Consequences

- No schedule can bypass approvals or the command policy, because there is
  no execution path that is not a Job.
- The dashboard distinguishes "you asked for this on a clock" from "Saaya
  reflected", which keeps trust legible.
