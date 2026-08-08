---
id: P-025
title: Marketing pass 1, the frame and the living mark
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - marketing
  - brand
  - motion
related:
  - docs/design/marketing-comparison.md
  - brand/MOTION.md
supersedes: []
---

# P-025: Marketing pass 1, the frame and the living mark

## Comparison first

docs/design/marketing-comparison.md records the rendered Phantom/Saaya
comparison and ranks five gaps: no navigation, no actions, no motion, an
unconvincing hero, and a false claim plus missing landmarks.

## Work completed

- Truth: the open-source claim is gone; the closing states the reality
  ("runs in your own environment... stays yours, and stays reversible").
- The echo motion system: nine documented states (brand/MOTION.md) on one
  shared EchoMark component used by the app shell and the story page.
  Shadow physics only: the echo follows, wanders, stretches, catches up
  and settles on success, compresses when reconnecting, dims on failure;
  idle drifts under half a pixel. CSS transforms only, no libraries;
  reduced motion renders settled geometry via a cascade-order rule (biome
  rejected the important shortcut and the cascade fix is cleaner); hidden
  tabs pause all of it; nine stories through the axe gate.
- The app's sidebar mark is now state-driven (idle, thinking, tool) from
  real streaming activity.
- Product frame on /about: announcement strip carrying a true statement,
  sticky header that elevates on scroll (original composition), anchor
  navigation to Product/Memory/Channels/Tools/Control, Open Saaya CTA,
  mobile menu sheet; hero gains the concrete subtitle, a CTA pair, and a
  five-capability proof strip; a real closing conversion section with the
  success-state mark settling into place.

## Verification

Gates green with honest exits: biome (after removing an important), tsc via
typegen, vitest 58 with axe, production build; server suite untouched at
81. Rendered: header anchors navigate (scrollY probe), the mark animates at
rest, "open source" absent from the rendered body, hero and closing
screenshots captured in the scratchpad.

## Next

Marketing items 5-9: expanded proof (full tool lifecycle, Slack handoff,
MCP permissions, restore preview), trust and architecture landmarks,
getting-started, copy audit, Lighthouse; then the queued app-refinement
increments B-F.
