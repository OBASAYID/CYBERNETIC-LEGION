from __future__ import annotations

import math
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Tuple

from distributed.message_bus import publish_event
from safety.override import is_locked


@dataclass
class SwarmTask:
    id: str
    type: str
    target: Tuple[float, float]
    priority: str = "normal"
    metadata: Dict[str, Any] | None = None


class SwarmController:
    """Multi-drone coordinator with nearest-assignment and formation planning.

    Fault-tolerance patterns:
    - member lease/heartbeat with stale-member eviction
    - lock-guarded state for concurrent loop/API access
    - graceful degradation on command failures
    """

    def __init__(
        self,
        audit_log,
        memory_service,
        dataset_builder,
        lease_timeout_seconds: float = 10.0,
    ) -> None:
        self.audit_log = audit_log
        self.memory_service = memory_service
        self.dataset_builder = dataset_builder
        self.lease_timeout_seconds = lease_timeout_seconds

        self._lock = threading.RLock()
        self.drones: Dict[str, Dict[str, Any]] = {}
        self.tasks: List[Dict[str, Any]] = []
        self.last_assignment: Dict[str, Any] | None = None
        self.formation: Dict[str, Any] = {"pattern": "none", "anchor": None, "members": {}}

    def register_drone(self, drone_id: str, drone_controller: Any | None = None) -> Dict[str, Any]:
        if not drone_id.strip():
            raise ValueError("drone_id is required")

        with self._lock:
            self.drones[drone_id] = {
                "controller": drone_controller,
                "status": "idle",
                "position": None,
                "task": None,
                "battery": 100.0,
                "last_seen": time.time(),
                "health": "online",
            }

        publish_event({"type": "swarm.drone_registered", "data": {"drone_id": drone_id, "timestamp": time.time()}})
        return {"status": "ok", "drone_id": drone_id, "registered": True}

    def update_position(self, drone_id: str, lat: float, lon: float) -> Dict[str, Any]:
        with self._lock:
            if drone_id not in self.drones:
                raise KeyError("drone not registered")
            self.drones[drone_id]["position"] = (float(lat), float(lon))
            self.drones[drone_id]["last_seen"] = time.time()
            self.drones[drone_id]["health"] = "online"

        return {"status": "ok", "drone_id": drone_id, "position": [lat, lon]}

    def update_state(self, drone_id: str, position: Tuple[float, float], battery: float) -> Dict[str, Any]:
        with self._lock:
            if drone_id not in self.drones:
                raise KeyError("drone not registered")

            self.drones[drone_id]["position"] = (float(position[0]), float(position[1]))
            self.drones[drone_id]["battery"] = max(0.0, min(100.0, float(battery)))
            self.drones[drone_id]["last_seen"] = time.time()
            self.drones[drone_id]["health"] = "online"

        return {
            "status": "ok",
            "drone_id": drone_id,
            "position": [float(position[0]), float(position[1])],
            "battery": max(0.0, min(100.0, float(battery))),
        }

    def heartbeat(self, drone_id: str) -> Dict[str, Any]:
        with self._lock:
            if drone_id not in self.drones:
                raise KeyError("drone not registered")
            self.drones[drone_id]["last_seen"] = time.time()
            self.drones[drone_id]["health"] = "online"
        return {"status": "ok", "drone_id": drone_id, "heartbeat": True}

    def prune_stale_members(self) -> List[str]:
        stale_ids: List[str] = []
        now = time.time()
        with self._lock:
            for drone_id, drone in self.drones.items():
                if now - float(drone.get("last_seen", 0.0)) > self.lease_timeout_seconds:
                    drone["health"] = "stale"
                    if drone.get("status") != "offline":
                        drone["status"] = "offline"
                    stale_ids.append(drone_id)
        return stale_ids

    def assign_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        if is_locked():
            return {"status": "blocked", "reason": "lockdown"}

        if "target" not in task or not isinstance(task["target"], (list, tuple)) or len(task["target"]) != 2:
            raise ValueError("task target must be [lat, lon]")

        target = (float(task["target"][0]), float(task["target"][1]))
        task_id = str(task.get("id", f"swarm-task-{int(time.time()*1000)}"))

        best_drone = None
        best_score = float("inf")
        best_distance = float("inf")
        best_battery = 0.0

        with self._lock:
            for drone_id, drone in self.drones.items():
                if drone.get("status") != "idle" or not drone.get("position") or drone.get("health") != "online":
                    continue

                dist = self._distance(drone["position"], target)
                battery = float(drone.get("battery", 100.0))
                battery_penalty = (100.0 - battery) * 0.1
                score = dist + battery_penalty
                if score < best_score:
                    best_score = score
                    best_distance = dist
                    best_battery = battery
                    best_drone = drone_id

            if best_drone is None:
                task_record = {
                    "id": task_id,
                    "type": str(task.get("type", "generic")),
                    "target": [target[0], target[1]],
                    "status": "queued",
                    "priority": str(task.get("priority", "normal")),
                    "timestamp": time.time(),
                }
                self.tasks.append(task_record)
                return {"status": "queued", "task": task_record}

            assigned = self.drones[best_drone]
            assigned["status"] = "busy"
            assigned["task"] = task_id

        result = self._dispatch_to_drone(best_drone, target)
        task_record = {
            "id": task_id,
            "type": str(task.get("type", "generic")),
            "target": [target[0], target[1]],
            "assigned_drone": best_drone,
            "distance_m": round(best_distance, 2),
            "assignment_score": round(best_score, 3),
            "battery": round(best_battery, 2),
            "status": "assigned" if result.get("status") == "ok" else "dispatch_failed",
            "priority": str(task.get("priority", "normal")),
            "timestamp": time.time(),
            "dispatch": result,
        }

        with self._lock:
            self.tasks.append(task_record)
            self.last_assignment = task_record

        self.dataset_builder(
            f"swarm_assignment::{task_id}",
            {"assigned_drone": best_drone, "status": task_record["status"]},
            {
                "type": "swarm_assignment",
                "distance_m": best_distance,
                "score": best_score,
                "battery": best_battery,
            },
        )
        self.memory_service(
            f"Swarm assigned task {task_id} to {best_drone} ({task_record['status']}).",
            {"type": "swarm", "task_id": task_id, "drone_id": best_drone},
        )
        self.audit_log(
            {
                "event_type": "swarm_task_assigned",
                "operator_id": "system",
                "output": task_record,
                "evaluation": {"overall": 1.0 if task_record["status"] == "assigned" else 0.3},
            }
        )
        publish_event({"type": "swarm.task_assigned", "data": task_record})
        return {"status": "ok", "task": task_record}

    def assign_tasks(self, tasks: List[Dict[str, Any]]) -> Dict[str, Any]:
        results = [self.assign_task(task) for task in tasks]
        return {
            "status": "ok",
            "assigned": sum(1 for r in results if r.get("task", {}).get("status") == "assigned"),
            "queued": sum(1 for r in results if r.get("status") == "queued"),
            "results": results,
        }

    def set_formation(
        self,
        pattern: str,
        anchor_lat: float,
        anchor_lon: float,
        spacing_m: float = 20.0,
    ) -> Dict[str, Any]:
        with self._lock:
            active_members = [drone_id for drone_id, meta in self.drones.items() if meta.get("health") == "online"]

        slots = self._formation_slots(pattern, len(active_members), spacing_m)
        assigned: Dict[str, Dict[str, float]] = {}

        for index, drone_id in enumerate(active_members):
            dx, dy = slots[index]
            lat, lon = self._offset(anchor_lat, anchor_lon, dx, dy)
            assigned[drone_id] = {"lat": lat, "lon": lon}
            self._dispatch_to_drone(drone_id, (lat, lon), alt=10.0)

        with self._lock:
            self.formation = {
                "pattern": pattern,
                "anchor": {"lat": anchor_lat, "lon": anchor_lon},
                "spacing_m": spacing_m,
                "members": assigned,
                "updated_at": time.time(),
            }

        publish_event({"type": "swarm.formation_updated", "data": self.formation})
        return {"status": "ok", "formation": self.formation}

    def release_drone_task(self, drone_id: str) -> None:
        with self._lock:
            drone = self.drones.get(drone_id)
            if not drone:
                return
            drone["status"] = "idle"
            drone["task"] = None

    def _dispatch_to_drone(self, drone_id: str, target: Tuple[float, float], alt: float = 12.0) -> Dict[str, Any]:
        with self._lock:
            drone = self.drones.get(drone_id)
            if not drone:
                return {"status": "error", "error": "drone_not_found"}
            controller = drone.get("controller")

        if controller is None:
            return {"status": "ok", "simulation": True, "detail": "no_controller_bound"}

        try:
            return controller.goto(target[0], target[1], alt)
        except Exception as exc:
            with self._lock:
                if drone_id in self.drones:
                    self.drones[drone_id]["status"] = "idle"
                    self.drones[drone_id]["task"] = None
            return {"status": "error", "error": str(exc)}

    def _distance(self, p1: Tuple[float, float], p2: Tuple[float, float]) -> float:
        lat1, lon1 = p1
        lat2, lon2 = p2
        r = 6371000.0
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
        return 2.0 * r * math.atan2(math.sqrt(a), math.sqrt(max(1e-12, 1.0 - a)))

    def _formation_slots(self, pattern: str, count: int, spacing_m: float) -> List[Tuple[float, float]]:
        if count <= 0:
            return []

        normalized = (pattern or "line").strip().lower()
        if normalized == "line":
            half = (count - 1) / 2.0
            return [((idx - half) * spacing_m, 0.0) for idx in range(count)]

        if normalized == "wedge":
            slots: List[Tuple[float, float]] = [(0.0, 0.0)]
            for idx in range(1, count):
                level = (idx + 1) // 2
                side = -1.0 if idx % 2 == 0 else 1.0
                slots.append((side * level * spacing_m, level * spacing_m))
            return slots[:count]

        if normalized == "circle":
            radius = max(spacing_m, (count * spacing_m) / (2.0 * math.pi))
            return [
                (
                    radius * math.cos((2.0 * math.pi * idx) / count),
                    radius * math.sin((2.0 * math.pi * idx) / count),
                )
                for idx in range(count)
            ]

        return self._formation_slots("line", count, spacing_m)

    def _offset(self, lat: float, lon: float, dx_m: float, dy_m: float) -> Tuple[float, float]:
        dlat = dy_m / 111_320.0
        dlon = dx_m / (111_320.0 * max(0.2, math.cos(math.radians(lat))))
        return lat + dlat, lon + dlon

    def status(self) -> Dict[str, Any]:
        with self._lock:
            drones = {
                drone_id: {
                    "status": meta.get("status"),
                    "position": meta.get("position"),
                    "task": meta.get("task"),
                    "battery": meta.get("battery", 100.0),
                    "health": meta.get("health"),
                    "last_seen": meta.get("last_seen"),
                }
                for drone_id, meta in self.drones.items()
            }
            queued = [task for task in self.tasks if task.get("status") in {"queued", "dispatch_failed"}]
            return {
                "registered": len(self.drones),
                "online": sum(1 for d in drones.values() if d.get("health") == "online"),
                "busy": sum(1 for d in drones.values() if d.get("status") == "busy"),
                "queued_tasks": len(queued),
                "drones": drones,
                "formation": self.formation,
                "last_assignment": self.last_assignment,
            }
