---
id: P-018
title: Privacy correction and the privacy gate
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - privacy
  - security
related:
  - journal/progress/P-017-fixture-privacy.md
  - AGENTS.md
supersedes: []
---

# P-018: Privacy correction and the privacy gate

## What happened

Public-facing examples had been derived from the owner's private context, a
release-blocking privacy defect the owner flagged twice; the first scrub
(P-017) was incomplete and had no enforcement. This entry records the full
correction. Specific personal terms are deliberately not repeated here.

## Correction

- One reviewed fictional dataset now feeds every demonstration surface:
  web/lib/demo-fixtures.ts (Noor Rahman, product operations lead at
  Northstar Labs; the Atlas project; atlas.example on a reserved domain;
  teammates Maya Chen, Theo Brooks, Lina Park). The /about page and every
  story import from it; a module comment states the rule.
- Full-tree audit beyond the app surfaces: journal entries, server test
  fixtures, and package metadata scrubbed (authorship remains in git
  commits; files carry no personal contact details).
- Marketing and story surfaces are static and import fixtures only; they
  have no access path to live memory, conversation storage, or databases.
- Enforcement: web/lib/privacy.test.ts scans every git-tracked file for the
  known identifiers (patterns assembled from fragments so the gate never
  matches itself) and fails the suite on any hit. It immediately proved
  itself by catching three journal files the manual audit had missed.
- AGENTS.md now carries the non-negotiable privacy section.

## Git exposure assessment (honest)

The repository is PRIVATE on GitHub with a single collaborator. Personal
terms exist in pushed history between the commits that introduced fixtures
and the corrections (the window around 5577ac5, 8331a39, 7227db0, edd5228,
973cb07, 81533e5, plus journal entries in between). The current tree is
clean and gate-enforced. History has not been rewritten: that requires the
owner's explicit approval. Recommendation recorded for the owner: while the
repo stays private, exposure is limited to the owner's own account; before
any public release, either rewrite history with git filter-repo (requires
approved force-push) or publish from a fresh squashed init, and rotate
nothing since no credentials were involved.

## Verification

- Privacy gate green over the whole tracked tree; server 65 and web 36
  tests pass; lint, typecheck, and production build green.
- Rendered /about probe: fictional terms present (Atlas, Maya Chen,
  atlas.example), personal and environment terms absent.
