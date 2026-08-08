"""Embedding provider construction; returns the plain callable the store wants."""

from langchain_openai import OpenAIEmbeddings

from saaya.config import Settings
from saaya.memory.store import Embedder


def build_embedder(settings: Settings) -> Embedder:
    _, _, model_name = settings.embedding_model.partition(":")
    client = OpenAIEmbeddings(model=model_name, api_key=settings.openai_api_key)  # pyright: ignore[reportArgumentType]  (str is coerced to SecretStr)

    async def embed(text: str) -> list[float]:
        return await client.aembed_query(text)

    return embed
