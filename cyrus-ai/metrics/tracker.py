from collections import deque
from threading import Lock
from time import time
from typing import Any, Deque, Dict, List

from persistence.json_store import read_items, replace_items

_METRIC_CAPACITY = 1000
_METRICS_FILE = "metrics.json"
_metrics_store: Deque[Dict[str, Any]] = deque(read_items(_METRICS_FILE), maxlen=_METRIC_CAPACITY)
_metrics_lock = Lock()


def log_metric(entry: Dict[str, Any]) -> None:
    payload = dict(entry)
    payload.setdefault("timestamp", time())
    with _metrics_lock:
        _metrics_store.append(payload)
        replace_items(_METRICS_FILE, [dict(item) for item in _metrics_store])


def get_metrics() -> List[Dict[str, Any]]:
    with _metrics_lock:
        return [dict(item) for item in _metrics_store]


def reset_metrics() -> None:
    with _metrics_lock:
        _metrics_store.clear()
        replace_items(_METRICS_FILE, [])
