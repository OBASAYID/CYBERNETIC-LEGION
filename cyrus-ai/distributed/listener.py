from typing import Any, Dict

from distributed.identity import NODE_ID
from distributed.message_bus import subscribe_events
from distributed.safe_execution import safe_execute
from memory_service import store_memory


def handle_event(event: Dict[str, Any]) -> None:
    print("Received distributed event:", event)

    event_type = event.get("type")
    source_node = event.get("node_id")

    if source_node == NODE_ID:
        return

    if event_type == "mission_update":
        payload = event.get("data", {})
        if isinstance(payload, dict):
            from mission_control.controller import apply_remote_mission_update

            apply_remote_mission_update(payload)
        return

    if event_type == "lockdown_state":
        payload = event.get("data", {})
        if isinstance(payload, dict):
            from safety.override import apply_remote_lockdown_state

            apply_remote_lockdown_state(payload)
        return

    if event_type != "memory_update":
        return

    payload = event.get("data", {})
    text = payload.get("text")
    metadata = payload.get("metadata", {})

    if not isinstance(text, str) or not text.strip():
        return

    if not isinstance(metadata, dict):
        metadata = {}

    metadata = {**metadata, "replicated_from": event.get("node_id")}
    _ = safe_execute(lambda: store_memory(text, metadata, propagate=False))


def start_listener() -> None:
    subscribe_events(handle_event)
