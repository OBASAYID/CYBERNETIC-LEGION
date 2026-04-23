import time
from threading import Lock
from typing import Any, Dict

from distributed.identity import NODE_ID
from distributed.message_bus import publish_event
from persistence import read_items, replace_items

_MISSIONS_FILE = "active_missions.json"
_LOCK = Lock()


def _load_missions() -> Dict[str, Dict[str, Any]]:
    items = read_items(_MISSIONS_FILE)
    return {item.get("mission_id", ""): item for item in items if item.get("mission_id")}


ACTIVE_MISSIONS: Dict[str, Dict[str, Any]] = _load_missions()


def _persist() -> None:
    replace_items(_MISSIONS_FILE, list(ACTIVE_MISSIONS.values()))


def _publish_update(mission: Dict[str, Any]) -> None:
    try:
        publish_event(
            {
                "type": "mission_update",
                "node_id": NODE_ID,
                "data": mission,
            }
        )
    except Exception:
        pass


def start_mission(
    mission_id: str,
    objective: str,
    metadata: Dict[str, Any] | None = None,
    initiated_by: str = "system",
) -> Dict[str, Any]:
    if not mission_id:
        raise ValueError("mission_id is required")

    mission = {
        "mission_id": mission_id,
        "objective": objective,
        "metadata": metadata or {},
        "status": "running",
        "initiated_by": initiated_by,
        "updated_at": time.time(),
    }

    with _LOCK:
        ACTIVE_MISSIONS[mission_id] = mission
        _persist()

    _publish_update(mission)
    return mission


def stop_mission(mission_id: str, stopped_by: str = "system") -> Dict[str, Any] | None:
    with _LOCK:
        mission = ACTIVE_MISSIONS.get(mission_id)
        if not mission:
            return None

        mission = dict(mission)
        mission["status"] = "stopped"
        mission["stopped_by"] = stopped_by
        mission["updated_at"] = time.time()
        ACTIVE_MISSIONS[mission_id] = mission
        _persist()

    _publish_update(mission)
    return mission


def get_mission(mission_id: str) -> Dict[str, Any] | None:
    with _LOCK:
        mission = ACTIVE_MISSIONS.get(mission_id)
        return dict(mission) if mission else None


def list_active_missions() -> Dict[str, Dict[str, Any]]:
    with _LOCK:
        return {key: dict(value) for key, value in ACTIVE_MISSIONS.items()}


def apply_remote_mission_update(mission: Dict[str, Any]) -> None:
    mission_id = str(mission.get("mission_id", "")).strip()
    if not mission_id:
        return

    with _LOCK:
        ACTIVE_MISSIONS[mission_id] = dict(mission)
        _persist()
