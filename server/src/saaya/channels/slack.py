"""Slack over Socket Mode: DMs and mentions run full agent turns.

Pure decision helpers stay separate from the Bolt wiring so they test
without Slack.
"""

# Bolt's decorators are untyped and register handlers the runtime invokes,
# so the unknown-decorator and unused-function rules do not apply here.
# pyright: reportUnusedFunction=false, reportUnknownMemberType=false, reportUntypedFunctionDecorator=false

from typing import Any

from slack_bolt.adapter.socket_mode.async_handler import AsyncSocketModeHandler
from slack_bolt.async_app import AsyncApp

from saaya.heartbeat.activity import ThreadActivity


def should_handle_message(event: dict[str, Any]) -> bool:
    """Human, non-edited, direct messages only; everything else is noise or
    handled by the mention path."""
    if event.get("bot_id") or event.get("subtype"):
        return False
    if event.get("channel_type") != "im":
        return False
    return bool(event.get("text", "").strip())


def thread_id_for(event: dict[str, Any]) -> str:
    """DMs are one continuous conversation; channel mentions get one thread
    per Slack thread."""
    channel = str(event.get("channel", "unknown"))
    if event.get("channel_type") == "im":
        return f"slack:{channel}"
    anchor = str(event.get("thread_ts") or event.get("ts") or "root")
    return f"slack:{channel}:{anchor}"


def strip_mention(text: str) -> str:
    """Remove the leading <@BOTID> from app_mention text."""
    stripped = text.strip()
    if stripped.startswith("<@") and ">" in stripped:
        stripped = stripped.split(">", 1)[1]
    return stripped.strip()


class SlackChannel:
    def __init__(
        self,
        *,
        bot_token: str,
        app_token: str,
        get_agent: Any,
        activity: ThreadActivity,
    ) -> None:
        self._app = AsyncApp(token=bot_token)
        self._handler = AsyncSocketModeHandler(self._app, app_token)
        self._get_agent = get_agent
        self._activity = activity
        self._register()

    def _register(self) -> None:
        @self._app.event("message")
        async def on_message(event: dict[str, Any], say: Any) -> None:
            if not should_handle_message(event):
                return
            await self._run_turn(event, str(event.get("text", "")), say)

        @self._app.event("app_mention")
        async def on_mention(event: dict[str, Any], say: Any) -> None:
            text = strip_mention(str(event.get("text", "")))
            if text:
                await self._run_turn(event, text, say)

    async def _run_turn(self, event: dict[str, Any], text: str, say: Any) -> None:
        thread_id = thread_id_for(event)
        await self._activity.mark_active(thread_id)
        reply_thread = event.get("thread_ts") or (
            event.get("ts") if event.get("channel_type") != "im" else None
        )
        try:
            result = await self._get_agent().ainvoke(
                {"messages": [{"role": "user", "content": text}]},
                config={"configurable": {"thread_id": thread_id}},
            )
            messages = result.get("messages", [])
            final = messages[-1] if messages else None
            reply = str(getattr(final, "text", "") or "").strip() or "Done."
        except Exception:
            reply = (
                "That turn failed on my side. The error is in my logs; try once more or rephrase."
            )
        await say(text=reply, thread_ts=reply_thread)

    async def connect(self) -> None:
        await self._handler.connect_async()

    async def close(self) -> None:
        await self._handler.close_async()
