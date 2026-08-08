"""Settings tests. Hermetic: no real env file, no real keys."""

import pytest
from pydantic_settings import SettingsConfigDict

from saaya.config import Settings


class EnvOnlySettings(Settings):
    """Settings without the repo .env.local, so tests see only the process env."""

    model_config = SettingsConfigDict(env_file=None, extra="ignore")


@pytest.fixture()
def clean_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (
        "CLAUDE_API_KEY",
        "OPENAI_API_KEY",
        "DATABASE_URL",
        "LANGSMITH_API_KEY",
        "LANGSMITH_TRACING",
        "SLACK_BOT_TOKEN",
        "SLACK_APP_TOKEN",
    ):
        monkeypatch.delenv(name, raising=False)


def test_reads_claude_api_key_by_project_name(
    clean_env: None, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("CLAUDE_API_KEY", "test-key")
    settings = EnvOnlySettings()
    assert settings.claude_api_key == "test-key"


def test_defaults_are_safe_without_environment(clean_env: None) -> None:
    settings = EnvOnlySettings()
    assert settings.claude_api_key == ""
    assert settings.database_url.startswith("postgresql://")
    assert settings.langsmith_tracing is False


def test_chat_model_default_is_anthropic(clean_env: None) -> None:
    settings = EnvOnlySettings()
    assert settings.chat_model.startswith("anthropic:")
