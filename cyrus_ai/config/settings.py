from __future__ import annotations

import os
from pathlib import Path
from typing import Literal

from dotenv import load_dotenv
from pydantic import BaseModel, Field


class Settings(BaseModel):
    app_name: str = "CYRUS"
    openai_api_key: str = Field(default="")
    elevenlabs_api_key: str = Field(default="")
    openai_model: str = Field(default="gpt-4o-mini")
    embedding_model: str = Field(default="text-embedding-3-small")
    embedding_provider: Literal["hash", "openai", "transformers"] = "hash"
    max_context_tokens: int = Field(default=3500)
    max_history_messages: int = Field(default=30)
    temperature: float = Field(default=0.35)
    memory_vector_dim: int = Field(default=512)
    memory_top_k: int = Field(default=5)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    api_host: str = Field(default="0.0.0.0")
    api_port: int = Field(default=3311)
    api_domain: str = Field(default="cyrus.local")


def load_settings() -> Settings:
    root = Path(__file__).resolve().parents[1]
    env_file = root / ".env"
    if env_file.exists():
        load_dotenv(env_file, override=False)
    else:
        load_dotenv(override=False)

    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    elevenlabs_key = os.getenv("ELEVENLABS_API_KEY", "").strip()

    if openai_key.lower() in {"your_key_here", "", "none", "null"}:
        openai_key = ""
    if elevenlabs_key.lower() in {"your_key_here", "", "none", "null"}:
        elevenlabs_key = ""

    return Settings(
        openai_api_key=openai_key,
        elevenlabs_api_key=elevenlabs_key,
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip() or "gpt-4o-mini",
        embedding_model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small").strip() or "text-embedding-3-small",
        embedding_provider=(os.getenv("EMBEDDING_PROVIDER", "hash").strip().lower() or "hash"),
        max_context_tokens=int(os.getenv("MAX_CONTEXT_TOKENS", "3500")),
        max_history_messages=int(os.getenv("MAX_HISTORY_MESSAGES", "30")),
        temperature=float(os.getenv("CYRUS_TEMPERATURE", "0.35")),
        memory_vector_dim=int(os.getenv("MEMORY_VECTOR_DIM", "512")),
        memory_top_k=int(os.getenv("MEMORY_TOP_K", "5")),
        log_level=(os.getenv("CYRUS_LOG_LEVEL", "INFO").upper() or "INFO"),
        api_host=os.getenv("CYRUS_API_HOST", "0.0.0.0").strip() or "0.0.0.0",
        api_port=int(os.getenv("CYRUS_API_PORT", "3311")),
        api_domain=os.getenv("CYRUS_API_DOMAIN", "cyrus.local").strip() or "cyrus.local",
    )
