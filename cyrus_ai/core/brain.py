from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Dict, List

from cyrus_ai.config.settings import Settings
from cyrus_ai.core.behavior import BehaviorRouter
from cyrus_ai.core.conversation import ConversationManager
from cyrus_ai.core.memory import CyrusMemory
from cyrus_ai.modes import debate_mode, kids_mode, ops_mode, professional_mode
from cyrus_ai.services.llm_service import LLMService
from cyrus_ai.services.mission_bus import MissionBus


SYSTEM_PROMPT = (
    "You are CYRUS, an intelligent AI assistant. Be precise, adaptive in tone, and grounded in facts. "
    "If uncertain, explicitly say what is unknown and ask clarifying questions instead of hallucinating. "
    "Prefer actionable, structured, and context-aware responses."
)


@dataclass
class BrainResponse:
    response: str
    mode: str
    confidence: float
    needs_clarification: bool


class CyrusBrain:
    """Central decision engine: routes user input through behavior, memory, and LLM."""

    def __init__(self, settings: Settings, memory: CyrusMemory, mission_bus: MissionBus | None = None):
        self.settings = settings
        self.memory = memory
        self.behavior = BehaviorRouter()
        self.mission_bus = mission_bus
        self.conversation = ConversationManager(
            max_tokens=settings.max_context_tokens,
            max_messages=settings.max_history_messages,
            model=settings.openai_model,
        )
        self.llm = LLMService(settings=settings)

    def _mode_prompt(self, mode: str) -> str:
        if mode == "kids":
            return kids_mode.get_mode_prompt()
        if mode == "professional":
            return professional_mode.get_mode_prompt()
        if mode == "debate":
            return debate_mode.get_mode_prompt()
        if mode == "ops":
            return ops_mode.get_mode_prompt()
        return "Default Mode: balanced, concise, and practical tone."

    def _importance_score(self, user_text: str) -> float:
        lowered = user_text.lower()
        if any(k in lowered for k in ("my name is", "remember", "my preference", "i prefer", "always")):
            return 0.95
        if len(user_text.split()) > 25:
            return 0.7
        return 0.45

    def process(self, user_text: str, source: str = "text") -> BrainResponse:
        decision = self.behavior.detect_mode(user_text)
        memory_hits = self.memory.retrieve(user_text, top_k=self.settings.memory_top_k)
        memory_context = [item["text"] for item in memory_hits]

        self.conversation.add("user", user_text, mode=decision.mode)
        mode_prompt = self._mode_prompt(decision.mode)
        messages = self.conversation.build_messages(system_prompt=SYSTEM_PROMPT, mode_prompt=mode_prompt)

        ops_context: List[str] = []
        if decision.mode == "ops" and self.mission_bus is not None:
            mission_result = self.mission_bus.execute(user_text)
            if mission_result.handled:
                ops_context.append(
                    f"MissionAdapter[{mission_result.adapter}] status={mission_result.status}: {mission_result.output}"
                )

        llm_result = self.llm.generate(
            messages=messages,
            user_input=user_text,
            memory_context=[*memory_context, *ops_context],
            mode=decision.mode,
        )

        response = llm_result["response"]
        confidence = min(llm_result["confidence"], decision.confidence + 0.1)

        if ops_context:
            response = f"{ops_context[0]}\n\n{response}"
            confidence = max(confidence, 0.72)

        needs_clarification = self.behavior.needs_clarification(decision) or confidence < 0.45

        if needs_clarification:
            response = (
                f"{response}\n\nBefore I continue, can you clarify your desired mode: kids, professional, debate, or ops?"
            )

        self.conversation.add("assistant", response, mode=decision.mode)
        timestamp = datetime.now(UTC).isoformat()
        self.memory.add_short_term(
            user_text,
            {"source": source, "mode": decision.mode, "timestamp": timestamp},
        )
        self.memory.add_long_term(
            user_text,
            {"source": source, "mode": decision.mode, "timestamp": timestamp},
            importance=self._importance_score(user_text),
        )

        return BrainResponse(
            response=response,
            mode=decision.mode,
            confidence=confidence,
            needs_clarification=needs_clarification,
        )
