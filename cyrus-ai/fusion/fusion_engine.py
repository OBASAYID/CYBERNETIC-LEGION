from typing import Any, Dict


def fuse_intelligence(memory: Dict[str, Any], live_data: Dict[str, Any] | None, analysis: str) -> Dict[str, Any]:
    memory_docs = memory.get("documents", []) if isinstance(memory, dict) else []
    has_memory = bool(memory_docs)
    has_live = bool(live_data)
    has_analysis = bool(str(analysis).strip())

    confidence = 0.55
    if has_memory:
        confidence += 0.15
    if has_live:
        confidence += 0.15
    if has_analysis:
        confidence += 0.15

    confidence = min(round(confidence, 3), 0.99)

    return {
        "situation": {
            "memory": memory,
            "live": live_data,
            "analysis": analysis,
        },
        "confidence": confidence,
    }
