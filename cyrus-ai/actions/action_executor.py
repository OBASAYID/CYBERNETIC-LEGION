import uuid
from typing import Any, Dict

from control.approval import consume_approval, request_approval
from control.authority import is_action_allowed
from safety.override import is_locked


def execute_action(action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    if is_locked():
        return {
            "status": "blocked",
            "action": action,
            "reason": "system_lockdown",
        }

    operator_role = str(payload.get("operator_role", "system"))
    if not is_action_allowed(operator_role, action):
        return {
            "status": "forbidden",
            "action": action,
            "reason": "role_not_authorized",
            "role": operator_role,
        }

    if action in {"webhook", "external_call"}:
        action_id = str(payload.get("action_id", "")).strip() or str(uuid.uuid4())
        if not consume_approval(action_id, action):
            return request_approval(
                action_id,
                action,
                requested_by=str(payload.get("operator_id", "system")),
                metadata={
                    "payload": payload,
                    "risk_level": "high",
                },
            )

    if action == "log":
        print("LOG:", payload)
    elif action == "alert":
        print("ALERT:", payload)
    elif action == "webhook":
        print("WEBHOOK:", payload)
    elif action == "external_call":
        print("EXTERNAL_CALL:", payload)
    else:
        return {
            "status": "ignored",
            "action": action,
            "reason": "unsupported_action",
        }

    return {
        "status": "executed",
        "action": action,
    }
