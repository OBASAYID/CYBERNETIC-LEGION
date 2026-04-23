from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Dict, List

import tiktoken


class _SimpleEncoding:
    def encode(self, text: str) -> List[int]:
        return [len(token) for token in text.split()]


@dataclass
class Message:
    role: str
    content: str
    mode: str = "default"
    created_at: str = field(default_factory=lambda: datetime.now(UTC).isoformat())


class ConversationManager:
    """Maintains conversation history and token-aware truncation."""

    def __init__(self, max_tokens: int = 3500, max_messages: int = 30, model: str = "gpt-4o-mini"):
        self.max_tokens = max_tokens
        self.max_messages = max_messages
        self.model = model
        self.history: List[Message] = []
        try:
            self.encoding = tiktoken.encoding_for_model(model)
        except Exception:
            try:
                self.encoding = tiktoken.get_encoding("cl100k_base")
            except Exception:
                self.encoding = _SimpleEncoding()

    def add(self, role: str, content: str, mode: str = "default") -> None:
        self.history.append(Message(role=role, content=content, mode=mode))
        if len(self.history) > self.max_messages * 3:
            self.history = self.history[-self.max_messages :]

    def _tokens(self, text: str) -> int:
        return len(self.encoding.encode(text))

    def build_messages(self, system_prompt: str, mode_prompt: str) -> List[Dict[str, str]]:
        messages: List[Dict[str, str]] = [{"role": "system", "content": f"{system_prompt}\n\n{mode_prompt}"}]

        running_tokens = self._tokens(messages[0]["content"])
        selected: List[Message] = []
        for msg in reversed(self.history):
            msg_tokens = self._tokens(msg.content) + 6
            if running_tokens + msg_tokens > self.max_tokens:
                break
            selected.append(msg)
            running_tokens += msg_tokens

        for msg in reversed(selected):
            messages.append({"role": msg.role, "content": msg.content})

        return messages
