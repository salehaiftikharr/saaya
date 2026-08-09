---
id: P-038
title: The repository learns to present itself
type: progress
status: complete
created: 2026-08-09
updated: 2026-08-09
tags:
  - documentation
  - brand
related:
  - docs/design/rendi-study.md
  - docs/design/deferred-scope.md
supersedes: []
---

# P-038: The repository learns to present itself

The owner asked for Rendi-class repository presentation with Saaya's
identity and only verifiable claims. Everything below was cross-checked
against the code, the tests, and the recorded demonstrations before being
written down.

## Created and changed

- `README.md`: rewritten in full. Hero lockup (new
  `docs/assets/hero-light.svg` and `hero-dark.svg`, composed from the
  existing brand mark and wordmark system, served through a
  theme-aware picture element), verified badges only (no license badge,
  none exists), and the narrative: the idea, verified demonstrations, the
  Saaya contract, the job system with a Mermaid lifecycle, the workbench
  with a real screenshot, memory, the three doors, tools, heartbeats and
  schedules, a Mermaid architecture diagram with a layer table and an
  honest statement of what LangChain provides versus what this repository
  implements, the not-a-chatbot comparison, security boundaries, run
  locally, the five-minute demo pointer, gates with counts labeled as the
  latest verified run (117 server, 72 web, 6 e2e, generated at writing
  time), repository structure, deployment pointer, contributor pointers,
  limitations, and the license status.
- `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`: new. Security
  reporting goes through GitHub private vulnerability reporting because
  no public email is verified in this repository; the code of conduct
  adopts the Contributor Covenant by reference with the same
  GitHub-native reporting path.
- `docs/ARCHITECTURE.md`, `docs/DEMO.md`, `docs/SECURITY-MODEL.md`: new.
  `docs/deployment.md` renamed to `docs/DEPLOYMENT.md` and extended with
  the runtime requirements the jobs era added: exactly one server
  process, persistent workspace storage, automatic migrations, the env
  catalog, and the pre-production authentication blocker.
- `docs/assets/workbench.png`: a real screenshot of the product rendering
  only the fictional Atlas dataset (network-mocked state: an approval
  waiting, plan checklist, artifact, ledger). No live data appears.

## Verification

- Every relative link and image path in the eight public documents
  resolves (scripted check).
- The privacy gate ran green inside the web suite; the tracked tree
  carries no personal identifiers.
- Counts in the README were generated immediately before writing and are
  labeled as the latest verified run.
- All commands documented in Run locally and the demo are the same ones
  exercised throughout this project's journals.

## Decisions recorded for the owner

1. **License**: none is chosen. No LICENSE file was created and no
   license is claimed anywhere; the README states all rights reserved
   pending the decision (MIT was previously floated). This is the one
   blocker for opening the repository.
2. **Public contact**: no verified public email exists in the
   repository, so security and conduct reporting use GitHub's private
   flows. If a dedicated address is wanted later, SECURITY.md and
   CODE_OF_CONDUCT.md each need a one-line change.
