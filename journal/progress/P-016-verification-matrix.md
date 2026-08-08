---
id: P-016
title: Design elevation 6, the verification matrix
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - verification
related:
  - journal/progress/P-015-about-page.md
supersedes: []
---

# P-016: Design elevation 6, the verification matrix

## What the matrix ran

Playwright MCP across 1440/1280/834/390 x light/dark on / (populated with
the real personal-context thread) plus /about at 390 and 1440; reduced-motion emulation;
keyboard tab order (composer then sidebar nav, all reachable); screenshots
captured per cell.

## What it caught, and the fixes

1. Release blocker: below md there was no navigation at all (sidebar is
   hidden and nothing replaced it). Fixed with icon nav in the header
   (mark, New conversation, Memory, Tools; aria-labels and pressed state),
   verified visible and working at 390 in both themes.
2. Recap tiles cramped at 390: now grid-cols-1 sm:grid-cols-3.
3. A real product bug, visible in the 390 memory screenshot: a heartbeat
   reflection had replaced how-i-work.md with the proposer's conversational
   output ending in a literal SKIP, and validation passed it. Root causes
   fixed deterministically: a structure invariant (every heading present
   before must survive; prose without the headings is rejected) and a
   SKIP-on-its-own-line guard in the proposer parse. Both covered by new
   hermetic tests (server suite 65). The file was restored via the product
   rollback (recorded as v7), proving the reversibility story end to end
   on a genuine incident.

## Verification

Server: ruff, pyright strict 0 errors, pytest 65. Web: biome, tsc, vitest
35 with axe, production build. Screenshots reviewed for the fixed 390 cells.

## Next step

Remaining debts (committed e2e spec, thread list, social PNG), README
matrix, final handoff.
