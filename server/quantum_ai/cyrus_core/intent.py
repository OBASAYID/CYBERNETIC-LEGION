"""
CYRUS Intent Classification Engine
===================================
Sophisticated intent classification with confidence scoring,
multi-intent detection, and contextual intent refinement.
"""

from enum import Enum, auto
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Set
import re


class Intent(Enum):
    """Primary intent categories for user input."""
    GREETING = "greeting"
    FAREWELL = "farewell"
    INQUIRY = "inquiry"
    EXPLANATION_REQUEST = "explanation_request"
    OPINION_REQUEST = "opinion_request"
    TASK_REQUEST = "task_request"
    CLARIFICATION = "clarification"
    CONFIRMATION = "confirmation"
    NEGATION = "negation"
    PRESENTATION_REQUEST = "presentation_request"
    QA_QUESTION = "qa_question"
    CHALLENGE = "challenge"
    HOSTILE = "hostile"
    EMOTIONAL = "emotional"
    SMALLTALK = "smalltalk"
    COMMAND = "command"
    ACKNOWLEDGMENT = "acknowledgment"
    GENERAL = "general"
    
    @property
    def requires_detailed_response(self) -> bool:
        """Intents that typically require longer, detailed responses."""
        return self in {
            Intent.INQUIRY,
            Intent.EXPLANATION_REQUEST,
            Intent.PRESENTATION_REQUEST,
            Intent.QA_QUESTION,
            Intent.CHALLENGE,
        }
    
    @property
    def is_conversational(self) -> bool:
        """Intents that are primarily conversational."""
        return self in {
            Intent.GREETING,
            Intent.FAREWELL,
            Intent.SMALLTALK,
            Intent.ACKNOWLEDGMENT,
            Intent.EMOTIONAL,
        }


@dataclass
class IntentClassification:
    """
    Complete intent classification result with confidence and metadata.
    """
    primary_intent: Intent
    confidence: float
    secondary_intents: List[Tuple[Intent, float]]
    detected_entities: List[str]
    question_type: Optional[str]
    urgency_level: float
    emotional_tone: str
    keywords_matched: List[str]
    
    @property
    def is_confident(self) -> bool:
        """Returns True if classification confidence is high."""
        return self.confidence >= 0.7
    
    @property
    def is_question(self) -> bool:
        """Returns True if input is a question."""
        return self.primary_intent in {
            Intent.INQUIRY,
            Intent.QA_QUESTION,
            Intent.CLARIFICATION,
            Intent.EXPLANATION_REQUEST,
            Intent.OPINION_REQUEST,
        }
    
    def get_all_intents(self) -> List[Tuple[Intent, float]]:
        """Get all detected intents with confidence scores."""
        all_intents = [(self.primary_intent, self.confidence)]
        all_intents.extend(self.secondary_intents)
        return all_intents


class IntentEngine:
    """
    Advanced intent classification engine with pattern matching,
    keyword analysis, and contextual refinement.
    """
    
    def __init__(self):
        self._init_patterns()
        self._init_keywords()
        self._init_question_patterns()
    
    def _init_patterns(self):
        """Initialize regex patterns for intent detection."""
        self.patterns: Dict[Intent, List[re.Pattern]] = {
            Intent.GREETING: [
                re.compile(r"^(hi|hello|hey|greetings|good\s*(morning|afternoon|evening))", re.I),
                re.compile(r"^(what'?s\s*up|howdy|yo)\b", re.I),
            ],
            Intent.FAREWELL: [
                re.compile(r"(bye|goodbye|see\s*you|take\s*care|farewell|until\s*next)", re.I),
                re.compile(r"(gotta\s*go|have\s*to\s*leave|signing\s*off)", re.I),
            ],
            Intent.PRESENTATION_REQUEST: [
                re.compile(r"(present|explain\s*to|walk\s*(me|us)\s*through|demonstrate)", re.I),
                re.compile(r"(give\s*(me|us)\s*a\s*(presentation|overview|rundown))", re.I),
                re.compile(r"(show\s*(me|us)\s*how|teach\s*(me|us))", re.I),
            ],
            Intent.COMMAND: [
                re.compile(r"^(do|make|create|build|generate|write|send|open|close|start|stop)\b", re.I),
                re.compile(r"^(set|change|update|modify|delete|remove|add)\b", re.I),
            ],
            Intent.CHALLENGE: [
                re.compile(r"(but\s*what\s*about|what\s*if|however|on\s*the\s*other\s*hand)", re.I),
                re.compile(r"(are\s*you\s*sure|how\s*can\s*you\s*be\s*certain|prove\s*it)", re.I),
            ],
            Intent.HOSTILE: [
                re.compile(r"(you'?re\s*wrong|that'?s\s*(stupid|dumb|ridiculous))", re.I),
                re.compile(r"(you\s*don'?t\s*know|you\s*can'?t)", re.I),
            ],
            Intent.EMOTIONAL: [
                re.compile(r"(i\s*(feel|am)\s*(sad|happy|angry|frustrated|worried|anxious))", re.I),
                re.compile(r"(this\s*makes\s*me\s*(feel|think))", re.I),
            ],
            Intent.CONFIRMATION: [
                re.compile(r"^(yes|yeah|yep|sure|correct|right|exactly|absolutely|indeed)", re.I),
                re.compile(r"(that'?s\s*(right|correct)|i\s*agree)", re.I),
            ],
            Intent.NEGATION: [
                re.compile(r"^(no|nope|nah|negative|wrong|incorrect)", re.I),
                re.compile(r"(i\s*disagree|that'?s\s*not\s*(right|correct))", re.I),
            ],
            Intent.ACKNOWLEDGMENT: [
                re.compile(r"^(ok|okay|got\s*it|understood|i\s*see|makes\s*sense)", re.I),
                re.compile(r"(thanks|thank\s*you|appreciate)", re.I),
            ],
        }
    
    def _init_keywords(self):
        """Initialize keyword sets for intent detection."""
        self.keywords: Dict[Intent, Set[str]] = {
            Intent.INQUIRY: {
                "why", "how", "what", "when", "where", "who", "which",
                "explain", "describe", "tell", "elaborate", "clarify",
            },
            Intent.EXPLANATION_REQUEST: {
                "explain", "describe", "elaborate", "detail", "break down",
                "walk through", "help understand", "meaning", "define",
            },
            Intent.OPINION_REQUEST: {
                "think", "opinion", "believe", "feel about", "view",
                "perspective", "thoughts on", "take on", "stance",
            },
            Intent.TASK_REQUEST: {
                "can you", "could you", "would you", "please", "need",
                "want", "help me", "assist", "do this", "handle",
            },
            Intent.CLARIFICATION: {
                "what do you mean", "clarify", "not sure", "confused",
                "don't understand", "be more specific", "rephrase",
            },
            Intent.SMALLTALK: {
                "weather", "weekend", "doing today", "how are",
                "what's new", "anything interesting", "fun",
            },
            Intent.QA_QUESTION: {
                "question", "ask", "wondering", "curious", "know if",
                "is it true", "can you tell", "information about",
            },
            Intent.CHALLENGE: {
                "challenge", "risk", "concern", "problem", "issue",
                "difficult", "impossible", "unlikely", "doubtful",
            },
        }
    
    def _init_question_patterns(self):
        """Initialize question type detection patterns."""
        self.question_patterns = {
            "what": re.compile(r"^what\b", re.I),
            "why": re.compile(r"^why\b", re.I),
            "how": re.compile(r"^how\b", re.I),
            "when": re.compile(r"^when\b", re.I),
            "where": re.compile(r"^where\b", re.I),
            "who": re.compile(r"^who\b", re.I),
            "which": re.compile(r"^which\b", re.I),
            "can": re.compile(r"^(can|could)\b", re.I),
            "is_are": re.compile(r"^(is|are|was|were)\b", re.I),
            "do_does": re.compile(r"^(do|does|did)\b", re.I),
            "will_would": re.compile(r"^(will|would|shall|should)\b", re.I),
        }
    
    def classify(self, text: str, context: Optional[Dict] = None) -> IntentClassification:
        """
        Classify the intent of user input.
        Returns complete classification with confidence and metadata.
        """
        text = text.strip()
        text_lower = text.lower()
        
        intent_scores: Dict[Intent, float] = {intent: 0.0 for intent in Intent}
        keywords_matched: List[str] = []
        
        for intent, patterns in self.patterns.items():
            for pattern in patterns:
                if pattern.search(text):
                    intent_scores[intent] += 0.4
                    break
        
        for intent, kw_set in self.keywords.items():
            for keyword in kw_set:
                if keyword in text_lower:
                    intent_scores[intent] += 0.15
                    keywords_matched.append(keyword)
        
        question_type = self._detect_question_type(text)
        if question_type:
            if question_type in {"why", "how"}:
                intent_scores[Intent.INQUIRY] += 0.3
            elif question_type in {"what", "who", "when", "where", "which"}:
                intent_scores[Intent.QA_QUESTION] += 0.25
            elif question_type in {"can", "will_would", "do_does"}:
                intent_scores[Intent.TASK_REQUEST] += 0.2
        
        if text.endswith("?"):
            for intent in [Intent.INQUIRY, Intent.QA_QUESTION, Intent.CLARIFICATION]:
                intent_scores[intent] += 0.1
        
        emotional_tone = self._detect_emotional_tone(text)
        urgency_level = self._detect_urgency(text)
        entities = self._extract_entities(text)
        
        if context:
            intent_scores = self._apply_context_modifiers(intent_scores, context)
        
        sorted_intents = sorted(
            intent_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        primary_intent = sorted_intents[0][0]
        primary_score = sorted_intents[0][1]
        
        if primary_score < 0.15:
            primary_intent = Intent.GENERAL
            primary_score = 0.5
        
        confidence = min(1.0, primary_score / 0.8)
        
        secondary_intents = [
            (intent, score)
            for intent, score in sorted_intents[1:4]
            if score > 0.1
        ]
        
        return IntentClassification(
            primary_intent=primary_intent,
            confidence=confidence,
            secondary_intents=secondary_intents,
            detected_entities=entities,
            question_type=question_type,
            urgency_level=urgency_level,
            emotional_tone=emotional_tone,
            keywords_matched=list(set(keywords_matched)),
        )
    
    def _detect_question_type(self, text: str) -> Optional[str]:
        """Detect the type of question if present."""
        for q_type, pattern in self.question_patterns.items():
            if pattern.match(text):
                return q_type
        return None
    
    def _detect_emotional_tone(self, text: str) -> str:
        """Detect the emotional tone of the input."""
        text_lower = text.lower()
        
        positive_markers = ["thank", "great", "awesome", "love", "appreciate", "happy", "excited"]
        negative_markers = ["angry", "frustrated", "annoyed", "upset", "disappointed", "hate", "terrible"]
        neutral_markers = ["okay", "fine", "alright"]
        
        positive_count = sum(1 for m in positive_markers if m in text_lower)
        negative_count = sum(1 for m in negative_markers if m in text_lower)
        
        if positive_count > negative_count:
            return "positive"
        elif negative_count > positive_count:
            return "negative"
        elif text.endswith("!"):
            return "emphatic"
        
        return "neutral"
    
    def _detect_urgency(self, text: str) -> float:
        """Detect urgency level (0.0 to 1.0)."""
        text_lower = text.lower()
        urgency = 0.3
        
        high_urgency = ["urgent", "asap", "immediately", "now", "emergency", "critical", "deadline"]
        medium_urgency = ["soon", "quickly", "today", "important", "need"]
        low_urgency = ["eventually", "sometime", "whenever", "no rush", "when you can"]
        
        if any(marker in text_lower for marker in high_urgency):
            urgency += 0.5
        elif any(marker in text_lower for marker in medium_urgency):
            urgency += 0.3
        elif any(marker in text_lower for marker in low_urgency):
            urgency -= 0.2
        
        if text.endswith("!"):
            urgency += 0.1
        if text.isupper():
            urgency += 0.2
        
        return max(0.0, min(1.0, urgency))
    
    def _extract_entities(self, text: str) -> List[str]:
        """Extract potential named entities from text."""
        words = text.split()
        entities = []
        
        for word in words:
            clean = word.strip(".,!?\"'()[]")
            if clean and len(clean) > 1:
                if clean[0].isupper() and not words.index(word) == 0:
                    entities.append(clean)
        
        return list(dict.fromkeys(entities))[:5]
    
    def _apply_context_modifiers(
        self,
        scores: Dict[Intent, float],
        context: Dict
    ) -> Dict[Intent, float]:
        """Apply contextual modifiers to intent scores."""
        if context.get("in_presentation"):
            scores[Intent.QA_QUESTION] *= 1.3
            scores[Intent.CHALLENGE] *= 1.2
        
        if context.get("previous_question"):
            scores[Intent.CLARIFICATION] *= 1.2
            scores[Intent.ACKNOWLEDGMENT] *= 1.1
        
        if context.get("emotional_context"):
            scores[Intent.EMOTIONAL] *= 1.3
        
        return scores
    
    def quick_classify(self, text: str) -> Intent:
        """
        Quick classification returning only the primary intent.
        Use for performance-critical paths.
        """
        return self.classify(text).primary_intent
    
    def is_question(self, text: str) -> bool:
        """Quick check if input is a question."""
        if text.strip().endswith("?"):
            return True
        return self._detect_question_type(text) is not None
