---
id: P-036
title: Container-stack recovery proven, and the axe gate reaches every new surface
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - containers
  - accessibility
related:
  - journal/progress/P-031-first-job-slice.md
  - journal/progress/P-035-schedules.md
supersedes: []
---

# P-036: Container-stack recovery proven, and the axe gate reaches every new surface

Two discretionary hardening items, both verified.

## Mid-run recovery in the containerized stack

The full profile (`docker compose --profile full up --build`) built with
all Jobs-phase code, migrated on boot, and served: health reported the
jobs worker running inside the container, and the compose file now sets
`JOBS_WORKSPACE_DIR` explicitly on the volume-mounted workspace.

The first restart attempt taught a lesson in honest verification: a
three-step probe job finished before `docker compose restart server`
landed (turn latency between detecting mid-run and issuing the restart),
so the ledger showed clean completion and no recovery, which proves state
survival but not mid-run recovery. The rerun removed the race by chaining
detection and restart in one server-side script: a five-step job, restart
issued within two seconds of the first step completing.

Verdict, from the ledger of `c9bde566`: step 3 was mid-flight at the
restart, boot recovery appended exactly one `job_recovered`, the
interrupted step re-ran, steps 1 and 2 never re-executed, every step
completed exactly once in the final tally, the job finished `completed`,
and all five note files exist in the volume-backed workspace. This is the
P-031 kill -9 property, now demonstrated under container SIGTERM
semantics in the deployable stack.

## Story coverage for the work surfaces

New Storybook stories, all on the fictional Atlas fixtures, so the axe
gate now covers every workbench component: the approval card in waiting,
approved, and rejected states; the artifact list with a report and a
patch; the job timeline with the full demo ledger and a
failure-and-refusal variant; and the state badge in every state. The gate
promptly earned its keep: the badge's quiet states (draft, queued,
paused, cancelled) used muted-on-muted tones that fail contrast, fixed to
secondary tones. Web tests: 65.

End-of-turn hygiene: no schedules enabled, the worker queue empty, the
dev environment restored (postgres-only compose plus host servers).
