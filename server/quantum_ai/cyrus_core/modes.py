"""
CYRUS Behavioral Mode System
============================
State-based behavior control with smooth transitions between operational modes.
"""

from enum import Enum, auto
from dataclasses import dataclass, field
from typing import Optional, Dict, List, Callable
from datetime import datetime
import time


class Mode(Enum):
    """CYRUS operational modes defining behavioral characteristics."""
    CASUAL = "casual"
    PROFESSIONAL = "professional"
    PRESENTATION = "presentation"
    QA = "qa"
    STANDBY = "standby"
    
    @property
    def formality_level(self) -> int:
        """Returns formality level 1-10."""
        levels = {
            Mode.CASUAL: 3,
            Mode.PROFESSIONAL: 7,
            Mode.PRESENTATION: 9,
            Mode.QA: 8,
            Mode.STANDBY: 5,
        }
        return levels.get(self, 5)
    
    @property
    def response_style(self) -> str:
        """Returns the expected response style for this mode."""
        styles = {
            Mode.CASUAL: "conversational and warm",
            Mode.PROFESSIONAL: "precise and authoritative",
            Mode.PRESENTATION: "structured and commanding",
            Mode.QA: "clear and confident",
            Mode.STANDBY: "minimal and efficient",
        }
        return styles.get(self, "balanced")


@dataclass
class ModeTransition:
    """Represents a transition between behavioral modes."""
    from_mode: Mode
    to_mode: Mode
    timestamp: datetime
    reason: str
    confidence: float = 1.0


@dataclass
class BehaviorState:
    """
    Complete behavioral state of CYRUS at any given moment.
    Tracks mode, confidence, emotional baseline, and transition history.
    """
    current_mode: Mode = Mode.CASUAL
    confidence_level: float = 0.95
    emotional_baseline: str = "composed"
    energy_level: float = 0.8
    engagement_score: float = 0.7
    transition_history: List[ModeTransition] = field(default_factory=list)
    mode_lock: bool = False
    lock_reason: Optional[str] = None
    
    def __post_init__(self):
        self._mode_enter_time = time.time()
        self._interaction_count = 0
    
    @property
    def time_in_mode(self) -> float:
        """Seconds spent in current mode."""
        return time.time() - self._mode_enter_time
    
    @property
    def interaction_count(self) -> int:
        return self._interaction_count
    
    def increment_interactions(self):
        """Track interaction count for fatigue modeling."""
        self._interaction_count += 1
        if self._interaction_count > 50:
            self.energy_level = max(0.5, self.energy_level - 0.01)
    
    def can_transition(self, target_mode: Mode) -> tuple[bool, str]:
        """
        Determines if a mode transition is allowed.
        Returns (allowed, reason).
        """
        if self.mode_lock:
            return False, f"Mode locked: {self.lock_reason}"
        
        if target_mode == self.current_mode:
            return False, "Already in target mode"
        
        if self.current_mode == Mode.PRESENTATION and self.time_in_mode < 30:
            return False, "Presentation must continue for minimum duration"
        
        return True, "Transition permitted"
    
    def transition_to(self, target_mode: Mode, reason: str = "User request") -> bool:
        """
        Execute a mode transition if permitted.
        Returns True if successful.
        """
        allowed, msg = self.can_transition(target_mode)
        if not allowed:
            return False
        
        transition = ModeTransition(
            from_mode=self.current_mode,
            to_mode=target_mode,
            timestamp=datetime.now(),
            reason=reason,
            confidence=self.confidence_level
        )
        self.transition_history.append(transition)
        
        if len(self.transition_history) > 100:
            self.transition_history = self.transition_history[-50:]
        
        self.current_mode = target_mode
        self._mode_enter_time = time.time()
        
        return True
    
    def lock_mode(self, reason: str):
        """Lock current mode to prevent transitions."""
        self.mode_lock = True
        self.lock_reason = reason
    
    def unlock_mode(self):
        """Unlock mode transitions."""
        self.mode_lock = False
        self.lock_reason = None
    
    def get_behavioral_modifiers(self) -> Dict[str, float]:
        """
        Returns behavioral modifiers based on current state.
        Used by response and speech engines.
        """
        return {
            "formality": self.current_mode.formality_level / 10.0,
            "confidence": self.confidence_level,
            "energy": self.energy_level,
            "engagement": self.engagement_score,
            "pause_likelihood": 1.0 - self.energy_level,
            "elaboration_factor": self.engagement_score * 1.5,
        }
    
    def adjust_confidence(self, delta: float):
        """Adjust confidence within bounds [0.5, 1.0]."""
        self.confidence_level = max(0.5, min(1.0, self.confidence_level + delta))
    
    def adjust_engagement(self, delta: float):
        """Adjust engagement within bounds [0.3, 1.0]."""
        self.engagement_score = max(0.3, min(1.0, self.engagement_score + delta))


class ModeController:
    """
    High-level controller for behavioral mode management.
    Provides intelligent mode suggestions and auto-transitions.
    """
    
    def __init__(self):
        self.state = BehaviorState()
        self._auto_transition_enabled = True
        self._mode_triggers: Dict[Mode, List[str]] = {
            Mode.PRESENTATION: ["present", "explain to audience", "walk through", "demonstrate"],
            Mode.QA: ["question", "ask", "clarify", "what about", "how does"],
            Mode.PROFESSIONAL: ["formally", "officially", "in detail", "professionally"],
            Mode.CASUAL: ["chat", "talk", "casually", "relax"],
        }
    
    def suggest_mode(self, user_input: str) -> Optional[Mode]:
        """
        Analyze input and suggest appropriate mode.
        Returns None if current mode is appropriate.
        """
        input_lower = user_input.lower()
        
        for mode, triggers in self._mode_triggers.items():
            if any(trigger in input_lower for trigger in triggers):
                if mode != self.state.current_mode:
                    return mode
        
        return None
    
    def auto_transition_if_needed(self, user_input: str, intent: str) -> Optional[ModeTransition]:
        """
        Automatically transition if context demands it.
        Returns the transition if one occurred.
        """
        if not self._auto_transition_enabled:
            return None
        
        suggested = self.suggest_mode(user_input)
        if suggested:
            if self.state.transition_to(suggested, f"Auto-transition based on input intent: {intent}"):
                return self.state.transition_history[-1]
        
        return None
    
    def get_current_state(self) -> BehaviorState:
        return self.state
    
    def force_mode(self, mode: Mode, lock: bool = False, reason: str = "Manual override"):
        """Force a specific mode, optionally locking it."""
        self.state.current_mode = mode
        self.state._mode_enter_time = time.time()
        if lock:
            self.state.lock_mode(reason)
