"""
Example Usage of Quantum AI Core

This demonstrates how to use the Quantum AI Core for various types of
queries, research, analysis, and processing requests.
"""

import numpy as np
from quantum_ai_core import QuantumAICore, format_response_for_display


def example_high_dimensional_analysis():
    """Example: High-dimensional data analysis."""
    print("\n" + "="*80)
    print("EXAMPLE 1: High-Dimensional Data Analysis")
    print("="*80)
    
    # Generate high-dimensional data
    np.random.seed(42)
    data = np.random.randn(1000, 50)  # 1000 samples, 50 dimensions
    
    # Initialize Quantum AI Core
    qai = QuantumAICore()
    
    # Process the request
    response = qai.process('research', data, n_components=10)
    
    # Display formatted response
    print(format_response_for_display(response))


def example_clustering_analysis():
    """Example: Clustering analysis."""
    print("\n" + "="*80)
    print("EXAMPLE 2: Clustering Analysis")
    print("="*80)
    
    # Generate clustered data
    np.random.seed(42)
    cluster1 = np.random.randn(100, 2) + [2, 2]
    cluster2 = np.random.randn(100, 2) + [-2, -2]
    cluster3 = np.random.randn(100, 2) + [2, -2]
    data = np.vstack([cluster1, cluster2, cluster3])
    
    # Initialize Quantum AI Core
    qai = QuantumAICore()
    
    # Process clustering request
    response = qai.process('clustering', data, k=3)
    
    # Display formatted response
    print(format_response_for_display(response))


def example_topic_modeling():
    """Example: Topic modeling on documents."""
    print("\n" + "="*80)
    print("EXAMPLE 3: Topic Modeling")
    print("="*80)
    
    # Sample documents
    documents = [
        "Machine learning is a subset of artificial intelligence",
        "Deep learning uses neural networks with multiple layers",
        "Data science combines statistics and computer science",
        "Natural language processing analyzes human language",
        "Computer vision processes and understands images",
        "Reinforcement learning learns through trial and error",
        "Supervised learning uses labeled training data",
        "Unsupervised learning finds patterns without labels"
    ]
    
    # Initialize Quantum AI Core
    qai = QuantumAICore()
    
    # Process topic modeling request
    response = qai.process('topic_modeling', documents, n_topics=3)
    
    # Display formatted response
    print(format_response_for_display(response))


def example_streaming_analysis():
    """Example: Streaming data analysis."""
    print("\n" + "="*80)
    print("EXAMPLE 4: Streaming Data Analysis")
    print("="*80)
    
    # Generate streaming data
    np.random.seed(42)
    stream = list(np.random.randint(0, 100, 10000))
    
    # Initialize Quantum AI Core
    qai = QuantumAICore()
    
    # Process streaming request
    response = qai.process('analysis', stream)
    
    # Display formatted response
    print(format_response_for_display(response))


def example_comprehensive_analysis():
    """Example: Comprehensive analysis with multiple modules."""
    print("\n" + "="*80)
    print("EXAMPLE 5: Comprehensive Multi-Module Analysis")
    print("="*80)
    
    # Generate complex data
    np.random.seed(42)
    data = np.random.randn(500, 30)
    
    # Initialize Quantum AI Core
    qai = QuantumAICore()
    
    # Process comprehensive research request
    response = qai.process('research', data, 
                          n_components=5,
                          k=3)
    
    # Display formatted response
    print(format_response_for_display(response))


def example_direct_module_access():
    """Example: Direct access to specific modules."""
    print("\n" + "="*80)
    print("EXAMPLE 6: Direct Module Access")
    print("="*80)
    
    # Initialize Quantum AI Core
    qai = QuantumAICore()
    
    # Generate data
    np.random.seed(42)
    data = np.random.randn(200, 20)
    
    # Direct SVD analysis
    print("\nDirect SVD Analysis:")
    svd_results = qai.svd.compute_svd(data)
    print(f"Rank: {svd_results['rank']}")
    print(f"Top 5 singular values: {svd_results['singular_values'][:5]}")
    print(f"Variance explained by top 5: {svd_results['cumulative_variance'][4]:.2%}")
    
    # Direct clustering
    print("\nDirect Clustering:")
    cluster_results = qai.clustering.kmeans_clustering(data, k=3)
    print(f"Number of clusters: {cluster_results['n_clusters']}")
    print(f"Inertia: {cluster_results['inertia']:.2f}")
    print(f"Silhouette score: {cluster_results['silhouette_score']:.4f}")
    
    # Get processing pathway
    print("\nProcessing Pathway:")
    pathway = qai.get_processing_pathway()
    for i, step in enumerate(pathway[:10], 1):
        print(f"  {i}. [{step.get('module', 'Unknown')}] {step.get('step', '')}")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("QUANTUM AI CORE - EXAMPLE USAGE")
    print("="*80)
    
    # Run examples
    example_high_dimensional_analysis()
    example_clustering_analysis()
    example_topic_modeling()
    example_streaming_analysis()
    example_comprehensive_analysis()
    example_direct_module_access()
    
    print("\n" + "="*80)
    print("All examples completed!")
    print("="*80)

