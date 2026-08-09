# Contributing

Saaya is a small, carefully gated codebase. The fastest way to contribute
well is to read [AGENTS.md](AGENTS.md) first: it carries the product
contract, the architecture boundaries, and the code standards this guide
only summarizes.

## Getting set up

Follow the Run locally section of the [README](README.md). You need
Docker, uv, pnpm, and the two required keys in `.env.local`. Confirm your
setup by running the full gates once before changing anything:

```console
cd server && uv run ruff format --check . && uv run ruff check . \
  && uv run pyright && uv run pytest
cd web && pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Server tests run against an isolated `saaya_test` database they create
themselves; they never touch development data, but they do need the
compose Postgres running.

## House rules

- **Comments explain why, never what.** A comment states a constraint, an
  invariant, or a tradeoff the code cannot show. If the next line already
  says it, delete the comment.
- **Root causes, not patches.** If a test flakes, fix the race. If a
  formatter fights you, fix the structure.
- **Honest exit codes.** Never hide a failing command behind a pipe or a
  `tail`. CI runs exactly the gates above; green locally must mean green
  in CI.
- **The ledger is the truth.** UI renders persisted state. Do not invent
  frontend state that the backend cannot reconstruct after a restart.
- **No LLM judges.** Validation that gates behavior must be deterministic
  and explainable.
- **Migrations**: edit `db/models.py` first, then `alembic revision
  --autogenerate`, then read the generated migration before upgrading.
  Never touch the LangGraph-owned tables.
- **Accessibility is a gate.** Every Storybook story runs axe at error
  severity. New interactive surfaces need stories.
- **Privacy fixtures.** Anything public-facing (about page, stories,
  docs, screenshots) uses the fictional demonstration dataset only. A CI
  test enforces this; do not weaken it.

## Branches, commits, and PRs

- Feature work happens on branches; never force-push shared history.
- Commit messages are plain sentences describing the change, no ticket
  tags, no changelog prose.
- A change is done when: the relevant gates pass, the rendered result was
  actually inspected (Playwright for UI), new behavior has tests, and
  durable decisions or evidence landed in `journal/` with frontmatter
  (`journal/decisions/` for ADRs, `journal/progress/` for evidence).

Pull request checklist:

1. All server and web gates green, honestly.
2. UI changes verified in the rendered app, including dark mode and a
   narrow viewport where relevant.
3. Tests added or extended for new behavior.
4. No secrets, no personal data, no real-user fixtures.
5. Journal entry for anything a future maintainer would need to know.
6. Docs updated when a claim in them stops being true.

## Security

Do not open public issues for vulnerabilities; use GitHub's private
vulnerability reporting as described in [SECURITY.md](SECURITY.md).
