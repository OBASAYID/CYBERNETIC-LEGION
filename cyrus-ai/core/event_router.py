from __future__ import annotations

import time
from typing import Any, Dict

from distributed.message_bus import publish_event
from safety.override import is_locked

from .fault_tolerance import safe_execute


class EventRouter:
    """Single event interface for all cross-module communication.

    Enforced system flow:
    Perception -> Brain -> Decision -> Swarm/Mission -> Action -> NXI Map -> Memory -> Learning
    """

    def __init__(
        self,
        mission_engine,
        swarm_runtime,
        memory_service,
        dataset_builder,
        audit_log,
    ) -> None:
        self.mission_engine = mission_engine
        self.swarm_runtime = swarm_runtime
        self.memory_service = memory_service
        self.dataset_builder = dataset_builder
        self.audit_log = audit_log

    def route_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        if not isinstance(event, dict):
            return {"status": "error", "error": "invalid_event"}

        event_type = str(event.get("type", "")).strip().lower()
        handler = {
            "perception": self.handle_perception,
            "swarm": self.handle_swarm,
            "mission": self.handle_mission,
            "control": self.handle_control,
            "decision": self.handle_decision,
        }.get(event_type)

        if handler is None:
            return {"status": "ignored", "reason": "unhandled_event_type", "event_type": event_type}

        result = safe_execute(lambda: handler(event), fallback={"status": "error", "error": "handler_failed"})
        publish_event(
            {
                "type": "core.event.routed",
                "data": {
                    "event_type": event_type,
                    "result_status": result.get("status") if isinstance(result, dict) else "unknown",
                    "timestamp": time.time(),
                },
            }
        )
        return result

    def handle_perception(self, event: Dict[str, Any]) -> Dict[str, Any]:
        data = event.get("data", {}) if isinstance(event, dict) else {}
        tracks = data.get("tracks", []) if isinstance(data, dict) else []
        telemetry = data.get("telemetry", {}) if isinstance(data, dict) else {}

        # Update swarm+map through runtime path (fault tolerant).
        tick_result = self.swarm_runtime.tick({"perception": {"tracks": tracks}, "telemetry": telemetry})
        return {
            "status": "ok",
            "stage": "perception",
            "swarm": tick_result,
        }

    def handle_decision(self, event: Dict[str, Any]) -> Dict[str, Any]:
        if is_locked():
            return {"status": "blocked", "reason": "lockdown"}

        data = event.get("data", {}) if isinstance(event, dict) else {}
        world_state = data.get("world_state", {}) if isinstance(data, dict) else {}

        mission_result = safe_execute(
            lambda: self.mission_engine.execute_next_step(world_state),
            fallback={"status": "error"},
        )
        swarm_result = safe_execute(
            lambda: self.swarm_runtime.tick(world_state),
            fallback={"status": "error"},
        )

        # Persist decision traces for learning loops.
        self.dataset_builder(
            "global_decision_event",
            {"mission": mission_result, "swarm": swarm_result},
            {"type": "global_decision"},
        )
        self.memory_service(
            f"Global decision processed: mission={mission_result.get('status')} swarm={swarm_result.get('status')}",
            {"type": "global_decision"},
        )

        return {
            "status": "ok",
            "stage": "decision",
            "mission": mission_result,
            "swarm": swarm_result,
        }

    def handle_swarm(self, event: Dict[str, Any]) -> Dict[str, Any]:
        data = event.get("data", {}) if isinstance(event, dict) else {}
        if data.get("action") == "assign_task":
            task = data.get("task", {})
            return self.swarm_runtime.controller.assign_task(task)
        if data.get("action") == "set_formation":
            return self.swarm_runtime.controller.set_formation(
                str(data.get("pattern", "line")),
                float(data.get("anchor_lat", 0.0)),
                float(data.get("anchor_lon", 0.0)),
                float(data.get("spacing_m", 20.0)),
            )
        return {"status": "ignored", "reason": "unknown_swarm_action"}

    def handle_mission(self, event: Dict[str, Any]) -> Dict[str, Any]:
        data = event.get("data", {}) if isinstance(event, dict) else {}
        action = str(data.get("action", "")).strip().lower()
        operator = str(data.get("operator", "system"))

        if action == "start":
            return self.mission_engine.start_goal(operator, data.get("goal", {}))
        if action == "stop":
            return self.mission_engine.stop_goal(operator, str(data.get("reason", "event_router_stop")))
        return {"status": "ignored", "reason": "unknown_mission_action"}

    def handle_control(self, event: Dict[str, Any]) -> Dict[str, Any]:
        payload = {
            "event_type": "core_control_event",
            "operator_id": str(event.get("operator_id", "system")),
            "input": event,
            "evaluation": {"overall": 1.0},
        }
        self.audit_log(payload)
        return {"status": "ok", "stage": "control"}
