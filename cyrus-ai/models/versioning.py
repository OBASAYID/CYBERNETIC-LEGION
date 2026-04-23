import json
import os
from pathlib import Path
from time import time
from typing import Any, Dict, List, Optional

_DEFAULT_MODEL_OUTPUT = Path(__file__).resolve().parent.parent / "runtime-data" / "model_output"
_MODEL_OUTPUT_ROOT = Path(os.getenv("CYRUS_MODEL_OUTPUT_DIR", str(_DEFAULT_MODEL_OUTPUT)))
_MODEL_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
_REGISTRY_FILE = _MODEL_OUTPUT_ROOT / "registry.json"
_ACTIVE_MODEL_FILE = _MODEL_OUTPUT_ROOT / "active-model.json"


def model_output_root() -> Path:
    _MODEL_OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    return _MODEL_OUTPUT_ROOT


def _read_registry() -> List[Dict[str, Any]]:
    if not _REGISTRY_FILE.exists():
        return []
    try:
        raw = json.loads(_REGISTRY_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return []
    if not isinstance(raw, list):
        return []
    return [dict(item) for item in raw if isinstance(item, dict)]


def _write_registry(entries: List[Dict[str, Any]]) -> None:
    _REGISTRY_FILE.write_text(json.dumps(entries, indent=2), encoding="utf-8")


def _read_active_model_record() -> Dict[str, Any]:
    if not _ACTIVE_MODEL_FILE.exists():
        return {}
    try:
        raw = json.loads(_ACTIVE_MODEL_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}
    if not isinstance(raw, dict):
        return {}
    return dict(raw)


def _write_active_model_record(record: Dict[str, Any]) -> None:
    _ACTIVE_MODEL_FILE.write_text(json.dumps(record, indent=2), encoding="utf-8")


def register_model_version(path: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    record = {
        "path": str(Path(path).resolve()),
        "metadata": dict(metadata or {}),
        "timestamp": time(),
    }
    entries = _read_registry()
    entries.append(record)
    _write_registry(entries)
    return record


def set_active_model(path: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    resolved_path = str(Path(path).resolve())
    record = {
        "path": resolved_path,
        "metadata": dict(metadata or {}),
        "timestamp": time(),
    }
    _write_active_model_record(record)
    return record


def get_active_model_path() -> Optional[str]:
    record = _read_active_model_record()
    path = record.get("path")
    if not isinstance(path, str) or not path.strip():
        return None
    if Path(path).exists():
        return path
    return None


def get_active_model() -> str:
    active_path = get_active_model_path()
    if not active_path:
        return ""
    return Path(active_path).name


def list_model_versions() -> List[str]:
    root = model_output_root()
    versions = []
    for child in root.iterdir():
        if child.is_dir() and (child / "config.json").exists():
            versions.append(str(child.resolve()))
    versions.sort(key=lambda item: Path(item).name)
    return versions


def get_latest_model_path() -> Optional[str]:
    versions = list_model_versions()
    if not versions:
        return None
    return versions[-1]


def get_latest_model() -> str:
    latest = get_latest_model_path()
    if latest:
        return Path(latest).name
    return ""
