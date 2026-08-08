---
id: ADR-004
title: Per-Job controlled workspace with path containment
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - security
related:
  - docs/research/jobs-capability-audit.md
  - journal/decisions/ADR-006-command-policy.md
supersedes: []
---

# ADR-004: Per-Job controlled workspace with path containment

## Decision

Every Job owns one directory, `<jobs_root>/<job_id>/`, created when the Job
enters `planning` and never shared between Jobs. `jobs_root` comes from
`JOBS_WORKSPACE_DIR` (defaults under the repo's `workspace/jobs/` in
development, a named volume in the container stack).

Containment rules, enforced in one guard module used by every file and
command tool the runner exposes:

1. Every candidate path is joined against the Job workspace and fully
   resolved (`Path.resolve()`, following symlinks) before use; the resolved
   path must sit inside the resolved workspace root or the operation is
   refused.
2. Absolute paths and `..` segments from model input are rejected before
   resolution even starts; rejection is cheap and the resolve check remains
   the backstop.
3. Symlinks may exist inside a workspace, but any operation whose resolved
   target escapes the workspace is refused, so a symlink is never an exit.
4. Size caps: a per-file write cap and a per-workspace total cap; exceeding
   either refuses the write.
5. Every refusal is recorded as a `policy_refused` job event with the
   attempted path, so denials are visible product behavior, not silent logs.

## Threat model

Assumed attacker: hostile text reaching the model (prompt injection in a
repository under inspection, in tool output, or in a user-pasted document)
that tries to steer tool calls. Defended: path traversal and symlink escape
out of the workspace, resource exhaustion via unbounded writes, secret
exfiltration via inherited environment (commands run with a scrubbed env,
ADR-006), and network egress by default (ADR-006). Out of scope in this
phase and stated honestly: kernel-level isolation per Job. The workspace is
a **controlled local workspace** inside the deployed stack's container
boundary; it is not a VM per job and the product never claims otherwise.
The host Docker socket is never mounted, in any configuration.

## Consequences

- Workspace files can be listed, read, and offered as artifacts through the
  API with the same guard, so the UI never has a privileged path.
- Cleanup is `rm -rf` of one directory after a retention window; nothing
  else on disk belongs to the Job. Deletion is never automatic in this
  phase; the owner decides.
