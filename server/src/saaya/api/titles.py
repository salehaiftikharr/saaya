"""Conversation titles, derived deterministically from user-authored text.

The only permitted input is text the user typed into that conversation:
never assistant output, retrieved memories, tool results, or system
content. No model call is involved.
"""

import re

from saaya.api.history import TranscriptMessage

MAX_TITLE_CHARS = 60
MAX_TITLE_WORDS = 7
FALLBACK_TITLE = "New conversation"

# Conversational throat-clearing that carries no identity.
_PREFIXES = (
    "please",
    "hey saaya",
    "hi saaya",
    "hello saaya",
    "saaya",
    "hey",
    "hi",
    "hello",
    "ok",
    "okay",
    "so",
    "can you",
    "could you",
    "would you",
    "help me",
)


def derive_title(text: str) -> str:
    # Slack mention and channel tokens are markup, not words.
    text = re.sub(r"<[@#!][^>]*>", " ", text)
    cleaned = " ".join(text.split()).strip()
    lowered = cleaned.lower()
    changed = True
    while changed:
        changed = False
        for prefix in _PREFIXES:
            boundary_ok = lowered == prefix or (
                lowered.startswith(prefix)
                and len(lowered) > len(prefix)
                and lowered[len(prefix)] in " ,:;!.-"
            )
            if boundary_ok:
                cleaned = cleaned[len(prefix) :].lstrip(" ,:;!.-")
                lowered = cleaned.lower()
                changed = True
    cleaned = cleaned.strip()
    if not re.search(r"[a-zA-Z0-9]", cleaned):
        return FALLBACK_TITLE

    words = cleaned.split()
    candidate = " ".join(words[:MAX_TITLE_WORDS])
    truncated = False
    if len(candidate) > MAX_TITLE_CHARS:
        cut = candidate[: MAX_TITLE_CHARS + 1]
        head, _, _ = cut.rpartition(" ")
        candidate = (head or candidate[:MAX_TITLE_CHARS]).rstrip()
        truncated = True
    candidate = candidate.rstrip(" ,:;.-")
    if not candidate:
        return FALLBACK_TITLE
    if truncated:
        candidate += "..."
    return candidate[0].upper() + candidate[1:]


def first_user_text(transcript: list[TranscriptMessage]) -> str | None:
    """The first eligible user-authored message, and nothing else."""
    for message in transcript:
        if message.role == "user" and message.text.strip():
            return message.text
    return None
