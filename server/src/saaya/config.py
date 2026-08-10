"""Application settings, the only place environment variables are read.

The Anthropic key is named CLAUDE_API_KEY in this project's env files (owner
convention); langchain-anthropic defaults to ANTHROPIC_API_KEY, so the key is
always passed to clients explicitly from here.
"""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=REPO_ROOT / ".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    claude_api_key: str = ""
    openai_api_key: str = ""
    database_url: str = "postgresql://saaya:saaya@localhost:5433/saaya"

    langsmith_api_key: str = ""
    langsmith_tracing: bool = False
    langsmith_project: str = "saaya-dev"

    slack_bot_token: str = ""
    slack_app_token: str = ""

    workspace_dir: Path = REPO_ROOT / "workspace"
    jobs_workspace_dir: Path = REPO_ROOT / "workspace" / "jobs"
    jobs_worker_enabled: bool = True

    mcp_token: str = ""
    auth_passphrase: str = ""
    public_url: str = "http://localhost:8000"

    heartbeat_interval_seconds: int = 300
    heartbeat_quiet_seconds: int = 600

    chat_model: str = "anthropic:claude-sonnet-4-6"
    embedding_model: str = "openai:text-embedding-3-small"


def load_settings() -> Settings:
    """Read settings from the environment and the repo-root .env.local,
    failing fast with named errors: a missing key should stop the boot
    with its name, not surface as a provider error on the first model
    call."""
    settings = Settings()
    missing = [
        env_name
        for env_name, value in (
            ("CLAUDE_API_KEY", settings.claude_api_key),
            ("OPENAI_API_KEY", settings.openai_api_key),
        )
        if not value
    ]
    if missing:
        raise RuntimeError(
            "Missing required settings: "
            + ", ".join(missing)
            + ". Copy .env.example to .env.local and fill them in."
        )
    return settings
