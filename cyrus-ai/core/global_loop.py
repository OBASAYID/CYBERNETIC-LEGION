from __future__ import annotations

import threading
import time
from concurrent.futures import ThreadPoolExecutor, TimeoutError
from typing import Any, Dict

from config.settings import settings
from safety.override import is_locked

from .fault_tolerance import safe_execute


class GlobalCyrusLoop:
    """Unified real-time global intelligence loop."""

    def __init__(self, brain_processor, vision_system, drone_controller, event_router, nxi_map) -> None:
        self.brain_processor = brain_processor
        self.vision_system = vision_system
        self.drone_controller = drone_controller
        self.event_router = event_router
        self.nxi_map = nxi_map

        self._running = False
        self._thread: threading.Thread | None = None
        self._last_cycle: Dict[str, Any] = {"status": "idle", "ts": 0.0}
        self._executor = ThreadPoolExecutor(max_workers=2)

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self.run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=3.0)

    def status(self) -> Dict[str, Any]:
        return {
            "running": self._running,
            "last_cycle": self._last_cycle,
        }

    def run(self) -> None:
        perception_min_interval = 1.0 / max(1.0, settings.PERCEPTION_MAX_FPS)
        last_perception_ts = 0.0

        while self._running:
            cycle_started = time.time()
            if is_locked():
                self._last_cycle = {"status": "blocked", "reason": "lockdown", "ts": time.time()}
                time.sleep(max(settings.LOOP_INTERVAL, 0.1))
                continue

            now = time.time()
            if now - last_perception_ts < perception_min_interval:
                time.sleep(perception_min_interval - (now - last_perception_ts))

            perception = self._async_perceive(timeout=0.25)
            telemetry = safe_execute(lambda: self.drone_controller.poll_telemetry(), fallback={"mode": "unknown"})
            world_state = {
                "perception": perception,
                "telemetry": telemetry,
            }

            # Perception -> Brain
            decision = safe_execute(
                lambda: self.brain_processor("global_perception", {"world_state": world_state}),
                fallback={"status": "error", "reason": "brain_failure"},
            )

            # Decision -> routed actions (swarm / mission / control)
            routed = self.event_router.route_event(
                {
                    "type": "decision",
                    "data": {
                        "decision": decision,
                        "world_state": world_state,
                    },
                }
            )

            # Action -> NXI map synchronization snapshot
            nxi_snapshot = safe_execute(lambda: self.nxi_map.get_state(), fallback={})

            self._last_cycle = {
                "status": "ok",
                "ts": time.time(),
                "world_state": world_state,
                "decision": decision,
                "routed": routed,
                "nxi_map_version": nxi_snapshot.get("version") if isinstance(nxi_snapshot, dict) else None,
                "duration_ms": round((time.time() - cycle_started) * 1000.0, 2),
            }
            last_perception_ts = time.time()

            elapsed = time.time() - cycle_started
            remaining = max(settings.LOOP_INTERVAL - elapsed, 0.0)
            if remaining > 0:
                time.sleep(remaining)

    def _async_perceive(self, timeout: float) -> Dict[str, Any]:
        future = self._executor.submit(self.vision_system.perceive)
        try:
            result = future.result(timeout=timeout)
            return result if isinstance(result, dict) else {}
        except TimeoutError:
            return {"status": "timeout", "detections": [], "tracks": []}
        except Exception:
            return {"status": "error", "detections": [], "tracks": []}
