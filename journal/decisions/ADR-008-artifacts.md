---
id: ADR-008
title: Artifacts as immutable, workspace-backed records
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - data-model
related:
  - journal/decisions/ADR-003-job-model.md
  - journal/decisions/ADR-004-job-workspace-boundary.md
supersedes: []
---

# ADR-008: Artifacts as immutable, workspace-backed records

## Decision

An **artifact** is a durable, named output of a Job: an `artifacts` row
(id, job_id, workspace-relative path, kind, title, content_type, size,
created_at) pointing at a file inside the Job's workspace, announced by an
`artifact_created` event.

- Artifacts are created by the runner registering a workspace file it
  produced (a report, a patch, a table export). Registration validates the
  path with the ADR-004 guard and snapshots size and content type.
- Artifacts are immutable as records: producing a revised report creates a
  new artifact; the ledger shows the succession. The underlying file is not
  rewritten after registration.
- `GET /api/jobs/{id}/artifacts/{artifact_id}` serves content through the
  authenticated API with the same path guard. There are no public share
  URLs in this phase (deferred with the rest of the public-surface scope).
- The workbench renders artifacts as typed blocks: markdown reports
  rendered, patches as diffs, everything else as a named download.

## Context

Phantom serves whatever the agent wrote on its VM as public pages behind
magic-link auth; useful, but nothing ties an output to the run that made it.
Rendi's instruments stay bound to the conversation and its log. Saaya binds
every output to the Job and the event that produced it, because provenance
is the product's spine: an artifact you cannot trace is a claim, not
evidence.

## Consequences

- Restart survival for outputs is inherited from the workspace plus the
  table; the demonstration reopens a Job after a stack restart and the
  artifact is still there, byte-identical.
- Retention is one policy for the workspace directory and its rows, decided
  by the owner, never automatic.
