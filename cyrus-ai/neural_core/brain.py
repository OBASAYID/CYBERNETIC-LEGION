from __future__ import annotations

from typing import Any, Dict, List

from .learning_engine import LearningEngine


class Brain:
    def __init__(self, learning_engine: LearningEngine | None = None) -> None:
        self.learning_engine = learning_engine or LearningEngine()

    def train(self, items: List[Dict[str, Any]]) -> Dict[str, Any]:
        processed = []
        for item in items:
            processed.append(self.learning_engine.learn(item.get("content", ""), item.get("metadata", {})).__dict__)
        return {
            "processed": len(processed),
            "events": processed,
        }

    def decide(self, context: Dict[str, Any]) -> Dict[str, Any]:
        summary = context.get("summary") or "decision_ready"
        return {
            "decision": summary,
            "confidence": 0.9,
            "context": context,
        }
