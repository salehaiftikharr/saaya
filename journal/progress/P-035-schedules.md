---
id: P-035
title: User schedules, where a clock is just another way to start a Job
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - schedules
related:
  - journal/decisions/ADR-010-schedules-vs-heartbeats.md
  - journal/progress/P-034-phase-handoff.md
supersedes: []
---

# P-035: User schedules, where a clock is just another way to start a Job

J3 lands ADR-010 as built: user-owned schedules whose every fire creates a
normal Job. There is no second execution path, so scheduled work inherits
the ledger, budgets, approvals, workspace containment, and restart
recovery without any of them knowing schedules exist. The reflection
heartbeat remains a separate, silent clock.

## What exists

- `user_schedules` (migration `b616ae3fac8c`, inspected before upgrade):
  name, task, kind (`at` or `every`), timing fields, enabled flag, last
  fire bookkeeping, and an indexed `next_fire_at`. Schedules are disabled,
  never deleted, without the owner's ask; one-shot `at` schedules park
  themselves by disabling after they fire.
- `jobs/schedules.py`: pure `initial_fire` and `next_fire` (every advances
  from now, so downtime cannot pile up runs), a store with an injectable
  clock, and a ticker whose `tick()` is the testable unit. A due schedule
  whose previous job is still live (queued, planning, running, retrying,
  or waiting on an approval) skips the fire and records
  `schedule_skipped_busy` on that job's ledger; a real fire creates the
  Job with the task as its goal and records `schedule_fired` with the
  schedule's identity. Re-enabling an `every` schedule counts from now, so
  a long-paused clock cannot fire the moment it wakes.
- Endpoints: create (validated kinds, interval floor of 60 seconds, week
  ceiling), list, and enable or disable. The ticker runs beside the job
  worker in the lifespan and stops cleanly with it.
- Work view: a Schedules section with the cadence in words ("Every 2
  minutes · next in under a minute"), an enabled switch, and a last-run
  link that opens the job detail. The Work nav button now carries a quiet
  amber dot when any job anywhere waits on an approval.

## Evidence

- Six fake-clock tests mirror the heartbeat style: pure fire math and
  validation, a due fire creating a Job with the task as goal and the
  linkage recorded on both sides, busy-skip recording and advancing,
  disabled never firing and re-enable counting from now, three hours of
  downtime firing exactly once, and a one-shot firing then parking.
  Server total: 117. Web gates and the six e2e layout proofs stay green.
- Live: a probe schedule ("Status note probe", every 120 seconds) was
  created through the API, rendered in the Work view with its countdown,
  fired on time, created a real Job the worker picked up, and was then
  disabled through the product switch so nothing runs unattended
  overnight. The fire evidence and the disable are both in this journal's
  commit window.

## Notes

- The schedule fire interval floor (60 seconds) is a policy floor, not a
  UI suggestion; the API refuses anything tighter.
- Natural-language cadences and cron expressions remain deferred
  (`docs/design/deferred-scope.md`); the data model holds them without a
  migration when they come.
