from typing import Any, Dict, List

from persistence.json_store import append_item, read_items, replace_items

_HISTORY_FILE = "benchmark-history.json"
_HISTORY_LIMIT = 200


def log_benchmark(entry: Dict[str, Any]) -> List[Dict[str, Any]]:
    return append_item(_HISTORY_FILE, entry, max_items=_HISTORY_LIMIT)


def get_benchmark_history() -> List[Dict[str, Any]]:
    return read_items(_HISTORY_FILE)


def reset_benchmark_history() -> None:
    replace_items(_HISTORY_FILE, [])
