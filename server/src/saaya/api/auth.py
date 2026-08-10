"""Owner authentication for the deployed instance.

Auth is enabled only when AUTH_PASSPHRASE is set, so local development and
the hermetic test suite stay open by default. When enabled, every /api/*
route requires a signed session cookie except the auth endpoints
themselves; /health stays public for probes, and the /mcp mount keeps its
own bearer check.

The session token is an expiry timestamp signed with an HMAC key derived
from the passphrase; verifying is stateless, so restarts do not log the
owner out. Login failures rate-limit per source address in memory, which
is correct here because the server is exactly one process (ADR-009)."""

import hashlib
import hmac
import secrets
import time
from collections.abc import Awaitable, Callable, MutableMapping
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field

COOKIE_NAME = "saaya_session"
SESSION_SECONDS = 30 * 24 * 3600
MAX_FAILURES = 10
LOCKOUT_SECONDS = 15 * 60

Scope = MutableMapping[str, Any]
Receive = Callable[[], Awaitable[MutableMapping[str, Any]]]
Send = Callable[[MutableMapping[str, Any]], Awaitable[None]]
AsgiApp = Callable[[Scope, Receive, Send], Awaitable[None]]

_PUBLIC_PREFIXES = ("/api/auth/",)
_PUBLIC_EXACT = frozenset({"/health"})


def _key(passphrase: str) -> bytes:
    return hashlib.sha256(f"saaya-session:{passphrase}".encode()).digest()


def mint_token(passphrase: str, now: float | None = None) -> str:
    expires = int((now if now is not None else time.time()) + SESSION_SECONDS)
    signature = hmac.new(_key(passphrase), str(expires).encode(), hashlib.sha256)
    return f"{expires}.{signature.hexdigest()}"


def verify_token(passphrase: str, token: str, now: float | None = None) -> bool:
    expires_raw, _, signature = token.partition(".")
    if not expires_raw.isdigit() or not signature:
        return False
    if int(expires_raw) < (now if now is not None else time.time()):
        return False
    expected = hmac.new(_key(passphrase), expires_raw.encode(), hashlib.sha256)
    return hmac.compare_digest(expected.hexdigest(), signature)


def _cookie_token(scope: Scope) -> str:
    headers = dict(scope.get("headers") or [])
    cookie_header = headers.get(b"cookie", b"").decode("latin-1")
    for part in cookie_header.split(";"):
        name, _, value = part.strip().partition("=")
        if name == COOKIE_NAME:
            return value
    return ""


def auth_middleware(app: AsgiApp, passphrase: str) -> AsgiApp:
    """Raw ASGI so streaming responses pass through untouched."""

    async def guarded(scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await app(scope, receive, send)
            return
        path = str(scope.get("path", ""))
        needs_auth = path.startswith("/api/") and not path.startswith(_PUBLIC_PREFIXES)
        if path in _PUBLIC_EXACT:
            needs_auth = False
        if needs_auth and not verify_token(passphrase, _cookie_token(scope)):
            await send(
                {
                    "type": "http.response.start",
                    "status": 401,
                    "headers": [(b"content-type", b"application/json")],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b'{"detail": "authentication required"}',
                }
            )
            return
        await app(scope, receive, send)

    return guarded


class LoginBody(BaseModel):
    passphrase: str = Field(min_length=1, max_length=512)


class SessionInfo(BaseModel):
    required: bool
    authenticated: bool


class FailureTracker:
    """Per-address lockout; in-memory is correct for the one-process server."""

    def __init__(self) -> None:
        self._by_address: dict[str, tuple[int, float]] = {}

    def locked(self, address: str, now: float) -> bool:
        count, until = self._by_address.get(address, (0, 0.0))
        return count >= MAX_FAILURES and now < until

    def record_failure(self, address: str, now: float) -> None:
        count, _ = self._by_address.get(address, (0, 0.0))
        self._by_address[address] = (count + 1, now + LOCKOUT_SECONDS)

    def reset(self, address: str) -> None:
        self._by_address.pop(address, None)


def build_auth_router(passphrase: str, failures: FailureTracker | None = None) -> APIRouter:
    router = APIRouter()
    tracker = failures or FailureTracker()

    def _address(request: Request) -> str:
        return request.client.host if request.client else "unknown"

    @router.get("/api/auth/session")
    async def session(request: Request) -> SessionInfo:  # pyright: ignore[reportUnusedFunction]
        if not passphrase:
            return SessionInfo(required=False, authenticated=True)
        token = request.cookies.get(COOKIE_NAME, "")
        return SessionInfo(required=True, authenticated=verify_token(passphrase, token))

    @router.post("/api/auth/login")
    async def login(  # pyright: ignore[reportUnusedFunction]
        request: Request, body: LoginBody, response: Response
    ) -> SessionInfo:
        if not passphrase:
            return SessionInfo(required=False, authenticated=True)
        address = _address(request)
        now = time.time()
        if tracker.locked(address, now):
            raise HTTPException(
                status_code=429,
                detail="Too many attempts; wait fifteen minutes and try again.",
            )
        if not secrets.compare_digest(body.passphrase, passphrase):
            tracker.record_failure(address, now)
            raise HTTPException(status_code=401, detail="That passphrase is not right.")
        tracker.reset(address)
        response.set_cookie(
            COOKIE_NAME,
            mint_token(passphrase),
            max_age=SESSION_SECONDS,
            httponly=True,
            samesite="lax",
            secure=request.url.scheme == "https",
            path="/",
        )
        return SessionInfo(required=True, authenticated=True)

    @router.post("/api/auth/logout")
    async def logout(response: Response) -> SessionInfo:  # pyright: ignore[reportUnusedFunction]
        response.delete_cookie(COOKIE_NAME, path="/")
        return SessionInfo(required=bool(passphrase), authenticated=not passphrase)

    return router
