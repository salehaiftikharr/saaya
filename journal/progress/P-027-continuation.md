---
id: P-027
title: Titles, restored tool activity, dev-thread hygiene, mark verification
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - ux
  - backend
related:
  - journal/progress/P-026-scroll-model.md
supersedes: []
---

# P-027: Titles, restored tool activity, dev-thread hygiene, mark verification

## Work completed

- Title quality: command-like prompts now keep only their first clause when
  it stands alone ("Reverse_text the word probe6" instead of the full
  request); the clause split respects decimals ("release notes for 2.1"
  survives, caught by an existing test); fourteen title tests green.
- The invisible-tool mystery: restored transcripts only ever carried text,
  so a reopened conversation showed a request and an answer with no work
  between them. to_transcript now attaches tool calls and their result
  previews to the assistant turn that produced them (matched by call id),
  and the client maps them to done-state chips. Verified live: the probe6
  thread now restores with its reverse_text activity and output.
- Development-thread hygiene without data loss: twelve of my development
  probe conversations were archived through the product's own reversible
  archive API (titles listed in the journal history); five real
  conversations remain. The mechanism decision: manual archive is the
  filter; nothing automatic ever touches user history.
- Mark state verification: a rendered probe confirmed all nine echo states
  resolve to their documented animations (listening animates the body,
  failure is static at reduced opacity), alongside the existing
  reduced-motion story and cascade rule.

## Gates

Server: ruff, pyright strict 0, pytest 83. Web: biome, typegen+tsc, vitest
58 with axe, production build, layout spec 3/3.
