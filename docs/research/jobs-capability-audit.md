# Jobs capability audit: Phantom, Rendi, and what Saaya builds

Phantom source verified at `f8c7ab4` (2026-05-01, current with origin), README v0.20.2. Claims below cite the files they were verified in; where the README overstates, the source wins. Rendi patterns are covered in `docs/design/rendi-study.md`; this document folds in only its work-surface consequences.

Decision vocabulary: **adopt** (build the equivalent now), **adapt** (build the outcome with a different design that fits Saaya), **later** (accepted, explicitly phased), **keep** (Saaya's existing answer already meets or beats it), **reject** (will not build, with reason), **defer** (out of scope for this product stage, recorded).

## The matrix

| # | Capability | Phantom behavior (verified) | Current Saaya | Decision | Phase |
|---|------------|------------------------------|---------------|----------|-------|
| 1 | Workspace isolation | The whole VM is the workspace. The Bun process runs on its own machine with full filesystem and a mounted Docker socket for sibling containers (`docker-compose.yaml`, README security note). No per-task boundary; safety comes from machine dedication. | A `workspace/` directory of memory files only. Dynamic tools run through a subprocess runner with scrubbed env and timeout. No execution workspace at all. | **Adapt.** Per-Job workspace directories under one jobs root with path containment (resolved-path prefix checks, no symlink escape, size caps). Honest framing: a controlled local workspace, not "its own computer". No host Docker access ever. | J1 |
| 2 | Long-running jobs | No durable job entity for goals. `ScheduledJob` (`scheduler/types.ts`) is a recurrence plus a prompt string; a fire calls `runtime.handleMessage("scheduler", "sched:<id>", task)` as one agent session (`executor.ts`). Busy fires are skipped. Rows keep only `last_run_*` aggregates. A crash mid-run loses the run; restart recovery only re-staggers missed fires (`recovery.ts`). | Nothing. Chat turns only. | **Adopt, and go past it.** A first-class `jobs` table with explicit lifecycle states and an append-only `job_events` ledger. Execution checkpointed by LangGraph so a worker restart resumes mid-run, which Phantom cannot do. This is Saaya's structural differentiator. | J1 |
| 3 | Planning and execution | Claude Agent SDK `query()` loop with hooks, markdown subagents (`subagents/storage.ts`), and skills. Budgets are `max_budget_usd` plus SDK turn caps (`chat-query.ts:134`, stop reasons in `agent/events.ts`). No external orchestration graph, no persisted plan. | Deep Agents (`create_deep_agent`) with built-in todo planning inside a chat turn. No goal-directed run loop, no persisted plan. | **Adapt.** A Job execution graph on LangGraph: plan step (Deep Agents planning), then step execution with per-step events, budgets as data (step cap, wall-clock cap), checkpointed resume. No LLM judges anywhere, deterministic validation only. | J1 |
| 4 | Files and artifacts | Files live on the VM disk; shareable pages served on a public domain behind magic-link auth (`ui/serve.ts`, `ui/api/pages.ts`). No artifact entity tied to a run. | None beyond memory files. | **Adapt.** First-class `artifacts` rows bound to a Job and a workspace path, listed and fetched through the authenticated API. Public share URLs are deferred. | J2 |
| 5 | Tool creation | Agent registers MCP tools at runtime into SQLite with `script` or `shell` handlers (`mcp/dynamic-tools.ts`); no human approval gate anywhere in the registration path (`mcp/tools-dynamic.ts`). | Draft, approve, activate lifecycle with deterministic validation, versions, rollback, scrubbed-env subprocess runner, usage evidence. | **Keep.** Saaya's governance is deliberately stronger. Jobs may propose tools; activation stays human. | done |
| 6 | Scheduled work | Real scheduler: `at`, `every`, 5-field cron with timezone, natural-language parse via a model, Slack delivery targets, error backoff, `MAX_CONSECUTIVE_ERRORS = 10`, delete-after-run, 30-day terminal sweep, missed-fire stagger (`scheduler/*`). | Reflection heartbeat only, internal and silent when idle. | **Adopt (subset).** User-owned schedules as a separate table from reflection heartbeats, starting with `at` and `every`; cron and natural-language parsing later. A schedule fire creates a Job, so scheduled work gets the same ledger, budgets, and recovery as everything else. | J3 |
| 7 | Progress events | `AgentEvent` union (init, assistant_message, tool_use, status, result with cost and stop reason) streamed per session (`agent/events.ts`); not persisted per run, job rows keep aggregates only. | Typed SSE wire union for chat turns; nothing persisted beyond the transcript. | **Adopt, and go past it.** `job_events` is persisted first, streamed second. The dashboard and the transcript both render the ledger, so refresh and restart lose nothing. Rendi's op-log canvas is the model: state in the log, UI as a reader. | J1 |
| 8 | Failure recovery | Per fire: error backoff and a consecutive-error cap flipping status to `failed`. Restart: missed fires re-staggered. Mid-run crash: work lost, no checkpoint. | Chat turn errors are reported honestly and can be retried by resending. | **Adopt, and go past it.** Explicit `Retrying`, `Failed`, `Blocked` states with recorded transitions and evidence in the ledger; LangGraph checkpoint resume across worker restarts; controlled failure is part of the demonstration. | J1-J2 |
| 9 | Permissions | MCP bearer tokens with scopes (`mcp/auth.ts`), magic-link auth for pages and secret forms, AES-256-GCM secret storage. The agent itself is unrestricted on its machine by design ("builds infrastructure without asking for permission"). | Single-scope MCP bearer token; human approval on tool activation; no approval framework for actions. | **Adapt.** One backend-enforced approvals model: a Job enters `WaitingApproval`, the pending action is stored with a preview, approval or rejection is recorded in the ledger, and the runner will not execute the gated action without the recorded approval. Command execution gets an allow/deny policy with scrubbed env and network off by default. | J2 |
| 10 | Infra health | `/health` JSON plus an HTML health page (`core/health-page.ts`); scheduler summary with counts, next fire, recent failures (`scheduler/health.ts`); MCP peer health. | `/api/health` with surface statuses (web, Slack, MCP). | **Adopt (small).** Extend health with worker liveness, queue depth, running and waiting Job counts, and last heartbeat times; render an operational view in the product. | J3 |

Explicitly deferred, recorded once: Telegram, email, Discord, webhook channels; public shareable pages; multi-tenancy; VM provisioning; seven model providers; magic links; agent fleets. Rejected permanently: LLM judge validation (ADR-005 records why), host Docker socket access, silent jobification of conversations.

## Why Saaya currently feels like a chatbot

Saaya's substrate is ahead of its surface. It has durable threads, one identity across three channels, provenance-backed memory with reversible learning, approval-gated tools, and a heartbeat, and all of it is real. But every capability is expressed through one shape: a message arrives, a turn streams, a reply lands. Nothing in the product can hold work that outlives a turn. There is no object that carries a goal, no plan a user can watch move, no workspace where files accumulate, no artifact to open later, no approval to grant, nothing to come back to. The transcript is the only container, so however good the internals are, the experience reads as chat.

Phantom's README names the ambition (a co-worker with its own computer) and Rendi names the mechanism (the session as an inbox that user, background work, and schedules all write into). Saaya has the inbox and is missing two of the three writers.

## The smallest architecture that changes the truth

One durable entity, one ledger, one worker loop, one panel:

1. **`jobs`**: id, thread_id, goal, state, budgets, workspace path, timestamps. States: `draft`, `queued`, `planning`, `waiting_approval`, `running`, `paused`, `blocked`, `retrying`, `failed`, `cancelled`, `completed`. Completion is a recorded transition with evidence, never an inference.
2. **`job_events`**: append-only (job_id, seq, at, actor, type, payload). Every transition, plan, step, tool call, approval, artifact, and failure is one row. The UI renders the ledger; nothing renders that is not in it.
3. **A checkpointed runner**: a LangGraph graph (plan, execute steps, finish) with its own checkpointer namespace, stepping under budgets, writing events as it goes, executing inside the Job's contained workspace directory. Worker restart resumes from the checkpoint.
4. **The workbench panel**: the Rendi-style conversation-owned surface rendering the Job's plan, live events, files, artifacts, and approvals beside the transcript.

Everything else in the directive (approvals, artifacts, schedules, dashboard, health) attaches to these four without rework, which is what makes this the smallest honest slice.

## API contract (first slice)

```
POST   /api/jobs                 {goal, thread_id?}            -> JobInfo (state=queued)
GET    /api/jobs                 ?state=&limit=                -> [JobInfo]
GET    /api/jobs/{id}                                          -> JobDetail (job + events + artifacts)
GET    /api/jobs/{id}/events     ?after_seq=  (SSE)            -> live ledger tail
POST   /api/jobs/{id}/cancel                                   -> recorded transition
POST   /api/jobs/{id}/retry                                    -> recorded transition (from failed)
POST   /api/jobs/{id}/approvals/{approval_id}  {decision}      -> recorded decision   (J2)
GET    /api/jobs/{id}/artifacts/{artifact_id}                  -> artifact content    (J2)
```

`JobInfo`: id, thread_id, goal, state, created_at, updated_at, workspace, budget fields, last_event_seq. `JobDetail` adds the ordered event list. Wire events for the SSE tail reuse the ledger rows verbatim: what is persisted is what streams.

## Migration sketch (first slice)

```
jobs:        id uuid pk, thread_id text null, goal text not null,
             state text not null default 'queued', error text null,
             step_budget int not null default 12,
             wall_clock_budget_s int not null default 600,
             workspace text not null,
             created_at, updated_at, started_at null, finished_at null
job_events:  id bigserial pk, job_id uuid fk, seq int not null,
             at timestamptz not null, actor text not null,
             type text not null, payload jsonb not null default '{}',
             unique (job_id, seq)
```

Artifacts and approvals tables land with J2 alongside their endpoints; schedules with J3. Alembic guard rules unchanged: never touch LangGraph-owned tables.
