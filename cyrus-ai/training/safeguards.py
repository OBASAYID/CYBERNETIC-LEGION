import json
import os
from pathlib import Path
from time import time
from typing import Any, Dict, List, Optional

from metrics.tracker import get_metrics
from models.local_model import reload_local_model
from models.versioning import set_active_model

_DEFAULT_FILE = Path(__file__).resolve().parent.parent / "runtime-data" / "model-safeguard.json"
_SAFEGUARD_FILE = Path(os.getenv("CYRUS_MODEL_SAFEGUARD_FILE", _DEFAULT_FILE))
_SAFEGUARD_FILE.parent.mkdir(parents=True, exist_ok=True)


def _read_state() -> Dict[str, Any]:
    if not _SAFEGUARD_FILE.exists():
        return {}
    try:
        raw = json.loads(_SAFEGUARD_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(raw, dict):
        return {}
    return dict(raw)


def _write_state(state: Dict[str, Any]) -> None:
    _SAFEGUARD_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")


def _metric_summary(metrics: List[Dict[str, Any]]) -> Dict[str, float]:
    if not metrics:
        return {
            "avg_score": 0.0,
            "avg_latency": 0.0,
            "failure_rate": 0.0,
            "samples": 0.0,
        }

    avg_score = sum(float(m.get("score", 0.0)) for m in metrics) / len(metrics)
    avg_latency = sum(float(m.get("latency", 0.0)) for m in metrics) / len(metrics)
    failure_rate = sum(1 for m in metrics if m.get("status") != "ok") / len(metrics)

    return {
        "avg_score": round(avg_score, 4),
        "avg_latency": round(avg_latency, 4),
        "failure_rate": round(failure_rate, 4),
        "samples": float(len(metrics)),
    }


def _metrics_since(timestamp: float) -> List[Dict[str, Any]]:
    metrics = get_metrics()
    return [m for m in metrics if float(m.get("timestamp", 0.0)) >= timestamp]


def register_promotion_safeguard(new_model_path: str, previous_model_path: Optional[str]) -> Dict[str, Any]:
    baseline_window = int(os.getenv("CYRUS_MODEL_SAFEGUARD_BASELINE_WINDOW", "50"))
    promotion_time = time()

    all_metrics = get_metrics()
    baseline_metrics = all_metrics[-baseline_window:] if baseline_window > 0 else all_metrics
    baseline = _metric_summary(baseline_metrics)

    state = {
        "active": True,
        "status": "monitoring",
        "promoted_at": promotion_time,
        "new_model_path": str(Path(new_model_path).resolve()),
        "previous_model_path": str(Path(previous_model_path).resolve()) if previous_model_path else None,
        "baseline": baseline,
        "window_size": int(os.getenv("CYRUS_MODEL_SAFEGUARD_WINDOW_SIZE", "25")),
        "min_score_ratio": float(os.getenv("CYRUS_MODEL_SAFEGUARD_MIN_SCORE_RATIO", "0.85")),
        "max_latency_ratio": float(os.getenv("CYRUS_MODEL_SAFEGUARD_MAX_LATENCY_RATIO", "1.35")),
        "max_failure_delta": float(os.getenv("CYRUS_MODEL_SAFEGUARD_MAX_FAILURE_DELTA", "0.1")),
        "last_checked_at": 0.0,
        "last_summary": {},
        "rollback": None,
    }
    _write_state(state)
    return state


def get_promotion_safeguard_state() -> Dict[str, Any]:
    return _read_state()


def evaluate_promotion_safeguard() -> Dict[str, Any]:
    state = _read_state()
    if not state or not state.get("active"):
        return {
            "status": "inactive",
            "reason": "no_active_safeguard",
            "rolled_back": False,
        }

    promoted_at = float(state.get("promoted_at", 0.0))
    recent_metrics = _metrics_since(promoted_at)
    window_size = int(state.get("window_size", 25))

    if len(recent_metrics) < window_size:
        state["status"] = "monitoring"
        state["last_checked_at"] = time()
        state["last_summary"] = _metric_summary(recent_metrics)
        _write_state(state)
        return {
            "status": "monitoring",
            "rolled_back": False,
            "samples_collected": len(recent_metrics),
            "samples_required": window_size,
        }

    evaluation_window = recent_metrics[-window_size:]
    summary = _metric_summary(evaluation_window)
    baseline = dict(state.get("baseline") or {})

    baseline_score = max(float(baseline.get("avg_score", 0.0)), 1e-6)
    baseline_latency = max(float(baseline.get("avg_latency", 0.0)), 1e-6)
    baseline_failure = float(baseline.get("failure_rate", 0.0))

    score_ratio = float(summary["avg_score"]) / baseline_score
    latency_ratio = float(summary["avg_latency"]) / baseline_latency
    failure_delta = float(summary["failure_rate"]) - baseline_failure

    should_rollback = (
        score_ratio < float(state.get("min_score_ratio", 0.85))
        or latency_ratio > float(state.get("max_latency_ratio", 1.35))
        or failure_delta > float(state.get("max_failure_delta", 0.1))
    )

    state["last_checked_at"] = time()
    state["last_summary"] = {
        **summary,
        "score_ratio": round(score_ratio, 4),
        "latency_ratio": round(latency_ratio, 4),
        "failure_delta": round(failure_delta, 4),
    }

    if should_rollback and state.get("previous_model_path"):
        previous = str(state["previous_model_path"])
        rollback_record = set_active_model(
            previous,
            metadata={
                "rollback_from": state.get("new_model_path"),
                "reason": "post_promotion_degradation",
                "summary": state["last_summary"],
            },
        )
        reload_local_model(previous)

        state["active"] = False
        state["status"] = "rolled_back"
        state["rollback"] = rollback_record
        _write_state(state)

        return {
            "status": "rolled_back",
            "rolled_back": True,
            "reason": "post_promotion_degradation",
            "summary": state["last_summary"],
        }

    state["status"] = "passed" if not should_rollback else "degraded_no_fallback"
    state["active"] = False
    _write_state(state)

    return {
        "status": state["status"],
        "rolled_back": False,
        "summary": state["last_summary"],
    }
