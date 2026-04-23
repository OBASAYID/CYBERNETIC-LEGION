from pathlib import Path

from cyrus_ai.core.memory import CyrusMemory
from cyrus_ai.services.embedding_service import HashEmbeddingProvider


def test_memory_add_and_retrieve(tmp_path: Path):
    mem = CyrusMemory(
        store_dir=tmp_path / "memory_store",
        vector_dim=128,
        embedding_provider=HashEmbeddingProvider(dim=128),
    )

    mem.add_short_term("operator name is alex", {"source": "test"})
    mem.add_long_term("operator name is alex", {"source": "test"}, importance=0.95)

    results = mem.retrieve("what is operator name", top_k=3)
    assert results
    assert any("alex" in r["text"] for r in results)
