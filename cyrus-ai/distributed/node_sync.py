from typing import Any, Dict

from distributed.identity import NODE_ID
from distributed.message_bus import publish_event


def sync_memory_update(memory_entry: Dict[str, Any]) -> Dict[str, Any]:
    return publish_event(
        {
            "type": "memory_update",
            "node_id": NODE_ID,
            "data": memory_entry,
        }
    )
