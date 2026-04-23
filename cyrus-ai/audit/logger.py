import hashlib
import json
import os
import time
from pathlib import Path
from threading import Lock
from typing import Any, Dict, List

from distributed.identity import NODE_ID
from distributed.message_bus import publish_event

_AUDIT_LOG_PATH = Path(
    os.getenv(
        "CYRUS_AUDIT_LOG_FILE",
        Path(__file__).resolve().parent.parent / "runtime-data" / "audit_log.jsonl",
    )
)
_LOCK = Lock()


def _canonical_json(payload: Dict[str, Any]) -> str:
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str)


def _ensure_parent() -> None:
    _AUDIT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


def _read_last_record() -> Dict[str, Any] | None:
    if not _AUDIT_LOG_PATH.exists():
        return None

    last_line = ""
    with _AUDIT_LOG_PATH.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                last_line = line.strip()

    if not last_line:
        return None

    try:
        return json.loads(last_line)
    except json.JSONDecodeError:
        return None


def _append_line(line: str) -> None:
    flags = os.O_APPEND | os.O_CREAT | os.O_WRONLY
    fd = os.open(str(_AUDIT_LOG_PATH), flags, 0o600)
    try:
        os.write(fd, line.encode("utf-8"))
        os.fsync(fd)
    finally:
        os.close(fd)


def log_audit(entry: Dict[str, Any]) -> Dict[str, Any]:
    if not isinstance(entry, dict):
        raise ValueError("entry must be a dictionary")

    _ensure_parent()
    with _LOCK:
        previous = _read_last_record()
        previous_hash = previous.get("entry_hash") if isinstance(previous, dict) else None

        base_record: Dict[str, Any] = {
            "timestamp": time.time(),
            "node_id": NODE_ID,
            "record_version": 1,
            "previous_hash": previous_hash,
            **entry,
        }

        digest_payload = dict(base_record)
        digest_payload.pop("entry_hash", None)
        base_record["entry_hash"] = hashlib.sha256(_canonical_json(digest_payload).encode("utf-8")).hexdigest()

        _append_line(_canonical_json(base_record) + "\n")

    try:
        publish_event(
            {
                "type": "audit_entry",
                "node_id": NODE_ID,
                "data": {
                    "entry_hash": base_record["entry_hash"],
                    "timestamp": base_record["timestamp"],
                    "event_type": base_record.get("event_type", "decision"),
                },
            }
        )
    except Exception:
        pass

    return base_record


def load_recent_audit_logs(limit: int = 100) -> List[Dict[str, Any]]:
    if limit <= 0:
        return []

    if not _AUDIT_LOG_PATH.exists():
        return []

    records: List[Dict[str, Any]] = []
    with _LOCK:
        with _AUDIT_LOG_PATH.open("r", encoding="utf-8") as handle:
            for line in handle:
                raw = line.strip()
                if not raw:
                    continue
                try:
                    records.append(json.loads(raw))
                except json.JSONDecodeError:
                    continue

    return records[-limit:]


def verify_audit_chain() -> Dict[str, Any]:
    records = load_recent_audit_logs(limit=10**9)
    previous_hash = None

    for idx, record in enumerate(records):
        check_payload = dict(record)
        observed_hash = check_payload.pop("entry_hash", None)
        expected_hash = hashlib.sha256(_canonical_json(check_payload).encode("utf-8")).hexdigest()

        if observed_hash != expected_hash:
            return {
                "valid": False,
                "index": idx,
                "reason": "hash_mismatch",
            }

        if record.get("previous_hash") != previous_hash:
            return {
                "valid": False,
                "index": idx,
                "reason": "chain_break",
            }

        previous_hash = observed_hash

    return {
        "valid": True,
        "records": len(records),
        "last_hash": previous_hash,
    }
