---
id: P-013
title: Design elevation 3, outcomes first
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - design
  - ui
related:
  - journal/progress/P-012-continuity.md
  - docs/design/phantom-study-and-plan.md
supersedes: []
---

# P-013: Design elevation 3, outcomes first

## Objective

Plan step 3 plus two tracked debts: every operational row leads with what
happened for the user; markdown renders; restore asks first.

## Work completed

- streamdown renders assistant messages (chosen over react-markdown because
  it is built for incomplete markdown mid-stream); user bubbles stay plain;
  markdown story added.
- Outcome-first rows: semantic items lead with the remembered sentence and
  collapse "Where this came from" (kind, date, use count, confidence);
  heartbeat rows lead with sentences like "Saaya looked at recent work;
  nothing needed to change" over a collapsed run record; version rows lead
  with "Saaya learned from a conversation" / "A memory change was reverted"
  over the change record. Mapping functions exported and story-covered,
  including the quiet-run case.
- Memory panel opens with three recap tiles in the display serif:
  remembered count, version number ("every change reversible"), last
  heartbeat time.
- Restore now confirms via alert-dialog (shadcn CLI) with honest copy: the
  restore itself is recorded and reversible.

## Verification

- Gates: biome, tsc, vitest 33 with the axe gate, production build. (Two
  story failures during the run were a race with the formatter mid-write;
  clean rerun passed 33/33.)
- Live: recap tiles render real data (6 remembered, v6 current - v6 was
  applied autonomously by the overnight heartbeat); outcome sentences
  render; the confirm dialog opens with version-specific copy; markdown
  bold and lists render in the restored transcript with no raw asterisks
  (screenshot-verified; a leftover future-dated fake-clock heartbeat row
  found and deleted from the dev database).

## Next step

Plan step 4 purposeful motion, then step 5 the /about narrative page, then
the step 6 verification matrix. Debts still open: committed e2e spec,
thread list, social PNG.
