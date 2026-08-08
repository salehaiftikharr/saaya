---
id: P-005
title: The reflect heartbeat
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - heartbeat
  - reflection
related:
  - journal/progress/P-004-memory-ui.md
  - journal/roadmap.md
supersedes: []
---

# P-005: The reflect heartbeat

## Objective

Saaya's first durable heartbeat: reflect over settled conversations on a
schedule, idempotent, overlap-guarded, silent when idle, restart-safe,
testable without real time, with history in the UI.

## Work completed

- threads and heartbeat_runs tables (Alembic-generated migration).
- ThreadActivity registry: the chat route marks activity; worthiness is
  deterministic (settled past a quiet period with activity reflection has
  not seen); reflection records the activity timestamp it saw, never now.
- ReflectHeartbeat runner: asyncio overlap guard, at most three threads per
  run, run ledger rows only when there was work (silent when idle), failure
  recorded with the error. APScheduler interval job in the app lifespan;
  interval and quiet period are settings.
- Heartbeat run detail carries reflection violation rules; rejected
  proposals are persisted under workspace/memory/.versions/rejected/ with
  their violations (evidence, not garbage).
- GET /api/heartbeats and a Heartbeats section in the memory panel with a
  HeartbeatRow story set (completed, rejected-with-rules, failed).

## Root causes found by verification

- A fake-clock test wrote future-dated rows into the shared dev database,
  which then sorted above real runs in the API and masqueraded as live
  results. Tests now delete every row they create; existing artifacts were
  purged and verified zero after a full suite run.
- mark_reflected originally stamped the current time, so activity arriving
  during a reflection could never be seen again; the injected-clock test
  caught it and the fix records the seen-activity timestamp instead.
- A live heartbeat rejection left no evidence; rejections are now
  inspectable artifacts and their rules ride the run detail.
- langchain-core text-accessor deprecation shim removed at all three sites.

## Verification

Gates green: ruff, pyright strict 0 errors, pytest 32; biome, tsc, vitest 24
with the axe gate. Live: real scheduler fired with fast settings, reflected a
real conversation (one nondeterministic rejection, then applied as v5 with
correct pnpm and Playwright bullets), silent afterward; heartbeat history
verified rendering in the browser with the real run row.

## Next step

Roadmap item 9: MCP server (FastMCP mounted in FastAPI) exposing ask_saaya,
search_memory, and status with bearer auth; then external MCP consumption.
