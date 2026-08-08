"""Title derivation: deterministic, user-content-only, safe truncation."""

from saaya.api.history import TranscriptMessage
from saaya.api.titles import FALLBACK_TITLE, derive_title, first_user_text


class TestDeriveTitle:
    def test_plain_request_becomes_a_clean_title(self) -> None:
        assert (
            derive_title("please help me draft the release notes for 2.1")
            == "Draft the release notes for 2.1"
        )

    def test_prompt_prefixes_are_stripped_iteratively(self) -> None:
        assert derive_title("hey saaya, can you review my standup notes") == (
            "Review my standup notes"
        )

    def test_word_cap_keeps_roughly_seven_words(self) -> None:
        text = "one two three four five six seven eight nine"
        assert derive_title(text) == "One two three four five six seven"

    def test_character_cap_truncates_at_a_word_boundary(self) -> None:
        text = "extraordinarily complicated deployment scenarios investigation notes"
        title = derive_title(text)
        assert len(title) <= 63
        assert title.endswith("...")
        assert " " in title

    def test_whitespace_collapses(self) -> None:
        assert derive_title("  fix \n\n the   flaky  test  ") == "Fix the flaky test"

    def test_unsuitable_input_falls_back(self) -> None:
        assert derive_title("") == FALLBACK_TITLE
        assert derive_title("   ") == FALLBACK_TITLE
        assert derive_title("!!! ???") == FALLBACK_TITLE
        assert derive_title("hey") == FALLBACK_TITLE

    def test_short_messages_survive(self) -> None:
        assert derive_title("standup") == "Standup"


class TestFirstUserText:
    def test_only_user_messages_are_eligible(self) -> None:
        transcript = [
            TranscriptMessage(role="assistant", text="I recalled something private."),
            TranscriptMessage(role="user", text="draft the notes"),
        ]
        assert first_user_text(transcript) == "draft the notes"

    def test_assistant_only_threads_yield_nothing(self) -> None:
        transcript = [TranscriptMessage(role="assistant", text="A remembered private fact.")]
        assert first_user_text(transcript) is None

    def test_empty_user_turns_are_skipped(self) -> None:
        transcript = [
            TranscriptMessage(role="user", text="   "),
            TranscriptMessage(role="user", text="real question"),
        ]
        assert first_user_text(transcript) == "real question"


def test_thread_source_classification() -> None:
    from saaya.api.routes import thread_source

    assert thread_source("3f2a") == "web"
    assert thread_source("slack:D42") == "slack-dm"
    assert thread_source("slack:C7:123.45") == "slack-thread"
    assert thread_source("mcp-abc") == "mcp"


def test_slack_mention_tokens_are_markup_not_words() -> None:
    assert derive_title("hello <@U0BOTID>") == FALLBACK_TITLE
    assert derive_title("<@U0BOTID> summarize the standup notes") == ("Summarize the standup notes")


def test_command_prompts_keep_only_the_first_clause() -> None:
    assert (
        derive_title("reverse_text the word probe6, just the result")
        == "Reverse_text the word probe6"
    )
    assert (
        derive_title("draft the release notes: use the new format please")
        == "Draft the release notes"
    )


def test_short_first_clauses_do_not_truncate_meaning() -> None:
    assert derive_title("quick check, what changed in staging yesterday") == (
        "Quick check, what changed in staging yesterday"
    )
