# Working in this repository

Conventions for anyone writing code here, human or agent.

## The Saaya contract (product law; every change honors it)

1. Saaya is a coworker, not a chat toy: conversations, work, and context
   survive restarts and return when the user does.
2. Memory compounds: what the user teaches Saaya once, Saaya knows next time,
   with provenance for every remembered thing.
3. Memory changes are versioned, inspectable, and reversible. Nothing edits
   Saaya's protected identity, security, or behavioral constraints
   automatically.
4. Work is visible: streaming output, tool activity, background tasks, and
   heartbeats are honest in the UI, including failures and retries.
5. No LLM judges or evaluation engines, under any name. Validation of memory
   and self-modification is deterministic: rules, schemas, bounds, diffs,
   permissions.

## Architecture boundaries

- `server/` (Python) owns the agent, memory, reflection, heartbeats, MCP, and
  all durable state. `web/` (TypeScript) owns the interactive product surface.
  The only contract between them is the FastAPI HTTP/SSE API.
- The Deep Agents harness is assembled in `server/src/saaya/agent/`; raw
  LangGraph appears only where Deep Agents cannot express the need, and each
  such drop-down is justified in a comment or ADR.
- Prompts are files under `server/src/saaya/agent/prompts/`, one concern per
  file. Tools live one per module. Assembly code only assembles.
- One streaming seam: the typed event adapter in `server/src/saaya/api/`.
  Nothing else translates model events.
- The commercially licensed langgraph-api server layer is not used, ever.
- Saaya's runtime home is `workspace/` and Postgres. The repo-level `memory/`
  and `journal/` directories are project documentation, not runtime state.

## Code standards

Python:
- Python 3.13, uv-managed. Full typing; pyright clean with zero unexplained
  suppressions. Ruff formats and lints; both run clean before any commit.
- Explicit pydantic schemas at every system boundary (API, DB, agent events).
- No broad exception swallowing. No hidden global mutable state; dependencies
  are constructed at the composition root and passed in.
- Async-safe throughout the request and agent paths.

TypeScript:
- Strict mode, zero errors. No `any`, no `@ts-ignore`, no unexplained
  suppressions. Biome enforces house style.

Both:
- Small, focused files; a file past 300 lines is probably doing too much.
- One concern per file. No kitchen-sink modules, no utils junk drawers.
- No dead code, no speculative abstraction, no TODO litter. An abstraction
  needs two real consumers.
- Every feature and dependency earns its place. A new dependency is a design
  decision with a written justification in the ADR or commit that adds it.

## Comments

Comment the why the code cannot say: a constraint, a quirk, a trade-off.
Never narrate what the next line does. If code needs a comment to be
understood, improve the names first. One lead sentence on each module.
ASCII hyphens only; no em or en dashes anywhere in code, copy, commits, or
docs.

## Testing

- Hermetic by default: no network, no keys, no real time. pytest on the
  server; Vitest plus Storybook interaction tests on the web app.
- Live-model tests are a separate ring behind `SAAYA_LIVE=1` and load keys
  only from `.env.local`.
- New behavior ships with its tests in the same commit.
- Heartbeats and schedules are testable with an injected clock.
- Critical user flows carry Playwright end-to-end coverage.
- Nothing is done until verified: gates green, the real flow exercised, UI
  proven in both themes. Claims of success require evidence.

## UI rules

- Registry first, hard requirement: before authoring any UI element, check the
  shadcn registry; install with `pnpm dlx shadcn@latest add <name>` and
  customize the installed file. Hand-build only when no primitive or
  documented pattern exists, and record why.
- Read the installed source under `web/components/ui/` before composing
  against it. Icons come from Lucide only.
- Every reusable component ships a colocated `*.stories.tsx`. The Storybook
  test run includes the axe accessibility gate at error level; violations
  block release.
- Light and dark are designed together. Keyboard access is not optional.
- UI copy speaks outcomes, never internals. No emojis, no marketing language.

## Memory safety rules

- The reflection process writes only through the staged-validate-promote path:
  writes land in a staging area, deterministic validation runs, then files are
  promoted or the stage is discarded. No direct writes to live memory files.
- Protected files (constitution, security posture) are never writable by
  reflection; validation independently verifies they are byte-identical.
- Bounded writes: growth caps per file and per run are enforced by validators,
  not by prompt trust.
- Every memory item carries provenance: what, source, when, why retained,
  confidence, reinforcement, supersession, introducing version.
- Every reflection run produces a version entry; any version can be diffed and
  rolled back.
- Secrets never enter memory files, prompts, logs, journals, fixtures, or
  screenshots. `.env.example` carries names and descriptions only.

## Migrations

Database changes go through the tooling, never by hand: edit the SQLAlchemy
models, then `uv run alembic revision --autogenerate -m "<change>"`, then
`uv run alembic upgrade head`. Generated SQL is not handwritten or edited;
an exception requires a documented reason in the migration file. LangGraph
checkpointer and store tables are owned by their libraries' `setup()`, not by
Alembic.

## Documentation

- Meaningful architectural trade-offs become ADRs in `journal/decisions/` with
  YAML front matter (stable id, status, related links).
- Each implementation phase ends with a progress entry in `journal/progress/`:
  objective, work, files, commands, verification, decisions, risks, next step.
- Public interfaces and the README's Rebuild from scratch section stay current
  in the same commit that changes them.

## Commits

Plain sentence case, atomic, present tense: "Add the heartbeat run ledger".
No ticket references, no Co-Authored-By, no emojis. Never push without the
owner's say-so.

## Verification gates (all green before any commit)

```console
# server/
uv run ruff format --check . && uv run ruff check .
uv run pyright
uv run pytest

# web/
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

CI runs exactly these gates and nothing else; green locally must mean green in
CI.

## Definition of done

A change is done when its tests pass, every gate above is green, the real flow
has been exercised end to end (Playwright for UI-facing work), both themes are
verified for visual changes, the journal records the increment, and the diff
contains nothing that does not earn its place.
