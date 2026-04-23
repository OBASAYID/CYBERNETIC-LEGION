"""
Example: Writing Style Analysis and Generation

Demonstrates how the Quantum AI Core adapts responses to different
writing styles: professional, business, and casual.
"""

import numpy as np
from quantum_ai_core import QuantumAICore, format_response_for_display
from core_algorithms.writing_style_analyzer import WritingStyleAnalyzer


def example_professional_style():
    """Example: Professional/academic writing style."""
    print("\n" + "="*80)
    print("EXAMPLE: Professional Writing Style")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(500, 30)
    
    # Initialize with professional style
    qai = QuantumAICore(
        response_format='scientific',
        include_equations=True,
        writing_style='professional'
    )
    
    # Process request
    response = qai.process('research', data)
    
    # Display
    print(format_response_for_display(response, show_equations=True))
    
    # Show style-specific interpretation
    print("\n" + "-"*80)
    print("PROFESSIONAL STYLE INTERPRETATION:")
    print("-"*80)
    print(response['quantum_ai_response']['interpretation'])


def example_business_style():
    """Example: Business/professional writing style."""
    print("\n" + "="*80)
    print("EXAMPLE: Business Writing Style")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(400, 25)
    
    # Initialize with business style
    qai = QuantumAICore(
        response_format='engineering',
        include_equations=True,
        writing_style='business'
    )
    
    # Process request
    response = qai.process('research', data)
    
    # Display
    print(format_response_for_display(response, show_equations=True))
    
    # Show style-specific interpretation
    print("\n" + "-"*80)
    print("BUSINESS STYLE INTERPRETATION:")
    print("-"*80)
    print(response['quantum_ai_response']['interpretation'])


def example_casual_style():
    """Example: Casual/conversational writing style."""
    print("\n" + "="*80)
    print("EXAMPLE: Casual Writing Style")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(300, 20)
    
    # Initialize with casual style
    qai = QuantumAICore(
        response_format='standard',
        include_equations=False,
        writing_style='casual'
    )
    
    # Process request
    response = qai.process('research', data)
    
    # Display
    print(format_response_for_display(response, show_equations=False))
    
    # Show style-specific interpretation
    print("\n" + "-"*80)
    print("CASUAL STYLE INTERPRETATION:")
    print("-"*80)
    print(response['quantum_ai_response']['interpretation'])


def example_style_analysis():
    """Example: Analyze writing style of text."""
    print("\n" + "="*80)
    print("EXAMPLE: Writing Style Analysis")
    print("="*80)
    
    analyzer = WritingStyleAnalyzer()
    
    # Sample texts in different styles
    professional_text = """
    The analysis demonstrates that the implementation of advanced algorithmic
    methodologies yields significant improvements in computational efficiency.
    Furthermore, the results indicate that the proposed approach substantially
    enhances performance metrics. Consequently, we recommend further investigation
    into these methodologies.
    """
    
    business_text = """
    Thank you for your request. We've completed the analysis and found some
    interesting results. The data shows that our approach works well. Please
    review these findings and let us know if you have any questions.
    """
    
    casual_text = """
    Hey! So I ran the analysis and got some cool results. The data looks pretty
    good - it seems like our approach is working. Check it out and let me know
    what you think!
    """
    
    # Analyze each
    print("\n1. Professional Text Analysis:")
    print("-" * 80)
    prof_analysis = analyzer.analyze_writing_style(professional_text)
    print(f"Dominant Style: {prof_analysis['dominant_style']}")
    print(f"Style Scores: {prof_analysis['style_scores']}")
    print(f"Confidence: {prof_analysis['confidence']:.2%}")
    
    print("\n2. Business Text Analysis:")
    print("-" * 80)
    bus_analysis = analyzer.analyze_writing_style(business_text)
    print(f"Dominant Style: {bus_analysis['dominant_style']}")
    print(f"Style Scores: {bus_analysis['style_scores']}")
    print(f"Confidence: {bus_analysis['confidence']:.2%}")
    
    print("\n3. Casual Text Analysis:")
    print("-" * 80)
    cas_analysis = analyzer.analyze_writing_style(casual_text)
    print(f"Dominant Style: {cas_analysis['dominant_style']}")
    print(f"Style Scores: {cas_analysis['style_scores']}")
    print(f"Confidence: {cas_analysis['confidence']:.2%}")


def example_style_adaptation():
    """Example: Adapt text to different styles."""
    print("\n" + "="*80)
    print("EXAMPLE: Style Adaptation")
    print("="*80)
    
    analyzer = WritingStyleAnalyzer()
    
    original_text = "I don't think we can use this approach. It doesn't work well."
    
    print("\nOriginal Text:")
    print(f"  {original_text}")
    
    print("\nAdapted to Professional:")
    print(f"  {analyzer.adapt_text_to_style(original_text, 'professional')}")
    
    print("\nAdapted to Business:")
    print(f"  {analyzer.adapt_text_to_style(original_text, 'business')}")
    
    print("\nAdapted to Casual:")
    print(f"  {analyzer.adapt_text_to_style(original_text, 'casual')}")


def example_per_request_style():
    """Example: Change writing style per request."""
    print("\n" + "="*80)
    print("EXAMPLE: Per-Request Style Control")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(300, 20)
    
    # Initialize (default style)
    qai = QuantumAICore()
    
    # Request 1: Professional
    print("\n--- Request 1: Professional Style ---")
    response1 = qai.process('research', data, writing_style='professional')
    print(response1['quantum_ai_response']['interpretation'][:200] + "...")
    
    # Request 2: Business
    print("\n--- Request 2: Business Style ---")
    response2 = qai.process('research', data, writing_style='business')
    print(response2['quantum_ai_response']['interpretation'][:200] + "...")
    
    # Request 3: Casual
    print("\n--- Request 3: Casual Style ---")
    response3 = qai.process('research', data, writing_style='casual')
    print(response3['quantum_ai_response']['interpretation'][:200] + "...")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("QUANTUM AI CORE - WRITING STYLE EXAMPLES")
    print("="*80)
    
    # Run examples
    example_professional_style()
    example_business_style()
    example_casual_style()
    example_style_analysis()
    example_style_adaptation()
    example_per_request_style()
    
    print("\n" + "="*80)
    print("All writing style examples completed!")
    print("="*80)

