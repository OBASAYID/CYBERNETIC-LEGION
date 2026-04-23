import os
import random
from typing import Any, Dict

from distributed.identity import NODE_ID

_DEFAULT_NODES = ["node1", "node2", "node3"]


def _nodes() -> list[str]:
    raw = os.getenv("CYRUS_CLUSTER_NODES", "")
    candidates = [item.strip() for item in raw.split(",") if item.strip()]
    return candidates if candidates else _DEFAULT_NODES


def route_task(task: Dict[str, Any]) -> Dict[str, Any]:
    _ = task
    selected = random.choice(_nodes())
    return {
        "selected_node": selected,
        "local_node": NODE_ID,
    }
