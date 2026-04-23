import os
import time
from pathlib import Path
from threading import Lock
from typing import Any, Dict

import json

from distributed.identity import NODE_ID
from distributed.message_bus import publish_event

_STATE_FILE = Path(
    os.getenv(
        "CYRUS_LOCKDOWN_STATE_FILE",
        Path(__file__).resolve().parent.parent / "runtime-data" / "system_lockdown.json",
    )
)
_LOCK = Lock()
SYSTEM_LOCKDOWN = False
LOCKDOWN_REASON = ""
LOCKDOWN_UPDATED_AT = 0.0


def _load() -> None:
    global SYSTEM_LOCKDOWN, LOCKDOWN_REASON, LOCKDOWN_UPDATED_AT

    if not _STATE_FILE.exists():
        return

    try:
        payload = json.loads(_STATE_FILE.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return

    SYSTEM_LOCKDOWN = bool(payload.get("locked", False))
    LOCKDOWN_REASON = str(payload.get("reason", ""))
    LOCKDOWN_UPDATED_AT = float(payload.get("updated_at", 0.0))


def _persist() -> None:
    _STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "locked": SYSTEM_LOCKDOWN,
        "reason": LOCKDOWN_REASON,
        "updated_at": LOCKDOWN_UPDATED_AT,
    }
    _STATE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def _publish_state() -> None:
    try:
        publish_event(
            {
                "type": "lockdown_state",
                "node_id": NODE_ID,
                "data": get_lockdown_state(),
            }
        )
    except Exception:
        pass


def enable_lockdown(reason: str = "manual_override") -> Dict[str, Any]:
    global SYSTEM_LOCKDOWN, LOCKDOWN_REASON, LOCKDOWN_UPDATED_AT

    with _LOCK:
        SYSTEM_LOCKDOWN = True
        LOCKDOWN_REASON = reason
        LOCKDOWN_UPDATED_AT = time.time()
        _persist()

    _publish_state()
    return get_lockdown_state()


def disable_lockdown(reason: str = "manual_override") -> Dict[str, Any]:
    global SYSTEM_LOCKDOWN, LOCKDOWN_REASON, LOCKDOWN_UPDATED_AT

    with _LOCK:
        SYSTEM_LOCKDOWN = False
        LOCKDOWN_REASON = reason
        LOCKDOWN_UPDATED_AT = time.time()
        _persist()

    _publish_state()
    return get_lockdown_state()


def is_locked() -> bool:
    with _LOCK:
        return SYSTEM_LOCKDOWN


def get_lockdown_state() -> Dict[str, Any]:
    with _LOCK:
        return {
            "locked": SYSTEM_LOCKDOWN,
            "reason": LOCKDOWN_REASON,
            "updated_at": LOCKDOWN_UPDATED_AT,
        }


def apply_remote_lockdown_state(state: Dict[str, Any]) -> None:
    global SYSTEM_LOCKDOWN, LOCKDOWN_REASON, LOCKDOWN_UPDATED_AT

    with _LOCK:
        SYSTEM_LOCKDOWN = bool(state.get("locked", False))
        LOCKDOWN_REASON = str(state.get("reason", ""))
        LOCKDOWN_UPDATED_AT = float(state.get("updated_at", 0.0))
        _persist()


_load()
