from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List


@dataclass
class LearningEvent:
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())


class LearningEngine:
    def __init__(self) -> None:
        self.events: List[LearningEvent] = []

    def learn(self, content: str, metadata: Dict[str, Any] | None = None) -> LearningEvent:
        event = LearningEvent(content=content, metadata=metadata or {})
        self.events.append(event)
        return event

    def stats(self) -> Dict[str, Any]:
        return {
            "total_events": len(self.events),
            "last_event_at": self.events[-1].created_at if self.events else None,
        }
