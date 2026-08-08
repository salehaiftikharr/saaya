---
id: P-012
title: Design elevation 2, continuity made visible
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - ui
  - memory
related:
  - journal/progress/P-011-type-foundation.md
  - docs/design/phantom-study-and-plan.md
supersedes: []
---

# P-012: Design elevation 2, continuity made visible

## Objective

Plan step 2: the product premise visible at rest, from real data; the echo
as the working language.

## Work completed

- GET /api/chat/{thread_id}/context: the memories nearest to where the
  conversation left off (recall over the last user message; surfacing
  reinforces deliberately, and the docstring says so). context_query helper
  with hermetic tests.
- ContinuityStrip: mark + eyebrow "Carried into this conversation" + up to
  three remembered items, rendered above restored transcripts only.
- EchoTrail replaces the generic skeleton while Saaya works: three staggered
  brand dots; prefers-reduced-motion renders the settled state; story
  includes a reduced-motion variant.

## Verification

- Gates: server ruff/pyright/pytest 63; web biome/tsc/vitest 31 with the
  axe gate; production build.
- Live: context endpoint returned the three real memories for the personal-context
  thread; browser screenshot shows the strip above the restored transcript
  in dark; the port-stealing pitfall from P-011 avoided by stopping the
  server container before host verification.

## Next step

Plan step 3: outcome-first rows with provenance collapsed beneath, serif
recap numerals, and the markdown-rendering debt folded in (raw asterisks
are visible in the verified screenshot).
