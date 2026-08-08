---
id: P-017
title: Fixture privacy scrub
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - privacy
  - design
related:
  - journal/progress/P-016-verification-matrix.md
supersedes: []
---

# P-017: Fixture privacy scrub

## Objective

Owner review of /about flagged personal information in committed fixtures.
Repo-committed examples must be anonymized; live product data in the
owner's private database is untouched.

## Work completed

All committed fixtures replaced with neutral stand-ins that keep the real
shapes and states: /about beats (deploy-on-merge context, release-notes
constraint, Thursday demo entity), continuity-strip stories, semantic-item
stories, procedural-file story, message markdown story; thread-id fragments
in fixtures genericized. The fixtures comment now states the policy: real
shapes, neutral details.

## Verification

- Source grep for the flagged personal terms across app/about and
  components: zero matches.
- Rendered-page probe for the same terms on /about: empty. Light-theme
  screenshots reviewed (this pass also completes the /about light-theme
  check from P-015).
- Gates: biome, tsc, vitest 35 with axe, production build.
