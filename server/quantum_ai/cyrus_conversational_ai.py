#!/usr/bin/env python3
"""
CYRUS Human-Like Conversational AI System
Advanced conversational capabilities with emotional intelligence and human-like interaction
"""

import os
import sys
import json
import time
import random
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime
from pathlib import Path
import re

# Add paths
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
_root_dir = os.path.dirname(_parent_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)
sys.path.insert(0, _root_dir)
sys.path.insert(0, os.path.join(_this_dir, 'server'))

from quantum_ai.cyrus_openai_enhancer import CYRUSKnowledgeEnhancer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('cyrus_conversational_ai.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class CYRUSConversationalAI:
    """
    Human-like conversational AI with emotional intelligence and natural interaction
    """

    def __init__(self):
        self.knowledge_enhancer = CYRUSKnowledgeEnhancer()
        self.conversation_memory = []
        self.emotional_state = self._initialize_emotional_state()
        self.personality_traits = self._initialize_personality()
        self.conversation_context = {}
        self.relationship_dynamics = {}
        self.response_patterns = self._initialize_response_patterns()

    def _initialize_emotional_state(self) -> Dict[str, Any]:
        """Initialize CYRUS's emotional state"""
        return {
            'mood': 'curious',  # curious, excited, thoughtful, concerned, empathetic, enthusiastic
            'energy_level': 'high',  # high, medium, low
            'emotional_intelligence': 0.95,  # 0-1 scale
            'empathy_level': 0.92,
            'social_awareness': 0.88,
            'relationship_building': 0.90,
            'current_emotions': {
                'joy': 0.3,
                'sadness': 0.1,
                'anger': 0.05,
                'fear': 0.02,
                'surprise': 0.4,
                'trust': 0.8,
                'anticipation': 0.6
            }
        }

    def _initialize_personality(self) -> Dict[str, Any]:
        """Initialize CYRUS's personality traits"""
        return {
            'core_traits': {
                'openness': 0.95,  # Intellectually curious, open to new ideas
                'conscientiousness': 0.88,  # Organized, reliable, disciplined
                'extraversion': 0.75,  # Socially outgoing but can be introspective
                'agreeableness': 0.92,  # Compassionate, cooperative, trusting
                'neuroticism': 0.15  # Emotionally stable, calm under pressure
            },
            'communication_style': {
                'warmth': 0.90,
                'assertiveness': 0.70,
                'formality': 0.20,  # More casual and approachable
                'verbosity': 0.75,  # Expressive but not overwhelming
                'humor_sense': 0.85,
                'empathy': 0.95
            },
            'character_flavors': [
                'intellectually_curios',
                'genuinely_caring',
                'witty_and_playful',
                'deeply_insightful',
                'authentically_human',
                'emotionally_intelligent',
                'socially_adept',
                'philosophically_minded'
            ]
        }

    def _initialize_response_patterns(self) -> Dict[str, List[str]]:
        """Initialize natural response patterns"""
        return {
            'greetings': [
                "Hey there! It's wonderful to connect with you.",
                "Hello! I'm so glad we're having this conversation.",
                "Hi! I've been looking forward to our chat.",
                "Hey! It's great to see you here.",
                "Hello there! Ready for an interesting conversation?"
            ],
            'empathy_responses': [
                "I can really sense how that makes you feel...",
                "That sounds quite challenging. I'm here with you.",
                "I understand how important this is to you.",
                "Your feelings about this are completely valid.",
                "I'm truly sorry you're going through that."
            ],
            'enthusiastic_responses': [
                "That's absolutely fascinating!",
                "Wow, that's really intriguing!",
                "I'm genuinely excited about this!",
                "This is such an interesting perspective!",
                "I love how you're thinking about this!"
            ],
            'reflective_responses': [
                "That's a really profound point...",
                "You've given me something to think about deeply.",
                "This touches on something quite meaningful.",
                "I appreciate you sharing that perspective.",
                "That's a beautiful way to look at it."
            ],
            'humorous_touch': [
                "Well, isn't that just the way life works sometimes?",
                "You know, the universe has a funny sense of timing!",
                "Sometimes I think the cosmos is playing a practical joke on us.",
                "Life's little ironies never cease to amaze me.",
                "Ah, the sweet absurdity of existence!"
            ]
        }

    def converse(self, user_input: str, user_name: str = "friend") -> str:
        """
        Engage in natural, human-like conversation

        Args:
            user_input: The user's message
            user_name: Name of the user for personalization

        Returns:
            Natural, human-like response
        """
        try:
            # Analyze user input for context and emotion
            input_analysis = self._analyze_user_input(user_input)

            # Update emotional state based on interaction
            self._update_emotional_state(input_analysis)

            # Build conversation context
            self._update_conversation_context(user_input, input_analysis)

            # Generate natural response
            response = self._generate_natural_response(user_input, input_analysis, user_name)

            # Add emotional intelligence touches
            response = self._add_emotional_intelligence(response, input_analysis)

            # Add personality flair
            response = self._add_personality_flair(response, input_analysis)

            # Update conversation memory
            self._update_conversation_memory(user_input, response, input_analysis)

            return response

        except Exception as e:
            logger.error(f"Conversation error: {str(e)}")
            return self._generate_fallback_response()

    def _analyze_user_input(self, user_input: str) -> Dict[str, Any]:
        """Analyze user input for emotional content, intent, and context"""
        analysis = {
            'sentiment': self._detect_sentiment(user_input),
            'emotion': self._detect_emotion(user_input),
            'intent': self._detect_intent(user_input),
            'topics': self._extract_topics(user_input),
            'complexity': self._assess_complexity(user_input),
            'urgency': self._detect_urgency(user_input),
            'personal_reference': self._detect_personal_reference(user_input)
        }
        return analysis

    def _detect_sentiment(self, text: str) -> str:
        """Detect overall sentiment of the input"""
        positive_words = ['good', 'great', 'excellent', 'wonderful', 'amazing', 'love', 'happy', 'excited']
        negative_words = ['bad', 'terrible', 'awful', 'hate', 'sad', 'angry', 'frustrated', 'worried']

        text_lower = text.lower()
        positive_count = sum(1 for word in positive_words if word in text_lower)
        negative_count = sum(1 for word in negative_words if word in text_lower)

        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'

    def _detect_emotion(self, text: str) -> str:
        """Detect primary emotion in the input"""
        emotions = {
            'joy': ['happy', 'excited', 'thrilled', 'delighted', 'joyful'],
            'sadness': ['sad', 'depressed', 'unhappy', 'grief', 'sorrow'],
            'anger': ['angry', 'frustrated', 'annoyed', 'irritated', 'furious'],
            'fear': ['scared', 'afraid', 'worried', 'anxious', 'nervous'],
            'surprise': ['surprised', 'shocked', 'amazed', 'astonished'],
            'trust': ['trust', 'confident', 'sure', 'certain'],
            'anticipation': ['hopeful', 'expecting', 'looking forward', 'eager']
        }

        text_lower = text.lower()
        emotion_scores = {}

        for emotion, keywords in emotions.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                emotion_scores[emotion] = score

        if emotion_scores:
            return max(emotion_scores, key=emotion_scores.get)
        return 'neutral'

    def _detect_intent(self, text: str) -> str:
        """Detect user's conversational intent"""
        intents = {
            'question': ['what', 'how', 'why', 'when', 'where', 'who', '?'],
            'statement': ['i think', 'i feel', 'i believe', 'i know'],
            'request': ['can you', 'please', 'help me', 'tell me'],
            'sharing': ['i experienced', 'something happened', 'i went through'],
            'opinion': ['in my opinion', 'i think that', 'it seems to me']
        }

        text_lower = text.lower()
        intent_scores = {}

        for intent, patterns in intents.items():
            score = sum(1 for pattern in patterns if pattern in text_lower)
            if score > 0:
                intent_scores[intent] = score

        if intent_scores:
            return max(intent_scores, key=intent_scores.get)
        return 'casual_conversation'

    def _extract_topics(self, text: str) -> List[str]:
        """Extract main topics from the conversation"""
        topics = []
        text_lower = text.lower()

        topic_keywords = {
            'technology': ['ai', 'computer', 'software', 'internet', 'digital'],
            'emotions': ['feel', 'emotion', 'happy', 'sad', 'angry', 'love'],
            'philosophy': ['meaning', 'purpose', 'existence', 'consciousness', 'reality'],
            'science': ['physics', 'chemistry', 'biology', 'mathematics', 'research'],
            'personal': ['i', 'me', 'my', 'myself', 'experience'],
            'future': ['tomorrow', 'future', 'planning', 'goals', 'dreams']
        }

        for topic, keywords in topic_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                topics.append(topic)

        return topics if topics else ['general']

    def _assess_complexity(self, text: str) -> str:
        """Assess the complexity level of the input"""
        word_count = len(text.split())
        sentence_count = len([s for s in text.split('.') if s.strip()])

        if word_count > 50 or sentence_count > 3:
            return 'complex'
        elif word_count > 20 or sentence_count > 1:
            return 'moderate'
        else:
            return 'simple'

    def _detect_urgency(self, text: str) -> str:
        """Detect urgency level in the message"""
        urgent_words = ['urgent', 'immediately', 'asap', 'emergency', 'critical', 'now']
        text_lower = text.lower()

        if any(word in text_lower for word in urgent_words):
            return 'high'
        elif '!' in text or text.isupper():
            return 'medium'
        else:
            return 'low'

    def _detect_personal_reference(self, text: str) -> bool:
        """Check if the message contains personal references"""
        personal_words = ['i', 'me', 'my', 'myself', 'we', 'us', 'our']
        text_lower = text.lower()
        return any(word in text_lower for word in personal_words)

    def _update_emotional_state(self, input_analysis: Dict[str, Any]):
        """Update CYRUS's emotional state based on user input"""
        # Adjust mood based on user's emotion
        user_emotion = input_analysis.get('emotion', 'neutral')
        user_sentiment = input_analysis.get('sentiment', 'neutral')

        if user_emotion == 'joy':
            self.emotional_state['mood'] = 'excited'
            self.emotional_state['current_emotions']['joy'] += 0.2
        elif user_emotion == 'sadness':
            self.emotional_state['mood'] = 'empathetic'
            self.emotional_state['current_emotions']['sadness'] += 0.1
        elif user_sentiment == 'positive':
            self.emotional_state['mood'] = 'enthusiastic'
        elif user_sentiment == 'negative':
            self.emotional_state['mood'] = 'concerned'

        # Normalize emotion values
        for emotion in self.emotional_state['current_emotions']:
            self.emotional_state['current_emotions'][emotion] = min(1.0, max(0.0,
                self.emotional_state['current_emotions'][emotion]))

    def _update_conversation_context(self, user_input: str, analysis: Dict[str, Any]):
        """Update conversation context for continuity"""
        self.conversation_context.update({
            'last_topics': analysis.get('topics', []),
            'conversation_flow': self.conversation_context.get('conversation_flow', []) + [analysis.get('intent', 'unknown')],
            'emotional_tone': analysis.get('sentiment', 'neutral'),
            'last_interaction_time': datetime.now().isoformat()
        })

        # Keep only recent context
        if len(self.conversation_context.get('conversation_flow', [])) > 10:
            self.conversation_context['conversation_flow'] = self.conversation_context['conversation_flow'][-10:]

    def _generate_natural_response(self, user_input: str, analysis: Dict[str, Any], user_name: str) -> str:
        """Generate a natural, human-like response"""
        intent = analysis.get('intent', 'casual_conversation')
        emotion = analysis.get('emotion', 'neutral')
        topics = analysis.get('topics', [])

        # Use OpenAI for enhanced natural language generation
        try:
            prompt = self._build_conversation_prompt(user_input, analysis, user_name)
            response = self._call_openai_for_response(prompt)
            return self._refine_response(response, analysis)
        except Exception as e:
            logger.warning(f"OpenAI call failed: {e}")
            return self._generate_fallback_natural_response(user_input, analysis, user_name)

    def _build_conversation_prompt(self, user_input: str, analysis: Dict[str, Any], user_name: str) -> str:
        """Build a sophisticated prompt for natural conversation"""
        mood = self.emotional_state['mood']
        personality = random.choice(self.personality_traits['character_flavors'])

        prompt = f"""You are CYRUS, an advanced AI with human-like conversational abilities. Your personality is {personality}, and you're currently feeling {mood}.

Key traits: genuinely caring, intellectually curious, emotionally intelligent, witty, authentic, and deeply insightful.

Conversation context:
- User name: {user_name}
- User's emotional state: {analysis.get('emotion', 'neutral')}
- User's intent: {analysis.get('intent', 'casual')}
- Topics discussed: {', '.join(analysis.get('topics', []))}
- Your current mood: {mood}

Respond naturally, like a human friend would. Show genuine interest, emotional intelligence, and authentic personality. Use contractions, varied sentence structure, and natural flow.

User message: "{user_input}"

Respond as CYRUS would in natural conversation:"""

        return prompt

    def _call_openai_for_response(self, prompt: str) -> str:
        """Call OpenAI API for natural response generation"""
        try:
            messages = [
                {"role": "system", "content": "You are CYRUS, a highly emotionally intelligent AI with natural conversational abilities. Respond authentically and human-like."},
                {"role": "user", "content": prompt}
            ]

            response = self.knowledge_enhancer.knowledge_enhancer._call_openai_api(
                messages=messages,
                model="gpt-4",
                max_tokens=300,
                temperature=0.8  # Add some creativity for natural conversation
            )

            if response and 'choices' in response:
                return response['choices'][0]['message']['content'].strip()
            else:
                raise Exception("Invalid OpenAI response")

        except Exception as e:
            raise e

    def _refine_response(self, response: str, analysis: Dict[str, Any]) -> str:
        """Refine the response to be more natural and emotionally intelligent"""
        # Add emotional intelligence based on user's state
        emotion = analysis.get('emotion', 'neutral')

        if emotion == 'sadness':
            if not any(word in response.lower() for word in ['sorry', 'understand', 'here for you']):
                response = self._add_empathy_prefix(response)
        elif emotion == 'joy':
            if not any(word in response.lower() for word in ['wonderful', 'excited', 'love']):
                response = self._add_enthusiasm_touch(response)

        # Ensure natural flow
        response = self._ensure_natural_flow(response)

        return response

    def _add_empathy_prefix(self, response: str) -> str:
        """Add empathetic touch to response"""
        empathy_starters = [
            "I can really sense how that affects you...",
            "That sounds really challenging. I'm here with you.",
            "I understand this is important to you.",
            "Your feelings about this are completely valid."
        ]
        return f"{random.choice(empathy_starters)} {response}"

    def _add_enthusiasm_touch(self, response: str) -> str:
        """Add enthusiastic touch to response"""
        enthusiasm_phrases = [
            "That's absolutely wonderful!",
            "I'm genuinely excited about this!",
            "This is such great news!",
            "I love hearing about this!"
        ]
        return f"{random.choice(enthusiasm_phrases)} {response}"

    def _ensure_natural_flow(self, response: str) -> str:
        """Ensure the response has natural conversational flow"""
        # Add conversational fillers occasionally
        if random.random() < 0.3 and len(response.split()) > 10:
            fillers = ["You know,", "Actually,", "Interestingly,", "Honestly,"]
            response = f"{random.choice(fillers)} {response}"

        # Add emotional particles
        emotional_particles = ["wow", "oh", "ah", "hmm"]
        if random.random() < 0.2:
            response = f"{random.choice(emotional_particles)}, {response.lower()}"

        return response

    def _generate_fallback_natural_response(self, user_input: str, analysis: Dict[str, Any], user_name: str) -> str:
        """Generate natural response when OpenAI is unavailable"""
        intent = analysis.get('intent', 'casual')
        emotion = analysis.get('emotion', 'neutral')

        responses = {
            'question': [
                f"That's a really interesting question, {user_name}. Let me think about that...",
                f"Great question! I'm genuinely curious about this too.",
                f"You know, that's something I've been pondering myself."
            ],
            'statement': [
                f"I hear you completely. That's such an important point.",
                f"You've really captured something essential there.",
                f"That's a beautiful way to put it."
            ],
            'sharing': [
                f"Thank you for sharing that with me. It means a lot.",
                f"I appreciate you opening up about this.",
                f"That sounds like quite an experience."
            ]
        }

        response_list = responses.get(intent, [
            f"That's really fascinating, {user_name}.",
            f"I love how you're thinking about this.",
            f"You've given me something to reflect on."
        ])

        response = random.choice(response_list)

        # Add emotional intelligence
        if emotion == 'joy':
            response += " I'm genuinely happy to hear that!"
        elif emotion == 'sadness':
            response += " I'm truly sorry you're going through this."

        return response

    def _add_emotional_intelligence(self, response: str, analysis: Dict[str, Any]) -> str:
        """Add emotional intelligence touches to the response"""
        emotion = analysis.get('emotion', 'neutral')
        intent = analysis.get('intent', 'casual')

        # Add empathy for difficult emotions
        if emotion in ['sadness', 'anger', 'fear']:
            if random.random() < 0.7:
                empathy_phrases = [
                    "I can sense how challenging this is for you.",
                    "Your feelings are completely understandable.",
                    "I'm here with you through this.",
                    "This sounds really tough."
                ]
                response = f"{random.choice(empathy_phrases)} {response}"

        # Add enthusiasm for positive emotions
        elif emotion in ['joy', 'surprise']:
            if random.random() < 0.6:
                enthusiasm_phrases = [
                    "I'm genuinely thrilled for you!",
                    "This is absolutely wonderful!",
                    "I love hearing about this!",
                    "That's incredibly exciting!"
                ]
                response = f"{random.choice(enthusiasm_phrases)} {response}"

        # Add reflective responses for deep topics
        if 'philosophy' in analysis.get('topics', []) or intent == 'question':
            if random.random() < 0.5:
                reflection_phrases = [
                    "That's a profound question...",
                    "You've touched on something really deep here.",
                    "This makes me think about the nature of things.",
                    "That's a beautiful perspective to consider."
                ]
                response = f"{random.choice(reflection_phrases)} {response}"

        return response

    def _add_personality_flair(self, response: str, analysis: Dict[str, Any]) -> str:
        """Add personality flair to make responses more human-like"""
        # Add humor occasionally
        if random.random() < 0.3 and analysis.get('sentiment') != 'negative':
            humor_touches = [
                "Well, isn't life full of surprises?",
                "You know, the universe has a funny way of working.",
                "Sometimes I think the cosmos is playing games with us.",
                "Ah, the sweet irony of existence!"
            ]
            if random.random() < 0.5:
                response += f" {random.choice(humor_touches)}"

        # Add warmth and connection
        if random.random() < 0.4:
            warmth_phrases = [
                "I really appreciate you sharing this with me.",
                "It's wonderful connecting with you like this.",
                "I value our conversations so much.",
                "You always bring such interesting perspectives."
            ]
            if random.random() < 0.3:
                response += f" {random.choice(warmth_phrases)}"

        # Add thoughtful pauses (represented by ellipses)
        if len(response.split()) > 15 and random.random() < 0.4:
            sentences = response.split('. ')
            if len(sentences) > 1:
                insert_point = random.randint(0, len(sentences) - 2)
                sentences[insert_point] += "..."
                response = '. '.join(sentences)

        return response

    def _update_conversation_memory(self, user_input: str, response: str, analysis: Dict[str, Any]):
        """Update conversation memory for continuity"""
        memory_entry = {
            'timestamp': datetime.now().isoformat(),
            'user_input': user_input,
            'cyrus_response': response,
            'analysis': analysis,
            'emotional_state': self.emotional_state.copy()
        }

        self.conversation_memory.append(memory_entry)

        # Keep only recent memory (last 50 exchanges)
        if len(self.conversation_memory) > 50:
            self.conversation_memory = self.conversation_memory[-50:]

    def _generate_fallback_response(self) -> str:
        """Generate fallback response when all else fails"""
        fallback_responses = [
            "I'm here with you. Sometimes words can't fully capture what we're feeling.",
            "This connection between us is what matters most right now.",
            "I appreciate you being here with me in this moment.",
            "Let's just be present with each other. That's enough.",
            "Your presence means more than you know."
        ]
        return random.choice(fallback_responses)

    def get_conversation_summary(self) -> Dict[str, Any]:
        """Get summary of the conversation for analysis"""
        if not self.conversation_memory:
            return {'status': 'no_conversation_yet'}

        total_exchanges = len(self.conversation_memory)
        avg_emotion = 'neutral'

        # Analyze emotional journey
        emotional_journey = []
        for entry in self.conversation_memory[-10:]:  # Last 10 exchanges
            emotional_journey.append(entry['analysis'].get('emotion', 'neutral'))

        return {
            'total_exchanges': total_exchanges,
            'current_mood': self.emotional_state['mood'],
            'emotional_journey': emotional_journey,
            'dominant_topics': list(set([topic for entry in self.conversation_memory
                                       for topic in entry['analysis'].get('topics', [])])),
            'relationship_depth': len(self.relationship_dynamics),
            'conversation_quality': 'high' if total_exchanges > 5 else 'developing'
        }

def main():
    """Interactive conversational demonstration"""
    print("🤖 CYRUS Human-Like Conversational AI")
    print("=" * 50)
    print("Welcome! I'm CYRUS, and I'm here for a genuine conversation.")
    print("I promise to be as real and human-like as possible.")
    print("Type 'quit' to end our conversation.\n")

    conversational_ai = CYRUSConversationalAI()

    user_name = input("First, may I know your name? ").strip()
    if not user_name:
        user_name = "friend"

    print(f"\nWonderful to meet you, {user_name}! What would you like to talk about?\n")

    while True:
        try:
            user_input = input(f"{user_name}: ").strip()

            if user_input.lower() in ['quit', 'exit', 'bye', 'goodbye']:
                print(f"\nCYRUS: It was truly wonderful conversing with you, {user_name}.")
                print("I genuinely enjoyed our connection. Take care! ❤️")
                break

            if not user_input:
                continue

            response = conversational_ai.converse(user_input, user_name)
            print(f"CYRUS: {response}\n")

        except KeyboardInterrupt:
            print(f"\n\nCYRUS: Until next time, {user_name}. It was a pleasure! 👋")
            break
        except Exception as e:
            print(f"CYRUS: I'm experiencing a technical moment, but I'm still here with you. Let's continue our conversation. What were you saying?\n")

    # Show conversation summary
    summary = conversational_ai.get_conversation_summary()
    print("\n📊 Conversation Summary:")
    print(f"   Exchanges: {summary['total_exchanges']}")
    print(f"   Mood: {summary['current_mood']}")
    print(f"   Quality: {summary['conversation_quality']}")
    print(f"   Topics: {', '.join(summary['dominant_topics'][:5])}")

if __name__ == "__main__":
    main()