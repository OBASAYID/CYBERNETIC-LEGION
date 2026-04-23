"""
CYRUS HUMANOID INTELLIGENCE CORE
================================
Cybernetic Yielding Robust Unified System v3.0

A production-grade humanoid professional intelligence system
capable of natural human conversation with behavioral mode switching,
long-term memory management, and professional audience interaction.

This is a HUMANOID-GRADE AI system - not a chatbot or assistant.
"""

from .modes import Mode, BehaviorState
from .memory import MemorySystem, ConversationTurn, ContextualMemory
from .intent import IntentEngine, Intent
from .speech import SpeechEngine, HumanizationEngine
from .response import ResponseEngine, PresentationEngine, QAEngine
from .core import CYRUS

__version__ = "3.0.0"
__codename__ = "OMEGA-TIER"

__all__ = [
    "CYRUS",
    "Mode",
    "BehaviorState",
    "MemorySystem",
    "ConversationTurn",
    "ContextualMemory",
    "IntentEngine",
    "Intent",
    "SpeechEngine",
    "HumanizationEngine",
    "ResponseEngine",
    "PresentationEngine",
    "QAEngine",
]
