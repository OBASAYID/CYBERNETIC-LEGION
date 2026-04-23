"""
Quantum Artificial Intelligence Core Algorithms Module
Based on Foundations of Data Science by Blum, Hopcroft, and Kannan

This module provides comprehensive data science and machine learning
capabilities for super-intelligent processing and analysis.
"""

from .high_dimensional import HighDimensionalAnalyzer
from .svd_analysis import SVDAnalyzer
from .random_walks import RandomWalkAnalyzer
from .machine_learning import MLProcessor
from .streaming import StreamingAnalyzer
from .clustering import ClusteringEngine
from .graph_analysis import GraphAnalyzer
from .topic_modeling import TopicModelingEngine
from .mathematical_formatter import MathematicalFormatter
from .writing_style_analyzer import WritingStyleAnalyzer

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

__version__ = '1.0.0'
