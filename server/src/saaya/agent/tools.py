"""Tools available to the agent. One module until a second concern appears."""

from datetime import UTC, datetime

from langchain_core.tools import tool


@tool
def current_datetime() -> str:
    """Return the current date and time with timezone."""
    now = datetime.now(UTC).astimezone()
    return now.strftime("%A, %B %d, %Y at %H:%M %Z")
