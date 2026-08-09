# The security model, in depth

[SECURITY.md](../SECURITY.md) is the summary and the reporting path. This
document is the threat model behind it, drawn from ADR-004 (workspace
containment), ADR-006 (command policy), and ADR-007 (approvals).

## Assumed attacker

Hostile text reaching the model: prompt injection in a repository under
inspection, in tool output, or in user-pasted content, steering the agent
toward harmful tool calls. The boundaries below are designed so that a
fully steered model still cannot exfiltrate secrets, escape its
workspace, reach the network from a job, or execute a consequential
command without a recorded human decision.

## Defense layers, innermost first

1. **Approval at the execution site.** A gated command creates an
   approval row with a verbatim preview and the job parks. The runner
   executes only after re-reading an approved, unconsumed decision, and
   consumption is recorded. The check lives beside the execution; no
   client, prompt, or model output can skip it.
2. **Command policy.** Argv lists only (no shell), an explicit binary
   allowlist, git read subcommands free and write subcommands gated,
   config-injection flags refused, absolute paths and parent traversal
   refused as argv tokens, timeouts and output caps, and no
   network-capable entry on the list. Verdicts are deterministic and
   every refusal is a ledger event.
3. **Scrubbed environment.** Commands and dynamic tools receive an
   explicit environment dictionary (minimal `PATH`, workspace-scoped
   `HOME`, `LANG`) with nothing inherited; a canary test asserts server
   env vars never reach a subprocess.
4. **Workspace containment.** Textual screening first (absolute paths,
   `..` segments refused), then full resolution with a prefix check that
   closes symlink escapes, plus per-file and per-workspace size caps.
5. **Capability governance.** Dynamic tools are inert drafts until a
   human approves the code; every version is kept; rollback and disable
   are single actions; usage is recorded.
6. **Memory governance.** Reflection proposals pass deterministic
   validators (structure, growth, credential detection); the identity
   file is unwritable by reflection and proven byte-identical after
   every run; semantic memories are reversible without history loss.
7. **Surface authentication.** MCP requires a bearer token. Slack is
   outbound Socket Mode only. The web app is unauthenticated by design
   for localhost development, which is precisely why public exposure is
   blocked until the auth gate ships.

## What the ledger guarantees

Every consequential occurrence, state transitions, plans, steps,
commands, refusals, approvals and decisions, artifacts, recoveries, is an
append-only event written in the same transaction as its state change.
`unique (job_id, seq)` turns any double-writer race into a loud failure
rather than duplicated history. Audit is therefore a read, not a
reconstruction.

## Non-goals, stated

- Kernel-level per-job isolation: jobs run only first-party, approved
  tools; the container is the outer boundary. Revisited if untrusted
  third-party code ever runs.
- Network namespaces for commands: isolation is by allowlist policy on a
  developer machine; the container stack can add `network_mode: none`
  runners when that hardening is wanted.
- Multi-user authorization: Saaya is single-operator; there is one trust
  domain inside the authenticated boundary.
