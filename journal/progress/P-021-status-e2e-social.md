---
id: P-021
title: Connection status, the live e2e ring, and the social asset
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - testing
  - brand
related:
  - journal/progress/P-020-composition.md
supersedes: []
---

# P-021: Connection status, the live e2e ring, and the social asset

## Work completed

- SurfaceStatus in the sidebar footer: one quiet dot per door (web, slack,
  mcp) from /api/health, polled every 30 seconds; a red Reconnecting state
  when the server is unreachable; a static-snapshot prop keeps stories
  hermetic (all-up, partially-off, reconnecting variants through the axe
  gate). Running tool chips now carry an accent border so in-flight work
  reads at a glance.
- Committed Playwright e2e spec (web/e2e/chat.spec.ts + playwright.config,
  pnpm test:e2e): send, streamed reply containing a unique marker, reload,
  transcript restored. Lives in the SAAYA_LIVE ring documented in AGENTS.md;
  verified both ways: passes in 3.7s against the real running stack, and
  skips itself entirely on default runs so CI stays hermetic.
- brand/saaya-social.png (1200x630): the mark with its echo shadow, the
  lowercase wordmark, and the tagline on the paper token, rendered from
  brand assets only (fictional-safe by construction); served as
  web/app/opengraph-image.png via the Next convention; BRAND.md updated.

## Verification

Web gates green (40 tests with axe, typegen+tsc, production build with the
OG image route); server 66; live e2e pass and skip both observed; CI check
follows this push. Prior push f1a8a5c confirmed green; the 19c49ec failure
was the role="group" biome error fixed by the fieldset change.

## Next step

Full-width matrix verification of / and /about, then the closing sweep
(dead code, README matrix, comprehensive handoff).
