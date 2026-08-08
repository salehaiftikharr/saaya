---
id: P-011
title: Design elevation 1, the type foundation
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - ui
related:
  - docs/design/phantom-study-and-plan.md
supersedes: []
---

# P-011: Design elevation 1, the type foundation

## Objective

Plan step 1: the two-register type system live in the app.

## Work completed

- Fraunces (variable, opsz/SOFT/WONK axes) added via next/font as the
  display voice; .type-display, .type-eyebrow, and .type-recap-numeral
  utilities in globals.css with the scale from the design doc.
- Empty state re-set in the display voice with continuity copy ("The
  coworker that stays..."); memory and tools panel headings moved to the
  mono eyebrow register. Display serif appears nowhere inside dense rows.

## Verification

- Gates: biome, tsc, vitest 27 with axe, production build.
- Rendered verification (found the port stolen by the stopped web
  container first; dev server re-bound): computed styles confirm h1
  Fraunces 36px weight 420 and panel h2 Geist Mono 11px uppercase 0.88px
  tracking; screenshots reviewed in dark; light re-check rides the next
  increment's matrix pass.

## Next step

Plan step 2: continuity strip from real recall data and the echo
working-trail. Then outcome-first rows (step 3).
