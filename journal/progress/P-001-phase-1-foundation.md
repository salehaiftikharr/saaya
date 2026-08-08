---
id: P-001
title: Phase 1 foundation, first increment
type: progress
status: in-progress
created: 2026-08-07
updated: 2026-08-07
tags:
  - phase-1
  - scaffolding
related:
  - journal/progress/P-000-phase-0-research.md
  - AGENTS.md
supersedes: []
---

# P-001: Phase 1 foundation, first increment

## Objective

Stand up the repository foundation: constitution, journal/memory structure,
scaffolded server and web apps, verification gates, and the Postgres service.

## Work completed

- AGENTS.md written (contract, boundaries, standards, gates, definition of done).
- Journal and project-memory structure created with front-mattered indexes.
- git repository initialized; `.env.local` verified gitignored before any commit.
- Server scaffolded: `uv init server --package --python 3.13`, package renamed
  to `saaya`; deps: deepagents 0.7.5, langgraph, langchain 1.3.14,
  langchain-anthropic, langchain-openai, langgraph-checkpoint-postgres,
  fastapi, uvicorn, sqlalchemy, alembic, asyncpg, pydantic-settings;
  dev: pytest, pytest-asyncio, ruff, pyright (strict).
- First module: `saaya/config.py` settings boundary reading CLAUDE_API_KEY
  (project naming) with hermetic tests.
- Web scaffolded: `pnpm create next-app@latest web` (Next 16.3, React 19.2,
  Tailwind 4, no ESLint), `shadcn init -b base --preset nova` (base-nova style
  on Base UI, matching the Rendi reference), Storybook 10.5 via
  `storybook init` (addon-vitest, addon-a11y at error level, colocated story
  globs), Biome with tailwindDirectives enabled.
- docker-compose.yaml: pgvector/pgvector:pg17 on host port 5433; container
  healthy; `CREATE EXTENSION vector` verified.

## Deviations from documented commands

- shadcn CLI renamed its flags since the Rendi snapshot: current form is
  `init -b base --preset nova` (was `--base-color`/base-nova). Same resulting
  style ("base-nova" in components.json).
- pnpm 11 renamed build-script approval: `allowBuilds` map in
  pnpm-workspace.yaml (onlyBuiltDependencies is no longer read). Needed for
  esbuild.
- pydantic-settings' `_env_file` kwarg is untyped; tests use a typed
  `EnvOnlySettings` subclass instead of a suppression.

## Verification

server: ruff format --check, ruff check, pyright strict (0 errors), pytest
(3 passed). web: biome lint clean, tsc --noEmit clean, vitest passes (no test
files yet, explicit --passWithNoTests until the first story lands), next build
succeeds. Postgres healthy with vector extension confirmed.

## Open risks

Storybook a11y gate not yet exercised by a real story; CI workflow not yet
created; brand system and app shell pending.

## Next step

Brand system v1 (BRAND.md, tokens, provisional mark), minimal app shell,
GitHub Actions running exactly the local gates, first commit series.
