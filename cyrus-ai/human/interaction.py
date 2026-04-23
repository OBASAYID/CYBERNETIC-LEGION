from __future__ import annotations

import time
from typing import Any, Dict


class HumanInteraction:
    """Voice/identity/adaptation bridge for embodied operation."""

    def __init__(self, memory_service, dataset_builder, audit_log) -> None:
        self.memory_service = memory_service
        self.dataset_builder = dataset_builder
        self.audit_log = audit_log
        self.identity_profiles: Dict[str, Dict[str, Any]] = {}

    def register_identity(self, user_id: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        existing = self.identity_profiles.get(user_id, {})
        merged = {**existing, **profile, "updated_at": time.time()}
        self.identity_profiles[user_id] = merged

        self.memory_service(
            f"Updated human identity profile for {user_id}",
            {"type": "human_identity", "user_id": user_id},
        )
        self.audit_log(
            {
                "event_type": "human_identity_updated",
                "operator_id": user_id,
                "output": merged,
                "evaluation": {"overall": 1.0},
            }
        )
        return {"status": "ok", "user_id": user_id, "profile": merged}

    def process_voice_text(self, user_id: str, text: str) -> Dict[str, Any]:
        profile = self.identity_profiles.get(user_id, {})
        response_style = profile.get("response_style", "balanced")

        if response_style == "brief":
            tone = "concise"
        elif response_style == "detailed":
            tone = "supportive_detailed"
        else:
            tone = "balanced"

        interaction = {
            "timestamp": time.time(),
            "user_id": user_id,
            "input_text": text,
            "tone": tone,
            "adaptation": {
                "response_style": response_style,
                "known_preferences": profile.get("preferences", {}),
            },
        }

        self.dataset_builder(
            f"human_interaction::{user_id}::{text[:200]}",
            {"tone": tone},
            {"type": "human_interaction", "user_id": user_id},
        )
        self.memory_service(
            f"Human interaction with {user_id}: {text[:200]}",
            {"type": "human_interaction", "user_id": user_id, "tone": tone},
        )

        return {"status": "ok", "interaction": interaction}

    def status(self) -> Dict[str, Any]:
        return {
            "registered_identities": len(self.identity_profiles),
            "identity_ids": sorted(self.identity_profiles.keys()),
        }
