---
id: P-032
title: The demonstration Job, end to end, on the real product surface
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - approvals
  - workbench
  - demonstration
related:
  - journal/progress/P-031-first-job-slice.md
  - journal/decisions/ADR-006-command-policy.md
  - journal/decisions/ADR-007-approvals.md
supersedes: []
---

# P-032: The demonstration Job, end to end, on the real product surface

Everything below happened live in the product, with the real model, no
static fixtures: chat-created Jobs on the fictional Atlas fixture, a
controlled failure, recovery, policy refusals, approval gates that really
withhold execution, artifacts, two kill -9 restarts, and a conversation
that reads its job's results.

## The demonstration, requirement by requirement

Job one (`f3780c5d`, created by the chat agent via `start_job` from an
explicit request; the workbench revealed itself beside the transcript):

- Built the fixture, ran `python3 checks/run_checks.py`, and hit the
  controlled pricing failure: `command_executed` with exit 1 in the ledger.
- Tried `pwd` along the way; the allowlist refused it and the refusal is a
  visible `policy_refused` timeline row. The boundary demonstrated itself
  unprompted.
- Fixed the bug, re-ran to exit 0, wrote and registered the
  release-readiness report artifact.
- Requested approval for `git init` and parked in `waiting_approval`.
  **The API was then killed with kill -9 while parked.** After restart:
  still parked, approval intact, no spurious recovery event (parked jobs
  are deliberately outside the stranded scan). Approved through the
  workbench; the job resumed and completed.

Job two (`ddcefa2d`) closed the loop the first run exposed: on a step
re-run after approval, a fresh executor invocation did not know a decision
had landed and skipped the gated command, leaving the approval unconsumed.
Fix: the executor now receives approved-but-unconsumed commands as explicit
context. With that in place the ledger shows the full enforcement chain
twice: `approval_requested`, decision by the user, `approval_accepted`,
then `command_executed` exit 0, for both `git init` and `git add .`; both
approvals consumed; `git status` ran ungated as read-class; a real `.git`
exists in the contained workspace.

Conversation continuation: asked in the same thread for the report's
takeaways; the agent used `check_jobs` and the new thread-scoped
`read_job_artifact` (an artifact is readable only from the conversation
that owns its job, tested) and answered from the artifact's actual content.

The mid-execution restart proof remains P-031's `d3a42152`: killed during
step 3, `job_recovered` on boot, completed steps never re-executed.

## The product taught itself

Before the fix round, the chat agent answered honestly but wrongly that
jobs cannot pause for approval, because nothing had told it. Tool
descriptions now carry the truth (isolated workspaces, approval pauses,
resume semantics), and the agent's next turn described the system
correctly. The gap and the fix are both in the transcript.

## Workbench and refinement increments in this commit

- The conversation-owned workbench panel (Rendi-adapted): reveals on job
  activity, close wins per thread, renders status, collapsible goal,
  pending approvals with previews and working decide buttons, artifacts
  that open rendered in place, and the persisted timeline.
- Approvals and artifacts joined the Work detail view.
- The continuity card became a one-line collapsible strip: count plus
  preview collapsed, kinds on expansion; recalled memory no longer pushes
  the conversation down.
- Repeated tool calls collapse into one structured activity item with
  count, state, result preview, and per-call disclosure; a running item
  with no live stream renders as interrupted, never as an eternal spinner.
- Composer: per-thread draft preservation in sessionStorage, a
  double-submit latch, busy placeholder, focus handback after a turn.
- Thread rows carry a job-state dot (waiting amber, live pulse, failed
  red, completed quiet) with screen-reader text.
- Scrubbed command HOME moved to a workspace dot-directory and listings
  exclude dot-paths, so runtime cache noise stays out of the work product.

## Evidence

- Server: 109 tests green (approval flow through the real tool closures,
  rejection never executes, runner holds and resumes, artifact rows,
  thread-scoped artifact reads, policy verdicts, scrubbed-env canary).
  ruff format, ruff check, pyright 0.
- Web: biome, tsc, vitest 60 stories/tests with the axe gate (it caught a
  low-contrast count badge; fixed), production build.
- Screenshots in the session scratchpad: `demo-1-workbench-revealed.png`,
  `demo-2-approval-waiting.png`, `demo-4-result-continuation.png`,
  `work-list.png`, `work-detail.png`.
- Process defect fixed: killing the API with `lsof -ti :8000` also killed
  the Next dev server through its proxy connections; restarts now target
  the listener only (`-sTCP:LISTEN`).

## Tracked next

Echo mark job states (working, waiting approval, offline), mobile
workbench access, restore-archived, operational health view, /about and
README updates now that Jobs exist, the full viewport and reduced-motion
matrix, SSE tail adoption in the panel, restore-preview diff and tool
rollback buttons.
