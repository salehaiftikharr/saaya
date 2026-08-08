"""Transcript mapping tests. Hermetic: structural fakes, no framework imports."""

from saaya.api.history import to_transcript


class FakeMessage:
    def __init__(self, kind: str, text: str = "", content: object = "") -> None:
        self.type = kind
        self.text = text
        self.content = content


def test_maps_user_and_assistant_turns() -> None:
    transcript = to_transcript(
        [FakeMessage("human", text="hello"), FakeMessage("ai", text="hi there")]
    )
    assert [(m.role, m.text) for m in transcript] == [
        ("user", "hello"),
        ("assistant", "hi there"),
    ]


def test_tool_messages_and_empty_ai_turns_are_excluded() -> None:
    transcript = to_transcript(
        [
            FakeMessage("human", text="time?"),
            FakeMessage("ai", text=""),
            FakeMessage("tool", text="Friday"),
            FakeMessage("ai", text="It is Friday."),
        ]
    )
    assert [m.role for m in transcript] == ["user", "assistant"]


def test_content_block_fallback_extracts_text() -> None:
    message = FakeMessage(
        "ai",
        content=[
            {"type": "text", "text": "part one "},
            {"type": "tool_use", "name": "x"},
            {"type": "text", "text": "part two"},
        ],
    )
    assert to_transcript([message])[0].text == "part one part two"


def test_callable_text_attribute_is_tolerated() -> None:
    message = FakeMessage("human")
    message.text = lambda: "from method"  # type: ignore[assignment]  (simulating older langchain-core)
    assert to_transcript([message])[0].text == "from method"


def test_context_query_takes_the_last_user_message() -> None:
    from saaya.api.history import context_query, to_transcript

    transcript = to_transcript(
        [
            FakeMessage("human", text="first question"),
            FakeMessage("ai", text="answer"),
            FakeMessage("human", text="follow-up about deploys"),
            FakeMessage("ai", text="deploy answer"),
        ]
    )
    assert context_query(transcript) == "follow-up about deploys"


def test_context_query_is_none_for_empty_threads() -> None:
    from saaya.api.history import context_query

    assert context_query([]) is None


def test_tool_activity_rides_the_assistant_turn() -> None:
    class ToolCallMessage(FakeMessage):
        def __init__(self) -> None:
            super().__init__("ai", text="")
            self.tool_calls = [{"id": "c1", "name": "reverse_text"}]

    class ToolResult(FakeMessage):
        def __init__(self) -> None:
            super().__init__("tool", text="6eborp")
            self.tool_call_id = "c1"

    transcript = to_transcript(
        [
            FakeMessage("human", text="reverse probe6"),
            ToolCallMessage(),
            ToolResult(),
            FakeMessage("ai", text="6eborp"),
        ]
    )
    assert transcript[1].role == "assistant"
    assert transcript[1].activities[0].name == "reverse_text"
    assert transcript[1].activities[0].output_preview == "6eborp"
