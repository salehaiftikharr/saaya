---
id: ADR-006
title: Deny-by-default command policy with scrubbed environment
type: decision
status: accepted
created: 2026-08-08
updated: 2026-08-08
tags:
  - jobs
  - security
related:
  - journal/decisions/ADR-004-job-workspace-boundary.md
supersedes: []
---

# ADR-006: Deny-by-default command policy with scrubbed environment

## Decision

The Job runner's `run_command` tool executes an **argv list, never a shell
string**. Policy is deny-by-default:

1. The first argv element must resolve to a binary on an explicit allowlist
   (initially: `python3`, `git`, `ls`, `cat`, `wc`, `head`, `tail`,
   `grep`, `diff`). Anything else is refused.
2. Allowlisted binaries can still be refused by argument class: `git` is
   restricted to read subcommands (`status`, `log`, `diff`, `show`,
   `ls-files`) until approvals gate the writing ones; flags that execute
   arbitrary code through an allowed binary (`python3 -c` stays allowed
   deliberately, `git -c core.fsmonitor=...` style config injection is
   blocked by refusing `-c` to git).
3. Environment is scrubbed to an explicit dictionary: minimal `PATH`,
   `HOME` pointed inside the workspace, `LANG`, and nothing inherited, so
   provider keys and tokens in the server's environment are structurally
   invisible. The dynamic-tool runner already proved this pattern with a
   canary test; the Job runner reuses it.
4. Working directory is always the Job workspace; paths in argv pass the
   ADR-004 guard.
5. Wall-clock timeout and output caps per command; truncation is marked.
6. Network is off by default as **policy**: the initial allowlist contains
   no network-capable invocation (no `curl`, no `pip`, `git` network
   subcommands like `fetch`, `clone`, `pull`, `push` are refused). This is
   an honest statement of mechanism: on the macOS dev host there is no
   network namespace to enforce it at the kernel, and the documentation
   says so; the container stack can later add `network_mode: none` runners.
7. Every execution and every refusal is a ledger event carrying argv, exit
   code, duration, and truncated output, so the transcript of what ran is
   complete.

## Consequences

- A prompt-injected instruction cannot make the runner fetch a URL, exfiltrate
  env secrets, or touch files outside the workspace without first defeating
  an allowlist, an argument filter, a scrubbed env, and a path guard, and
  any attempt leaves a visible refusal event.
- The allowlist will feel tight; loosening it is a reviewed policy change,
  not a runtime setting the model can reach.
