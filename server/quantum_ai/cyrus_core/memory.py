"""
CYRUS Memory Management System
==============================
Long-term conversational context with semantic importance weighting,
topic tracking, and contextual recall capabilities.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Any
from enum import Enum
import hashlib
import json
from collections import defaultdict


class Speaker(Enum):
    """Conversation participants."""
    HUMAN = "human"
    CYRUS = "cyrus"
    SYSTEM = "system"


class TopicCategory(Enum):
    """High-level topic categories for memory organization."""
    TECHNICAL = "technical"
    PERSONAL = "personal"
    PROFESSIONAL = "professional"
    CREATIVE = "creative"
    FACTUAL = "factual"
    EMOTIONAL = "emotional"
    TASK = "task"
    GENERAL = "general"


@dataclass
class ConversationTurn:
    """
    A single turn in conversation with metadata.
    """
    speaker: Speaker
    content: str
    timestamp: datetime
    mode_context: str
    importance: float = 0.5
    topic: Optional[str] = None
    category: TopicCategory = TopicCategory.GENERAL
    entities: List[str] = field(default_factory=list)
    sentiment: str = "neutral"
    turn_id: str = ""
    
    def __post_init__(self):
        if not self.turn_id:
            self.turn_id = self._generate_id()
    
    def _generate_id(self) -> str:
        """Generate unique turn ID."""
        content_hash = hashlib.md5(
            f"{self.timestamp.isoformat()}{self.content[:50]}".encode()
        ).hexdigest()[:12]
        return f"turn_{content_hash}"
    
    def to_dict(self) -> Dict:
        return {
            "turn_id": self.turn_id,
            "speaker": self.speaker.value,
            "content": self.content,
            "timestamp": self.timestamp.isoformat(),
            "mode_context": self.mode_context,
            "importance": self.importance,
            "topic": self.topic,
            "category": self.category.value,
            "entities": self.entities,
            "sentiment": self.sentiment,
        }


@dataclass
class ContextualMemory:
    """
    A contextual memory unit that persists beyond immediate conversation.
    Used for long-term recall and personalization.
    """
    content: str
    category: TopicCategory
    importance: float
    created_at: datetime
    last_accessed: datetime
    access_count: int = 1
    related_topics: List[str] = field(default_factory=list)
    source_turn_ids: List[str] = field(default_factory=list)
    decay_rate: float = 0.01
    memory_id: str = ""
    
    def __post_init__(self):
        if not self.memory_id:
            self.memory_id = hashlib.md5(
                f"{self.created_at.isoformat()}{self.content[:30]}".encode()
            ).hexdigest()[:12]
    
    @property
    def effective_importance(self) -> float:
        """Calculate importance with time decay and access boost."""
        age_days = (datetime.now() - self.created_at).days
        decay = self.decay_rate * age_days
        access_boost = min(0.2, self.access_count * 0.02)
        return max(0.1, min(1.0, self.importance - decay + access_boost))
    
    def access(self):
        """Record memory access."""
        self.last_accessed = datetime.now()
        self.access_count += 1


class MemorySystem:
    """
    Complete memory management system for CYRUS.
    Handles short-term conversation, working memory, and long-term recall.
    """
    
    def __init__(
        self,
        conversation_limit: int = 50,
        working_memory_limit: int = 10,
        long_term_limit: int = 500
    ):
        self.conversation_limit = conversation_limit
        self.working_memory_limit = working_memory_limit
        self.long_term_limit = long_term_limit
        
        self.conversation_history: List[ConversationTurn] = []
        self.working_memory: List[ConversationTurn] = []
        self.long_term_memories: List[ContextualMemory] = []
        
        self.topic_index: Dict[str, List[str]] = defaultdict(list)
        self.entity_index: Dict[str, List[str]] = defaultdict(list)
        self.active_context: Dict[str, Any] = {}
        
        self._importance_keywords = {
            "remember": 0.3,
            "important": 0.3,
            "always": 0.2,
            "never": 0.2,
            "critical": 0.4,
            "key": 0.2,
            "essential": 0.3,
            "my name": 0.5,
            "i am": 0.3,
            "i work": 0.3,
            "i live": 0.3,
        }
    
    def remember(
        self,
        speaker: Speaker,
        content: str,
        mode_context: str,
        topic: Optional[str] = None,
        entities: Optional[List[str]] = None,
        sentiment: str = "neutral"
    ) -> ConversationTurn:
        """
        Store a new conversation turn with full metadata.
        Returns the created turn.
        """
        importance = self._calculate_importance(content)
        category = self._categorize_content(content)
        
        turn = ConversationTurn(
            speaker=speaker,
            content=content,
            timestamp=datetime.now(),
            mode_context=mode_context,
            importance=importance,
            topic=topic or self._extract_topic(content),
            category=category,
            entities=entities or self._extract_entities(content),
            sentiment=sentiment,
        )
        
        self.conversation_history.append(turn)
        
        if len(self.conversation_history) > self.conversation_limit:
            self._archive_old_turns()
        
        if importance > 0.6:
            self._add_to_working_memory(turn)
        
        if turn.topic:
            self.topic_index[turn.topic].append(turn.turn_id)
        for entity in turn.entities:
            self.entity_index[entity.lower()].append(turn.turn_id)
        
        return turn
    
    def recall_recent(self, count: int = 5) -> List[ConversationTurn]:
        """Recall most recent conversation turns."""
        return self.conversation_history[-count:]
    
    def recall_by_topic(self, topic: str, limit: int = 10) -> List[ConversationTurn]:
        """Recall turns related to a specific topic."""
        topic_lower = topic.lower()
        relevant_ids = set()
        
        for indexed_topic, turn_ids in self.topic_index.items():
            if topic_lower in indexed_topic.lower():
                relevant_ids.update(turn_ids)
        
        results = []
        for turn in reversed(self.conversation_history):
            if turn.turn_id in relevant_ids:
                results.append(turn)
                if len(results) >= limit:
                    break
        
        return results
    
    def recall_by_entity(self, entity: str, limit: int = 10) -> List[ConversationTurn]:
        """Recall turns mentioning a specific entity."""
        entity_lower = entity.lower()
        turn_ids = set(self.entity_index.get(entity_lower, []))
        
        results = []
        for turn in reversed(self.conversation_history):
            if turn.turn_id in turn_ids:
                results.append(turn)
                if len(results) >= limit:
                    break
        
        return results
    
    def get_working_memory(self) -> List[ConversationTurn]:
        """Get current working memory (most important recent context)."""
        return self.working_memory.copy()
    
    def get_context_summary(self) -> Dict[str, Any]:
        """
        Generate a summary of current conversational context.
        Used for informing response generation.
        """
        recent = self.recall_recent(10)
        
        topics = []
        entities = []
        sentiments = []
        
        for turn in recent:
            if turn.topic:
                topics.append(turn.topic)
            entities.extend(turn.entities)
            sentiments.append(turn.sentiment)
        
        unique_topics = list(dict.fromkeys(topics))[:5]
        unique_entities = list(dict.fromkeys(entities))[:10]
        
        sentiment_counts: Dict[str, int] = defaultdict(int)
        for s in sentiments:
            sentiment_counts[s] += 1
        dominant_sentiment = max(sentiment_counts.keys(), key=lambda k: sentiment_counts[k]) if sentiment_counts else "neutral"
        
        return {
            "turn_count": len(self.conversation_history),
            "recent_topics": unique_topics,
            "active_entities": unique_entities,
            "dominant_sentiment": dominant_sentiment,
            "working_memory_size": len(self.working_memory),
            "long_term_memory_count": len(self.long_term_memories),
            "active_context": self.active_context,
        }
    
    def store_long_term(
        self,
        content: str,
        category: TopicCategory,
        importance: float,
        related_topics: Optional[List[str]] = None,
        source_turns: Optional[List[str]] = None
    ) -> ContextualMemory:
        """Store a memory for long-term recall."""
        memory = ContextualMemory(
            content=content,
            category=category,
            importance=importance,
            created_at=datetime.now(),
            last_accessed=datetime.now(),
            related_topics=related_topics or [],
            source_turn_ids=source_turns or [],
        )
        
        self.long_term_memories.append(memory)
        
        if len(self.long_term_memories) > self.long_term_limit:
            self._prune_long_term_memories()
        
        return memory
    
    def search_long_term(
        self,
        query: str,
        category: Optional[TopicCategory] = None,
        limit: int = 5
    ) -> List[ContextualMemory]:
        """Search long-term memories by content and category."""
        query_lower = query.lower()
        query_words = set(query_lower.split())
        
        scored_memories = []
        for memory in self.long_term_memories:
            if category and memory.category != category:
                continue
            
            content_lower = memory.content.lower()
            content_words = set(content_lower.split())
            
            word_overlap = len(query_words & content_words)
            if query_lower in content_lower:
                score = memory.effective_importance + 0.5
            elif word_overlap > 0:
                score = memory.effective_importance + (word_overlap * 0.1)
            else:
                continue
            
            scored_memories.append((memory, score))
        
        scored_memories.sort(key=lambda x: x[1], reverse=True)
        
        results = []
        for memory, _ in scored_memories[:limit]:
            memory.access()
            results.append(memory)
        
        return results
    
    def set_context(self, key: str, value: Any):
        """Set active context value."""
        self.active_context[key] = value
    
    def get_context(self, key: str, default: Any = None) -> Any:
        """Get active context value."""
        return self.active_context.get(key, default)
    
    def clear_context(self, key: Optional[str] = None):
        """Clear specific or all active context."""
        if key:
            self.active_context.pop(key, None)
        else:
            self.active_context.clear()
    
    def _calculate_importance(self, content: str) -> float:
        """Calculate importance score for content."""
        content_lower = content.lower()
        importance = 0.5
        
        for keyword, boost in self._importance_keywords.items():
            if keyword in content_lower:
                importance += boost
        
        if len(content) > 200:
            importance += 0.1
        if "?" in content:
            importance += 0.1
        if "!" in content:
            importance += 0.05
        
        return min(1.0, importance)
    
    def _categorize_content(self, content: str) -> TopicCategory:
        """Categorize content into topic categories."""
        content_lower = content.lower()
        
        technical_words = ["code", "program", "system", "data", "algorithm", "api", "function"]
        personal_words = ["i feel", "my", "myself", "personally", "emotion"]
        professional_words = ["work", "project", "deadline", "meeting", "client", "business"]
        creative_words = ["idea", "design", "create", "imagine", "story", "art"]
        task_words = ["do", "complete", "task", "todo", "schedule", "remind"]
        
        if any(w in content_lower for w in technical_words):
            return TopicCategory.TECHNICAL
        if any(w in content_lower for w in personal_words):
            return TopicCategory.PERSONAL
        if any(w in content_lower for w in professional_words):
            return TopicCategory.PROFESSIONAL
        if any(w in content_lower for w in creative_words):
            return TopicCategory.CREATIVE
        if any(w in content_lower for w in task_words):
            return TopicCategory.TASK
        
        return TopicCategory.GENERAL
    
    def _extract_topic(self, content: str) -> Optional[str]:
        """Extract main topic from content."""
        words = content.split()
        if len(words) < 3:
            return None
        
        keywords = [w for w in words if len(w) > 4 and w.isalpha()]
        if keywords:
            return keywords[0].lower()
        return None
    
    def _extract_entities(self, content: str) -> List[str]:
        """Extract named entities from content."""
        words = content.split()
        entities = []
        
        for word in words:
            clean = word.strip(".,!?\"'")
            if clean and clean[0].isupper() and len(clean) > 1:
                entities.append(clean)
        
        return list(dict.fromkeys(entities))[:5]
    
    def _add_to_working_memory(self, turn: ConversationTurn):
        """Add turn to working memory with importance management."""
        self.working_memory.append(turn)
        
        if len(self.working_memory) > self.working_memory_limit:
            self.working_memory.sort(key=lambda t: t.importance)
            self.working_memory = self.working_memory[1:]
    
    def _archive_old_turns(self):
        """Archive old conversation turns to long-term memory."""
        to_archive = self.conversation_history[:10]
        self.conversation_history = self.conversation_history[10:]
        
        for turn in to_archive:
            if turn.importance > 0.6:
                self.store_long_term(
                    content=f"[{turn.speaker.value}] {turn.content}",
                    category=turn.category,
                    importance=turn.importance,
                    related_topics=[turn.topic] if turn.topic else [],
                    source_turns=[turn.turn_id],
                )
    
    def _prune_long_term_memories(self):
        """Remove lowest importance long-term memories."""
        self.long_term_memories.sort(
            key=lambda m: m.effective_importance,
            reverse=True
        )
        self.long_term_memories = self.long_term_memories[:self.long_term_limit - 50]
    
    def export_session(self) -> Dict:
        """Export current session data."""
        return {
            "conversation_history": [t.to_dict() for t in self.conversation_history],
            "working_memory": [t.to_dict() for t in self.working_memory],
            "active_context": self.active_context,
            "summary": self.get_context_summary(),
        }
