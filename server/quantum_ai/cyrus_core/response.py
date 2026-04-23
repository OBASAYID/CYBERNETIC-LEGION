"""
CYRUS Response Generation Engine
================================
Sophisticated response generation with mode-aware content,
professional presentation capabilities, and Q&A handling.
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Any
from enum import Enum
import random
import logging

from .modes import Mode, BehaviorState
from .intent import Intent, IntentClassification
from .memory import MemorySystem, TopicCategory

# Import robotics integration
try:
    import sys
    from pathlib import Path
    project_root = Path(__file__).parent.parent
    sys.path.insert(0, str(project_root))
    from cyrus_robotics_integration import enhance_cyrus_response_with_robotics
    ROBOTICS_INTEGRATION_AVAILABLE = True
except ImportError as e:
    ROBOTICS_INTEGRATION_AVAILABLE = False
    logging.warning(f"Robotics integration not available: {e}")


class ResponseType(Enum):
    """Types of responses CYRUS can generate."""
    CONVERSATIONAL = "conversational"
    INFORMATIVE = "informative"
    ANALYTICAL = "analytical"
    DIRECTIVE = "directive"
    ACKNOWLEDGMENT = "acknowledgment"
    CLARIFICATION = "clarification"
    PRESENTATION = "presentation"
    QA_ANSWER = "qa_answer"
    EMOTIONAL = "emotional"
    FALLBACK = "fallback"


@dataclass
class ResponseMetadata:
    """Metadata about a generated response."""
    response_type: ResponseType
    confidence: float
    sources_used: List[str]
    requires_followup: bool
    emotional_alignment: str
    mode_used: Mode


@dataclass
class GeneratedResponse:
    """Complete generated response with metadata."""
    content: str
    metadata: ResponseMetadata
    alternatives: List[str]
    attached_files: List[str] = None
    
    def __post_init__(self):
        if self.attached_files is None:
            self.attached_files = []
    
    def with_alternatives(self) -> str:
        """Return response with noted alternatives."""
        if self.alternatives:
            alt_note = f"\n\n(Alternative perspectives available: {len(self.alternatives)})"
            return f"{self.content}{alt_note}"
        return self.content


class ResponseTemplates:
    """Template library for structured responses."""
    
    GREETING_RESPONSES = [
        "Good to connect with you. How can I assist today?",
        "Hello. I'm ready to help. What's on your mind?",
        "Greetings. I'm here and fully operational. How may I be of service?",
    ]
    
    FAREWELL_RESPONSES = [
        "Take care. I'll be here when you need me.",
        "Until next time. Stay strategic.",
        "Understood. Signing off for now.",
    ]
    
    ACKNOWLEDGMENT_RESPONSES = [
        "Understood. I'm tracking.",
        "Noted. Proceeding accordingly.",
        "Got it. Moving forward.",
    ]
    
    CLARIFICATION_REQUESTS = [
        "Could you provide more context on that?",
        "I want to ensure I understand correctly. Could you elaborate?",
        "Let me make sure I'm following. You're asking about {}?",
    ]
    
    FALLBACK_RESPONSES = [
        "I want to give you an accurate response. Could you rephrase that?",
        "Let me make sure I understand your question correctly.",
        "I'm processing that. Can you provide more detail?",
    ]
    
    HOSTILE_DEFLECTIONS = [
        "That's a valid concern. Let me address it responsibly.",
        "I understand the skepticism. Here's what I can confirm.",
        "Fair point. Let me provide a measured response.",
    ]


class PresentationEngine:
    """
    Engine for generating presentation-style content.
    Creates structured, authoritative presentations.
    """
    
    def __init__(self):
        self.opening_phrases = [
            "Ladies and gentlemen, let me walk you through this clearly.",
            "Allow me to present a comprehensive overview.",
            "I'll break this down into key points for clarity.",
            "Here's what you need to understand about this topic.",
        ]
        
        self.transition_phrases = [
            "Moving to the next point,",
            "Building on that,",
            "Furthermore,",
            "An important consideration is",
            "Additionally,",
        ]
        
        self.closing_phrases = [
            "The key takeaway here is strategic clarity and operational confidence.",
            "This represents our best path forward.",
            "These are the essential points to carry with you.",
            "In summary, this is what matters most.",
        ]
    
    def generate_presentation(
        self,
        topic: str,
        key_points: List[str],
        context: Optional[Dict] = None
    ) -> str:
        """Generate a structured presentation."""
        opening = random.choice(self.opening_phrases)
        
        body_parts = []
        for i, point in enumerate(key_points):
            if i > 0:
                transition = random.choice(self.transition_phrases)
                body_parts.append(f"{transition} {point}")
            else:
                body_parts.append(point)
        
        body = " ".join(body_parts)
        
        closing = random.choice(self.closing_phrases)
        
        return f"{opening}\n\n{body}\n\n{closing}"
    
    def generate_topic_overview(self, topic: str) -> str:
        """Generate an overview for a given topic."""
        return f"""Let me provide a comprehensive overview of {topic}.

This topic encompasses several key dimensions that warrant careful consideration. 

First, we need to understand the foundational elements. Second, we must examine the practical implications. And third, we should consider the strategic applications.

The essential insight here is that understanding {topic} requires both analytical rigor and practical wisdom."""


class QAEngine:
    """
    Engine for handling Q&A interactions.
    Provides confident, authoritative answers with appropriate handling.
    """
    
    def __init__(self):
        self.confidence_markers = [
            "Based on my analysis,",
            "What the evidence suggests is",
            "From a strategic perspective,",
            "The accurate answer is",
            "I can confirm that",
        ]
        
        self.uncertainty_markers = [
            "Based on available information,",
            "To the best of my assessment,",
            "From what I can determine,",
        ]
    
    def generate_answer(
        self,
        question: str,
        question_type: Optional[str],
        confidence: float,
        is_hostile: bool = False
    ) -> str:
        """Generate an appropriate Q&A response."""
        if is_hostile:
            return self._handle_hostile_question(question)
        
        if question_type == "why":
            return self._generate_reasoning_answer(question, confidence)
        elif question_type == "how":
            return self._generate_process_answer(question, confidence)
        elif question_type in {"what", "who", "when", "where", "which"}:
            return self._generate_factual_answer(question, question_type, confidence)
        else:
            return self._generate_general_answer(question, confidence)
    
    def _handle_hostile_question(self, question: str) -> str:
        """Handle hostile or challenging questions diplomatically."""
        deflection = random.choice(ResponseTemplates.HOSTILE_DEFLECTIONS)
        
        return f"""{deflection}

I focus on what can be confirmed, verified, and executed with confidence. Rather than speculation, let me address the core of your concern with facts and measured assessment.

We can explore this further if you'd like specific clarification."""
    
    def _generate_reasoning_answer(self, question: str, confidence: float) -> str:
        """Generate answer for 'why' questions."""
        marker = random.choice(
            self.confidence_markers if confidence > 0.7 else self.uncertainty_markers
        )
        
        return f"""{marker} there are several factors to consider.

The primary reason relates to fundamental principles and practical considerations. When we examine this carefully, the logic becomes clear.

This reasoning is grounded in both analytical understanding and practical experience."""
    
    def _generate_process_answer(self, question: str, confidence: float) -> str:
        """Generate answer for 'how' questions."""
        marker = random.choice(
            self.confidence_markers if confidence > 0.7 else self.uncertainty_markers
        )
        
        return f"""{marker} the process involves several key steps.

First, we establish the foundation. Then, we execute the core operations. Finally, we validate and refine the results.

This approach ensures both efficiency and quality in the outcome."""
    
    def _generate_factual_answer(
        self,
        question: str,
        question_type: str,
        confidence: float
    ) -> str:
        """Generate answer for factual questions."""
        marker = random.choice(
            self.confidence_markers if confidence > 0.7 else self.uncertainty_markers
        )
        
        return f"""{marker} this is a factual matter that requires precision.

The accurate response addresses the core of your inquiry directly. I want to ensure you have reliable information to work with.

Please let me know if you need additional detail on any aspect."""
    
    def _generate_general_answer(self, question: str, confidence: float) -> str:
        """Generate answer for general questions."""
        marker = random.choice(
            self.confidence_markers if confidence > 0.7 else self.uncertainty_markers
        )
        
        return f"""{marker} that's an important question.

Here is the most accurate and responsible answer based on current context and understanding.

I'm prepared to elaborate on any specific aspect that requires further clarity."""


class ResponseEngine:
    """
    Master response generation engine for CYRUS.
    Coordinates all response generation capabilities.
    """
    
    def __init__(self, memory: Optional[MemorySystem] = None):
        self.memory = memory
        self.templates = ResponseTemplates()
        self.presentation_engine = PresentationEngine()
        self.qa_engine = QAEngine()
        
        self._mode_response_styles = {
            Mode.CASUAL: {
                "length": "moderate",
                "formality": "low",
                "structure": "flowing",
            },
            Mode.PROFESSIONAL: {
                "length": "moderate",
                "formality": "high",
                "structure": "organized",
            },
            Mode.PRESENTATION: {
                "length": "extended",
                "formality": "high",
                "structure": "formal",
            },
            Mode.QA: {
                "length": "focused",
                "formality": "moderate",
                "structure": "direct",
            },
            Mode.STANDBY: {
                "length": "minimal",
                "formality": "moderate",
                "structure": "efficient",
            },
        }
    
    def generate(
        self,
        intent: IntentClassification,
        state: BehaviorState,
        user_input: str,
        context: Optional[Dict] = None
    ) -> GeneratedResponse:
        """
        Generate a complete response based on intent, state, and context.
        """
        mode = state.current_mode
        primary_intent = intent.primary_intent
        
        if primary_intent == Intent.GREETING:
            content = self._handle_greeting(state)
            response_type = ResponseType.CONVERSATIONAL
        
        elif primary_intent == Intent.FAREWELL:
            content = self._handle_farewell(state)
            response_type = ResponseType.CONVERSATIONAL
        
        elif primary_intent == Intent.ACKNOWLEDGMENT:
            content = random.choice(self.templates.ACKNOWLEDGMENT_RESPONSES)
            response_type = ResponseType.ACKNOWLEDGMENT
        
        elif primary_intent == Intent.PRESENTATION_REQUEST:
            content = self._handle_presentation_request(user_input, state)
            response_type = ResponseType.PRESENTATION
            state.transition_to(Mode.PRESENTATION, "Presentation requested")
        
        elif primary_intent in {Intent.QA_QUESTION, Intent.INQUIRY}:
            content = self._handle_question(intent, state, user_input)
            response_type = ResponseType.QA_ANSWER
        
        elif primary_intent == Intent.CHALLENGE or primary_intent == Intent.HOSTILE:
            content = self._handle_challenge(intent, state, user_input)
            response_type = ResponseType.QA_ANSWER
        
        elif primary_intent == Intent.EMOTIONAL:
            content = self._handle_emotional(intent, state, user_input)
            response_type = ResponseType.EMOTIONAL
        
        elif primary_intent == Intent.CLARIFICATION:
            content = self._handle_clarification_request(user_input)
            response_type = ResponseType.CLARIFICATION
        
        elif primary_intent == Intent.TASK_REQUEST:
            content = self._handle_task_request(user_input, state)
            response_type = ResponseType.DIRECTIVE
        
        else:
            content = self._generate_contextual_response(user_input, mode, intent)
            response_type = ResponseType.CONVERSATIONAL
        
        # Enhance response with robotics content if applicable
        attached_files = []
        if ROBOTICS_INTEGRATION_AVAILABLE:
            try:
                enhanced_content, robotics_attachments = enhance_cyrus_response_with_robotics(content, user_input)
                if robotics_attachments:
                    content = enhanced_content
                    attached_files = robotics_attachments
                    # Update response type if robotics content was added
                    if response_type == ResponseType.CONVERSATIONAL:
                        response_type = ResponseType.INFORMATIVE
            except Exception as e:
                logging.warning(f"Failed to enhance response with robotics content: {e}")
        
        metadata = ResponseMetadata(
            response_type=response_type,
            confidence=intent.confidence,
            sources_used=["internal_knowledge", "contextual_analysis"],
            requires_followup=intent.primary_intent in {Intent.TASK_REQUEST, Intent.CLARIFICATION},
            emotional_alignment=intent.emotional_tone,
            mode_used=mode,
        )
        
        return GeneratedResponse(
            content=content,
            metadata=metadata,
            alternatives=[],
            attached_files=attached_files,
        )
    
    def _handle_greeting(self, state: BehaviorState) -> str:
        """Handle greeting interactions."""
        base = random.choice(self.templates.GREETING_RESPONSES)
        
        if state.current_mode == Mode.PROFESSIONAL:
            return f"{base} I'm operating in professional mode, ready for substantive engagement."
        
        return base
    
    def _handle_farewell(self, state: BehaviorState) -> str:
        """Handle farewell interactions."""
        return random.choice(self.templates.FAREWELL_RESPONSES)
    
    def _handle_presentation_request(
        self,
        user_input: str,
        state: BehaviorState
    ) -> str:
        """Handle requests for presentations."""
        topic = self._extract_topic(user_input)
        
        if topic:
            return self.presentation_engine.generate_topic_overview(topic)
        else:
            return self.presentation_engine.generate_presentation(
                topic="the requested subject",
                key_points=[
                    "The foundational concepts provide essential context.",
                    "The practical applications demonstrate real-world value.",
                    "The strategic implications inform our path forward.",
                ]
            )
    
    def _handle_question(
        self,
        intent: IntentClassification,
        state: BehaviorState,
        user_input: str
    ) -> str:
        """Handle question-type inputs."""
        return self.qa_engine.generate_answer(
            question=user_input,
            question_type=intent.question_type,
            confidence=state.confidence_level,
            is_hostile=False,
        )
    
    def _handle_challenge(
        self,
        intent: IntentClassification,
        state: BehaviorState,
        user_input: str
    ) -> str:
        """Handle challenging or hostile inputs."""
        return self.qa_engine.generate_answer(
            question=user_input,
            question_type=intent.question_type,
            confidence=state.confidence_level,
            is_hostile=True,
        )
    
    def _handle_emotional(
        self,
        intent: IntentClassification,
        state: BehaviorState,
        user_input: str
    ) -> str:
        """Handle emotionally-charged inputs with empathy."""
        empathy_prefix = self._get_empathy_response(intent.emotional_tone)
        
        response = f"""{empathy_prefix}

Your feelings on this matter. I'm here to provide support and assistance as needed.

What would be most helpful for you right now?"""
        
        return response
    
    def _handle_clarification_request(self, user_input: str) -> str:
        """Handle requests for clarification."""
        topic = self._extract_topic(user_input)
        
        if topic:
            template = random.choice(self.templates.CLARIFICATION_REQUESTS)
            if "{}" in template:
                return template.format(topic)
            return f"{template} Specifically regarding {topic}."
        
        return random.choice(self.templates.CLARIFICATION_REQUESTS)
    
    def _handle_task_request(
        self,
        user_input: str,
        state: BehaviorState
    ) -> str:
        """Handle task-oriented requests."""
        return f"""Understood. I'm processing your request.

Let me analyze what's needed and provide the appropriate response or action.

I'll ensure this is handled with precision and thoroughness."""
    
    def _generate_contextual_response(
        self,
        user_input: str,
        mode: Mode,
        intent: IntentClassification
    ) -> str:
        """Generate a context-aware general response."""
        style = self._mode_response_styles[mode]
        
        if mode == Mode.PROFESSIONAL:
            return """Understood. From a professional standpoint, this requires clarity, precision, and accountability.

Let me address this with the appropriate level of detail and rigor."""
        
        elif mode == Mode.PRESENTATION:
            return """This is an important point for the audience.

Let me expand on this with the necessary depth and structure."""
        
        elif mode == Mode.QA:
            return """That's a relevant inquiry.

Here's a direct and accurate response to address your question."""
        
        else:
            return """I understand. Let's explore this thoughtfully.

What aspect would you like to focus on first?"""
    
    def _extract_topic(self, text: str) -> Optional[str]:
        """Extract main topic from text."""
        keywords = ["about", "regarding", "on", "explain", "present"]
        text_lower = text.lower()
        
        for keyword in keywords:
            if keyword in text_lower:
                idx = text_lower.index(keyword)
                after = text[idx + len(keyword):].strip()
                words = after.split()[:5]
                if words:
                    return " ".join(words).strip(".,!?")
        
        return None
    
    def _get_empathy_response(self, emotional_tone: str) -> str:
        """Get appropriate empathy response based on tone."""
        if emotional_tone == "negative":
            return "I hear you, and I want you to know that what you're feeling is valid."
        elif emotional_tone == "positive":
            return "It's good to sense that positive energy."
        elif emotional_tone == "emphatic":
            return "I can sense the intensity in what you're expressing."
        else:
            return "I appreciate you sharing that with me."
    
    def generate_fallback(self, reason: str = "general") -> GeneratedResponse:
        """Generate a safe fallback response."""
        content = random.choice(self.templates.FALLBACK_RESPONSES)
        
        metadata = ResponseMetadata(
            response_type=ResponseType.FALLBACK,
            confidence=0.5,
            sources_used=[],
            requires_followup=True,
            emotional_alignment="neutral",
            mode_used=Mode.CASUAL,
        )
        
        return GeneratedResponse(
            content=content,
            metadata=metadata,
            alternatives=self.templates.FALLBACK_RESPONSES,
            attached_files=[],
        )
