import queue
import time
from typing import Any, Dict, Optional

from persistence.json_store import append_item, read_items

_EVENT_CAPACITY = 5000
_BACKPRESSURE_THRESHOLD = 0.8
_DEAD_LETTER_FILE = "dead-letters.json"
event_queue: queue.Queue[Dict[str, Any]] = queue.Queue(maxsize=_EVENT_CAPACITY)


def ingest_event(event: Dict[str, Any]) -> bool:
    if not isinstance(event, dict):
        raise ValueError("event must be an object")

    try:
        event_queue.put_nowait(event)
        return True
    except queue.Full:
        try:
            append_item(_DEAD_LETTER_FILE, {**event, "_dropped_at": time.time()})
        except Exception:
            pass
        return False


def get_event() -> Optional[Dict[str, Any]]:
    try:
        return event_queue.get_nowait()
    except queue.Empty:
        return None


def queue_size() -> int:
    return event_queue.qsize()


def queue_capacity() -> int:
    return _EVENT_CAPACITY


def queue_utilization() -> float:
    if _EVENT_CAPACITY == 0:
        return 0.0
    return round(event_queue.qsize() / _EVENT_CAPACITY, 4)


def is_backpressured() -> bool:
    return queue_utilization() >= _BACKPRESSURE_THRESHOLD


def dead_letter_count() -> int:
    try:
        return len(read_items(_DEAD_LETTER_FILE))
    except Exception:
        return 0
