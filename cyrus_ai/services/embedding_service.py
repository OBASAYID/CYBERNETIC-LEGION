from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Protocol

import numpy as np

logger = logging.getLogger(__name__)


class EmbeddingProvider(Protocol):
    dim: int

    def embed(self, text: str) -> np.ndarray:
        ...


@dataclass
class HashEmbeddingProvider:
    dim: int = 512

    def embed(self, text: str) -> np.ndarray:
        vec = np.zeros(self.dim, dtype=np.float32)
        for token in text.split():
            idx = abs(hash(token)) % self.dim
            vec[idx] += 1.0

        digest = hashlib.blake2b(text.encode("utf-8"), digest_size=16).digest()
        for i, b in enumerate(digest):
            vec[(i * 17) % self.dim] += b / 255.0

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec /= norm
        return vec.astype(np.float32)


class OpenAIEmbeddingProvider:
    def __init__(self, api_key: str, model: str, dim: int = 512):
        self.dim = dim
        self.model = model
        self.client = None
        self._api_key = api_key

    def _ensure_client(self):
        if self.client is not None:
            return self.client
        if not self._api_key:
            return None
        try:
            from openai import OpenAI

            self.client = OpenAI(api_key=self._api_key)
            return self.client
        except Exception as exc:
            logger.warning("OpenAI embedding provider unavailable: %s", exc)
            return None

    def embed(self, text: str) -> np.ndarray:
        client = self._ensure_client()
        if not client:
            return HashEmbeddingProvider(dim=self.dim).embed(text)

        try:
            response = client.embeddings.create(model=self.model, input=text)
            vector = np.array(response.data[0].embedding, dtype=np.float32)
            if vector.shape[0] > self.dim:
                vector = vector[: self.dim]
            elif vector.shape[0] < self.dim:
                pad = np.zeros(self.dim - vector.shape[0], dtype=np.float32)
                vector = np.concatenate([vector, pad])

            norm = np.linalg.norm(vector)
            if norm > 0:
                vector /= norm
            return vector
        except Exception as exc:
            logger.warning("OpenAI embedding request failed, using hash fallback: %s", exc)
            return HashEmbeddingProvider(dim=self.dim).embed(text)


class TransformersEmbeddingProvider:
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2", dim: int = 512):
        self.dim = dim
        self.model_name = model_name
        self._encoder = None

    def _ensure_encoder(self):
        if self._encoder is not None:
            return self._encoder
        try:
            from transformers import AutoModel, AutoTokenizer
            import torch

            tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            model = AutoModel.from_pretrained(self.model_name)
            model.eval()
            self._encoder = (tokenizer, model, torch)
            return self._encoder
        except Exception as exc:
            logger.warning("Transformers embedding provider unavailable: %s", exc)
            return None

    def embed(self, text: str) -> np.ndarray:
        encoder = self._ensure_encoder()
        if not encoder:
            return HashEmbeddingProvider(dim=self.dim).embed(text)

        tokenizer, model, torch = encoder
        try:
            with torch.no_grad():
                tokens = tokenizer(text, return_tensors="pt", truncation=True, max_length=128)
                outputs = model(**tokens)
                embedding = outputs.last_hidden_state.mean(dim=1).squeeze(0).cpu().numpy().astype(np.float32)

            if embedding.shape[0] > self.dim:
                embedding = embedding[: self.dim]
            elif embedding.shape[0] < self.dim:
                embedding = np.concatenate([embedding, np.zeros(self.dim - embedding.shape[0], dtype=np.float32)])

            norm = np.linalg.norm(embedding)
            if norm > 0:
                embedding /= norm
            return embedding
        except Exception as exc:
            logger.warning("Transformers embedding inference failed, using hash fallback: %s", exc)
            return HashEmbeddingProvider(dim=self.dim).embed(text)


def build_embedding_provider(provider_name: str, dim: int, *, openai_api_key: str, openai_model: str):
    name = (provider_name or "hash").lower()
    if name == "openai":
        return OpenAIEmbeddingProvider(api_key=openai_api_key, model=openai_model, dim=dim)
    if name == "transformers":
        return TransformersEmbeddingProvider(dim=dim)
    return HashEmbeddingProvider(dim=dim)
