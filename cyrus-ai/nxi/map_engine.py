from __future__ import annotations

import copy
import threading
import time
from typing import Any, Dict


class NXIMap:
    """Thread-safe global fused world model for drones, targets, and events."""

    def __init__(self, max_events: int = 2000) -> None:
        self.lock = threading.Lock()
        self.max_events = max(100, max_events)
        self.state: Dict[str, Any] = {
            "version": 0,
            "updated_at": 0.0,
            "drones": {},
            "targets": {},
            "events": [],
        }

    def update_drone(self, drone_id: str, data: Dict[str, Any]) -> None:
        with self.lock:
            self.state["drones"][drone_id] = {
                **data,
                "updated_at": time.time(),
            }
            self._bump_version_locked()

    def update_target(
        self,
        target_id: str,
        position: tuple[float, float],
        metadata: Dict[str, Any] | None = None,
    ) -> None:
        with self.lock:
            self.state["targets"][target_id] = {
                "position": [float(position[0]), float(position[1])],
                "metadata": dict(metadata or {}),
                "updated_at": time.time(),
            }
            self._bump_version_locked()

    def add_event(self, event: Dict[str, Any]) -> None:
        with self.lock:
            enriched = {
                **event,
                "timestamp": event.get("timestamp", time.time()),
            }
            self.state["events"].append(enriched)
            if len(self.state["events"]) > self.max_events:
                self.state["events"] = self.state["events"][-self.max_events:]
            self._bump_version_locked()

    def get_state(self) -> Dict[str, Any]:
        with self.lock:
            return copy.deepcopy(self.state)

    def snapshot(self) -> Dict[str, Any]:
        """Compatibility alias for callers expecting a snapshot API."""
        return self.get_state()

    def _bump_version_locked(self) -> None:
        self.state["version"] = int(self.state.get("version", 0)) + 1
        self.state["updated_at"] = time.time()
