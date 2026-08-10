"""Auth gate tests, hermetic: the token primitives, the middleware over a
minimal app, and the login flow with its lockout. No database, no model
clients, no full lifespan."""

import time

from fastapi import FastAPI
from fastapi.testclient import TestClient

from saaya.api.auth import (
    COOKIE_NAME,
    FailureTracker,
    auth_middleware,
    build_auth_router,
    mint_token,
    verify_token,
)

PASSPHRASE = "correct horse battery staple"


# --- token primitives -----------------------------------------------------


def test_token_round_trip_and_tamper() -> None:
    token = mint_token(PASSPHRASE)
    assert verify_token(PASSPHRASE, token)
    assert not verify_token(PASSPHRASE, token + "x")
    assert not verify_token("different passphrase", token)
    assert not verify_token(PASSPHRASE, "garbage")
    assert not verify_token(PASSPHRASE, "")


def test_token_expiry() -> None:
    old = mint_token(PASSPHRASE, now=time.time() - 31 * 24 * 3600)
    assert not verify_token(PASSPHRASE, old)


# --- middleware and endpoints --------------------------------------------


def build_app(passphrase: str = PASSPHRASE) -> TestClient:
    app = FastAPI()
    app.include_router(build_auth_router(passphrase))

    @app.get("/api/threads")
    async def threads() -> list[str]:  # pyright: ignore[reportUnusedFunction]
        return ["thread"]

    @app.get("/health")
    async def health() -> dict[str, str]:  # pyright: ignore[reportUnusedFunction]
        return {"status": "ok"}

    guarded = auth_middleware(app, passphrase) if passphrase else app
    return TestClient(guarded)  # type: ignore[arg-type]


def test_unauthenticated_api_is_refused() -> None:
    client = build_app()
    assert client.get("/api/threads").status_code == 401


def test_health_and_session_stay_public() -> None:
    client = build_app()
    assert client.get("/health").status_code == 200
    session = client.get("/api/auth/session")
    assert session.status_code == 200
    assert session.json() == {"required": True, "authenticated": False}


def test_login_grants_and_logout_revokes() -> None:
    client = build_app()
    login = client.post("/api/auth/login", json={"passphrase": PASSPHRASE})
    assert login.status_code == 200
    assert COOKIE_NAME in login.cookies
    assert client.get("/api/threads").status_code == 200
    assert client.get("/api/auth/session").json()["authenticated"] is True

    client.post("/api/auth/logout")
    assert client.get("/api/threads").status_code == 401


def test_wrong_passphrase_refused_and_locks_out() -> None:
    client = build_app()
    for _ in range(10):
        refused = client.post("/api/auth/login", json={"passphrase": "wrong"})
        assert refused.status_code == 401
    locked = client.post("/api/auth/login", json={"passphrase": PASSPHRASE})
    assert locked.status_code == 429, "even the right passphrase waits out a lockout"


def test_lockout_expires() -> None:
    tracker = FailureTracker()
    now = time.time()
    for _ in range(10):
        tracker.record_failure("1.2.3.4", now)
    assert tracker.locked("1.2.3.4", now)
    assert not tracker.locked("1.2.3.4", now + 16 * 60)


def test_disabled_auth_leaves_everything_open() -> None:
    client = build_app(passphrase="")
    assert client.get("/api/threads").status_code == 200
    session = client.get("/api/auth/session").json()
    assert session == {"required": False, "authenticated": True}
