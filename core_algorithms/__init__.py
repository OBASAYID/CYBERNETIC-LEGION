"""
Core Algorithms Package - Root convenience wrapper

Provides access to all core algorithm implementations.
"""

import sys
import os

# Add the server path to sys.path for imports
_server_path = os.path.join(os.path.dirname(__file__), '..', 'server')
if _server_path not in sys.path:
    sys.path.insert(0, _server_path)

try:
    from quantum_ai.core_algorithms.high_dimensional import HighDimensionalAnalyzer
    from quantum_ai.core_algorithms.svd_analysis import SVDAnalyzer
    from quantum_ai.core_algorithms.random_walks import RandomWalkAnalyzer
    from quantum_ai.core_algorithms.machine_learning import MLProcessor
    from quantum_ai.core_algorithms.streaming import StreamingAnalyzer
    from quantum_ai.core_algorithms.clustering import ClusteringEngine
    from quantum_ai.core_algorithms.graph_analysis import GraphAnalyzer
    from quantum_ai.core_algorithms.topic_modeling import TopicModelingEngine
    from quantum_ai.core_algorithms.mathematical_formatter import MathematicalFormatter
    from quantum_ai.core_algorithms.writing_style_analyzer import WritingStyleAnalyzer

    __all__ = [
        'HighDimensionalAnalyzer',
        'SVDAnalyzer',
        'RandomWalkAnalyzer',
        'MLProcessor',
        'StreamingAnalyzer',
        'ClusteringEngine',
        'GraphAnalyzer',
        'TopicModelingEngine',
        'MathematicalFormatter',
        'WritingStyleAnalyzer'
    ]

except ImportError as e:
    # Fallback for when quantum_ai is not available
    print(f"Warning: Could not import core algorithms: {e}")
    __all__ = []
