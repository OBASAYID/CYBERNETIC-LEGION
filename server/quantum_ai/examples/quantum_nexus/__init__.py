"""
Examples Package for Quantum Intelligence Nexus v2.0
Comprehensive examples demonstrating all module capabilities.
"""

import os
from pathlib import Path

# Get all example files
_examples_dir = Path(__file__).parent
_example_files = [f.name for f in _examples_dir.glob("*.py") if f.name != "__init__.py"]

def list_examples():
    """List all available example files."""
    return sorted(_example_files)

def get_example_path(example_name: str) -> str:
    """Get full path to an example file."""
    if not example_name.endswith('.py'):
        example_name += '.py'
    return str(_examples_dir / example_name)

def get_all_examples() -> dict:
    """Get all examples as a dictionary mapping name to path."""
    return {name: get_example_path(name) for name in _example_files}

# Available examples
__all__ = ['list_examples', 'get_example_path', 'get_all_examples']

# Example descriptions
EXAMPLE_DESCRIPTIONS = {
    'example_module_imports.py': 'Direct module imports and basic usage patterns',
    'example_explainability.py': 'SHAP, LIME, feature importance, fairness, bias mitigation',
    'example_advanced_features.py': 'All v2.0 advanced features demonstration',
    'example_basic_usage.py': 'Basic Quantum Intelligence Nexus usage',
    'example_superhuman_interaction.py': 'Superhuman interaction features',
    'quantum_ai_core_example.py': 'Quantum AI Core integration examples',
    'visualization_example.py': 'Visualization capabilities',
    'explainability_example.py': 'Explainability features',
    'preprocessing_example.py': 'Data preprocessing examples',
}

def get_example_info():
    """Get information about all examples."""
    return {
        'total_examples': len(_example_files),
        'examples': _example_files,
        'descriptions': EXAMPLE_DESCRIPTIONS
    }



