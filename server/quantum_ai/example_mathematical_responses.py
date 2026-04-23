"""
Example: Mathematical and Scientific Response Formatting

Demonstrates how to generate responses with mathematical equations,
scientific notation, and different format styles.
"""

import numpy as np
from quantum_ai_core import QuantumAICore, format_response_for_display


def example_scientific_format():
    """Example: Scientific format with equations."""
    print("\n" + "="*80)
    print("EXAMPLE: Scientific Format with Mathematical Equations")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(500, 30)
    
    # Initialize with scientific format
    qai = QuantumAICore(
        response_format='scientific',
        include_equations=True,
        equation_format='latex'
    )
    
    # Process request
    response = qai.process('research', data)
    
    # Display
    print(format_response_for_display(response, show_equations=True))


def example_mathematical_format():
    """Example: Mathematical format emphasizing equations."""
    print("\n" + "="*80)
    print("EXAMPLE: Mathematical Format")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(300, 20)
    
    # Initialize with mathematical format
    qai = QuantumAICore(
        response_format='mathematical',
        include_equations=True,
        equation_format='latex'
    )
    
    # Process request
    response = qai.process('research', data)
    
    # Display
    print(format_response_for_display(response, show_equations=True))


def example_engineering_format():
    """Example: Engineering format."""
    print("\n" + "="*80)
    print("EXAMPLE: Engineering Format")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(400, 25)
    
    # Initialize with engineering format
    qai = QuantumAICore(
        response_format='engineering',
        include_equations=True,
        equation_format='latex'
    )
    
    # Process request
    response = qai.process('research', data)
    
    # Display
    print(format_response_for_display(response, show_equations=True))


def example_svd_with_equations():
    """Example: SVD analysis with mathematical equations."""
    print("\n" + "="*80)
    print("EXAMPLE: SVD with Mathematical Formulation")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(200, 15)
    
    # Initialize
    qai = QuantumAICore(
        response_format='mathematical',
        include_equations=True,
        equation_format='latex'
    )
    
    # Direct SVD with equations
    svd_results = qai.svd.compute_svd(data)
    
    # Get equations
    from core_algorithms.mathematical_formatter import MathematicalFormatter
    math_formatter = MathematicalFormatter()
    equations = math_formatter.generate_algorithm_equations('svd')
    
    print("\nSVD Mathematical Formulation:")
    print("-" * 80)
    for name, eq in equations.items():
        print(f"{name.replace('_', ' ').title()}:")
        print(f"  {eq}")
        print()
    
    print("\nSVD Results:")
    print(f"  Rank: {svd_results['rank']}")
    print(f"  Condition Number: {svd_results['condition_number']:.2e}")
    print(f"  Top 5 Singular Values: {svd_results['singular_values'][:5]}")
    print(f"  Variance Explained (top 5): "
          f"{svd_results['cumulative_variance'][4]:.2%}")


def example_clustering_with_equations():
    """Example: Clustering with k-means equations."""
    print("\n" + "="*80)
    print("EXAMPLE: k-Means Clustering with Mathematical Formulation")
    print("="*80)
    
    # Generate clustered data
    np.random.seed(42)
    cluster1 = np.random.randn(100, 2) + [2, 2]
    cluster2 = np.random.randn(100, 2) + [-2, -2]
    cluster3 = np.random.randn(100, 2) + [2, -2]
    data = np.vstack([cluster1, cluster2, cluster3])
    
    # Initialize
    qai = QuantumAICore(
        response_format='mathematical',
        include_equations=True,
        equation_format='latex'
    )
    
    # Process clustering
    response = qai.process('clustering', data, k=3)
    
    # Display
    print(format_response_for_display(response, show_equations=True))


def example_custom_format_per_request():
    """Example: Custom format per request."""
    print("\n" + "="*80)
    print("EXAMPLE: Custom Format Per Request")
    print("="*80)
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(300, 20)
    
    # Initialize (default format)
    qai = QuantumAICore()
    
    # Request 1: Scientific format
    print("\n--- Request 1: Scientific Format ---")
    response1 = qai.process('research', data, 
                           response_format='scientific',
                           include_equations=True)
    print(format_response_for_display(response1, show_equations=True)[:500] + "...")
    
    # Request 2: Mathematical format
    print("\n--- Request 2: Mathematical Format ---")
    response2 = qai.process('research', data,
                           response_format='mathematical',
                           include_equations=True)
    print(format_response_for_display(response2, show_equations=True)[:500] + "...")
    
    # Request 3: Standard format (no equations)
    print("\n--- Request 3: Standard Format (No Equations) ---")
    response3 = qai.process('research', data,
                           response_format='standard',
                           include_equations=False)
    print(format_response_for_display(response3, show_equations=False)[:500] + "...")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("QUANTUM AI CORE - MATHEMATICAL RESPONSE EXAMPLES")
    print("="*80)
    
    # Run examples
    example_scientific_format()
    example_mathematical_format()
    example_engineering_format()
    example_svd_with_equations()
    example_clustering_with_equations()
    example_custom_format_per_request()
    
    print("\n" + "="*80)
    print("All mathematical examples completed!")
    print("="*80)

