from collections import deque
from threading import Lock
from time import monotonic

from alerts.dispatcher import send_alert

_WINDOW_SIZE = 200
_ALERT_COOLDOWN_SECONDS = 120
_events = deque(maxlen=_WINDOW_SIZE)
_lock = Lock()
_last_alert_time = 0.0


def maybe_alert_on_error_rate(status_code: int) -> None:
    global _last_alert_time

    with _lock:
        _events.append(1 if status_code >= 500 else 0)
        if len(_events) < 20:
            return

        error_rate = sum(_events) / len(_events)
        now = monotonic()
        if error_rate > 0.30 and (now - _last_alert_time) >= _ALERT_COOLDOWN_SECONDS:
            _last_alert_time = now
            send_alert(f"High error rate detected: {error_rate:.2%} over last {len(_events)} requests")
