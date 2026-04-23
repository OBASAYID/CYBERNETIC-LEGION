import json
import os
from pathlib import Path
from threading import Lock
from time import time
from typing import Any, Dict, Optional

_DEFAULT_DATASET = Path(__file__).resolve().parent.parent / "runtime-data" / "training_data.jsonl"
_DATASET_FILE = Path(os.getenv("CYRUS_TRAINING_DATASET_FILE", str(_DEFAULT_DATASET)))
_DATASET_FILE.parent.mkdir(parents=True, exist_ok=True)
_write_lock = Lock()
DATASET_FILE = str(_DATASET_FILE)


def _normalize_output(output: Any) -> str:
    if isinstance(output, str):
        return output
    try:
        return json.dumps(output, ensure_ascii=True)
    except TypeError:
        return str(output)


def log_training_example(input_text: str, output: Any, metadata: Optional[Dict[str, Any]] = None) -> None:
    if not isinstance(input_text, str) or not input_text.strip():
        raise ValueError("input_text must be a non-empty string")

    record = {
        "input": input_text.strip(),
        "output": _normalize_output(output),
        "metadata": dict(metadata or {}),
        "timestamp": time(),
        "node_id": os.getenv("CYRUS_NODE_ID", "unknown"),
    }

    line = json.dumps(record, ensure_ascii=True)
    with _write_lock:
        with _DATASET_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def count_training_examples() -> int:
    if not _DATASET_FILE.exists():
        return 0

    count = 0
    with _DATASET_FILE.open("r", encoding="utf-8") as f:
        for line in f:
            if line.strip():
                count += 1
    return count
