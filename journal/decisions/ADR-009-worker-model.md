---
id: ADR-009
title: In-process async worker, restart-safe by checkpoint
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - architecture
related:
  - journal/decisions/ADR-005-job-execution-graph.md
supersedes: []
---

# ADR-009: In-process async worker, restart-safe by checkpoint

## Decision

Jobs execute inside the FastAPI process as asyncio tasks managed by a small
worker component: a claim loop that picks up `queued` Jobs (bounded
concurrency, initially 1), runs the ADR-005 graph, and a boot-time recovery
scan that finds Jobs stranded in live states (`planning`, `running`,
`retrying`) with no owning task and resumes them from their checkpoints,
recording a `job_recovered` event.

There is no separate worker process, no Redis, no Celery, no queue broker.

## Context

This is a deliberately honest sizing decision. Saaya is a single-operator
product on one machine. Restart survival, the property that matters, comes
from LangGraph checkpoints and the event ledger living in Postgres, not from
process separation; a separate worker fleet would add deployment surface and
failure modes while protecting against load that does not exist. Phantom
makes the same call at its scale (one Bun process does everything).

The seam is kept clean for the day the call changes: the worker talks to the
rest of the app only through the jobs store and the graph, so extracting it
into its own process later is a deployment change, not a redesign.

## Consequences

- A crash or deploy mid-run is recovered on next boot: the recovery scan is
  the same code path the demonstration exercises with a mid-execution stack
  restart.
- Long-running blocking work must not sit on the event loop; anything
  blocking runs through `asyncio.to_thread`, the same discipline the
  dynamic-tool runner already follows under uvloop.
- Known accepted limitation, recorded: a runaway step competes with API
  latency inside one process. Budgets (ADR-005) bound the damage; the
  operational view (health) exposes worker liveness so degradation is
  visible.
