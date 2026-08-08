---
id: P-019
title: CI green from a fresh clone, and the conversation shell
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - ci
  - design
  - ui
related:
  - journal/progress/P-018-privacy-correction.md
supersedes: []
---

# P-019: CI green from a fresh clone, and the conversation shell

## CI root cause

Every web CI job since the first push had failed on one error: LayoutProps
is a Next-generated global, created only after a dev server or build runs,
and CI ran typecheck before any build. Local runs passed because .next/
already existed, so "green locally means green in CI" was never actually
true, and run results were never watched after pushing. Fixes: typecheck is
now "next typegen && tsc --noEmit" (verified locally from a deleted .next,
reproducing then clearing the exact CI failure), and watching the run after
push is part of the loop.

## Conversation shell (owner critique items 5, 6, 7)

- GET /api/threads over the thread registry, web-namespace only (bare-uuid
  ids; slack:, mcp-, sched: stay in their surfaces), with a
  namespace-exclusion test.
- Sidebar Conversations list: relative-time entries, active marker via
  aria-current, switching loads transcript and continuity through the same
  loader the resume path uses.
- Footer decrowded to one line plus an About link; empty state gains three
  starter suggestions (fictional-safe copy) that genuinely send.

## Verification

Server 66 tests; web gates green (lint, typegen+tsc, 36 tests with axe,
production build). Live: 14 real conversations listed, switch verified with
transcript and active marker, screenshots reviewed in light theme; the
stale-server pitfall (old uvicorn without the new endpoint) caught and
resolved by restart before concluding anything.
