---
id: P-024
title: Conversation identity, history, and the live header
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - ux
  - backend
related:
  - docs/design/app-refinement-audit.md
supersedes: []
---

# P-024: Conversation identity, history, and the live header

## Objective

Refinement directive items 1-3: conversations get identities, history gets
structure and controls, the header tells the truth.

## Backend

- threads gains title (80 chars) and archived_at (Alembic dd09f3e2a779; an
  earlier empty autogenerate was caught by inspection, downgraded, and
  removed before the real one).
- Deterministic derive_title: user-authored text only, Slack mention markup
  removed, prompt prefixes stripped at word boundaries, seven-word target,
  word-boundary truncation with ellipsis, fallback New conversation. Twelve
  tests, three of which caught real bugs (prefix boundary, ellipsis eaten by
  rstrip, mention-token titles observed on the live Slack row).
- Titles are written once at creation on every surface (web chat route,
  Slack channel, MCP ask) and lazily backfilled for pre-title rows from the
  first eligible user message in the checkpointed transcript, then
  persisted; later messages never retitle (tested).
- GET /api/threads now lists every conversational surface with a source
  classification (web, slack-dm, slack-thread, mcp; scheduler and test
  namespaces excluded), PATCH rename, POST archive (hides from the list,
  keeps transcript and learning; consequences stated in the API docstring
  and the UI dialog). Server suite 81.

## Frontend

- ThreadList: search, calendar grouping (Today, Yesterday, Previous 7 days,
  Older; locale-aware, DST-safe by calendar-day arithmetic, invalid and
  future timestamps tested), title-primary rows with subdued recency and
  absolute-time tooltips, source badges for non-web threads, hover- and
  focus-revealed overflow menu, rename dialog, archive confirmation.
  relativeTime rewritten with floor arithmetic after a test proved "1m ago"
  was unreachable under rounding.
- The axe gate caught active-row metadata contrast below threshold; fixed
  with a stronger tone on selection.
- Header shows the conversation title plus a live state (Thinking or Using
  a tool, from real streaming activity); mobile gains a conversation drawer
  (sheet) with the same list.

## Verification

Server: ruff, pyright strict, pytest 81. Web: biome, typegen+tsc, vitest 49
with axe, production build; honest exit codes throughout. Live: 17 real
threads backfilled with correct titles and sources on first list render;
the mention-markup fix re-derived the Slack row; search filters; header
shows the active title; before and after screenshots captured in the
session scratchpad (uncommitted, publication-safe).

## Next

Directive items 4-8: transcript composition, composer, connection-state
vocabulary, memory agency (correct, forget, supersede), tools lifecycle UX;
then the full matrix and the leak-focused tests.
