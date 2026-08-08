---
id: P-030
title: Memory agency, tool evidence, and the product-experience handoff
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - memory
  - tools
  - handoff
related:
  - journal/progress/P-029-item8-and-sweep.md
supersedes: []
---

# P-030: Memory agency, tool evidence, and the product-experience handoff

## Memory agency (the refinement queue's last major item)

- memory_items gains forgotten_at; dynamic_tools gains last_used_at and
  last_outcome (Alembic f9a10b37e3c4; another premature empty autogenerate
  was caught and removed before the real one - the recurring lesson is to
  edit models before generating).
- Store: forget() removes an item from recall and listing while keeping
  the row privately; supersede() creates the correction, links the old row
  to it as the audit trail, and retrieval follows only the replacement.
  Both proven by retrieval-exclusion tests (server suite 85).
- Endpoints: forget, supersede, and version snapshot content (for restore
  previews). UI: each remembered thing carries hover-revealed Correct and
  Forget actions with consequence-stating confirmations; plain-language
  intros on the memory sections; the protected identity card now explains
  why it has no edit control. Tool rows state where they are available,
  that drafts run nowhere until approved, and their last use and outcome
  (recorded by the runner).
- Nothing automatic touches her real memories; every action is explicit,
  confirmed, and non-destructive.

## Rendered verification

Memory view: both intros, the protected explanation, and seven action
menus present against real data; Tools view shows the availability and
usage line. Screenshot in the scratchpad.

## Product-experience goal: handed off

With items 8 and 9 verified (P-029) and this increment closing the queued
memory-agency and tool-evidence work, the product-experience goal is
complete. Remaining niceties recorded, not hidden: the restore-preview
diff dialog (endpoint now exists; UI wiring pending) and a Rollback button
on tool rows. Both are small and tracked for the next pass.

## Next phase

The Jobs directive (coworker, not chatbot) begins: capability-gap audit
against Phantom's current source, then ADRs, then the smallest durable Job
slice. The full directive is preserved in working memory.
