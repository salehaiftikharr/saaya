# Security

Saaya runs against your own Postgres and your own model API keys, executes
commands on behalf of an agent, and speaks to Slack and MCP clients. This
document describes the boundaries that make that safe, how to report a
problem, and what is honestly not covered yet.

## Reporting a vulnerability

Use GitHub's private vulnerability reporting on this repository (Security
tab, "Report a vulnerability"). Please do not open a public issue for
security reports. Reports are read by the repository owner; expect a reply
within a few days and credit in the fix if you want it.

## Secrets

- Env files (`.env.local` and friends) are gitignored; `.env.example`
  carries variable names and descriptions only. No secret value belongs in
  the repository, in memory content, or in job workspaces.
- Command execution uses a scrubbed environment: an explicit dictionary
  (minimal `PATH`, a workspace-scoped `HOME`, `LANG`) with nothing
  inherited, so provider keys in the server process are structurally
  invisible to anything a job runs. A canary test pins this.
- Dynamic tool scripts run in subprocesses with the same scrubbed
  environment and a timeout.
- Memory validators reject credential-shaped content, so keys cannot be
  laundered into remembered facts.

## Command and tool execution

The job runner's command tool is deny-by-default (ADR-006):

- Argv lists only; there is no shell.
- An explicit binary allowlist; `git` is limited to read subcommands
  unless a write subcommand passes the approval gate; `-c` style config
  injection is refused; no network-capable invocation is on the list
  (refusals include `curl`, `pip`, and the git network subcommands).
- Wall-clock timeouts and output caps per command.
- Every execution and every refusal is an append-only ledger event with
  argv and exit code, so the record of what ran is complete.

Dynamic tools are inert drafts until a human reads the script and
approves it; approval, disablement, versioning, and rollback are all
recorded.

## Filesystem containment

Each job owns one workspace directory. Every path an agent supplies is
textually screened (no absolute paths, no parent traversal) and then
fully resolved; anything that resolves outside the workspace is refused,
which closes symlink escapes. Writes carry per-file and per-workspace
size caps. Refusals are visible ledger events.

## Approvals

Consequential actions create a recorded approval with a human-readable
preview and park the job. The runner executes the gated action only after
re-reading an approved, unconsumed decision at the execution site, so
neither a client nor the model can skip the gate. Decisions are single
use and permanently recorded.

## Surfaces

- **Web**: authentication is one owner passphrase. When
  `AUTH_PASSPHRASE` is set, every `/api` route requires a signed HttpOnly
  session cookie (HMAC over an expiry, 30-day sessions, Secure on https);
  login is constant-time compared and rate-limited per address (ten
  failures, fifteen-minute lockout), and `/health` stays public for
  probes. Unset, the app is open and intended for localhost development
  only; never expose an instance without the passphrase set.
- **Slack**: outbound Socket Mode only; no inbound webhook surface. The
  bot sees messages Slack sends it under its configured scopes.
- **MCP**: bearer-token auth; the server activates only when `MCP_TOKEN`
  is set. Treat the token as a credential and rotate it for production.
- **Artifacts**: readable only through the API, and chat-side reads are
  scoped to the conversation that owns the job.

## Memory and privacy

Real personal memory may exist in authenticated private product state; it
never belongs in public-facing surfaces. Every demonstration surface (the
about page, fixtures, stories, documentation images) uses one reviewed
fictional dataset, and a CI test scans the tracked tree to keep it that
way. Semantic memories can be corrected or forgotten; forgetting removes
them from recall and future context while keeping a private record, and
the protected identity file cannot be written by reflection at all.

## Known limitations

- Command network isolation is policy (nothing allowlisted can reach the
  network), not a kernel namespace; the container stack is the outer
  boundary.
- Jobs run one at a time in the API process by design; a runaway step
  competes with API latency until its budget stops it.
- Per-job kernel-level isolation is out of scope while jobs run only
  first-party, human-approved tools.
