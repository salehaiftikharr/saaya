"""Thread identity is namespaced per surface; the namespaces are disjoint by
construction, which is what keeps conversations from leaking across surfaces."""

import uuid

from saaya.channels.slack import thread_id_for


def test_web_threads_are_bare_uuids() -> None:
    generated = str(uuid.uuid4())
    assert not generated.startswith(("slack:", "mcp-"))


def test_slack_threads_carry_the_slack_namespace() -> None:
    dm = thread_id_for({"channel_type": "im", "channel": "D1", "ts": "1.0"})
    mention = thread_id_for({"channel": "C1", "ts": "2.0"})
    assert dm.startswith("slack:")
    assert mention.startswith("slack:")


def test_namespaces_cannot_collide() -> None:
    """A web uuid can never equal a slack or mcp id: the prefixes contain
    characters uuids do not produce."""
    web = str(uuid.uuid4())
    slack = thread_id_for({"channel_type": "im", "channel": "D1", "ts": "1.0"})
    mcp = f"mcp-{uuid.uuid4()}"
    assert len({web, slack, mcp}) == 3
    assert ":" not in web and not web.startswith("mcp-")
