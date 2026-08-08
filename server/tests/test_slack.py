"""Slack decision helpers. Hermetic: plain dicts, no Slack."""

from saaya.channels.slack import should_handle_message, strip_mention, thread_id_for


class TestShouldHandle:
    def test_human_dm_is_handled(self) -> None:
        assert should_handle_message({"channel_type": "im", "text": "hello", "user": "U1"})

    def test_bot_messages_are_ignored(self) -> None:
        assert not should_handle_message({"channel_type": "im", "text": "hi", "bot_id": "B1"})

    def test_edits_and_system_subtypes_are_ignored(self) -> None:
        assert not should_handle_message(
            {"channel_type": "im", "text": "hi", "subtype": "message_changed"}
        )

    def test_channel_chatter_is_left_to_mentions(self) -> None:
        assert not should_handle_message({"channel_type": "channel", "text": "hi"})

    def test_empty_text_is_ignored(self) -> None:
        assert not should_handle_message({"channel_type": "im", "text": "   "})


class TestThreadIdentity:
    def test_dm_is_one_continuous_conversation(self) -> None:
        assert thread_id_for({"channel_type": "im", "channel": "D42", "ts": "1.0"}) == "slack:D42"

    def test_mention_threads_by_slack_thread(self) -> None:
        event = {"channel": "C7", "ts": "9.9", "thread_ts": "5.5"}
        assert thread_id_for(event) == "slack:C7:5.5"

    def test_top_level_mention_anchors_its_own_thread(self) -> None:
        assert thread_id_for({"channel": "C7", "ts": "9.9"}) == "slack:C7:9.9"


class TestStripMention:
    def test_leading_mention_is_removed(self) -> None:
        assert strip_mention("<@U0BOT> what time is it") == "what time is it"

    def test_plain_text_is_untouched(self) -> None:
        assert strip_mention("hello") == "hello"
