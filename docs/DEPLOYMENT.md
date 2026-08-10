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

## Split hosting (Render + Neon + Vercel)

The managed-platform shape: the server runs as one Render web service,
Postgres lives on Neon, and the web app deploys to Vercel with a rewrite
that proxies `/api/*` to the server. The rewrite is what makes the split
work: the browser only ever talks to the page's own origin, so the
session cookie stays first party and no CORS surface exists.

**Neon.** Create a project and copy the connection string. The migrations
run `CREATE EXTENSION IF NOT EXISTS vector` at first boot, which Neon
supports on every plan. Keep `?sslmode=require` on the URL.

**Render.** One web service from this repository (`server/` root,
Docker). Rules that do not bend:

- Exactly one instance, never autoscaled (ADR-009: the worker, schedule
  ticker, and heartbeat live in the process; replicas double-fire).
- An always-on instance type. A free instance that sleeps kills running
  jobs and misses schedule fires.
- Attach a persistent disk and point `WORKSPACE_DIR` and
  `JOBS_WORKSPACE_DIR` at its mount path, or artifacts and procedural
  memory vanish on deploy.
- Health check path `/health`: it is the one route that stays public
  when the passphrase gate is on; `/api/health` sits behind the cookie.

Environment on the server service: `CLAUDE_API_KEY`, `OPENAI_API_KEY`,
`DATABASE_URL` (the Neon URL with `sslmode=require`), `AUTH_PASSPHRASE`
(long and random; it is the only door), and `PUBLIC_URL` set to the
service's https origin. Optional surfaces as needed: `SLACK_BOT_TOKEN`
and `SLACK_APP_TOKEN` for the Slack door, `SLACK_OWNER_ID` so finished
jobs from web and schedules reach your DM, and a strong generated
`MCP_TOKEN` if MCP is wanted. MCP clients connect straight to the Render
origin at `/mcp`; only `/api/*` flows through the Vercel rewrite.

**Vercel.** Import the repository with root directory `web/` and set one
environment variable: `SAAYA_API_URL`, the Render origin. The build
already contains the rewrite that forwards `/api/:path*` there.

**Verify the stream before trusting the deploy.** SSE now crosses two
proxies, and any buffering layer turns the live transcript into a
spinner. After deploying, log in on the Vercel origin and confirm chat
tokens render as they stream, or watch it directly:

```console
curl -N -H "Cookie: saaya_session=<value from the browser>" \
  https://<your-app>.vercel.app/api/jobs/<id>/events
```

Rows should appear one at a time, not in a burst at the end. The server
already sends `Cache-Control: no-transform` and `X-Accel-Buffering: no`.
If the stream still arrives buffered through the rewrite, the fallback
is the single-origin shape: run the container stack behind one proxy
(the small VM guide above), where SSE is proven.

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
