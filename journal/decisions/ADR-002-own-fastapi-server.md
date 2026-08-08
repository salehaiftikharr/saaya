---
id: ADR-002
title: Serve the graph from our own FastAPI app
type: decision
status: accepted
created: 2026-08-07
updated: 2026-08-07
tags:
  - architecture
  - licensing
  - api
related:
  - docs/research/architecture-decisions.md
supersedes: []
---

# ADR-002: Serve the graph from our own FastAPI app

## Decision

The compiled agent graph is served by Saaya's own FastAPI application:
SSE chat streaming, thread and memory APIs, heartbeat status, and a FastMCP
server mounted in the same process. The langgraph-api server layer
(`langgraph up` and the platform runtime) is not used.

## Why

- Licensing: the langgraph libraries are MIT, but the langgraph-api server
  layer is Elastic-licensed and requires a license key for production
  standalone deployment. Saaya is an open-source project that must deploy
  cleanly anywhere.
- Product fit: Saaya's API surface (typed event stream, memory provenance,
  heartbeat history, version rollback) is product-specific; owning the
  FastAPI layer means the UI is built against exactly one contract.
- The same compiled graph can still deploy to LangSmith Deployments later
  without code changes; that remains the managed path, not the default.

## Consequences

- We own thread listing, run replay, and streaming plumbing that the platform
  would otherwise provide. Scope is contained by building only what the UI
  needs.
- Cron/scheduling does not come from the platform; the heartbeat system is
  first-class in Saaya by design anyway.
