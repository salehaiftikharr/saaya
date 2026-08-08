---
id: P-026
title: The application shell scroll model
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - layout
  - ux
related:
  - journal/progress/P-024-conversation-identity.md
supersedes: []
---

# P-026: The application shell scroll model

## Root cause

The outer shell used min-h-dvh, so the document itself grew and scrolled,
carrying the brand, navigation, and composer out of view while the mostly
empty canvas drifted. Region overflow rules could never fix that from
below.

## Correction

- The shell is h-dvh with overflow hidden: the document never scrolls.
- Sidebar: fixed brand/nav header, the conversation list as the single
  min-h-0 flex-1 internal scroller (native scrollbar, restrained but
  visible), fixed footer with bottom safe-area padding.
- Main pane: fixed header, the transcript as a min-h-0 ScrollArea, the
  composer anchored with safe-area padding; memory and tools panels scroll
  internally the same way.
- Mobile drawer: full-height internal scroll with a fixed header and
  visible close control; safe-area respected.

## Proof

- New always-on Playwright spec (e2e/layout.spec.ts, network mocked at the
  edge so it exercises layout only, webServer config added): document
  scrollHeight never exceeds the viewport; wheel over the sidebar moves
  only the list; wheel over the transcript moves only the transcript;
  brand, navigation, and composer stay in view after both; a two-message
  transcript has zero scrollable overflow; message 79 of 80 remains
  visible above the composer. Three tests, all passing in 2.6s.
- Rendered sweep at 1440x900, 1280x720, 1024x768, 768x1024, 390x844, and
  360x640 with real data: no document scrolling and no horizontal overflow
  in any cell; fixed regions verified visible after internal scrolling;
  sidebar-scrolled and mobile-drawer screenshots captured.

## Gates

biome, typegen+tsc, vitest 58 with axe, production build, and the three
new browser proofs; server suite untouched.
