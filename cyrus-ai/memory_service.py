import os
import uuid
from typing import Any, Dict, List

import chromadb
from chromadb.api.types import QueryResult

from distributed.node_sync import sync_memory_update

_CHROMA_DIR = os.getenv(
    "CYRUS_CHROMA_PATH",
    os.path.join(os.path.dirname(__file__), "chroma-data"),
)

os.makedirs(_CHROMA_DIR, exist_ok=True)

client = chromadb.PersistentClient(path=_CHROMA_DIR)
collection = client.get_or_create_collection(name="cyrus_memory")


def store_memory(text: str, metadata: Dict[str, Any], propagate: bool = True) -> str:
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")

    if metadata is None:
        metadata = {}

    memory_id = str(uuid.uuid4())
    collection.add(
        documents=[text.strip()],
        metadatas=[metadata],
        ids=[memory_id],
    )

    if propagate:
        sync_memory_update({"id": memory_id, "text": text.strip(), "metadata": metadata})

    return memory_id


def query_memory(query: str, n_results: int = 5) -> Dict[str, List[Any]]:
    if not isinstance(query, str) or not query.strip():
        raise ValueError("query must be a non-empty string")

    safe_n = max(1, min(int(n_results), 20))
    results: QueryResult = collection.query(query_texts=[query.strip()], n_results=safe_n)

    return {
        "ids": results.get("ids", [[]])[0],
        "documents": results.get("documents", [[]])[0],
        "metadatas": results.get("metadatas", [[]])[0],
        "distances": results.get("distances", [[]])[0],
    }


def query_memory_batch(queries: List[str], n_results: int = 5) -> Dict[str, Any]:
    if not isinstance(queries, list) or not queries:
        raise ValueError("queries must be a non-empty list")

    safe_n = max(1, min(int(n_results), 20))
    sanitized = [q.strip() for q in queries if isinstance(q, str) and q.strip()]
    if not sanitized:
        raise ValueError("queries must contain non-empty strings")

    results: QueryResult = collection.query(query_texts=sanitized, n_results=safe_n)
    return {
        "queries": sanitized,
        "ids": results.get("ids", []),
        "documents": results.get("documents", []),
        "metadatas": results.get("metadatas", []),
        "distances": results.get("distances", []),
    }
