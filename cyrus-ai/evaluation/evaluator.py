from typing import Any, Dict, Iterable


def _clamp(value: float) -> float:
    return max(0.0, min(round(value, 3), 1.0))


def _has_content(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, str):
        return bool(value.strip())
    if isinstance(value, dict):
        return bool(value)
    if isinstance(value, Iterable) and not isinstance(value, (str, bytes, dict)):
        return any(True for _ in value)
    return True


def evaluate_response(
    input_text: str,
    output: Dict[str, Any],
    expected: Dict[str, Any] | None = None,
) -> Dict[str, float]:
    result = output.get("result", output) if isinstance(output, dict) else {}
    memory = result.get("memory", {}) if isinstance(result, dict) else {}
    analysis = result.get("analysis") if isinstance(result, dict) else None
    mission = result.get("mission", {}) if isinstance(result, dict) else {}

    relevance = 0.25
    if _has_content(analysis):
        relevance += 0.35
    if _has_content(memory):
        relevance += 0.15
    if isinstance(input_text, str) and input_text.strip() and _has_content(mission):
        relevance += 0.15

    accuracy = 0.2
    if isinstance(memory, dict) and not memory.get("error"):
        accuracy += 0.3
    if isinstance(analysis, str) and analysis and "LLM unavailable" not in analysis and "LLM failed" not in analysis:
        accuracy += 0.3
    if isinstance(mission, dict) and isinstance(mission.get("mission_plan"), list) and mission["mission_plan"]:
        accuracy += 0.2

    completeness = 0.2
    if _has_content(memory):
        completeness += 0.2
    if _has_content(analysis):
        completeness += 0.3
    if _has_content(mission):
        completeness += 0.2

    if expected:
        expected_keys = {key for key, value in expected.items() if value is not None}
        if expected_keys:
            matched = sum(1 for key in expected_keys if result.get(key) is not None)
            completeness += 0.1 * (matched / len(expected_keys))
            accuracy += 0.1 * (matched / len(expected_keys))

    relevance = _clamp(relevance)
    accuracy = _clamp(accuracy)
    completeness = _clamp(completeness)
    overall = _clamp((relevance + accuracy + completeness) / 3)

    return {
        "relevance": relevance,
        "accuracy": accuracy,
        "completeness": completeness,
        "overall": overall,
    }
