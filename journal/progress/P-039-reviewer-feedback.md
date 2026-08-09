---
id: P-039
title: "Reviewer feedback, week tier: the checkpointer leak and its family"
type: progress
status: complete
created: 2026-08-09
updated: 2026-08-09
tags:
  - feedback
  - jobs
  - reliability
related:
  - docs/research/feedback-matrix.md
supersedes: []
---

# P-039: Reviewer feedback, week tier

The `saaya-feedback` package (Cheema's full end-to-end review against
`6af5640`) was read completely and converted into the traceability matrix
at `docs/research/feedback-matrix.md`. This entry records the week-tier
fixes (F1 through F5), each validated against the current tree before
action.

## FB-001 / F1, the checkpointer leak (P0)

Validated: 230 `execute:*` checkpoint_ns rows under `job:*` threads in
this machine's own Postgres confirmed the reviewer's mechanism exactly.
The per-step deep agent inherited the job graph's checkpointer through
LangGraph config propagation, so a step re-run after an approval resumed
its own concluded conversation and skipped the work.

Both prescribed fixes landed:

- The executor is compiled with `checkpointer=False`, so every step
  invocation is genuinely fresh.
- Owner decisions no longer depend on model compliance at all: the runner
  settles decided approvals deterministically before invoking the model.
  Approved argv is executed by code (`settle_decided_approvals`), the
  `command_executed` and `approval_accepted` events are appended, the
  decision is consumed, and rejections are recorded, consumed, and
  delivered to the model as a note. The false resume comment in the
  runner is gone; the comment now describes what actually happens.

Regression tests pin the exact observed failures: an executor that makes
zero tool calls on resume still yields exactly one `command_executed`
(the fabricated-success scenario), and the rejection path (which had
never executed in the running product, F19) is proven end to end.

## FB-002 / F2, fabricated success (P0)

The deterministic settle removes the main source. The job executor prompt
now carries the honesty law from the identity constitution ("never
fabricate facts, files, or results; a truthful failure is worth more than
a convincing success that did not happen").

## FB-003 / F3, the creates check (P1)

Runtime done-check moved from `is_file()` to `exists()`, so real
directory products validate. `parse_plan` rejects empty and
trailing-slash creates entries loudly at planning time, and PLAN_PROMPT
now tells the planner files-only with the git-init guidance. Dotfiles
like `.gitignore` remain legal (the dot-heuristic the review sketched
would have rejected them; the test suite documents the boundary).

## FB-004 / F4, buffered streams (P1)

Both SSE routes now send `Cache-Control: no-cache, no-transform` and
`X-Accel-Buffering: no`. Verified live through the Next dev proxy with
`Accept-Encoding: gzip`: frames arrive immediately and untransformed,
where before the compressor buffered them indefinitely.

## FB-005 / F5, the fresh-clone crash-loop (P1)

Workspace memory files are gitignored, so a fresh clone had none and the
reflection heartbeat crash-looped every five minutes. The product now
owns its required files: `memory/seed.py` writes neutral defaults for
`identity.md` and `how-i-work.md` at boot when absent (never
overwriting), and the reflection read tolerates absence as defense in
depth. Tests cover seeding, non-overwrite, and the tolerant read.

## The month tier and the presentation pass

The remaining confirmed items landed in two further increments. F6: a
fetch blip keeps the last-known sidebar and health recovery refreshes
it. F7: retry and stop live beside the workbench state badge. F8: the
bench blocks are controlled Collapsibles, and the app console is clean
with the workbench open on a completed job, exactly where the warning
used to fire. F10: the identity prompt now states the gate accurately.
F11: `uv run saaya` migrates and serves. F12: the adapter measures each
tool call by run id, a `tool_timings` table persists it by call id
(migration `233c09650a83`), history joins it, and live turns prefer the
server measurement. F13: failed turns read offline-aware copy when
health knows the server is gone. F14: `/health` answers, verified live.
F15: the job prompts moved to `jobs/prompts/*.md`. F17 was already
documented in `.env.example`.

Presentation and infra: the README's private-repo falsehood is fixed,
a four-line scan block sits under the hero, the two golden commands
lead Run locally, and the Mermaid architecture flowchart is replaced by
a hand-crafted light and dark SVG pair (accent reserved for the
approval gate, mono annotations, previewed on GitHub's exact
backgrounds through a local mock, one zoom-caught collision fixed
before commit). Hero assets consolidated into `brand/`. Compose gained
a server healthcheck with web gated on it, and settings fail fast with
named keys at boot. The stranger's-eyes sweep over the public tree
found no personal identifiers.

## Evidence, final

Server 123 tests (10 new this phase), web 72, six e2e proofs, pyright
and biome clean, production build green. Migration from a truly empty
database creates all twelve tables and was run and cleaned up.
Rendered checks: workbench open with clean console, offline composer
state, recovery without reload. The F4 stream fix was proven live
through the gzip-requesting proxy.

## Blocked on the owner, recorded

The LICENSE decision (MIT recommended by the reviewer and previously
floated here), the `gh repo edit` metadata block from the feedback
package plus the social-preview upload, and the upstream issue filing
for the checkpointer discovery (the public artifacts should carry the
owner's voice and accounts).
