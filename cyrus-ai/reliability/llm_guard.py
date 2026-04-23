from time import sleep
from typing import Any, Callable


def safe_llm_call(fn: Callable[[], Any], retries: int = 2, backoff_seconds: float = 0.2) -> Any:
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as exc:
            last_error = exc
            if attempt < retries:
                sleep(backoff_seconds * (attempt + 1))

    return {
        "error": "LLM failed",
        "details": str(last_error) if last_error else "unknown error",
    }
