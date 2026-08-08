"""The reflection proposer: one plain model call that rewrites the file.

A writer, never a judge: whatever it returns faces the deterministic rules in
validate.py, which alone decide whether anything is applied.
"""

from pathlib import Path

from langchain.chat_models import init_chat_model

from saaya.config import Settings
from saaya.reflection.runner import Proposer

PROMPT_PATH = Path(__file__).parent.parent / "agent" / "prompts" / "reflection.md"


def build_proposer(settings: Settings) -> Proposer:
    provider, _, model_name = settings.chat_model.partition(":")
    model = init_chat_model(
        model_name,
        model_provider=provider,
        api_key=settings.claude_api_key,
        temperature=0.0,
    )
    instructions = PROMPT_PATH.read_text(encoding="utf-8")

    async def propose(current: str, transcript: str) -> str | None:
        response = await model.ainvoke(
            [
                {"role": "system", "content": instructions},
                {
                    "role": "user",
                    "content": (
                        f"Current file:\n\n{current}\n\nRecent conversation:\n\n{transcript}"
                    ),
                },
            ]
        )
        # .text is a str-subclass accessor in langchain-core 1.x; plain str()
        # takes the property path without touching the deprecated call shim.
        cleaned = str(response.text).strip()
        if cleaned == "SKIP" or cleaned == "":
            return None
        return cleaned + "\n" if not cleaned.endswith("\n") else cleaned

    return propose
