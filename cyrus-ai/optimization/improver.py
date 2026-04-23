from typing import Any, Dict, List


def improve_system(metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not metrics:
        return {"action": "stable", "reason": "no_metrics"}

    avg_latency = sum(float(m.get("latency", 0)) for m in metrics) / len(metrics)
    avg_score = sum(float(m.get("score", 0)) for m in metrics) / len(metrics)
    failure_rate = sum(1 for m in metrics if m.get("status") != "ok") / len(metrics)

    if avg_latency > 2000:
        action = "optimize_speed"
        reason = "high_latency"
    elif failure_rate > 0.1:
        action = "improve_reliability"
        reason = "elevated_failure_rate"
    elif avg_score < 0.75:
        action = "optimize_quality"
        reason = "low_evaluation_score"
    else:
        action = "stable"
        reason = "metrics_within_target"

    return {
        "action": action,
        "reason": reason,
        "avg_latency": round(avg_latency, 3),
        "avg_score": round(avg_score, 3),
        "failure_rate": round(failure_rate, 3),
        "sample_size": len(metrics),
    }
