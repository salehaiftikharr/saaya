---
id: P-034
title: "Phase handoff: the coworker directive, complete against its criteria"
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - handoff
  - jobs
  - workbench
related:
  - docs/research/jobs-capability-audit.md
  - docs/design/rendi-study.md
  - docs/design/deferred-scope.md
  - journal/progress/P-031-first-job-slice.md
  - journal/progress/P-032-demonstration-and-workbench.md
  - journal/progress/P-033-workbench-completion.md
supersedes: []
---

# P-034: Phase handoff, the coworker directive complete against its criteria

The combined Jobs and Rendi-workbench directive, checked line by line.
Commits, all CI-green in order: `a4da4fc` (audit, Rendi study, ADRs 003
through 010), `9f38d13` (Job slice: ledger, checkpointed runner, worker
recovery, Work view), `0bea009` (approvals, artifacts, command policy,
workbench, chat bridge), `e05980b` (live demonstration, conversation
surface refinements), `c1d5873` (echo job states, mobile workbench,
restore-archived, jobs health, SSE tail, README and /about, the 390px
overflow fix with new e2e proofs), plus this commit (restore preview
diff, tool rollback, shared health hook with offline mark wiring).

## Completion criteria, answered

- **No longer a generic chatbot.** A conversation owns a workbench; a
  substantial request becomes a durable Job with a visible plan, live
  ledger, contained workspace, approvals, and artifacts. Chat is the
  control surface, not the product.
- **Rendi-informed patterns, cohesively.** Conversation-owned panel with
  reveal-on-activity and close-wins, typed activity items with one prop
  grammar and honest interruption, merge-based recovery reads, state in
  an actor-attributed append-only log, composer as a state seat with
  draft preservation and focus handback, sidebar with instant search and
  status. Documented with license notes in `docs/design/rendi-study.md`.
- **A substantial request becomes a durable Job.** `start_job` from
  explicit asks in chat, thread-linked, never silent; `check_jobs` and
  thread-scoped `read_job_artifact` let the conversation use results.
- **Progress, tools, failures, approvals, artifacts visible.** The
  ledger renders in the workbench, the Work view, and the /about beat;
  refusals and budget stops are timeline rows, not log lines.
- **State survives refresh and full restart.** Proven three ways: kill -9
  mid-step with checkpoint resume and no re-executed completed steps
  (P-031), kill -9 while parked at an approval with the gate intact and
  no spurious recovery (P-032), and the UI reading identical state after
  reload because everything renders from persistence.
- **Restored conversations keep tool activity and results.** Transcript
  activities and the job ledger are both persisted; the interrupted
  predicate keeps dead turns honest.
- **History understandable without timestamps.** Semantic titles, source
  badges, job-state dots, calendar grouping, search, archive with
  restore; relative time is secondary metadata.
- **Composer handles streaming, stopping, retrying, reconnection.** Stop
  and retry live; per-thread drafts; a double-submit latch; the shared
  health hook drives offline and recovery states in the mark and footer.
- **Layout works across the matrix.** Viewport-locked shell with six e2e
  proofs including workbench scroll independence and phone-width
  no-horizontal-overflow; the sweep caught and fixed a real 390px clip.
- **Reduced motion and keyboard verified.** The cascade rule silences
  every mark state; new controls are native buttons and dialogs from the
  shared primitives; the axe gate runs over every story, and it has
  caught real contrast failures during this phase.
- **Personal data absent from public surfaces.** Every public example is
  the fictional Northstar and Atlas set; the privacy test still scans the
  tracked tree in CI.
- **Gates honest.** Server: ruff format, ruff check, pyright 0, 111
  tests. Web: biome, tsc, vitest with axe, production build, e2e 6 for 6
  twice. CI runs exactly these and is green on every hash above.

## Reproducing the demonstration

```console
docker compose up -d
cd server && uv run alembic upgrade head
uv run uvicorn --factory saaya.api.app:create_app --port 8000
cd web && pnpm dev
```

Open http://localhost:3000, start a conversation, and ask for a
background job in your own words (the demonstration used a release
readiness review over a small fictional fixture the job builds itself,
with an intentional failing check and git steps that require approval).
Watch the workbench reveal itself; approve the gated commands when the
amber card appears; kill the API mid-run (`kill -9 $(lsof -ti tcp:8000
-sTCP:LISTEN)`) and restart it to watch recovery; then ask Saaya what the
report says.

## Known limitations, stated

- One job executes at a time by design (ADR-009); queued work waits.
- An interrupted step re-runs from its beginning after recovery, and the
  ledger shows both attempts (at-least-once for the in-flight step).
- Command network isolation is policy (no network-capable argv on the
  allowlist), not a kernel namespace, and the docs say so.
- The rollback control appears only for tools with more than one version;
  the dev database currently holds a v1 tool, so the control was
  verified through its story and its endpoint rather than live.
- Deferrals live in `docs/design/deferred-scope.md` with revisit
  triggers; J3 schedules (ADR-010) are the next planned capability.
