"""
CYRUS Core Intelligence System
==============================
The central orchestrator for the CYRUS Humanoid Intelligence.
Coordinates all subsystems for coherent, human-like interaction.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any, Callable
from datetime import datetime
import time

from .modes import Mode, BehaviorState, ModeController
from .memory import MemorySystem, Speaker, ConversationTurn, TopicCategory
from .intent import IntentEngine, IntentClassification, Intent
from .speech import SpeechEngine
from .response import ResponseEngine, GeneratedResponse


@dataclass
class CYRUSConfig:
    """Configuration for CYRUS behavior and capabilities."""
    enable_voice_simulation: bool = False
    enable_timing_simulation: bool = False
    max_conversation_history: int = 50
    max_working_memory: int = 10
    max_long_term_memory: int = 500
    default_mode: Mode = Mode.CASUAL
    enable_auto_mode_switching: bool = True
    confidence_threshold: float = 0.6
    verbose_output: bool = False


@dataclass
class InteractionResult:
    """Complete result of a CYRUS interaction."""
    response: str
    raw_response: GeneratedResponse
    intent: IntentClassification
    mode_used: Mode
    mode_changed: bool
    processing_time: float
    confidence: float
    requires_followup: bool
    attached_files: List[str] = None
    
    def __post_init__(self):
        if self.attached_files is None:
            self.attached_files = []
    
    def to_dict(self) -> Dict:
        return {
            "response": self.response,
            "mode": self.mode_used.value,
            "mode_changed": self.mode_changed,
            "intent": self.intent.primary_intent.value,
            "confidence": self.confidence,
            "processing_time": self.processing_time,
            "requires_followup": self.requires_followup,
            "attached_files": self.attached_files,
        }


class CYRUS:
    """
    CYRUS Humanoid Intelligence Core
    =================================
    Cybernetic Yielding Robust Unified System v3.0
    
    A production-grade humanoid professional intelligence system
    capable of natural human conversation with behavioral mode switching,
    long-term memory management, and professional audience interaction.
    
    This is a HUMANOID-GRADE AI system - not a chatbot or assistant.
    """
    
    VERSION = "3.0.0"
    CODENAME = "OMEGA-TIER"
    
    def __init__(self, config: Optional[CYRUSConfig] = None):
        self.config = config or CYRUSConfig()
        
        self.mode_controller = ModeController()
        self.mode_controller.force_mode(self.config.default_mode)
        
        self.memory = MemorySystem(
            conversation_limit=self.config.max_conversation_history,
            working_memory_limit=self.config.max_working_memory,
            long_term_limit=self.config.max_long_term_memory,
        )
        
        self.intent_engine = IntentEngine()
        self.response_engine = ResponseEngine(memory=self.memory)
        self.speech_engine = SpeechEngine()
        
        self._interaction_count = 0
        self._session_start = datetime.now()
        self._last_interaction = None
        self._callbacks: Dict[str, List[Callable]] = {
            "on_mode_change": [],
            "on_response": [],
            "on_memory_update": [],
        }
        
        self._log("CYRUS Humanoid Intelligence Core initialized")
        self._log(f"Version: {self.VERSION} ({self.CODENAME})")
    
    @property
    def state(self) -> BehaviorState:
        """Current behavioral state."""
        return self.mode_controller.get_current_state()
    
    @property
    def mode(self) -> Mode:
        """Current operational mode."""
        return self.state.current_mode
    
    @property
    def session_duration(self) -> float:
        """Duration of current session in seconds."""
        return (datetime.now() - self._session_start).total_seconds()
    
    def process_input(self, user_input: str) -> InteractionResult:
        """
        Process user input and generate a humanoid response.
        
        This is the primary interface for interacting with CYRUS.
        Handles intent classification, mode management, memory,
        response generation, and speech processing.
        """
        start_time = time.time()
        
        user_input = self._preprocess_input(user_input)
        
        if self._is_mode_command(user_input):
            return self._handle_mode_command(user_input, start_time)
        
        if self._is_system_command(user_input):
            return self._handle_system_command(user_input, start_time)
        
        previous_mode = self.mode
        
        context = self._build_classification_context()
        intent = self.intent_engine.classify(user_input, context)
        
        if self.config.enable_auto_mode_switching:
            transition = self.mode_controller.auto_transition_if_needed(
                user_input,
                intent.primary_intent.value
            )
            if transition:
                self._trigger_callbacks("on_mode_change", transition)
        
        user_turn = self.memory.remember(
            speaker=Speaker.HUMAN,
            content=user_input,
            mode_context=self.mode.value,
            entities=intent.detected_entities,
            sentiment=intent.emotional_tone,
        )
        
        response = self._generate_response(intent, user_input)
        
        cyrus_turn = self.memory.remember(
            speaker=Speaker.CYRUS,
            content=response.content,
            mode_context=self.mode.value,
            sentiment="neutral",
        )
        
        final_output = self.speech_engine.speak(
            response.content,
            self.state,
            simulate_timing=self.config.enable_timing_simulation,
        )
        
        self._interaction_count += 1
        self._last_interaction = datetime.now()
        self.state.increment_interactions()
        
        processing_time = time.time() - start_time
        
        result = InteractionResult(
            response=final_output,
            raw_response=response,
            intent=intent,
            mode_used=self.mode,
            mode_changed=self.mode != previous_mode,
            processing_time=processing_time,
            confidence=response.metadata.confidence,
            requires_followup=response.metadata.requires_followup,
            attached_files=response.attached_files,
        )
        
        self._trigger_callbacks("on_response", result)
        
        return result
    
    def set_mode(self, mode: Mode, lock: bool = False) -> str:
        """
        Manually set the operational mode.
        
        Args:
            mode: Target mode to switch to
            lock: Whether to lock the mode (prevent auto-switching)
        
        Returns:
            Confirmation message
        """
        previous = self.mode
        
        self.mode_controller.force_mode(mode, lock=lock, reason="Manual override")
        
        if lock:
            return f"CYRUS mode locked to {mode.value.upper()}. Auto-switching disabled."
        
        return f"CYRUS mode switched from {previous.value.upper()} to {mode.value.upper()}."
    
    def unlock_mode(self) -> str:
        """Unlock mode transitions."""
        self.state.unlock_mode()
        return "Mode lock released. Auto-switching enabled."
    
    def get_status(self) -> Dict[str, Any]:
        """Get current CYRUS system status."""
        return {
            "version": self.VERSION,
            "codename": self.CODENAME,
            "mode": self.mode.value,
            "mode_locked": self.state.mode_lock,
            "confidence_level": self.state.confidence_level,
            "energy_level": self.state.energy_level,
            "interaction_count": self._interaction_count,
            "session_duration_seconds": self.session_duration,
            "memory_summary": self.memory.get_context_summary(),
            "last_interaction": self._last_interaction.isoformat() if self._last_interaction else None,
        }
    
    def get_memory_context(self) -> Dict[str, Any]:
        """Get current memory context summary."""
        return self.memory.get_context_summary()
    
    def recall_recent_conversation(self, count: int = 5) -> List[Dict]:
        """Recall recent conversation turns."""
        turns = self.memory.recall_recent(count)
        return [turn.to_dict() for turn in turns]
    
    def clear_conversation(self) -> str:
        """Clear conversation history while preserving long-term memory."""
        self.memory.conversation_history.clear()
        self.memory.working_memory.clear()
        return "Conversation history cleared. Long-term memories preserved."
    
    def store_memory(
        self,
        content: str,
        category: TopicCategory = TopicCategory.GENERAL,
        importance: float = 0.7
    ) -> str:
        """Manually store a long-term memory."""
        self.memory.store_long_term(
            content=content,
            category=category,
            importance=importance,
        )
        return f"Memory stored in {category.value} category."
    
    def search_memories(
        self,
        query: str,
        limit: int = 5
    ) -> List[Dict]:
        """Search long-term memories."""
        results = self.memory.search_long_term(query, limit=limit)
        return [
            {
                "content": m.content,
                "category": m.category.value,
                "importance": m.effective_importance,
                "created": m.created_at.isoformat(),
            }
            for m in results
        ]
    
    def register_callback(self, event: str, callback: Callable):
        """Register a callback for system events."""
        if event in self._callbacks:
            self._callbacks[event].append(callback)
    
    def _preprocess_input(self, text: str) -> str:
        """Preprocess user input."""
        text = text.strip()
        text = " ".join(text.split())
        return text
    
    def _is_mode_command(self, text: str) -> bool:
        """Check if input is a mode command."""
        text_lower = text.lower()
        return text_lower.startswith("mode ") or text_lower.startswith("/mode ")
    
    def _is_system_command(self, text: str) -> bool:
        """Check if input is a system command."""
        text_lower = text.lower()
        system_commands = ["/status", "/memory", "/clear", "/help", "/history"]
        return any(text_lower.startswith(cmd) for cmd in system_commands)
    
    def _handle_mode_command(
        self,
        text: str,
        start_time: float
    ) -> InteractionResult:
        """Handle mode change commands."""
        parts = text.lower().replace("/mode", "mode").split()
        
        if len(parts) < 2:
            response_text = f"Current mode: {self.mode.value.upper()}. Available modes: casual, professional, presentation, qa"
        else:
            mode_str = parts[1]
            lock = "lock" in parts
            
            try:
                target_mode = Mode(mode_str)
                response_text = self.set_mode(target_mode, lock=lock)
            except ValueError:
                response_text = f"Unknown mode: {mode_str}. Available: casual, professional, presentation, qa"
        
        return self._create_system_result(response_text, start_time)
    
    def _handle_system_command(
        self,
        text: str,
        start_time: float
    ) -> InteractionResult:
        """Handle system commands."""
        text_lower = text.lower()
        
        if text_lower.startswith("/status"):
            status = self.get_status()
            response_text = f"""CYRUS System Status:
- Version: {status['version']} ({status['codename']})
- Mode: {status['mode'].upper()}
- Confidence: {status['confidence_level']:.0%}
- Energy: {status['energy_level']:.0%}
- Interactions: {status['interaction_count']}
- Session Duration: {status['session_duration_seconds']:.0f}s"""
        
        elif text_lower.startswith("/memory"):
            ctx = self.get_memory_context()
            response_text = f"""Memory Context:
- Conversation Turns: {ctx['turn_count']}
- Working Memory Items: {ctx['working_memory_size']}
- Long-term Memories: {ctx['long_term_memory_count']}
- Recent Topics: {', '.join(ctx['recent_topics']) or 'None'}
- Dominant Sentiment: {ctx['dominant_sentiment']}"""
        
        elif text_lower.startswith("/clear"):
            response_text = self.clear_conversation()
        
        elif text_lower.startswith("/history"):
            history = self.recall_recent_conversation(5)
            if history:
                lines = [f"[{h['speaker']}] {h['content'][:50]}..." for h in history]
                response_text = "Recent conversation:\n" + "\n".join(lines)
            else:
                response_text = "No conversation history."
        
        elif text_lower.startswith("/help"):
            response_text = """CYRUS System Commands:
- /status - Show system status
- /memory - Show memory context
- /clear - Clear conversation history
- /history - Show recent conversation
- /help - Show this help
- mode <mode> [lock] - Switch mode (casual, professional, presentation, qa)"""
        
        else:
            response_text = "Unknown command. Type /help for available commands."
        
        return self._create_system_result(response_text, start_time)
    
    def _create_system_result(
        self,
        response_text: str,
        start_time: float
    ) -> InteractionResult:
        """Create an interaction result for system commands."""
        dummy_intent = IntentClassification(
            primary_intent=Intent.COMMAND,
            confidence=1.0,
            secondary_intents=[],
            detected_entities=[],
            question_type=None,
            urgency_level=0.5,
            emotional_tone="neutral",
            keywords_matched=[],
        )
        
        from .response import GeneratedResponse, ResponseMetadata, ResponseType
        
        dummy_response = GeneratedResponse(
            content=response_text,
            metadata=ResponseMetadata(
                response_type=ResponseType.DIRECTIVE,
                confidence=1.0,
                sources_used=["system"],
                requires_followup=False,
                emotional_alignment="neutral",
                mode_used=self.mode,
            ),
            alternatives=[],
        )
        
        return InteractionResult(
            response=response_text,
            raw_response=dummy_response,
            intent=dummy_intent,
            mode_used=self.mode,
            mode_changed=False,
            processing_time=time.time() - start_time,
            confidence=1.0,
            requires_followup=False,
        )
    
    def _build_classification_context(self) -> Dict:
        """Build context for intent classification."""
        recent = self.memory.recall_recent(3)
        
        return {
            "in_presentation": self.mode == Mode.PRESENTATION,
            "previous_question": any(
                "?" in turn.content for turn in recent
                if turn.speaker == Speaker.HUMAN
            ),
            "emotional_context": self.memory.get_context("emotional_state"),
            "current_mode": self.mode.value,
        }
    
    def _generate_response(
        self,
        intent: IntentClassification,
        user_input: str
    ) -> GeneratedResponse:
        """Generate response using the response engine."""
        try:
            context = {
                "memory_context": self.memory.get_context_summary(),
                "recent_turns": [t.to_dict() for t in self.memory.recall_recent(3)],
            }
            
            response = self.response_engine.generate(
                intent=intent,
                state=self.state,
                user_input=user_input,
                context=context,
            )
            
            if response.metadata.confidence < self.config.confidence_threshold:
                self.state.adjust_confidence(-0.05)
            else:
                self.state.adjust_confidence(0.02)
            
            return response
            
        except Exception as e:
            self._log(f"Response generation error: {e}")
            return self.response_engine.generate_fallback(str(e))
    
    def _trigger_callbacks(self, event: str, data: Any):
        """Trigger registered callbacks for an event."""
        for callback in self._callbacks.get(event, []):
            try:
                callback(data)
            except Exception as e:
                self._log(f"Callback error for {event}: {e}")
    
    def _log(self, message: str):
        """Internal logging."""
        if self.config.verbose_output:
            timestamp = datetime.now().strftime("%H:%M:%S")
            print(f"[CYRUS {timestamp}] {message}")
    
    def __repr__(self) -> str:
        return f"<CYRUS v{self.VERSION} mode={self.mode.value} interactions={self._interaction_count}>"
