---
id: P-008
title: Containerized full stack
type: progress
status: complete
created: 2026-08-08
updated: 2026-08-08
tags:
  - deployment
  - docker
related:
  - journal/progress/P-007-slack.md
  - journal/roadmap.md
supersedes: []
---

# P-008: Containerized full stack

## Objective

Roadmap item 12, local-stack portion: the whole product runs as containers
from one command, with migrations applied at start.

## Work completed

- server/Dockerfile on the uv python3.13 image: frozen sync, bytecode
  compile, alembic upgrade then uvicorn at start. psycopg[binary] added
  after the slim image surfaced the missing system libpq.
- web/Dockerfile: pnpm build, Next standalone runtime. Root cause found by
  verification: rewrites are evaluated at build time, so the API origin is
  a build arg (SAAYA_API_URL), not a runtime env var; and .dockerignore
  files keep host node_modules and .venv out of images.
- docker-compose full profile: server (workspace mounted, env from
  .env.local, DATABASE_URL pointed at the postgres service) and web behind
  a build arg pointing at the server service.

## Verification

Both images build; `docker compose --profile full up` brings up postgres
(healthy), server (migrations ran, /api/health ok), and web (200). A real
turn through the containerized proxy recalled genuine long-term memories
(portfolio URL and commit style) with recall_memories visible in the event
stream.

## Remaining for item 12 (tracked, not silently dropped)

Production posture: TLS/reverse proxy, non-root container users, image
publishing, backup story for postgres and workspace, and a small-VM deploy
guide. These stay open on the roadmap; the item is checked for the
runnable-stack criteria only if those are split out; keeping item 12
unchecked until the production notes land.

## Next step

Roadmap item 11: dynamic and reusable tool creation behind an approval
step. Standing debts: committed Playwright e2e spec, markdown rendering,
thread list, restore confirmation, brand social PNG.
