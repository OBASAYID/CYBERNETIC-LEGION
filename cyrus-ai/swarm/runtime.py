from __future__ import annotations

import threading
import time
from typing import Any, Dict
import math

from distributed.message_bus import publish_event
from safety.override import is_locked
from nxi.map_engine import NXIMap
from tracking.pursuit import PursuitEngine

from .swarm_controller import SwarmController
from .swarm_pursuit import SwarmPursuitCoordinator


class SwarmRuntime:
    """Swarm orchestration runtime integrating mission, perception, safety, and brain."""

    def __init__(
        self,
        brain_processor,
        mission_engine,
        audit_log,
        memory_service,
        dataset_builder,
    ) -> None:
        self.brain_processor = brain_processor
        self.controller = SwarmController(audit_log, memory_service, dataset_builder)
        self.pursuit_engine = PursuitEngine()
        self.nxi_map = NXIMap()
        self.mission_engine = mission_engine
        self.coordinator = SwarmPursuitCoordinator(
            self.controller,
            self.pursuit_engine,
            self.nxi_map,
            mission_engine=mission_engine,
            brain_processor=brain_processor,
            audit_log=audit_log,
        )
        self._lock = threading.RLock()
        self._last_tick: Dict[str, Any] = {
            "status": "idle",
            "updated_at": 0.0,
        }

    def register_drone(self, drone_id: str, drone_controller: Any | None = None) -> Dict[str, Any]:
        return self.controller.register_drone(drone_id, drone_controller)

    def tick(self, world_state: Dict[str, Any]) -> Dict[str, Any]:
        started = time.time()
        stale = self.controller.prune_stale_members()

        if is_locked():
            blocked = {
                "status": "blocked",
                "reason": "lockdown",
                "stale_drones": stale,
                "updated_at": time.time(),
            }
            with self._lock:
                self._last_tick = blocked
            return blocked

        perception = world_state.get("perception", {}) if isinstance(world_state, dict) else {}
        telemetry = world_state.get("telemetry", {}) if isinstance(world_state, dict) else {}
        tracks = perception.get("tracks", []) if isinstance(perception, dict) else []

        telemetry_lat = telemetry.get("lat")
        telemetry_lon = telemetry.get("lon")
        if isinstance(telemetry_lat, (float, int)) and isinstance(telemetry_lon, (float, int)):
            self.controller.update_state(
                "drone-1",
                (float(telemetry_lat), float(telemetry_lon)),
                float(telemetry.get("battery_percent", 100.0) or 100.0),
            )
            self.nxi_map.update_drone(
                "drone-1",
                {
                    "position": [float(telemetry_lat), float(telemetry_lon)],
                    "alt": float(telemetry.get("alt", 0.0) or 0.0),
                    "mode": str(telemetry.get("mode", "unknown")),
                    "battery_percent": float(telemetry.get("battery_percent", 100.0) or 100.0),
                },
            )

        pursuit_actions = []
        for track in tracks:
            bbox = track.get("bbox", [0, 0, 0, 0])
            if not isinstance(bbox, (list, tuple)) or len(bbox) < 2:
                continue
            target_pos = self._track_to_geo(track, telemetry)
            if target_pos is None:
                continue
            target_id = str(track.get("track_id", ""))
            if not target_id:
                continue
            pursuit_actions.append(self.coordinator.handle_detection(target_id, target_pos))

        mission_status = self.mission_engine.status()
        if mission_status.get("active") and mission_status.get("goal", {}).get("type") == "formation":
            constraints = mission_status.get("goal", {}).get("constraints", {})
            anchor = constraints.get("anchor", {})
            if isinstance(anchor, dict) and "lat" in anchor and "lon" in anchor:
                self.controller.set_formation(
                    pattern=str(constraints.get("pattern", "line")),
                    anchor_lat=float(anchor["lat"]),
                    anchor_lon=float(anchor["lon"]),
                    spacing_m=float(constraints.get("spacing_m", 20.0)),
                )

        tick_result = {
            "status": "ok",
            "duration_ms": round((time.time() - started) * 1000.0, 2),
            "stale_drones": stale,
            "swarm": self.controller.status(),
            "tracking": {
                "active_targets": len(self.nxi_map.get_state().get("targets", {})),
            },
            "pursuit": {
                "actions": pursuit_actions,
                "count": len(pursuit_actions),
            },
            "nxi_map_version": self.nxi_map.get_state().get("version"),
            "updated_at": time.time(),
        }

        with self._lock:
            self._last_tick = tick_result

        publish_event(
            {
                "type": "swarm.heartbeat",
                "data": {
                    "timestamp": time.time(),
                    "registered": tick_result["swarm"].get("registered", 0),
                    "online": tick_result["swarm"].get("online", 0),
                    "active_targets": tick_result["tracking"].get("active_targets", 0),
                    "map_version": tick_result["nxi_map_version"],
                },
            }
        )
        return tick_result

    def status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "last_tick": self._last_tick,
                "swarm": self.controller.status(),
                "tracking": {
                    "active_targets": len(self.nxi_map.get_state().get("targets", {})),
                },
                "nxi_map": self.nxi_map.get_state(),
            }

    def _track_to_geo(self, track: Dict[str, Any], telemetry: Dict[str, Any]) -> tuple[float, float] | None:
        base_lat = telemetry.get("lat")
        base_lon = telemetry.get("lon")
        if not isinstance(base_lat, (float, int)) or not isinstance(base_lon, (float, int)):
            return None

        bbox = track.get("bbox", [0, 0, 0, 0])
        if not isinstance(bbox, (list, tuple)) or len(bbox) < 4:
            return float(base_lat), float(base_lon)

        x = float(bbox[0])
        y = float(bbox[1])
        w = float(bbox[2])
        h = float(bbox[3])

        pixel_x = x + (w / 2.0)
        pixel_y = y + (h / 2.0)

        # Approximate camera-to-ground projection for short-range pursuit cueing.
        east_m = (pixel_x - 320.0) * 0.12
        north_m = (240.0 - pixel_y) * 0.12

        dlat = north_m / 111_320.0
        dlon = east_m / (111_320.0 * max(0.2, math.cos(math.radians(float(base_lat)))))
        return float(base_lat) + dlat, float(base_lon) + dlon
