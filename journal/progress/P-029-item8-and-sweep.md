---
id: P-029
title: Streaming behavior finished and the acceptance sweep
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - ux
  - verification
related:
  - journal/progress/P-028-proof-depth.md
supersedes: []
---

# P-029: Streaming behavior finished and the acceptance sweep

## Item 8, verified against real state

- Sends are abortable: a Stop control replaces Send while streaming, and
  aborting writes the honest terminal row "Stopped. The reply ends here";
  verified mid-stream against the live model.
- Failed or stopped turns carry a Try again action that resends the last
  user text as a new attempt; the failed exchange stays visible.
- Readers who scroll away are never dragged down during streaming
  (verified live); a Jump to latest control returns them and hides at the
  bottom - proven deterministically in the layout spec against mocked
  overflow (4/4 browser proofs).
- The composer grows with content to a capped height, shows the
  Enter-to-send hint, and guards duplicate submission.

## Item 9, the acceptance sweep

- 24 rendered cells (both surfaces, six viewports 1440 to 360, both
  themes): zero horizontal overflow, zero personal terms on the public
  page, zero open-source claims anywhere.
- Reduced motion: every echo-part animation resolves to none.
- Keyboard on the story page: brand, then each nav anchor in order, then
  Open Saaya.
- Performance treated diagnostically: dev-server DCL 52ms, ~7KB
  transferred on a warm reload; a full Lighthouse run is not available in
  this environment and is recorded as the honest limitation.
- Gates: server 83; web biome, typegen+tsc, vitest 58 with axe, production
  build, layout proofs 4/4; privacy gate green in the suite.

## Remaining, tracked

Memory agency (correct, forget, supersede with retrieval exclusion) and
tools lifecycle polish (last used, rollback in UI) stay queued from the
refinement directive; final screenshots live in the session scratchpad.
