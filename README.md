# Saaya

Saaya (saa-yaa, Urdu for shadow) is a persistent AI coworker. It keeps its own
workspace, remembers how you work, and gets more useful the longer you work
together. Conversations survive restarts; memory compounds with provenance;
every self-directed memory change is validated deterministically, versioned,
and reversible.

Beyond chat, Saaya runs durable background Jobs: hand it a goal and it plans,
executes step by step inside a contained per-job workspace, pauses for your
approval before consequential commands, registers its outputs as artifacts,
and resumes from a checkpoint if the process dies mid-run. Every event is an
append-only ledger row, so what you see after a restart is what happened.

Status: the twelve-item roadmap is implemented and verified end to end, and
the Jobs phase (durable work, approvals, artifacts, restart recovery) is
implemented with its demonstration recorded in the journal.

| Capability | State |
| --- | --- |
| Streamed chat with visible tool activity | working, e2e-verified |
| Conversations durable across restarts | working, e2e-verified |
| Semantic memory with provenance and recall | working |
| Procedural memory, reflection, versions, rollback | working, deterministic validation only |
| Reflect heartbeat (quiet when idle) | working, fake-clock tested |
| MCP server (bearer) and external MCP tools | working, real-client verified |
| Slack over Socket Mode | working, round-trip verified |
| Dynamic tools (propose, approve, disable, roll back) | working, restart-verified |
| Containerized stack (non-root) | working, e2e-verified |
| Durable Jobs (plan, step ledger, budgets) | working, kill -9 recovery verified |
| Per-job contained workspace and command policy | working, boundary-tested |
| Approvals that really withhold execution | working, live-demonstrated |
| Job artifacts, served and rendered | working |
| Design system (two-register type, echo grammar, story page) | shipped |
| Privacy gate over the tracked tree | enforced in CI |
| CI (exact local gates) | green |

The journal under `journal/` carries the evidence for every row.

## Architecture

Two applications, one contract. Details in
[docs/research/architecture-decisions.md](docs/research/architecture-decisions.md)
and [AGENTS.md](AGENTS.md).

- `server/`: Python 3.13. LangChain Deep Agents harness on LangGraph with
  Postgres checkpointing, served by FastAPI with a typed SSE event stream.
- `web/`: Next.js with TypeScript strict, Tailwind, shadcn (base-nova on
  Base UI), Storybook with an axe accessibility gate, Biome.
- `docker-compose.yaml`: PostgreSQL 17 with pgvector.
- `brand/`: the Saaya identity system (BRAND.md, tokens, marks).
- `journal/`, `memory/`, `docs/research/`: decisions, progress, and the
  source studies behind the design.

## Run it

Requires Docker, uv, pnpm, and a `.env.local` at the repo root (copy
`.env.example` and fill in keys).

```console
docker compose up -d
cd server && uv sync && uv run uvicorn --factory saaya.api.app:create_app --port 8000
cd web && pnpm install && pnpm dev
```

Open http://localhost:3000. Ask Saaya what time it is to watch a tool run.

To run the whole product as containers instead (server, web, and postgres):

```console
docker compose --profile full up --build
```

## Verification gates

```console
cd server && uv run ruff format --check . && uv run ruff check . && uv run pyright && uv run pytest
cd web && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

CI runs exactly these. Green locally must mean green in CI.

## Rebuild from scratch

The commands that created this structure, in order. Generator flags drift;
when a command's current flags differ, the deviation is recorded in
`journal/progress/`.

```console
git init saaya && cd saaya
uv init server --package --python 3.13
cd server
uv add deepagents langgraph langchain langchain-anthropic langchain-openai \
  langgraph-checkpoint-postgres fastapi "uvicorn[standard]" sqlalchemy \
  alembic asyncpg pydantic-settings
uv add --dev pytest pytest-asyncio ruff pyright
cd ..
pnpm create next-app@latest web --typescript --tailwind --app --no-src-dir \
  --import-alias "@/*" --use-pnpm --no-eslint --yes
cd web
pnpm dlx shadcn@latest init -b base --preset nova --yes
pnpm dlx shadcn@latest add button separator tooltip skeleton textarea scroll-area --yes
pnpm dlx storybook@latest init --yes
pnpm add -D @biomejs/biome && pnpm dlx @biomejs/biome init
pnpm add next-themes
```

`docker-compose.yaml` is hand-written (no generator exists); it is the
documented exception.

## License

Not yet chosen; all rights reserved until a license lands. (MIT is proposed
and pending the owner's decision.)
