from __future__ import annotations

import json
from collections import deque
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Deque, Dict, List

import faiss
import numpy as np

from cyrus_ai.services.embedding_service import EmbeddingProvider, HashEmbeddingProvider


@dataclass
class MemoryItem:
    text: str
    metadata: Dict[str, Any]


class CyrusMemory:
    """Hybrid memory with short-term queue and FAISS-backed long-term search."""

    def __init__(
        self,
        store_dir: Path,
        vector_dim: int = 512,
        short_term_limit: int = 12,
        embedding_provider: EmbeddingProvider | None = None,
    ):
        self.store_dir = store_dir
        self.store_dir.mkdir(parents=True, exist_ok=True)
        self.vector_dim = vector_dim
        self.short_term: Deque[MemoryItem] = deque(maxlen=short_term_limit)
        self.metadata_path = self.store_dir / "memory_metadata.json"
        self.index_path = self.store_dir / "memory.index"

        self.embedding_provider = embedding_provider or HashEmbeddingProvider(dim=vector_dim)
        self.index = faiss.IndexFlatIP(vector_dim)
        self.items: List[MemoryItem] = []
        self._load()

    def _embed_text(self, text: str) -> np.ndarray:
        vec = self.embedding_provider.embed(text)
        if vec.ndim == 1:
            vec = vec.reshape(1, -1)
        return vec.astype(np.float32)

    def _load(self) -> None:
        if self.metadata_path.exists():
            with self.metadata_path.open("r", encoding="utf-8") as f:
                raw = json.load(f)
            self.items = [MemoryItem(**item) for item in raw]

        if self.index_path.exists():
            self.index = faiss.read_index(str(self.index_path))
        elif self.items:
            vectors = [self._embed_text(item.text) for item in self.items]
            matrix = np.vstack(vectors).astype(np.float32)
            self.index.add(matrix)

    def _save(self) -> None:
        with self.metadata_path.open("w", encoding="utf-8") as f:
            json.dump([item.__dict__ for item in self.items], f, indent=2)
        faiss.write_index(self.index, str(self.index_path))

    def add_short_term(self, text: str, metadata: Dict[str, Any]) -> None:
        self.short_term.append(MemoryItem(text=text, metadata=metadata))

    def add_long_term(self, text: str, metadata: Dict[str, Any], importance: float = 0.5) -> None:
        if importance < 0.45:
            return

        vec = self._embed_text(text)
        self.index.add(vec.astype(np.float32))
        self.items.append(MemoryItem(text=text, metadata=metadata))
        self._save()

    def retrieve(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        for item in list(self.short_term):
            if any(token in item.text.lower() for token in query.lower().split()[:4]):
                results.append({"text": item.text, "metadata": item.metadata, "score": 0.75})

        if self.index.ntotal > 0 and self.items:
            q = self._embed_text(query).astype(np.float32)
            scores, indices = self.index.search(q, min(top_k, self.index.ntotal))
            for score, idx in zip(scores[0], indices[0]):
                if idx == -1:
                    continue
                item = self.items[idx]
                results.append({"text": item.text, "metadata": item.metadata, "score": float(score)})

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
