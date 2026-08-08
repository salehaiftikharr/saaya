---
id: P-022
title: Final verification matrix and honest gate exits
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - verification
  - ci
related:
  - journal/progress/P-021-status-e2e-social.md
supersedes: []
---

# P-022: Final verification matrix and honest gate exits

## Matrix

Twelve rendered cells (/ and /about at 1440, 834, 390, each in light and
dark), horizontal-overflow probe on every cell: zero overflow issues.
Reduced-motion emulation confirms the echo trail's animation resolves to
none. Keyboard order re-verified earlier in the program (composer, then
sidebar navigation, all reachable).

## A process defect found by CI, worth recording

Commit 14eeda6 went red on two aria-label-without-role errors that local
lint had "passed": the local pipeline was `pnpm lint | tail -1; echo $?`,
which reports tail's exit code, not lint's. Local green was fabricated by
the shell, not earned by the code. Fixed the markup (role="status" on both
status spans, semantically right for a polling status region) and the
habit: gate runs use pipefail or direct exit codes, never a piped tail's.

## Verification

All gates green with honest exits (lint, typegen+tsc, 40 web tests with
axe, production build, server 66, privacy gate); pushed as ebb68a1 with the
CI run watched to conclusion.
