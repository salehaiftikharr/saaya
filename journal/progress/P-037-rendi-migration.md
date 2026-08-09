---
id: P-037
title: "The Rendi migration: Saaya's interface, rebuilt on its sibling's foundation"
type: progress
status: complete
created: 2026-08-09
updated: 2026-08-09
tags:
  - frontend
  - migration
  - rendi
related:
  - docs/design/rendi-study.md
supersedes: []
---

# P-037: The Rendi migration, and the morning handoff

The owner authorized a direct source-level port of Rendi's interface into
Saaya's operational app (Rendi is the owner's own MIT-licensed project;
attribution recorded in `docs/design/rendi-study.md`). The migration ran
overnight as four verified increments, all CI-green, with the backend
untouched.

## Commits

- `ea3c780` foundation: the ai-elements suite and shared primitives.
- `05b2eb3` shell: sidebar system, breadcrumb topbar, command palette.
- `1c71375` transcript and composer on the ported grammar.
- `c2e0805` workbench blocks with the ledger-derived plan.

## Rendi files reused (at `04d62d6`)

- `components/ai-elements/`: code-block, conversation, loader, message,
  prompt-input, reasoning, shimmer, tool. Adapted: ai-sdk type imports now
  point at the local `lib/ai-parts.ts` shim, and the tool state union
  gained an honest `interrupted` state for dead turns.
- `components/ui/`: sidebar, command, kbd, spinner, badge, collapsible,
  select, input-group, hover-card, button-group, breadcrumb. Used as
  shipped.
- `hooks/use-mobile.ts` as shipped.
- Structural patterns re-implemented against Saaya data: the app shell
  composition (SidebarProvider and Inset), sidebar header with the
  keyboard badge and collapsed-search item, the palette with its global
  shortcuts, the composer body and footer arrangement, and the workbench
  panel chrome (widen and close controls).

Deliberately not taken: the analytics cards (instrument, query-data,
dataset, pulse, commit-sync), the spatial canvas with camera and
gestures, charts, Rendi's Ember palette, fonts, wordmark, and all brand
copy.

## Saaya files replaced or retired

- `components/shell/app-sidebar.tsx`, `app-topbar.tsx`,
  `command-palette.tsx`: new, replacing the hand-rolled aside and the
  mobile history sheet. `components/chat/thread-list.tsx` and its stories
  are deleted; the sidebar absorbed grouping, search, source badges, job
  dots, rename, archive, and restore.
- `components/chat/chat-app.tsx`: rebuilt on the ported shell; scroll
  architecture, workbench reveal logic, echo state, and health wiring
  carried over intact.
- `components/chat/message.tsx`, `tool-activity.tsx`, `composer.tsx`:
  rebuilt on the ported Message, Tool, and PromptInput systems.

## Behavior added or corrected

- Command palette (cmd-K) with actions and conversation search; cmd-shift-O
  starts a new conversation; the sidebar collapses to an icon rail.
- Tool activity now shows measured durations for live turns (captured
  client-side at the wire events; restored transcripts carry no timing, a
  known gap noted below), one grouped card per tool with per-call
  disclosure, and interrupted states that never spin.
- Assistant messages gained hover copy controls. User turns always have a
  visible outcome: reply, running trail, error with retry, or job handoff.
- The composer gained correct IME composition handling (from the ported
  PromptInput), per-thread draft persistence through the prompt
  controller, an offline placeholder, and the ported submit and stop
  affordances.
- The workbench became blocks: a Plan checklist derived purely from the
  ledger (step dots for pending, running, done, failed), Artifacts,
  Outcome, and Progress (collapsed by default once complete), plus a
  persisted width toggle.
- Transcript density tightened (max-w-3xl, gap-4); the memory strip stays
  the compact one-line disclosure.

## Verification

- Gates: biome, tsc, 72 vitest story tests with the axe gate, production
  build, six e2e layout proofs (sidebar selector updated deliberately for
  the ported DOM), all green; server suite untouched at 117.
- Rendered: live streamed turn end to end through the new composer and
  transcript (the duration badge read 1ms on current_datetime), mobile 390
  with the sidebar sheet, dark theme across every surface, no horizontal
  overflow at 1440, 1280, 1024, 768, 390, or 360, reduced-motion guard
  confirmed in the stylesheet, /about intact after the shared-component
  changes.
- Screenshots in the session scratchpad: shell-migrated,
  transcript-migrated, workbench-blocks, mobile-sidebar-sheet,
  dark-migrated, live-turn-migrated, about-post-migration, with the
  pre-migration sweep set as the before shots.

## Remaining differences from Rendi, and why

- No per-conversation routes (`/c/[id]`): Saaya keeps its single-page
  state architecture; introducing routing mid-migration would have touched
  thread persistence and SSR behavior for cosmetic URL gains. Recommended
  as its own future increment.
- No transcript virtualization (`@tanstack/react-virtual`): Saaya's
  conversations are single-operator sized; worth adopting if transcripts
  grow to thousands of turns.
- No spatial board: the workbench is structured blocks over real job
  data by design (recorded in the study doc).

## Known limitations and pre-hosting follow-ups

- Restored transcripts lack tool timing; an additive pair of fields on
  `TranscriptActivity` (started and finished timestamps from the
  checkpointed messages, if available) would close it.
- The sidebar collapsed rail hides the archived section (reachable by
  expanding); acceptable, noted.
- The pre-hosting list from the go-live plan stands unchanged: the auth
  gate first, then Slack delivery of job results, then the deploy
  runbook.

## Inspect it

```console
cd server && uv run uvicorn --factory saaya.api.app:create_app --port 8000
cd web && pnpm dev
```

Open http://localhost:3000: cmd-K for the palette, a conversation with
jobs for the workbench blocks, the sidebar trigger at 390 wide for the
mobile sheet.
