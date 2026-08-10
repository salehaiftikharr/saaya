# P-040: Hosting readiness

The phase that stands between a localhost product and a deployed one:
one door for the owner, results that reach her where she is, a repaired
local-CI parity guarantee, a screenshot worth the README's claims, and
the runbook for the managed-platform split.

## The auth gate (8fb818a)

`AUTH_PASSPHRASE` set turns on a raw ASGI middleware in front of every
`/api` route: HMAC-signed stateless session cookies (30 days, HttpOnly,
SameSite=Lax, Secure on https), constant-time login compare, per-address
lockout (ten failures, fifteen minutes), `/health` and `/api/auth/*`
public, `/mcp` keeping its own bearer. Unset, local development stays
open. The middleware is deliberately not BaseHTTPMiddleware so SSE
streams pass untouched; a browser session was driven end to end (401
wall, wrong passphrase copy, unlock into the full app, streaming
confirmed with the cookie over curl). The web side gates at the root:
session first, then the app, so no poller ever mounts against a locked
API. Eight hermetic tests cover tokens, middleware, login, lockout, and
the disabled state.

## Slack delivery of terminal results (a45731e)

The worker fires an `on_terminal` hook after the runner returns; a
composer builds the summary (state, goal, error with a retry hint,
artifact titles, step count) and posts it to the job's origin Slack
thread, or to `SLACK_OWNER_ID` as a DM for web and schedule jobs.
Best-effort by design: the ledger is the truth and a failed post only
logs. Four hermetic tests pin the routing table and the composed text.

## The parity repair (f12db3f)

CI failed pyright twice on tests green locally. Root cause, proven not
guessed: the locked starlette prefers an `httpx2` client for its
TestClient and falls back to `httpx` with partially unknown types; a
stray `httpx2` in the stale local venv resolved everything here while
CI, syncing only the lock, saw Unknown members. A fresh lock-only venv
reproduced CI's five errors on this machine; a Linux container running
the exact CI steps reproduced the failure on the old tree and passed on
the fix before it was pushed. `httpx2` joined the dev dependencies,
which is starlette's own migration path, and the stale venv was rebuilt
from the lock so local green means CI green again.

## The screenshot that earns its place (29c0760)

The README capture now shows a seven-step release readiness job on the
fictional Atlas project, parked at a git commit approval: grouped tool
calls with measured durations, three registered artifacts, a recovery
event and a refused command in the ledger, threads from all three doors
in the sidebar, light and dark variants at retina scale. Same recipe as
P-038: the real product UI over a network-mocked fictional dataset, with
a catch-all route registered first so nothing live can leak into a
public image, and the Next dev badge excluded as development chrome.

## The split-hosting runbook (this commit)

`docs/DEPLOYMENT.md` gains the Render + Neon + Vercel section: one
always-on Render instance (ADR-009 forbids replicas), persistent disk
for the workspace, `/health` as the public probe, Neon with
`sslmode=require` and the pgvector extension created by migrations,
Vercel carrying only `SAAYA_API_URL` for the rewrite that keeps cookies
first party, and the SSE verification step spelled out with the
single-origin fallback if a proxy buffers the stream.

## Verification

- Server: 135 tests, ruff, pyright strict, all green locally and in CI
  (runs for 8fb818a's fix chain through 29c0760 conclude success).
- Web: full suite including the privacy gate over the new screenshot
  content; every fixture name in the capture is from the reviewed
  fictional dataset.
- The Linux chamber (`ghcr.io/astral-sh/uv` image, CI's exact steps) is
  the new tool for any future local-CI divergence.

## Owner-facing state

Phase 2 of going live is account setup on Render, Neon, and Vercel with
the runbook above; that work is the owner's by agreement, with the env
list ready to paste.
