---
id: P-003
title: Semantic memory, procedural memory, and reflection
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - phase-3
  - memory
  - reflection
related:
  - journal/progress/P-002-vertical-slice.md
  - docs/research/phantom.md
supersedes: []
---

# P-003: Semantic memory, procedural memory, and reflection

## Objective

Scope priorities 6 and 7: memory that compounds with provenance, and the
self-improvement loop with deterministic validation, versions, and rollback.
No LLM judges anywhere.

## Work completed

- App database foundation: SQLAlchemy models, Alembic wired to settings with
  an include_object guard so reflected tables owned by LangGraph are never
  dropped; generated migration with two documented hand additions (pgvector
  import, CREATE EXTENSION); ruff excludes generated versions/.
- Semantic memory: memory_items on pgvector with full provenance (kind, why
  retained, confidence, source thread and kind, learned/reinforced
  timestamps, reinforcement count, supersession link, version). Store with
  injected embedder; recall reinforces what it returns. OpenAI embeddings in
  production; deterministic fake embedder in tests.
- Agent memory tools: remember and recall_memories bound to the store;
  thread id captured from the run config as provenance; identity prompt
  teaches restraint (store single specific statements; when unsure, do not).
- Procedural memory: workspace/memory with a protected identity.md and a
  reflection-maintained how-i-work.md, both loaded into the system prompt.
- Reflection: proposer (one plain model call, a writer never a judge),
  deterministic validators (protected files, allowlist, growth and size
  caps, shrink guard, credential patterns, balanced fences, protected-drift
  cross-check), version ledger with byte-exact snapshots and append-only
  JSONL, rollback that itself records a version, agent rebuild on apply.
- API: GET /api/memory, POST /api/reflection/run, POST /api/memory/rollback.

## Verification

- Gates: ruff, pyright strict 0 errors, pytest 29 passed (13 reflection
  tests covering every rule and outcome; store tests against local pgvector
  with no network).
- Live: taught two facts in one thread; a zero-context thread recalled both
  via recall_memories. Ran reflection over a real conversation: version 2
  applied with two precise bullets; a brand-new thread then led with the
  learned personal constraint unprompted (the constraint shaping behavior);
  rollback to v1 removed it, roll-forward to v2 restored it; ledger shows
  versions 1-4 append-only; identity.md byte-identical throughout.

## Open risks

- Reflection is endpoint-triggered; the deterministic worthiness trigger and
  Saaya's own heartbeat arrive next.
- Memory UI panel (versions, rollback, provenance) not yet built; API only.
- Semantic supersession is stored but no flow writes it yet.

## Next step

Memory UI panel with stories and e2e; then Saaya's first durable heartbeat
(reflect over recent conversations on a schedule, silent when nothing
happened).
