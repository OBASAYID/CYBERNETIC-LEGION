import os
from typing import Any, Dict

from agents.commander import Commander
from models.local_model import local_infer
from models.reasoning import reason

commander = Commander()


def hybrid_reason(input_text: str, context: str) -> str:
    prompt = f"{input_text.strip()}\n\nContext:\n{context.strip() if isinstance(context, str) else ''}".strip()
    try:
        return local_infer(prompt)
    except Exception:
        return reason(prompt)


def reason_with_mode(input_text: str, context: str) -> str:
    model_mode = os.getenv("CYRUS_MODEL_MODE", "hybrid").strip().lower()
    prompt = f"{input_text.strip()}\n\nContext:\n{context.strip() if isinstance(context, str) else ''}".strip()

    if model_mode == "local":
        return local_infer(prompt)
    if model_mode == "hybrid":
        return hybrid_reason(input_text, context)
    return reason(prompt)


def process_input(input_text: str, operator_role: str = "system", operator_id: str = "system") -> Dict[str, Any]:
    result = commander.execute(input_text, operator_role=operator_role, operator_id=operator_id)
    return {
        "type": "multi-agent",
        "result": result,
    }


def process_embodied_input(signal_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Route embodied signals through the same core reasoning commander."""
    prompt = f"[EMBODIED_SIGNAL:{signal_type}]\n{payload}"
    result = commander.execute(prompt, operator_role="system", operator_id="embodied-core")
    return {
        "type": "embodied",
        "signal": signal_type,
        "result": result,
    }


def process_swarm_event(event: Dict[str, Any], coordinator) -> Dict[str, Any]:
    if not isinstance(event, dict):
        raise ValueError("swarm event must be a dictionary")

    if event.get("type") == "target_detected":
        target_id = str(event.get("id", ""))
        position = event.get("position")
        if not target_id:
            raise ValueError("target_detected event missing id")
        if not isinstance(position, (list, tuple)) or len(position) != 2:
            raise ValueError("target_detected event missing position [x,y]")

        return coordinator.handle_detection(target_id, (float(position[0]), float(position[1])))

    return {"status": "ignored", "reason": "unsupported_event_type", "event_type": event.get("type")}
