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
    assert [m.model_dump() for m in transcript] == [
        {"role": "user", "text": "hello"},
        {"role": "assistant", "text": "hi there"},
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
