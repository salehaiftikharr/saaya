---
id: P-033
title: Workbench completion, mobile truth, and the story catching up
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - workbench
  - mobile
  - health
  - marketing
related:
  - journal/progress/P-032-demonstration-and-workbench.md
  - docs/design/deferred-scope.md
supersedes: []
---

# P-033: Workbench completion, mobile truth, and the story catching up

The remaining workbench-directive items, each verified in the rendered
product.

## Shipped in this increment

- **Echo mark speaks for jobs.** Three new states join the motion grammar
  (documented in `brand/MOTION.md`): `working` is a slow sustained bob,
  `waiting-approval` reaches apart once and holds (waiting is a still
  state, no loop), `offline` fades without motion. The sidebar mark now
  reads the conversation's job activity: streaming turns win, then waiting
  beats working beats idle. Reduced motion silences all of it by the
  existing cascade rule. Offline exists in the grammar and stories; its
  auto-wiring is a recorded deferral until SurfaceStatus's health state
  becomes a shared hook.
- **Mobile workbench.** A briefcase trigger with a live status dot (amber
  when a job waits on you) opens the workbench as a right-side sheet:
  state, goal, approvals with working decide buttons, artifacts, and the
  ledger, with the conversation untouched behind it.
- **Restore archived.** `POST /api/threads/{id}/restore` inverts archive
  (nothing was deleted, nothing is rebuilt), `GET /api/threads/archived`
  lists what is parked, and the sidebar gains a quiet Archived disclosure
  with per-row Restore. Roundtrip tested.
- **Operational health.** `/api/health` now reports the jobs worker
  (running or off), queued, live, and waiting counts; the footer status
  gains a jobs chip (amber when waiting on you), and the Work view leads
  with a one-line operations strip.
- **The SSE tail replaced polling in the bench.** Each persisted ledger row
  arriving on `/api/jobs/{id}/events` triggers one snapshot refresh;
  dropped streams reconnect with backoff; terminal jobs close cleanly on
  `end_of_stream`. What renders is still only what persistence returns.
- **The story caught up with the capability.** README states the Jobs
  capability with the evidence rows (kill -9 recovery, approvals that
  withhold execution, artifacts) and /about gains beat 03, Delegate: a
  fictional Atlas job told entirely through the product's own ledger
  components (state badge, decided approval card, timeline), plus a Jobs
  anchor, a hero proof chip, a trust-matrix row for job workspaces, and an
  architecture item for checkpoint resume. All fixture data is the
  fictional Northstar/Atlas set; the privacy gate still covers the tree.

## The sweep found a real break

At 390px the transcript clipped instead of wrapping: `main` is a flex
child and had no `min-w-0`, so the tool-activity rows' intrinsic width
propagated and held the column at 672px inside the viewport-locked shell,
which clips rather than scrolls. Fixed with `min-w-0` on `main` and
`w-full` on the transcript column. Two new always-on Playwright proofs
pin it: workbench-open scroll independence at 1440 (the document still
never scrolls; the bench scrolls without moving the transcript) and a
phone-width no-horizontal-overflow assertion with tool activity present.
Two scroll-timing flakes under parallel workers were settled with explicit
waits for the follow-the-stream autoscroll. The e2e suite is 6 for 6,
twice in a row.

## Evidence

- Server: 111 tests (archive-restore roundtrip and job counts joined),
  ruff, pyright 0. Web: biome, tsc, vitest, production build, e2e 6/6
  twice. Health verified live: worker running, jobs chip idle, archived
  listing returning the 12 parked dev conversations.
- Screenshots in the session scratchpad: `about-jobs-beat.png`,
  `sweep-1440.png`, `sweep-390-fixed.png`, `sweep-390-bench-sheet.png`.
- `docs/design/deferred-scope.md` records every deliberate absence with
  its revisit trigger; P-032's test count corrected to 109.

## Tracked next

Restore-preview diff dialog and tool rollback buttons (endpoints exist),
offline mark wiring through a shared health hook, dark-theme and
keyboard-order spot checks on the new surfaces, and the J3 schedule phase
when the directive calls for it.
