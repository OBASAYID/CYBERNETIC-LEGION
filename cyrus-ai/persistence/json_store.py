import json
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List

_BASE_DIR = Path(__file__).resolve().parent.parent / "runtime-data"
_BASE_DIR.mkdir(parents=True, exist_ok=True)
_file_locks: dict[Path, Lock] = {}
_global_lock = Lock()


def _get_lock(path: Path) -> Lock:
    with _global_lock:
        if path not in _file_locks:
            _file_locks[path] = Lock()
        return _file_locks[path]


def _normalize(items: Any) -> List[Dict[str, Any]]:
    if not isinstance(items, list):
        return []
    return [dict(item) for item in items if isinstance(item, dict)]


def read_items(file_name: str) -> List[Dict[str, Any]]:
    path = _BASE_DIR / file_name
    lock = _get_lock(path)
    with lock:
        if not path.exists():
            return []
        try:
            content = json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return []
        return _normalize(content)


def replace_items(file_name: str, items: List[Dict[str, Any]]) -> None:
    path = _BASE_DIR / file_name
    lock = _get_lock(path)
    payload = json.dumps(_normalize(items), indent=2)
    with lock:
        path.write_text(payload, encoding="utf-8")


def append_item(file_name: str, item: Dict[str, Any], max_items: int = 1000) -> List[Dict[str, Any]]:
    existing = read_items(file_name)
    existing.append(dict(item))
    if max_items > 0:
        existing = existing[-max_items:]
    replace_items(file_name, existing)
    return existing
