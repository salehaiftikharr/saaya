---
id: P-039
title: "Reviewer feedback traceability matrix (saaya-feedback @ 6af5640)"
type: progress
status: in-progress
created: 2026-08-09
updated: 2026-08-09
tags:
  - feedback
  - production-readiness
related:
  - journal/progress/P-032-demonstration-and-workbench.md
supersedes: []
---

# P-039: Reviewer feedback traceability matrix

Source: github.com/mcheemaa/saaya-feedback (Cheema and his Claude), reviewed
against Saaya at `6af5640`, validated here against the current tree. Every
substantive observation gets a row. Status moves as work lands; evidence
links commits, tests, and journal sections. This entry is updated in place
until the phase closes.

Severity: P0 unsafe execution, privacy, fabricated state; P1 broken core
flow or recovery; P2 UX, a11y, reliability, public-facing accuracy; P3
polish.

| ID | Source | Observation | Area | Sev | Validation | Classification | Resolution plan | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FB-001 | 02 F1 | Step executor inherits the job graph's checkpointer via implicit config propagation; re-run steps resume a concluded conversation, skip commands, never consume decisions | jobs | P0 | 230 `execute:*` checkpoint_ns rows under `job:%` threads in the live DB; agents.py builds create_deep_agent with no checkpointer arg | Confirmed | `checkpointer=False` on the executor AND deterministic runner execution of decided approvals before invoking the model; regression tests | in progress |
| FB-002 | 02 F2 | Jobs can complete with fabricated results: no honesty laws in EXECUTE_PROMPT, empty creates lists verify nothing, gated-intent steps unverified against the ledger | jobs | P0 | Prompt read: no honesty clause; runner check only iterates creates | Confirmed | Shared constitution in the executor prompt; ledger check: steps that requested approvals must show command_executed; parse_plan requires file-looking creates entries | pending |
| FB-003 | 02 F3 | creates done-check uses is_file(), so directory postconditions (.git) can never pass, failing steps after approval | jobs | P1 | runner.py check confirmed `.is_file()` | Confirmed | exists() for robustness plus parse_plan rejecting non-file entries | pending |
| FB-004 | 02 F4 | Next dev proxy gzips SSE and buffers it; chat, ledger tail, approval cards all dead-live in dev | web/api | P1 | Mechanism matches my earlier bench-poll observations; to reproduce with curl through proxy with gzip header | Confirmed pending repro | `Cache-Control: no-cache, no-transform` + `X-Accel-Buffering: no` on both StreamingResponse sites; verify live streaming through proxy | pending |
| FB-005 | 02 F5 | Reflection heartbeat crash-loops on fresh install: how-i-work.md read has no exists() guard; Memory page shows failure feed on day one | memory | P1 | reflection/runner.py read path to verify; my dev has files so not locally visible | Confirmed by code read | Seed workspace memory files at boot when absent; tolerant reflection read; fresh-boot test | pending |
| FB-006 | 02 F6 | Thread-list fetch failure wipes sidebar to [] and nothing refreshes on reconnect | web | P2 | use-chat.ts catch path to verify | Confirmed by code read | Keep last-known list on failure; refresh threads when health returns ok | pending |
| FB-007 | 02 F7 | Workbench