---
id: P-014
title: Design elevation 4, motion with purpose
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - motion
related:
  - journal/progress/P-013-outcome-rows.md
supersedes: []
---

# P-014: Design elevation 4, motion with purpose

## Work completed

- User messages slide in via motion-safe animate-in utilities (tw-animate-css
  already in the stack); reduced motion renders instantly.
- A heartbeat row that arrives while the panel is open pulses exactly once
  (justArrived tracked against the latest seen run); keyframe disabled
  under prefers-reduced-motion; stories cover arrival and reduced-motion
  arrival.
- Confirmation feedback via sonner (shadcn CLI): "Memory change reverted"
  with the recorded-version description, tool approve/disable toasts, and
  "Connection interrupted" with a continue hint on the chat failure path.

## Verification

Gates green: biome, tsc, vitest 35 with the axe gate, production build.
The echo trail (P-012) already carried its reduced-motion story; increment
6's matrix re-verifies every motion state in the browser including reduced
motion.

## Next step

Plan step 5: the /about narrative page from real components.
