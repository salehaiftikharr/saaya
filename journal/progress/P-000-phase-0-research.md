---
id: P-000
title: Phase 0 research and architecture
type: progress
status: complete
created: 2026-08-07
updated: 2026-08-07
tags:
  - phase-0
  - research
related:
  - docs/research/phantom.md
  - docs/research/mistri.md
  - docs/research/rendi.md
  - docs/research/architecture-decisions.md
supersedes: []
---

# P-000: Phase 0 research and architecture

## Objective

Study Phantom, Mistri, and Rendi at source level; verify current LangChain,
LangGraph, and Deep Agents APIs against official documentation; produce the
research documents, architecture, feature matrix, repository structure, and
scaffolding commands before any implementation.

## Work completed

- Cloned and inspected all three repositories (source, tests, docs, AGENTS.md,
  configuration, brand assets).
- Verified deepagents >= 0.7 `create_deep_agent` API, LangGraph Postgres
  checkpointer/store, MCP adapters, and licensing boundaries against official
  docs (details and URLs in docs/research/).
- Wrote the four research documents under docs/research/.
- Key evidence-driven finding: Phantom's documented judge pipeline was deleted
  in favor of deterministic invariants; this validates the no-judge product
  decision and reshaped the reflection design (deterministic worthiness rules,
  staged writes, pure-function validation).

## Files changed

docs/research/{phantom,mistri,rendi,architecture-decisions}.md, .env.example,
.env.local (owner-provided keys; gitignored), .gitignore, AGENTS.md,
journal/ and memory/ structure.

## Commands executed

git clone (x3, shallow, into session scratchpad), git init -b main,
git check-ignore .env.local (verified ignored).

## Verification

- .env.local confirmed gitignored before any commit existed.
- Playwright MCP browser verified working against live pages (used for the
  GitHub and langchain.com research; sanity re-check against example.com).

## Decisions

ADR-001 (Deep Agents harness), ADR-002 (own FastAPI server). Owner input
recorded: Anthropic key is named CLAUDE_API_KEY in env; embeddings via
OPENAI_API_KEY; Slack tokens provided for the later channel phase.

## Open risks

deepagents pre-1.0 churn (pinned versions); single-Postgres assumption for
checkpoints, store, and app tables (revisit if contention appears).

## Next step

Phase 1 foundation: scaffold server and web with the documented commands,
wire verification gates, Docker Compose with pgvector, initial brand system,
minimal app shell.
