from __future__ import annotations

import time
from typing import Any, Dict, List

from distributed.message_bus import publish_event
from safety.override import is_locked


class MissionEngine:
    """Goal-driven mission execution with safety and event-bus integration."""

    def __init__(self, audit_log, memory_service, dataset_builder) -> None:
        self.audit_log = audit_log
        self.memory_service = memory_service
        self.dataset_builder = dataset_builder
        self.active_goal: Dict[str, Any] | None = None
        self.steps: List[Dict[str, Any]] = []
        self.step_index = 0
        self.last_result: Dict[str, Any] | None = None

    def start_goal(self, operator: str, goal: Dict[str, Any]) -> Dict[str, Any]:
        if is_locked():
            raise RuntimeError("mission start blocked by lockdown")

        self.active_goal = {
            "id": goal.get("id", f"goal-{int(time.time())}"),
            "type": goal.get("type", "observe"),
            "priority": goal.get("priority", "normal"),
            "constraints": goal.get("constraints", {}),
            "started_at": time.time(),
        }
        self.steps = list(goal.get("steps", []))
        self.step_index = 0
        self.last_result = None

        publish_event(
            {
                "type": "mission_update",
                "data": {
                    "status": "started",
                    "goal": self.active_goal,
                    "step_index": self.step_index,
                    "timestamp": time.time(),
                },
            }
        )
        self.audit_log(
            {
                "event_type": "mission_started",
                "operator_id": operator,
                "output": self.active_goal,
                "evaluation": {"overall": 1.0},
            }
        )
        self.memory_service(
            f"Mission {self.active_goal['id']} started by {operator} with {len(self.steps)} steps.",
            {"type": "mission", "status": "started", "operator": operator},
        )
        return {"status": "ok", "mission": self.status()}

    def stop_goal(self, operator: str, reason: str = "manual_stop") -> Dict[str, Any]:
        if self.active_goal is None:
            return {"status": "ok", "message": "no active mission"}

        mission_id = self.active_goal["id"]
        self.audit_log(
            {
                "event_type": "mission_stopped",
                "operator_id": operator,
                "output": {"mission_id": mission_id, "reason": reason},
                "evaluation": {"overall": 1.0},
            }
        )
        publish_event(
            {
                "type": "mission_update",
                "data": {
                    "status": "stopped",
                    "mission_id": mission_id,
                    "reason": reason,
                    "timestamp": time.time(),
                },
            }
        )
        self.memory_service(
            f"Mission {mission_id} stopped by {operator}: {reason}",
            {"type": "mission", "status": "stopped", "operator": operator},
        )

        self.active_goal = None
        self.steps = []
        self.step_index = 0
        self.last_result = None
        return {"status": "ok", "message": "mission stopped"}

    def execute_next_step(self, world_state: Dict[str, Any]) -> Dict[str, Any]:
        if self.active_goal is None:
            return {"status": "idle", "reason": "no_active_goal"}

        if is_locked():
            return {"status": "blocked", "reason": "lockdown"}

        if self.step_index >= len(self.steps):
            result = {
                "status": "complete",
                "mission_id": self.active_goal["id"],
                "completed_at": time.time(),
            }
            self.last_result = result
            publish_event({"type": "mission_update", "data": result})
            return result

        step = self.steps[self.step_index]
        action = step.get("action", "observe")
        outcome = {
            "status": "executed",
            "mission_id": self.active_goal["id"],
            "step_index": self.step_index,
            "action": action,
            "world_state": world_state,
            "timestamp": time.time(),
        }
        self.last_result = outcome
        self.step_index += 1

        self.dataset_builder(
            f"mission_step::{self.active_goal['id']}::{self.step_index - 1}::{action}",
            {"action": action, "status": "executed"},
            {"type": "mission_step", "mission_id": self.active_goal["id"], "step": self.step_index - 1},
        )
        publish_event({"type": "mission_update", "data": outcome})
        return outcome

    def status(self) -> Dict[str, Any]:
        return {
            "active": self.active_goal is not None,
            "goal": self.active_goal,
            "step_index": self.step_index,
            "total_steps": len(self.steps),
            "last_result": self.last_result,
        }
