"""Bearer-token verification for the MCP endpoint.

One static operator token from settings; constant-time comparison. Empty
token means the MCP surface stays disabled.
"""

import hmac

from mcp.server.auth.provider import AccessToken, TokenVerifier


class StaticTokenVerifier(TokenVerifier):
    def __init__(self, expected_token: str) -> None:
        self._expected = expected_token

    async def verify_token(self, token: str) -> AccessToken | None:
        if self._expected == "":
            return None
        if not hmac.compare_digest(token, self._expected):
            return None
        return AccessToken(token=token, client_id="operator", scopes=["operator"])
