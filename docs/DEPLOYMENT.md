# Deploying Saaya

Three modes, in increasing seriousness: local development (host processes
plus a compose Postgres, the README's Run locally path), the container
stack (everything below), and production. The production rule: **set
`AUTH_PASSPHRASE` before anything faces the internet.** With it set,
every API route requires the owner's session cookie; without it the
instance is wide open and belongs on localhost only.

Saaya ships as three containers: server (FastAPI + agent), web (Next.js),
and PostgreSQL with pgvector. Locally and on a small VM the stack is one
command:

```console
docker compose --profile full up --build -d
```

Both application images run as non-root users (saaya and node).

## Small VM guide (Hetzner, DigitalOcean, or similar)

1. Provision Ubuntu 24.04 with 4 GB RAM, install Docker Engine and the
   compose plugin.
2. Clone the repository and create `.env.local` from `.env.example` on the
   VM (never copy your development env file; issue fresh keys).
3. `docker compose --profile full up --build -d`.
4. Put a reverse proxy in front for TLS. Caddy is the least ceremony:

   ```
   saaya.example.com {
       reverse_proxy /api/* localhost:8000
       reverse_proxy /mcp* localhost:8000
       reverse_proxy localhost:3000
   }
   ```

   Caddy provisions certificates automatically. Once proxied, remove the
   published ports for server and web from the compose file so only the
   proxy is reachable, and set PUBLIC_URL to the https origin for the MCP
   resource metadata.
5. Slack needs no inbound network (Socket Mode connects outward); MCP
   clients connect to `https://saaya.example.com/mcp` with the bearer token.

## Backups

Two things hold state; everything else rebuilds from the repository.

- Postgres: `docker compose exec postgres pg_dump -U saaya saaya | gzip >
  saaya-$(date +%F).sql.gz` on a cron; restore with psql into a fresh
  volume.
- Workspace: `tar czf workspace-$(date +%F).tar.gz workspace/` captures
  procedural memory, versions, rejected-proposal evidence, and active tool
  scripts.

Take both together so memory rows and memory files stay consistent.

## Runtime requirements that are easy to miss

- **Exactly one server process.** The job worker, schedule ticker, and
  reflection heartbeat live inside the FastAPI process. Never scale it to
  multiple workers or replicas: schedules would double-fire. One process
  is the design (ADR-009), and restart recovery makes it safe.
- **Persistent storage for `workspace/`.** Job workspaces, procedural
  memory, and active tool scripts live there. In the compose stack it is
  a bind mount; on any host with an ephemeral filesystem, mount a
  persistent disk at the workspace path and set `WORKSPACE_DIR` and
  `JOBS_WORKSPACE_DIR` accordingly, or artifacts will not survive
  deploys.
- **Migrations are automatic.** The server container runs
  `alembic upgrade head` at boot; first boot creates everything,
  upgrades are additive, and the LangGraph-owned tables are guarded from
  autogenerate.
- **Environment.** Every variable is documented by name in
  `.env.example`. Required: `CLAUDE_API_KEY`, `OPENAI_API_KEY`,
  `DATABASE_URL`, and in production `AUTH_PASSPHRASE` (long and random;
  it is the only door). Optional surfaces: `SLACK_BOT_TOKEN` +
  `SLACK_APP_TOKEN` (plus Slack event subscriptions), `MCP_TOKEN`
  (generate a strong value for anything beyond localhost),
  `LANGSMITH_API_KEY`. Managed Postgres usually needs
  `?sslmode=require` on the URL.
- **Slack is outbound only** (Socket Mode); it works behind NAT with no
  inbound route. **MCP is inbound** and bearer-authenticated; expose it
  only through TLS and treat the token as a credential.

## Operational notes

- Upgrades: `git pull && docker compose --profile full up --build -d`;
  migrations run at server start and are additive.
- Health: `GET /api/health` reports every surface (web, slack, mcp);
  heartbeat history is at `GET /api/heartbeats`.
- The reflect heartbeat and Slack reconnect on restart; conversations and
  tools survive because their state is in Postgres and the workspace.
