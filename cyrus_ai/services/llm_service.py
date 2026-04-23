from __future__ import annotations

import logging
from typing import Dict, List

from openai import OpenAI

from cyrus_ai.config.settings import Settings

logger = logging.getLogger(__name__)


class LLMService:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = None

    def _ensure_client(self):
        if self.client is not None:
            return self.client
        if not self.settings.openai_api_key:
            return None
        try:
            self.client = OpenAI(api_key=self.settings.openai_api_key)
            return self.client
        except Exception as exc:
            logger.warning("OpenAI client initialization failed: %s", exc)
            self.client = None
            return None

    def generate(
        self,
        messages: List[Dict[str, str]],
        user_input: str,
        memory_context: List[str],
        mode: str,
    ) -> Dict[str, float | str]:
        memory_block = "\n".join(f"- {m}" for m in memory_context[:5]) or "- No relevant memory"
        context_message = {
            "role": "system",
            "content": (
                f"Relevant memory:\n{memory_block}\n"
                f"Current mode: {mode}. Use this mode and memory context when responding."
            ),
        }

        prompt_messages = [messages[0], context_message, *messages[1:]]

        client = self._ensure_client()
        if not client:
            return {
                "response": (
                    "I am running in fallback mode because OPENAI_API_KEY is not configured. "
                    "Set the API key in cyrus_ai/.env to enable full reasoning responses."
                ),
                "confidence": 0.35,
            }

        try:
            completion = client.chat.completions.create(
                model=self.settings.openai_model,
                temperature=self.settings.temperature,
                messages=prompt_messages,
            )
            text = completion.choices[0].message.content or "I do not have a response yet."
            confidence = 0.85 if text else 0.3
            return {"response": text.strip(), "confidence": confidence}
        except Exception as exc:
            logger.exception("LLM request failed")
            return {
                "response": (
                    "I encountered an upstream model error and cannot verify a safe answer yet. "
                    "Please retry or provide narrower context."
                ),
                "confidence": 0.25,
            }
