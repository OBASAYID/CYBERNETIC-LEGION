from __future__ import annotations

from typing import Any, Callable


def safe_execute(
    fn: Callable[[], Any],
    fallback: Any = None,
    on_error: Callable[[Exception], None] | None = None,
) -> Any:
    try:
        return fn()
    except Exception as exc:
        if on_error is not None:
            on_error(exc)
        return fallback
