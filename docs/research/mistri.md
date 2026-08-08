---
id: RES-002
title: Mistri source study
type: research
status: complete
created: 2026-08-07
updated: 2026-08-07
tags:
  - research
  - mistri
  - engineering-discipline
related:
  - docs/research/architecture-decisions.md
supersedes: []
---

# Mistri source study

Studied at github.com/mcheemaa/mistri (MIT). Mistri (Urdu for the fixer, the
tradesperson who gets it done) is an agent harness for Ruby applications:
Anthropic, OpenAI, and Gemini through their native protocols, zero runtime
dependencies, no terminal UI. The stated split is the sharpest sentence in the
repo: "The gem owns mechanism; the host application owns policy."

Saaya does not use Mistri (Ruby, and we build on LangChain). We study it for the
engineering discipline, which its AGENTS.md makes explicit and its source
demonstrably follows.

## Architecture observations

- `lib/mistri/` holds roughly forty files, each one concern: `agent.rb`,
  `session.rb`, `tool.rb`, `tool_executor.rb`, `compaction.rb`, `budget.rb`,
  `sse.rb`, `retry_policy.rb`, `abort_signal.rb`, `memory.rb`, `sub_agent.rb`,
  `mcp.rb`, `skills.rb`. Nothing resembles a utils junk drawer. File names alone
  give a working map of the system.
- Zero runtime dependencies is enforced in the gemspec and treated as a design
  decision requiring written justification to change. The lesson for Saaya is
  not zero dependencies (LangChain is the point of the project) but that every
  dependency is a decision with a stated reason, recorded where reviewers look.
- Durable pause/resume is designed around identity, not process state: a run
  parks an approval-requiring tool call and returns immediately; days later a
  different process builds a fresh agent, revalidates the exact call by session
  id and call id, and resumes. This is the correct mental model for Saaya's
  approval flows and heartbeats: durable identity plus revalidation, never a
  waiting thread.
- Observability lands in the ordinary application log: one assignment
  (`Mistri.logger = ...`) yields a compact per-run story with tokens, tool
  durations, and dollar cost, with a `content: false` mode when payloads must
  stay out of logs. Saaya should offer the same dignity: readable logs first,
  LangSmith traces as the deep view.
- Four test rings, hermetic by default: (1) hermetic with a fake provider and
  recorded wire fixtures, in CI; (2) differential tests where behavior must
  match a reference implementation; (3) live tests behind an explicit
  `MISTRI_LIVE=1` opt-in with keys from a gitignored env file; (4) a demo
  application driven end to end in a real browser before release.
- Streaming discipline as a quality gate: streaming paths never buffer a whole
  response, and hot-path changes must state their latency impact in review.

## Discipline adopted as Saaya engineering requirements

From AGENTS.md and CONTRIBUTING.md, generalized away from Ruby:

- Every feature, dependency, and comment must earn its place.
- New behavior ships with its tests in the same commit.
- Tests are hermetic by default: no network, no keys. Live-model tests are a
  separate, explicitly opted-in ring.
- Comments state the why the code cannot say: a constraint, a provider quirk, a
  deliberate trade-off. Never narrate the next line. If a method needs a comment
  to be understood, improve the name first. One lead sentence on each module.
- ASCII hyphens only; no em or en dashes anywhere.
- Commits: plain sentence case, atomic, present tense. No ticket references, no
  Co-Authored-By, no emojis.
- CI green on main, always. Nothing merges red.
- Public API changes update the changelog in the same commit.
- Every phase gets an adversarial review before merge; findings are fixed or
  rejected with a stated reason, never silently dropped.

## Ruby-specific conventions we do not carry

- `# frozen_string_literal: true` headers, RuboCop, Minitest, gemspec zero-dep
  enforcement, RubyGems trusted publishing. Saaya's equivalents are Ruff,
  pyright, pytest, Biome, and pinned-version scaffolding, defined in AGENTS.md.
