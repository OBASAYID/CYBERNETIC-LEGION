import threading
import time
from typing import Any, Dict

from persistence import read_items, replace_items

_PENDING_FILE = "control_pending_actions.json"
_APPROVED_FILE = "control_approved_actions.json"
_LOCK = threading.Lock()


def _load_map(file_name: str) -> Dict[str, Dict[str, Any]]:
    items = read_items(file_name)
    results: Dict[str, Dict[str, Any]] = {}
    for item in items:
        action_id = str(item.get("action_id", "")).strip()
        if action_id:
            results[action_id] = item
    return results


PENDING_ACTIONS: Dict[str, Dict[str, Any]] = _load_map(_PENDING_FILE)
APPROVED_ACTIONS: Dict[str, Dict[str, Any]] = _load_map(_APPROVED_FILE)


def _persist() -> None:
    replace_items(_PENDING_FILE, list(PENDING_ACTIONS.values()))
    replace_items(_APPROVED_FILE, list(APPROVED_ACTIONS.values()))


def request_approval(
    action_id: str,
    action: str,
    requested_by: str = "system",
    metadata: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    if not action_id:
        raise ValueError("action_id is required")

    with _LOCK:
        payload = {
            "action_id": action_id,
            "action": action,
            "requested_by": requested_by,
            "metadata": metadata or {},
            "status": "pending",
            "requested_at": time.time(),
        }
        PENDING_ACTIONS[action_id] = payload
        _persist()

    return {
        "status": "pending",
        "action_id": action_id,
        "action": action,
    }


def approve_action(action_id: str, approver: str = "admin") -> Dict[str, Any] | None:
    with _LOCK:
        action = PENDING_ACTIONS.pop(action_id, None)
        if not action:
            return None

        action = dict(action)
        action["status"] = "approved"
        action["approved_by"] = approver
        action["approved_at"] = time.time()
        APPROVED_ACTIONS[action_id] = action
        _persist()
        return action


def reject_action(action_id: str, approver: str = "admin", reason: str = "rejected") -> Dict[str, Any] | None:
    with _LOCK:
        action = PENDING_ACTIONS.pop(action_id, None)
        if not action:
            return None

        action = dict(action)
        action["status"] = "rejected"
        action["approved_by"] = approver
        action["approved_at"] = time.time()
        action["reason"] = reason
        _persist()
        return action


def consume_approval(action_id: str, action: str) -> bool:
    with _LOCK:
        approved = APPROVED_ACTIONS.get(action_id)
        if not approved:
            return False

        if approved.get("action") != action:
            return False

        APPROVED_ACTIONS.pop(action_id, None)
        _persist()
        return True


def list_pending_actions() -> Dict[str, Dict[str, Any]]:
    with _LOCK:
        return {key: dict(value) for key, value in PENDING_ACTIONS.items()}
