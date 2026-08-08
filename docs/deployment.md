# Deploying Saaya

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

## Operational notes

- Upgrades: `git pull && docker compose --profile full up --build -d`;
  migrations run at server start and are additive.
- Health: `GET /api/health` reports every surface (web, slack, mcp);
  heartbeat history is at `GET /api/heartbeats`.
- The reflect heartbeat and Slack reconnect on restart; conversations and
  tools survive because their state is in Postgres and the workspace.
