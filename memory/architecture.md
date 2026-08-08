---
id: MEM-ARCH
title: Architecture map
type: reference
status: active
created: 2026-08-07
updated: 2026-08-07
tags:
  - memory
  - architecture
related:
  - docs/research/architecture-decisions.md
  - journal/decisions/ADR-001-deep-agents-harness.md
  - journal/decisions/ADR-002-own-fastapi-server.md
supersedes: []
---

# Architecture map

Two applications, one contract.

- `server/` (Python 3.13, uv): the agent (Deep Agents harness), memory
  (checkpointer, pgvector store, procedural files), reflection (staged writes,
  deterministic validation, versions), heartbeats, MCP server and client, and
  the FastAPI API with the single typed streaming seam.
- `web/` (Next.js, TypeScript strict, shadcn on Tailwind): the product
  surface. Talks only to the FastAPI API.
- PostgreSQL with pgvector (Docker Compose): checkpoints, semantic store,
  application tables. LangGraph libraries own their tables via setup();
  Alembic owns Saaya's.
- `workspace/`: Saaya's runtime home; contents gitignored.
- `brand/`: the Saaya identity system; the only custom vectors in the product.

Authoritative detail lives in docs/research/architecture-decisions.md and the
ADRs. This map is updated whenever a boundary moves.
