"""
CYRUS Humanoid Speech Engine
============================
Natural language generation with human-like delivery,
including pauses, emphasis, and conversational cadence.
"""

import time
import random
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
from .modes import Mode, BehaviorState


class EmphasisType(Enum):
    """Types of speech emphasis."""
    NONE = "none"
    SLIGHT = "slight"
    MODERATE = "moderate"
    STRONG = "strong"


class PauseType(Enum):
    """Types of natural pauses."""
    BRIEF = "brief"
    THINKING = "thinking"
    DRAMATIC = "dramatic"
    TRANSITIONAL = "transitional"


@dataclass
class SpeechSegment:
    """A segment of speech with delivery metadata."""
    text: str
    emphasis: EmphasisType = EmphasisType.NONE
    pause_before: Optional[PauseType] = None
    pause_after: Optional[PauseType] = None
    pace: float = 1.0


class HumanizationEngine:
    """
    Engine for adding human-like qualities to text output.
    Includes hesitation, emphasis, and natural speech patterns.
    """
    
    def __init__(self):
        self.thinking_phrases = [
            "Let me think about this...",
            "Hmm, that's an interesting point...",
            "Well...",
            "You know...",
            "Consider this...",
            "Here's the thing...",
        ]
        
        self.confidence_phrases = [
            "I can say with certainty that",
            "Based on my analysis,",
            "It's clear that",
            "The evidence suggests",
            "What we know is",
            "In my assessment,",
        ]
        
        self.transition_phrases = [
            "Now,",
            "Additionally,",
            "Furthermore,",
            "Moving on,",
            "On another note,",
            "That said,",
        ]
        
        self.empathy_phrases = [
            "I understand your concern.",
            "That's a valid point.",
            "I can see why you'd think that.",
            "Your perspective is noted.",
            "That's worth considering.",
        ]
    
    def add_thinking_pause(
        self,
        text: str,
        mode: Mode,
        confidence: float
    ) -> str:
        """Add natural thinking pauses based on mode and confidence."""
        if mode == Mode.PRESENTATION:
            return text
        
        if confidence < 0.7 and random.random() < 0.3:
            pause = random.choice(self.thinking_phrases)
            return f"{pause} {text}"
        
        return text
    
    def add_confidence_markers(
        self,
        text: str,
        confidence: float,
        is_factual: bool = True
    ) -> str:
        """Add confidence markers to assertions."""
        if not is_factual or confidence < 0.6:
            return text
        
        if confidence > 0.9 and random.random() < 0.4:
            marker = random.choice(self.confidence_phrases)
            return f"{marker} {text}"
        
        return text
    
    def add_transitions(
        self,
        segments: List[str],
        mode: Mode
    ) -> str:
        """Add natural transitions between segments."""
        if len(segments) <= 1:
            return " ".join(segments)
        
        result = [segments[0]]
        
        for segment in segments[1:]:
            if mode in {Mode.PRESENTATION, Mode.PROFESSIONAL}:
                if random.random() < 0.4:
                    transition = random.choice(self.transition_phrases)
                    result.append(f"{transition} {segment}")
                else:
                    result.append(segment)
            else:
                result.append(segment)
        
        return " ".join(result)
    
    def add_empathy_acknowledgment(
        self,
        text: str,
        emotional_context: str
    ) -> str:
        """Add empathetic acknowledgment for emotional inputs."""
        if emotional_context in {"negative", "emphatic"}:
            acknowledgment = random.choice(self.empathy_phrases)
            return f"{acknowledgment} {text}"
        return text


class SpeechEngine:
    """
    Complete speech engine for CYRUS humanoid output.
    Manages delivery style, timing, and human-like qualities.
    """
    
    def __init__(self):
        self.humanizer = HumanizationEngine()
        self._pause_durations = {
            PauseType.BRIEF: (0.2, 0.4),
            PauseType.THINKING: (0.5, 1.0),
            PauseType.DRAMATIC: (1.0, 1.5),
            PauseType.TRANSITIONAL: (0.3, 0.6),
        }
        
        self._mode_delivery_styles = {
            Mode.CASUAL: {
                "pace": 1.0,
                "formality": 0.3,
                "warmth": 0.8,
                "directness": 0.6,
            },
            Mode.PROFESSIONAL: {
                "pace": 0.95,
                "formality": 0.8,
                "warmth": 0.5,
                "directness": 0.85,
            },
            Mode.PRESENTATION: {
                "pace": 0.85,
                "formality": 0.9,
                "warmth": 0.6,
                "directness": 0.7,
            },
            Mode.QA: {
                "pace": 0.9,
                "formality": 0.75,
                "warmth": 0.6,
                "directness": 0.9,
            },
            Mode.STANDBY: {
                "pace": 1.0,
                "formality": 0.5,
                "warmth": 0.4,
                "directness": 0.95,
            },
        }
    
    def speak(
        self,
        text: str,
        state: BehaviorState,
        simulate_timing: bool = False
    ) -> str:
        """
        Process text for delivery with mode-appropriate style.
        Optionally simulates realistic timing.
        """
        mode = state.current_mode
        modifiers = state.get_behavioral_modifiers()
        
        processed = self._apply_mode_style(text, mode)
        
        processed = self.humanizer.add_thinking_pause(
            processed,
            mode,
            modifiers["confidence"]
        )
        
        delivery_annotation = self._get_delivery_annotation(mode, modifiers)
        
        if simulate_timing:
            self._simulate_delivery_timing(processed, mode)
        
        if delivery_annotation:
            return f"{processed}\n\n{delivery_annotation}"
        
        return processed
    
    def speak_presentation(
        self,
        segments: List[str],
        state: BehaviorState
    ) -> str:
        """
        Deliver a multi-segment presentation with proper pacing.
        """
        processed_segments = []
        
        for i, segment in enumerate(segments):
            styled = self._apply_mode_style(segment, Mode.PRESENTATION)
            
            if i == 0:
                styled = self._add_opening_authority(styled)
            elif i == len(segments) - 1:
                styled = self._add_closing_impact(styled)
            
            processed_segments.append(styled)
        
        full_text = self.humanizer.add_transitions(
            processed_segments,
            Mode.PRESENTATION
        )
        
        return f"{full_text}\n\n(Delivered with calm authority and measured pace.)"
    
    def speak_qa_response(
        self,
        response: str,
        question_type: Optional[str],
        is_hostile: bool,
        state: BehaviorState
    ) -> str:
        """
        Deliver a Q&A response with appropriate confidence and handling.
        """
        if is_hostile:
            response = self._add_diplomatic_deflection(response)
            annotation = "(Addressed with composed professionalism.)"
        else:
            response = self.humanizer.add_confidence_markers(
                response,
                state.confidence_level,
                is_factual=True
            )
            annotation = "(Answered with confidence and clarity.)"
        
        return f"{response}\n\n{annotation}"
    
    def _apply_mode_style(self, text: str, mode: Mode) -> str:
        """Apply mode-specific styling to text."""
        style = self._mode_delivery_styles.get(mode, self._mode_delivery_styles[Mode.CASUAL])
        
        if style["formality"] > 0.7:
            text = self._formalize_language(text)
        
        return text
    
    def _formalize_language(self, text: str) -> str:
        """Apply formal language adjustments."""
        replacements = {
            "gonna": "going to",
            "wanna": "want to",
            "gotta": "have to",
            "kinda": "kind of",
            "sorta": "sort of",
            "dunno": "don't know",
            "yeah": "yes",
            "nope": "no",
            "ok ": "understood ",
            "okay ": "understood ",
        }
        
        result = text
        for informal, formal in replacements.items():
            result = result.replace(informal, formal)
        
        return result
    
    def _add_opening_authority(self, text: str) -> str:
        """Add authoritative opening for presentations."""
        openers = [
            "Ladies and gentlemen,",
            "Allow me to explain.",
            "Let me walk you through this.",
            "Here's what you need to know.",
        ]
        return f"{random.choice(openers)} {text}"
    
    def _add_closing_impact(self, text: str) -> str:
        """Add impactful closing for presentations."""
        closers = [
            "The key takeaway here is strategic clarity.",
            "This is the path forward.",
            "That's the essential point to remember.",
            "This represents our best approach.",
        ]
        return f"{text} {random.choice(closers)}"
    
    def _add_diplomatic_deflection(self, text: str) -> str:
        """Add diplomatic handling for hostile questions."""
        deflectors = [
            "That's a valid concern. Let me address it responsibly.",
            "I appreciate the direct question.",
            "That's an important consideration.",
            "Allow me to provide some clarity on that.",
        ]
        return f"{random.choice(deflectors)} {text}"
    
    def _get_delivery_annotation(
        self,
        mode: Mode,
        modifiers: Dict[str, float]
    ) -> Optional[str]:
        """Get delivery style annotation for output."""
        if mode == Mode.PRESENTATION:
            return "(Delivered with measured authority.)"
        elif mode == Mode.QA:
            if modifiers["confidence"] > 0.8:
                return "(Answered with high confidence.)"
            return "(Answered thoughtfully.)"
        elif mode == Mode.PROFESSIONAL:
            return "(Stated with professional precision.)"
        
        return None
    
    def _simulate_delivery_timing(self, text: str, mode: Mode):
        """Simulate realistic delivery timing (for CLI use)."""
        style = self._mode_delivery_styles[mode]
        
        base_pause = 0.3 / style["pace"]
        time.sleep(base_pause)
        
        sentence_count = text.count(".") + text.count("!") + text.count("?")
        if sentence_count > 1:
            time.sleep(0.2 * sentence_count)
    
    def get_voice_parameters(self, mode: Mode) -> Dict:
        """
        Get voice synthesis parameters for the current mode.
        For integration with TTS systems.
        """
        style = self._mode_delivery_styles[mode]
        
        return {
            "rate": 0.9 + (0.2 * style["pace"]),
            "pitch": 1.0 if style["formality"] > 0.7 else 1.05,
            "volume": 0.85 if mode == Mode.CASUAL else 0.95,
            "emphasis": "moderate" if mode == Mode.PRESENTATION else "normal",
        }
