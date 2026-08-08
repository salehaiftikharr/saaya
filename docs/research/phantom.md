---
id: RES-001
title: Phantom source study
type: research
status: complete
created: 2026-08-07
updated: 2026-08-07
tags:
  - research
  - phantom
  - architecture
related:
  - docs/research/architecture-decisions.md
supersedes: []
---

# Phantom source study

Studied at v0.20.2 (github.com/ghostwright/phantom, Apache 2.0, Bun + TypeScript).
Scale: ~42,800 lines of production code, ~42,500 lines of tests across 185 test
files, a React 19 chat SPA, and a plain-JS dashboard. Built entirely on the Claude
Agent SDK. This document records what the source actually does, which differs from
its own documentation in places that matter.

## The design rule that shapes everything

Phantom's CLAUDE.md states: "TypeScript is plumbing. The Agent SDK is the brain."
Nearly every subsystem is a thin deterministic shell around an LLM call with a
teaching prompt and a narrow tool allowlist, followed by deterministic validation
and commit-or-rollback. There are no intent parsers or classifiers in application
code. This shape is worth preserving in Saaya: teach the model, validate
deterministically, keep application code boring.

## Finding: the documented judge pipeline does not exist

The README and docs describe a six-step evolution pipeline with five validation
gates and triple-judge voting. That code was deleted. Comments in
`src/evolution/engine.ts` and `invariant-check.ts` say the judge pipeline was
replaced with "~200 lines of deterministic sweeps" after judge costs ran 20-180x
over target. What ships is:

1. A single cheap LLM gate decides whether a session is worth learning from.
2. Worthy sessions enter a SQLite queue (deduped per conversation).
3. Every ~180 minutes, or when the queue hits depth 5, a sandboxed reflection
   subprocess runs: working directory jailed to the config folder, tools limited
   to Read/Write/Edit/Glob/Grep, allow/deny path rules, hard timeouts per model
   tier with kill semantics.
4. Nine deterministic invariants (pure functions) validate the result: only
   allowlisted files changed, the constitution file is byte-identical, growth
   caps (80 lines/file, 100 total), no credential patterns, structurally valid
   markdown/JSONL, sentinel-to-diff cross-check.
5. Pass: bump version, log changes. Fail: restore a byte-exact snapshot.
   Three failures move the work to a poison table.

Phantom's production experience independently validates Saaya's no-judge product
decision. The parts worth carrying forward are the deterministic ones: the
invariant checker, snapshot/restore versioning, the queue with a failure ceiling,
and the reflection teaching prompt (which repeats "the default answer is skip"
three times). The LLM gate can be replaced with deterministic worthiness rules.

## What is essential to the coworker experience

- Durable conversations resumable across restarts (sessions keyed per channel
  conversation; SDK-held history referenced by id).
- Memory that visibly compounds: episodic records per turn, semantic facts with
  contradiction supersession, procedural instruction files layered into the
  system prompt. Ranking blends importance, reinforcement (access counts are
  incremented on retrieval), and a 14-day recency half-life.
- Streaming with visible tool activity. The web chat defines a 32-event typed
  wire protocol (session lifecycle, text deltas, thinking, tool call stages,
  subagent progress), persists every frame, and supports replay/reconnect by
  sequence number. Slack renders the same activity as an emoji status state
  machine plus a live-edited progress message.
- Scheduled autonomy: an in-process scheduler fires full agent turns on cron or
  interval schedules with backoff, failure ceilings, and owner notification.
- An MCP server (bearer tokens, scopes, rate limits, audit log) so external
  clients can query memory, ask the agent, and use its tools.
- Dynamic capability creation: a registry of runtime-created tools (script
  handlers run in a scrubbed environment) that survive restarts and are exposed
  both to the agent itself and to MCP clients.

## What is Claude Agent SDK-specific

- `systemPrompt: {preset: "claude_code", append}`: Phantom never writes a full
  system prompt; it appends to Claude Code's. Deep Agents' harness prompt plus
  our own composed sections is the replacement.
- SDK-owned conversation state (`persistSession` + `resume`). LangGraph inverts
  this: the checkpointer owns history, which enables explicit summarization,
  forking, and per-turn memory injection. Phantom's continuity-context and
  transcript-search subsystems exist to work around SDK compaction and are
  unnecessary when we own state.
- In-process MCP server factories per query (an SDK one-instance-one-transport
  constraint). On LangChain, tools are plain bound functions; the pattern
  evaporates.
- `settingSources`: four whole subsystems (skills, subagents CRUD, plugins,
  hooks; ~6,100 lines) only edit Claude Code's native config files, which the
  SDK loads. Meaningless off the SDK.
- Provider switching via environment-variable translation (375 lines) because
  the SDK subprocess reads env at call time. Replaced by `init_chat_model`.
- Subprocess-per-query isolation gives hard kill timeouts. Worth keeping only
  where correctness depends on it (reflection snapshot/rollback).

## What maps naturally to LangChain and Deep Agents

| Phantom | Saaya on LangChain |
| --- | --- |
| Session resume | LangGraph checkpointer, thread id per conversation |
| Layered prompt assembly | Composed system prompt sections + AGENTS.md memory |
| Episodic/semantic/procedural memory | Checkpoint threads + pgvector store + file backend |
| Reflection subprocess | Reflection run with restricted file tools |
| Invariants + versioning | Port the logic as pure Python functions |
| 32-event wire format | Smaller typed event union over `astream_events` |
| Scheduler | Durable heartbeat system (redesigned, see brief) |
| MCP server | FastMCP mounted in FastAPI |
| Dynamic tools | Registry + scrubbed-env script handlers |
| Subagents | Deep Agents `task` tool with declared subagents |

## What is unnecessary, overengineered, or peripheral

- Skills/subagents/plugins/hooks CRUD and dashboards: SDK file-format plumbing.
- The 7-persona first-hour-of-work system: cloud product onboarding theater,
  cross-repo contracts, 11 locked failure codes. Impressive, not core.
- Tenancy heartbeats, metadata-gateway secret fetching, magic-link cross-tenant
  validation: cloud-operator infrastructure.
- Telegram and IMAP email channels: real but peripheral; web + Slack cover the
  product premise.
- Three parallel transcript stores (SDK sessions, wire event log, vector
  episodes) partially duplicate one another; owning state lets Saaya keep two
  (checkpoints + event log) and derive episodes.
- A hand-rolled Qdrant REST client and a fake-BM25 sparse vector (term frequency
  hashed with FNV-1a, no IDF). pgvector with a proper embedding column is
  simpler and honest.

## Bugs and gaps found (fix in Saaya, do not copy)

- The web chat path never consolidates memory; only channel-routed messages do.
  Docs claim all channels share memory. Saaya consolidates on every surface.
- Nightly memory consolidation is documented but stubbed (returns zeros).
- Docs claim 8 roles; 2 ship. Docs claim a 30-day session cookie; code says 7.

## Ideas to adapt rather than copy

- The reflection teaching prompt structure (file taxonomy, worthy-signal list,
  formatting rules, skip-by-default, worked examples) is the highest-leverage
  artifact. Rewrite it for Saaya's memory schema; keep its shape and restraint.
- Retrieval that reinforces (access counts feeding durability) is a genuinely
  good memory idea and is cheap on pgvector.
- The emoji status state machine and live-edited progress message for Slack.
- Owner-only access control as the default posture for every channel.
