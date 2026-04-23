from __future__ import annotations

import threading
import time
from typing import Any, Dict

from distributed.message_bus import publish_event


class CyrusCoreLoop:
    """Embodied intelligence loop integrating perception, planning, and actuation."""

    def __init__(
        self,
        drone_controller,
        vision_system,
        mission_engine,
        human_interaction,
        brain_processor,
        audit_log,
        swarm_runtime=None,
    ) -> None:
        self.drone = drone_controller
        self.vision = vision_system
        self.mission = mission_engine
        self.human = human_interaction
        self.brain_processor = brain_processor
        self.audit_log = audit_log
        self.swarm_runtime = swarm_runtime

        self._running = False
        self._thread: threading.Thread | None = None
        self._lock = threading.RLock()
        self._last_snapshot: Dict[str, Any] = {
            "status": "idle",
            "iteration": 0,
            "last_tick": 0.0,
        }

    def start(self, tick_hz: float = 2.0) -> Dict[str, Any]:
        with self._lock:
            if self._running:
                return {"status": "ok", "message": "core loop already running", "snapshot": self.status()}
            self._running = True
            self._thread = threading.Thread(target=self._run, args=(tick_hz,), daemon=True)
            self._thread.start()
            self.audit_log(
                {
                    "event_type": "embodiment_loop_started",
                    "operator_id": "system",
                    "output": {"tick_hz": tick_hz},
                    "evaluation": {"overall": 1.0},
                }
            )
            return {"status": "ok", "message": "core loop started", "snapshot": self.status()}

    def stop(self) -> Dict[str, Any]:
        with self._lock:
            if not self._running:
                return {"status": "ok", "message": "core loop already stopped", "snapshot": self.status()}
            self._running = False

        if self._thread is not None:
            self._thread.join(timeout=3.0)

        self.audit_log(
            {
                "event_type": "embodiment_loop_stopped",
                "operator_id": "system",
                "output": {},
                "evaluation": {"overall": 1.0},
            }
        )
        return {"status": "ok", "message": "core loop stopped", "snapshot": self.status()}

    def _run(self, tick_hz: float) -> None:
        interval = max(0.05, 1.0 / max(0.1, tick_hz))
        iteration = 0

        while True:
            with self._lock:
                if not self._running:
                    break

            started = time.time()
            iteration += 1

            perception = self.vision.perceive()
            telemetry = self.drone.poll_telemetry()
            world_state = {
                "perception": perception,
                "telemetry": telemetry,
            }

            mission_result = self.mission.execute_next_step(world_state)
            swarm_result = (
                self.swarm_runtime.tick(world_state)
                if self.swarm_runtime is not None
                else {"status": "disabled"}
            )
            brain_result = self.brain_processor(
                "embodied_control",
                {
                    "world_state": world_state,
                    "mission": self.mission.status(),
                    "mission_result": mission_result,
                    "swarm_result": swarm_result,
                },
            )

            snapshot = {
                "status": "running",
                "iteration": iteration,
                "last_tick": time.time(),
                "world_state": world_state,
                "mission_result": mission_result,
                "swarm_result": swarm_result,
                "brain_result": brain_result,
            }

            with self._lock:
                self._last_snapshot = snapshot

            publish_event(
                {
                    "type": "embodiment_heartbeat",
                    "data": {
                        "iteration": iteration,
                        "timestamp": time.time(),
                        "mission_active": self.mission.status().get("active", False),
                    },
                }
            )

            elapsed = time.time() - started
            remaining = interval - elapsed
            if remaining > 0:
                time.sleep(remaining)

    def status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "running": self._running,
                "snapshot": self._last_snapshot,
                "mission": self.mission.status(),
                "drone": self.drone.state,
                "vision": {
                    "simulation_mode": self.vision.simulation_mode,
                },
                "human": self.human.status(),
                "swarm": self.swarm_runtime.status() if self.swarm_runtime is not None else {"status": "disabled"},
            }
