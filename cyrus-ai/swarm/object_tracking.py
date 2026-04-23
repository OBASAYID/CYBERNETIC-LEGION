from __future__ import annotations

import threading
import time
from typing import Any, Dict, List

from distributed.message_bus import publish_event
from safety.override import is_locked


class RealTimeObjectTracker:
    """Real-time multi-target tracker with pursuit task generation."""

    def __init__(self, brain_processor, audit_log) -> None:
        self.brain_processor = brain_processor
        self.audit_log = audit_log
        self._lock = threading.RLock()
        self.targets: Dict[str, Dict[str, Any]] = {}
        self.primary_target_id: str | None = None
        self.last_plan: Dict[str, Any] | None = None

    def ingest_perception(self, tracks: List[Dict[str, Any]], telemetry: Dict[str, Any]) -> Dict[str, Any]:
        now = time.time()
        lat = telemetry.get("lat")
        lon = telemetry.get("lon")
        updated = 0

        with self._lock:
            for item in tracks:
                tid = str(item.get("track_id"))
                if not tid:
                    continue
                bbox = item.get("bbox", [0, 0, 0, 0])
                target = {
                    "id": tid,
                    "label": item.get("label", "unknown"),
                    "confidence": float(item.get("confidence", 0.0)),
                    "bbox": bbox,
                    "last_seen": float(item.get("last_seen", now)),
                    "world_estimate": self._estimate_world_position(lat, lon, bbox),
                }
                self.targets[tid] = target
                updated += 1

            self.targets = {
                tid: target
                for tid, target in self.targets.items()
                if now - float(target.get("last_seen", now)) <= 5.0
            }

            self.primary_target_id = self._choose_primary_target()

        publish_event(
            {
                "type": "swarm.tracking_update",
                "data": {
                    "updated": updated,
                    "active_targets": len(self.targets),
                    "primary_target_id": self.primary_target_id,
                    "timestamp": now,
                },
            }
        )
        return self.status()

    def plan_pursuit(self, swarm_controller, max_pursuers: int = 2) -> Dict[str, Any]:
        if is_locked():
            return {"status": "blocked", "reason": "lockdown"}

        with self._lock:
            target = self.targets.get(self.primary_target_id) if self.primary_target_id else None

        if not target or not target.get("world_estimate"):
            return {"status": "idle", "reason": "no_target"}

        world = target["world_estimate"]
        strategy = self.brain_processor(
            "swarm_pursuit",
            {
                "target": target,
                "swarm": swarm_controller.status(),
                "constraints": {"max_pursuers": max_pursuers},
            },
        )

        task = {
            "id": f"pursuit-{target['id']}-{int(time.time() * 1000)}",
            "type": "pursuit",
            "priority": "high",
            "target": [world["lat"], world["lon"]],
            "metadata": {
                "target_id": target["id"],
                "brain": strategy,
            },
        }

        assignments = []
        for _ in range(max_pursuers):
            assigned = swarm_controller.assign_task(task)
            if assigned.get("status") in {"queued", "blocked"}:
                break
            assignments.append(assigned)

        plan = {
            "status": "ok",
            "target_id": target["id"],
            "assignments": assignments,
            "strategy": strategy,
            "timestamp": time.time(),
        }
        with self._lock:
            self.last_plan = plan

        self.audit_log(
            {
                "event_type": "swarm_pursuit_planned",
                "operator_id": "system",
                "output": plan,
                "evaluation": {"overall": 1.0 if assignments else 0.5},
            }
        )
        publish_event({"type": "swarm.pursuit_plan", "data": plan})
        return plan

    def _choose_primary_target(self) -> str | None:
        if not self.targets:
            return None

        sorted_targets = sorted(
            self.targets.values(),
            key=lambda t: (float(t.get("confidence", 0.0)), float(t.get("last_seen", 0.0))),
            reverse=True,
        )
        return str(sorted_targets[0].get("id"))

    def _estimate_world_position(self, base_lat: Any, base_lon: Any, bbox: Any) -> Dict[str, float] | None:
        if not isinstance(base_lat, (float, int)) or not isinstance(base_lon, (float, int)):
            return None

        if not isinstance(bbox, (list, tuple)) or len(bbox) < 4:
            return {"lat": float(base_lat), "lon": float(base_lon)}

        x, y, w, h = [float(v) for v in bbox[:4]]
        offset_east = ((x + w / 2.0) - 320.0) * 0.05
        offset_north = ((240.0 - (y + h / 2.0))) * 0.05
        dlat = offset_north / 111_320.0
        dlon = offset_east / (111_320.0 * max(0.2, abs(float(base_lat)) / 90.0 + 0.1))
        return {"lat": float(base_lat) + dlat, "lon": float(base_lon) + dlon}

    def status(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "active_targets": len(self.targets),
                "primary_target_id": self.primary_target_id,
                "targets": list(self.targets.values()),
                "last_plan": self.last_plan,
            }
