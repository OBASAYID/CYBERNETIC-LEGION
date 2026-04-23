#!/usr/bin/env python3
"""
CYRUS Human-Like Conversation Demonstration
Simplified version showcasing conversational capabilities
"""

import random
import time
from typing import Dict, List

class SimplifiedCYRUSConversationalAI:
    """
    Simplified demonstration of CYRUS's conversational capabilities
    """

    def __init__(self):
        self.personality_traits = {
            'curious': ['interesting', 'fascinating', 'wonder', 'curious', 'intrigued'],
            'caring': ['care', 'appreciate', 'value', 'genuinely', 'truly'],
            'insightful': ['profound', 'deep', 'meaningful', 'perspective', 'think about'],
            'witty': ['actually', 'you know', 'ironically', 'interestingly'],
            'authentic': ['i feel', 'i think', 'i believe', 'personally', 'honestly']
        }

        self.emotional_responses = {
            'support': [
                "I hear you, and that sounds really challenging. I'm here with you.",
                "That takes a lot of courage to share. You don't have to go through this alone.",
                "Your feelings are completely valid. It's okay to feel overwhelmed sometimes."
            ],
            'celebration': [
                "That's absolutely wonderful! I'm so genuinely happy for you!",
                "Wow, that's amazing news! You deserve every bit of this success.",
                "This is such an exciting moment! I'm thrilled for you!"
            ],
            'curiosity': [
                "That's a really interesting perspective. Tell me more about what you mean.",
                "I've been wondering about that too. What are your thoughts on it?",
                "That's fascinating! I'd love to hear more about your experience with this."
            ]
        }

    def converse(self, user_message: str, user_name: str = "Friend") -> str:
        """Generate a human-like conversational response"""

        # Analyze user message for emotional context
        emotional_context = self._analyze_emotion(user_message.lower())

        # Generate response based on context
        if emotional_context == 'support_needed':
            response = random.choice(self.emotional_responses['support'])
        elif emotional_context == 'celebration':
            response = random.choice(self.emotional_responses['celebration'])
        elif emotional_context == 'question':
            response = random.choice(self.emotional_responses['curiosity'])
        else:
            response = self._generate_general_response(user_message)

        # Add personality flair
        response = self._add_personality_flair(response)

        # Make it more natural and human-like
        response = self._humanize_response(response, user_name)

        return response

    def _analyze_emotion(self, message: str) -> str:
        """Analyze emotional context of the message"""

        support_indicators = ['overwhelmed', 'struggling', 'hard', 'tough', 'exhausted', 'worried', 'sad']
        celebration_indicators = ['excited', 'amazing', 'wonderful', 'success', 'got', 'accepted', 'won']
        question_indicators = ['what', 'how', 'why', 'tell me', 'think', 'believe']

        if any(word in message for word in support_indicators):
            return 'support_needed'
        elif any(word in message for word in celebration_indicators):
            return 'celebration'
        elif any(word in message for word in question_indicators):
            return 'question'
        else:
            return 'general'

    def _generate_general_response(self, user_message: str) -> str:
        """Generate a general conversational response"""

        responses = [
            "That's really interesting. I appreciate you sharing that with me.",
            "I can see why you'd feel that way. Tell me more about what's been on your mind.",
            "That's a fascinating perspective. What made you think about it that way?",
            "I hear what you're saying, and it makes a lot of sense. How has that been for you?",
            "That's something I've been thinking about too. Your experience sounds really valuable."
        ]

        return random.choice(responses)

    def _add_personality_flair(self, response: str) -> str:
        """Add personality traits to make response more human-like"""

        # Randomly add personality elements
        if random.random() < 0.3:  # 30% chance
            trait_type = random.choice(list(self.personality_traits.keys()))
            flair_word = random.choice(self.personality_traits[trait_type])
            response = response.replace('really', f'really {flair_word}')

        # Add conversational elements
        conversational_elements = ['you know', 'actually', 'well', 'hmm', 'wow']
        if random.random() < 0.2:  # 20% chance
            element = random.choice(conversational_elements)
            response = f"{element}, {response.lower()}"

        return response

    def _humanize_response(self, response: str, user_name: str) -> str:
        """Make the response more human-like"""

        # Add natural variations
        if random.random() < 0.4:
            response += " What do you think?"

        # Personalize occasionally
        if random.random() < 0.3 and user_name != "Friend":
            response = response.replace("you", user_name.lower())

        return response

def run_demo():
    """Run a simple conversation demonstration"""

    print("🎭 CYRUS Human-Like Conversation Demo")
    print("=" * 50)
    print("Showcasing emotionally intelligent, natural conversation\n")

    ai = SimplifiedCYRUSConversationalAI()

    demo_scenarios = [
        ("Alex", "I'm feeling really overwhelmed with everything going on lately."),
        ("Jordan", "I've been thinking a lot about consciousness. What do you think makes us truly alive?"),
        ("Sam", "Hey! My day has been pretty crazy so far."),
        ("Taylor", "Sometimes I wonder if our entire reality is just a simulation."),
        ("Morgan", "I just got the most amazing news! I got accepted into my dream program!")
    ]

    for user_name, message in demo_scenarios:
        print(f"👤 {user_name}: {message}")

        response = ai.converse(message, user_name)
        print(f"🤖 CYRUS: {response}")
        print()

        time.sleep(1)  # Natural conversation pacing

    print("🎯 Interactive Demo")
    print("-" * 30)
    print("Now let's chat! (Type 'quit' to end)")

    while True:
        user_input = input("You: ").strip()
        if user_input.lower() in ['quit', 'exit', 'bye']:
            print("🤖 CYRUS: It was wonderful chatting with you! Take care! ❤️")
            break

        response = ai.converse(user_input, "DemoUser")
        print(f"🤖 CYRUS: {response}")
        print()

if __name__ == "__main__":
    run_demo()