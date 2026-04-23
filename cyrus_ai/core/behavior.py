from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ModeName = Literal["kids", "professional", "debate", "ops", "default"]


@dataclass
class ModeDecision:
    mode: ModeName
    confidence: float
    reason: str


class BehaviorRouter:
    """Detects context and selects interaction mode."""

    _ops_prefixes = (
        "run",
        "execute",
        "deploy",
        "start",
        "stop",
        "restart",
        "scan",
        "status",
        "report",
        "check",
        "launch",
        "abort",
        "arm",
        "disarm",
    )

    _ops_keywords = (
        "drone",
        "mission",
        "telemetry",
        "waypoint",
        "uav",
    )

    def detect_mode(self, user_text: str) -> ModeDecision:
        text = user_text.strip().lower()

        if "kid" in text or "child" in text or "for children" in text:
            return ModeDecision(mode="kids", confidence=0.95, reason="kids keyword")

        if any(k in text for k in ("argument", "debate", "counterargument", "prove me wrong", "argue")):
            return ModeDecision(mode="debate", confidence=0.9, reason="debate keyword")

        if any(k in text for k in ("legal", "court", "contract", "compliance", "regulation")):
            return ModeDecision(mode="professional", confidence=0.9, reason="legal/professional context")

        if text.startswith(self._ops_prefixes) or re.match(r"^(set|list|show|enable|disable)\b", text):
            return ModeDecision(mode="ops", confidence=0.88, reason="command-style phrase")

        if any(token in text for token in self._ops_keywords):
            return ModeDecision(mode="ops", confidence=0.88, reason="command-style phrase")

        return ModeDecision(mode="default", confidence=0.6, reason="no explicit mode")

    def needs_clarification(self, decision: ModeDecision) -> bool:
        return decision.mode == "default" and decision.confidence < 0.65
