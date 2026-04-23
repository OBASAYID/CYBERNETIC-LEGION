from __future__ import annotations

import threading
import time
from typing import Any, Dict, List

from distributed.message_bus import publish_event


class NXIGlobalIntelligenceMap:
    """Live global world model for drones, targets, and mission context."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self.grid_cells: Dict[str, Dict[str, Any]] = {}
        self.drone_nodes: Dict[str, Dict[str, Any]] = {}
        self.targets: Dict[str, Dict[str, Any]] = {}
        self.recent_events: List[Dict[str, Any]] = []
        self.version = 0

    def update_drone(self, drone_id: str, lat: float | None, lon: float | None, alt: float | None, status: str) -> None:
        if lat is None or lon is None:
            return

        with self._lock:
            self.drone_nodes[drone_id] = {
                "drone_id": drone_id,
                "lat": float(lat),
                "lon": float(lon),
                "alt": float(alt or 0.0),
                "status": status,
                "updated_at": time.time(),
            }
            self._touch_cell(lat, lon, {"drone_id": drone_id, "status": status})
            self._bump_version({"type": "drone_update", "drone_id": drone_id})

    def update_targets(self, targets: List[Dict[str, Any]]) -> None:
        with self._lock:
            for target in targets:
                target_id = str(target.get("id") or target.get("track_id") or "")
                if not target_id:
                    continue

                world = target.get("world_estimate")
                lat = world.get("lat") if isinstance(world, dict) else None
                lon = world.get("lon") if isinstance(world, dict) else None
                self.targets[target_id] = {
                    **target,
                    "id": target_id,
                    "updated_at": time.time(),
                }
                if isinstance(lat, (float, int)) and isinstance(lon, (float, int)):
                    self._touch_cell(
                        float(lat),
                        float(lon),
                        {"target_id": target_id, "label": target.get("label", "unknown")},
                    )

            self._bump_version({"type": "target_update", "target_count": len(targets)})

    def ingest_world_state(self, world_state: Dict[str, Any]) -> None:
        telemetry = world_state.get("telemetry", {}) if isinstance(world_state, dict) else {}
        lat = telemetry.get("lat")
        lon = telemetry.get("lon")
        alt = telemetry.get("alt")
        if isinstance(lat, (float, int)) and isinstance(lon, (float, int)):
            self.update_drone(
                "drone-1",
                float(lat),
                float(lon),
                float(alt or 0.0),
                str(telemetry.get("mode", "unknown")),
            )

    def snapshot(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "version": self.version,
                "generated_at": time.time(),
                "drone_nodes": list(self.drone_nodes.values()),
                "targets": list(self.targets.values()),
                "hot_cells": sorted(self.grid_cells.values(), key=lambda c: c.get("activity", 0), reverse=True)[:200],
                "recent_events": list(self.recent_events[-50:]),
            }

    def _touch_cell(self, lat: float, lon: float, annotation: Dict[str, Any]) -> None:
        key = self._cell_key(lat, lon)
        cell = self.grid_cells.get(
            key,
            {
                "cell_id": key,
                "center": {"lat": round(lat, 3), "lon": round(lon, 3)},
                "activity": 0,
                "last_annotation": {},
                "updated_at": 0.0,
            },
        )
        cell["activity"] = int(cell.get("activity", 0)) + 1
        cell["last_annotation"] = annotation
        cell["updated_at"] = time.time()
        self.grid_cells[key] = cell

    def _cell_key(self, lat: float, lon: float, precision: float = 0.01) -> str:
        lat_bucket = round(lat / precision) * precision
        lon_bucket = round(lon / precision) * precision
        return f"{lat_bucket:.2f}:{lon_bucket:.2f}"

    def _bump_version(self, event: Dict[str, Any]) -> None:
        self.version += 1
        packed = {"version": self.version, "timestamp": time.time(), **event}
        self.recent_events.append(packed)
        publish_event({"type": "nxi.map.update", "data": packed})
