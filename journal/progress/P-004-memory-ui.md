---
id: P-004
title: Memory panel in the web app
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - phase-3
  - ui
  - memory
related:
  - journal/progress/P-003-memory-and-reflection.md
supersedes: []
---

# P-004: Memory panel in the web app

## Objective

Make memory inspectable and reversible from the product surface: procedural
files, version history with restore, and remembered items with provenance.

## Work completed

- lib/memory-api.ts mirroring the memory API models.
- Memory components with colocated stories: SemanticItemRow (kind badge,
  confidence, reinforcement), VersionRow (current marker, Restore action),
  ProceduralFileCard (protected badge with lock), MemoryPanel (loading,
  error, and empty states; rollback wired to the API with reload).
- Sidebar navigation between Chat and Memory views in ChatApp.

## Verification

- Gates green: biome, tsc, vitest 21 passed (8 files) including the axe
  accessibility gate on all memory stories.
- The axe gate caught a real violation (list items rendered outside a list
  in stories); fixed with list decorators reflecting real app context.
- Live in the browser via Playwright MCP: panel shows the real learned
  bullets, identity.md marked protected, version history v1-v4 with current
  marker; verified in light and dark themes.

## Open risks

Restore has no confirmation step yet; acceptable while single-user, worth an
interrupt-style confirm when approvals land.

## Next step

Saaya's first durable heartbeat: reflect over recent conversations on a
schedule, idempotent, overlap-guarded, silent when nothing happened, with
run history in the UI.
