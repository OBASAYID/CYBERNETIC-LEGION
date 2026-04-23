from typing import Dict, Set

_ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "admin": {
        "log",
        "alert",
        "webhook",
        "external_call",
        "system_train",
        "mission_start",
        "mission_stop",
        "lockdown",
    },
    "operator": {
        "log",
        "alert",
        "webhook",
        "external_call",
        "mission_start",
        "mission_stop",
    },
    "analyst": {
        "log",
        "alert",
    },
    "viewer": set(),
    "system": {
        "log",
        "alert",
        "webhook",
        "external_call",
        "system_train",
        "mission_start",
        "mission_stop",
        "lockdown",
    },
}


def is_action_allowed(role: str, action: str) -> bool:
    normalized_role = (role or "viewer").strip().lower()
    normalized_action = (action or "").strip().lower()
    if not normalized_action:
        return False

    permissions = _ROLE_PERMISSIONS.get(normalized_role, set())
    return normalized_action in permissions
