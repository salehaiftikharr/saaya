---
id: ADR-003
title: Durable Job model with an append-only event ledger
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - data-model
related:
  - docs/research/jobs-capability-audit.md
supersedes: []
---

# ADR-003: Durable Job model with an append-only event ledger

## Decision

Work that outlives a chat turn is a **Job**: a durable row created by an
explicit user request, carrying a goal, a lifecycle state, budgets, and a
workspace. Everything that happens to a Job is one row in an append-only
**job_events** ledger: `(job_id, seq, at, actor, type, payload)` with
`unique (job_id, seq)` and `actor` one of `user`, `saaya`, `system`.

States: `draft`, `queued`, `planning`, `waiting_approval`, `running`,
`paused`, `blocked`, `retrying`, `failed`, `cancelled`, `completed`.

Legal transitions:

- `draft -> queued -> planning -> running`
- `running -> waiting_approval -> running` (decision recorded first)
- `running -> retrying -> running`
- `running | planning -> blocked` (budget exhausted, unmet dependency)
- `blocked | failed -> retrying` (user action)
- `paused <-> running` (user action)
- any non-terminal `-> cancelled` (user action)
- `running -> failed`, `running -> completed`

`completed`, `failed`, and `cancelled` are terminal. Completion is a recorded
transition whose event payload carries evidence (summary, artifact ids);
nothing infers completion from silence. Every transition is written as a
`state_changed` event before the column is updated, in one transaction, so
the ledger is never behind the row.

## Context

Phantom (verified at `f8c7ab4`) has no durable goal entity: its scheduler
stores a prompt string and aggregates of the last fire, and a crash mid-run
loses the run. Rendi keeps board state in an actor-attributed op log and lets
the UI render only the log. Saaya combines both lessons: the Job is the
entity Phantom lacks, and the ledger is the log Rendi proves out.

A conversation is never silently converted into a Job. Jobs are created by an
explicit request (`POST /api/jobs`, a confirmed suggestion in chat, or later a
schedule fire), and the owning thread, when there is one, links to the Job so
the conversation and the work stay one story.

## Consequences

- The UI (workbench, dashboard, transcript cards) renders the ledger and only
  the ledger; there is no state that exists solely in memory or markup.
- Refresh, worker restart, and full-stack restart change nothing the user can
  see except liveness, because reads always come from Postgres.
- The ledger doubles as the SSE wire format: what is persisted is what
  streams, so there is no second vocabulary to drift.
