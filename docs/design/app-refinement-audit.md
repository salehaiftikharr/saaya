---
id: DES-002
title: Application refinement audit and plan
type: research
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - ux
related:
  - docs/design/phantom-study-and-plan.md
supersedes: []
---

# Application refinement audit and plan

Rendered audit (Playwright, 1440/834, screenshots in the session scratchpad
as audit-before-*.png; publication-safe because they are not committed).

## The five highest-impact UX failures, with evidence

1. Conversations have no identity. The sidebar renders sixteen rows reading
   only "13m ago / 2h ago / 6h ago / 8h ago ..." (probe output, desktop
   screenshot). Nothing distinguishes one thread from another without
   opening it. Root cause is the data model: the threads table has no title
   column, so no amount of frontend formatting can fix it.
2. The header wastes its position on a static word. It reads "Ready" at
   rest and communicates neither which conversation is open nor what Saaya
   is doing beyond a binary Working flag.
3. History has no structure or controls: no grouping by day, no search, no
   rename, no way to retire a conversation; only web threads are listed, so
   Slack and MCP conversations are invisible in the product.
4. The transcript floats in space: max-w-2xl content inside a full-bleed
   canvas with uniform gaps, tool chips visually detached from their turn,
   no copy affordance, auto-scroll that would drag a reader to the bottom
   during streaming.
5. Operational surfaces under-communicate: status dots without state
   vocabulary or last-check time, About squeezed beside them; the memory
   page offers no agency (no correct/forget/supersede); the tools page is
   one floating card with no lifecycle explanation or usage evidence.

## Backend before frontend

Titles, archive, and source labels require schema and API work: threads
gains title and archived_at (Alembic); title derives deterministically from
the first eligible user-authored message only, set at creation on every
surface and lazily backfilled for existing rows; list gains source
(web, slack-dm, slack-thread, mcp), rename, and archive. Memory agency
requires forgotten_at plus a supersede flow that keeps the audit trail out
of retrieval. Tool usage evidence requires last-used columns written by the
runner.

## Increments

A: titles end to end (schema, derivation with tests, all-surface creation,
backfill, rename/archive, grouped searchable sidebar, live header). B:
transcript and composer refinement. C: connection-status vocabulary and
About relocation. D: memory agency (correct/forget/supersede) and tools
lifecycle UX. E: verification matrix and the focused test set.
