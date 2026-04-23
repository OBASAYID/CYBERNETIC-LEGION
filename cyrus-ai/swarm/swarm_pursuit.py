from __future__ import annotations

import time
from typing import Any, Dict, Tuple

from distributed.message_bus import publish_event
from safety.override import is_locked


class SwarmPursuitCoordinator:
    """Bridges detection stream -> pursuit prediction -> task assignment -> map updates."""

    def __init__(self, swarm, pursuit, nxi_map, mission_engine=None, brain_processor=None, audit_log=None):
        self.swarm = swarm
        self.pursuit = pursuit
        self.map = nxi_map
        self.mission_engine = mission_engine
        self.brain_processor = brain_processor
        self.audit_log = audit_log

    def handle_detection(self, target_id: str, position: Tuple[float, float]) -> Dict[str, Any]:
        if is_locked():
            return {"status": "blocked", "reason": "lockdown"}

        self.pursuit.update_target(position)
        predicted = self.pursuit.predict_position()

        self.map.update_target(target_id, predicted, metadata={"source": "vision", "raw_position": list(position)})

        task = {
            "id": f"intercept-{target_id}-{int(time.time() * 1000)}",
            "type": "intercept",
            "priority": "high",
            "target": [predicted[0], predicted[1]],
            "metadata": {
                "target_id": target_id,
                "predicted": [predicted[0], predicted[1]],
            },
        }

        if callable(self.brain_processor):
            brain_out = self.brain_processor(
                "swarm_target_detected",
                {
                    "target_id": target_id,
                    "position": position,
                    "predicted": predicted,
                    "swarm": self.swarm.status(),
                },
            )
            task["metadata"]["brain"] = brain_out

        assigned = self.swarm.assign_task(task)

        event = {
            "type": "swarm_track_assignment",
            "target_id": target_id,
            "position": [position[0], position[1]],
            "predicted": [predicted[0], predicted[1]],
            "result": assigned,
            "timestamp": time.time(),
        }
        self.map.add_event(event)
        publish_event({"type": "swarm.track_assignment", "data": event})

        if callable(self.audit_log):
            self.audit_log(
                {
                    "event_type": "swarm_track_assignment",
                    "operator_id": "system",
                    "output": event,
                    "evaluation": {"overall": 1.0 if assigned.get("status") == "ok" else 0.4},
                }
            )

        if self.mission_engine is not None and self.mission_engine.status().get("active"):
            self.map.add_event({"type": "mission_context", "mission": self.mission_engine.status()})

        return {
            "status": "ok",
            "assigned": assigned,
            "predicted": [predicted[0], predicted[1]],
        }
