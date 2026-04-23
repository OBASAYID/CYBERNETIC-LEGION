"""
Example: Superhuman Interactive Intelligence Features
Demonstrates emotional awareness, context memory, and multimodal processing
"""

import sys
import os
import numpy as np

# Add server to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

from quantum_ai.quantum_ai_core import QuantumAICore

def example_emotional_awareness():
    """Example 1: Emotional Awareness and Empathetic Responses"""
    print("=" * 80)
    print("EXAMPLE 1: Emotional Awareness")
    print("=" * 80)
    print()
    
    qai = QuantumAICore()
    qai.superhuman_interaction.start_conversation("User", expertise="intermediate")
    
    # User expresses frustration
    print("User: I'm frustrated with the results")
    print()
    
    response = qai.superhuman_interaction.process_user_input(
        "I'm frustrated with the results"
    )
    
    print("Assistant Response:")
    print(f"  {response['response']}")
    print()
    print("Emotion Analysis:")
    print(f"  Label: {response['emotion']['label']}")
    print(f"  Confidence: {response['emotion']['confidence']:.2f}")
    print(f"  Valence: {response['emotion'].get('valence', 0.5):.2f}")
    print(f"  Requires Empathy: {response['emotion'].get('requires_empathy', False)}")
    print()
    
    # Test with positive emotion
    print("User: I'm so excited about this breakthrough!")
    print()
    
    positive_response = qai.superhuman_interaction.process_user_input(
        "I'm so excited about this breakthrough!"
    )
    
    print("Assistant Response:")
    print(f"  {positive_response['response']}")
    print()
    print("Emotion Analysis:")
    print(f"  Label: {positive_response['emotion']['label']}")
    print(f"  Confidence: {positive_response['emotion']['confidence']:.2f}")
    print()


def example_context_memory():
    """Example 2: Context Memory with RAG"""
    print("=" * 80)
    print("EXAMPLE 2: Context Memory (RAG)")
    print("=" * 80)
    print()
    
    qai = QuantumAICore()
    qai.superhuman_interaction.start_conversation("Alice", expertise="advanced")
    
    # Add context to memory
    print("Adding context to memory...")
    qai.superhuman_interaction.add_to_context_memory(
        "user_goal", 
        "optimize_performance",
        ttl=10  # Time to live: 10 interactions
    )
    
    qai.superhuman_interaction.add_to_context_memory(
        "current_project",
        "quantum_ml_research",
        ttl=15
    )
    
    qai.superhuman_interaction.add_to_context_memory(
        "preferred_method",
        "quantum_kernel_svm",
        ttl=10
    )
    
    print("✓ Context stored:")
    print("  - user_goal: optimize_performance (TTL: 10)")
    print("  - current_project: quantum_ml_research (TTL: 15)")
    print("  - preferred_method: quantum_kernel_svm (TTL: 10)")
    print()
    
    # Retrieve context
    print("User: How can I improve my model?")
    print()
    
    response = qai.superhuman_interaction.process_user_input(
        "How can I improve my model?"
    )
    
    print("Assistant Response:")
    print(f"  {response['response']}")
    print()
    print("Context Used:")
    for ctx in response['context_used']:
        print(f"  - {ctx['key']}: {ctx['value']} (relevance: {ctx['relevance']})")
    print()
    
    # Test context retrieval directly
    print("Retrieving context for 'performance'...")
    context = qai.superhuman_interaction.retrieve_context("performance")
    print(f"✓ Retrieved {len(context)} relevant items:")
    for item in context:
        print(f"  - {item['key']}: {item['value']}")
    print()


def example_multimodal():
    """Example 3: Multimodal Input Processing"""
    print("=" * 80)
    print("EXAMPLE 3: Multimodal Processing")
    print("=" * 80)
    print()
    
    qai = QuantumAICore()
    qai.superhuman_interaction.start_conversation("User", expertise="intermediate")
    
    # Text input (standard)
    print("1. Text Input:")
    print("   User: What is machine learning?")
    print()
    
    text_response = qai.superhuman_interaction.process_text_input(
        "What is machine learning?"
    )
    
    print("   Assistant:")
    print(f"   {text_response['response']}")
    print()
    
    # Voice input (requires audio file)
    print("2. Voice Input:")
    print("   Processing audio file: audio.wav")
    print("   (Note: Requires actual audio file for full functionality)")
    print()
    
    # Simulate voice processing
    try:
        # This would work with an actual audio file
        # voice_response = qai.superhuman_interaction.process_voice_input("audio.wav")
        print("   ✓ Voice transcription would happen here")
        print("   ✓ Response generated from transcribed text")
        print()
    except Exception as e:
        print(f"   ⚠ Voice processing requires audio file: {str(e)}")
        print()
    
    # Image input (requires image file)
    print("3. Image Input:")
    print("   Processing image: data.jpg")
    print("   Question: What's in this image?")
    print("   (Note: Requires actual image file for full functionality)")
    print()
    
    # Simulate image processing
    try:
        # This would work with an actual image file
        # image_response = qai.superhuman_interaction.process_image_input(
        #     "data.jpg",
        #     "What's in this image?"
        # )
        print("   ✓ Visual question answering would happen here")
        print("   ✓ Answer generated from image analysis")
        print()
    except Exception as e:
        print(f"   ⚠ Image processing requires image file: {str(e)}")
        print()


def example_conversation_flow():
    """Example: Complete conversation flow with all features"""
    print("=" * 80)
    print("EXAMPLE 4: Complete Conversation Flow")
    print("=" * 80)
    print()
    
    qai = QuantumAICore()
    
    # Start conversation
    qai.superhuman_interaction.start_conversation(
        "Dr. Smith",
        expertise="advanced"
    )
    
    # Set conversation style
    qai.superhuman_interaction.set_conversation_style('professional')
    
    # Add context
    qai.superhuman_interaction.add_to_context_memory(
        "research_focus",
        "quantum machine learning for drug discovery",
        ttl=20
    )
    
    # Conversation turns
    print("Conversation:")
    print()
    
    turns = [
        "Hello, I'm working on quantum ML for drug discovery",
        "What quantum algorithms would you recommend?",
        "I'm concerned about the computational complexity",
        "Can you explain VQE in simple terms?"
    ]
    
    for i, user_input in enumerate(turns, 1):
        print(f"Turn {i}:")
        print(f"  User: {user_input}")
        print()
        
        response = qai.superhuman_interaction.process_user_input(user_input)
        
        print(f"  Assistant: {response['response']}")
        print(f"  Emotion: {response['emotion']['label']}")
        print(f"  Confidence: {response['confidence']:.2f}")
        print()
    
    # Get conversation summary
    summary = qai.superhuman_interaction.get_conversation_summary()
    print("Conversation Summary:")
    print(f"  Total turns: {summary['total_turns']}")
    print(f"  User: {summary['user_name']}")
    print(f"  Style: {summary['conversation_style']}")
    print(f"  Topics discussed: {', '.join(summary['topics_discussed'][:5])}")
    print(f"  Emotional trajectory: {', '.join(summary['emotional_trajectory'])}")
    print()
    
    # Export conversation
    exported = qai.superhuman_interaction.export_conversation(format='markdown')
    print("✓ Conversation exported (first 200 chars):")
    print(exported[:200] + "...")
    print()


def example_active_learning():
    """Example: Active Learning with User Feedback"""
    print("=" * 80)
    print("EXAMPLE 5: Active Learning")
    print("=" * 80)
    print()
    
    qai = QuantumAICore()
    qai.superhuman_interaction.start_conversation("User", expertise="intermediate")
    
    # Generate response
    response = qai.superhuman_interaction.process_user_input(
        "Explain quantum computing"
    )
    
    print("Initial Response:")
    print(f"  {response['response']}")
    print()
    
    # Request feedback
    print("Requesting user feedback...")
    feedback_callback = qai.superhuman_interaction.request_user_feedback(
        response['response'],
        aspect='accuracy'
    )
    
    # Simulate user feedback
    print("User provides feedback:")
    feedback_result = feedback_callback(
        rating=8.5,
        comment="Very helpful, but could use more examples"
    )
    
    print(f"  Rating: {feedback_result['rating']}/10")
    print(f"  Status: {feedback_result['status']}")
    print()
    
    # Feedback is stored in context memory
    context = qai.superhuman_interaction.retrieve_context("feedback")
    print("Feedback stored in context:")
    for item in context:
        print(f"  - {item['key']}: {item['value']}")
    print()


def main():
    """Run all examples"""
    print("\n" + "=" * 80)
    print("QUANTUM AI CORE v3.0 - SUPERHUMAN INTERACTION EXAMPLES")
    print("=" * 80)
    print()
    
    example_emotional_awareness()
    example_context_memory()
    example_multimodal()
    example_conversation_flow()
    example_active_learning()
    
    print("=" * 80)
    print("All examples completed!")
    print("=" * 80)
    print()
    print("Note: Voice and image processing require actual files.")
    print("Text processing and emotion analysis work immediately.")


if __name__ == "__main__":
    main()



