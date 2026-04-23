"""
Quantum AI Core - Convenience import

This allows imports like: from quantum_ai_core import QuantumAICore
"""

import sys
import os

# Add server to path if not already there
server_path = os.path.join(os.path.dirname(__file__), 'server')
if server_path not in sys.path:
    sys.path.insert(0, server_path)

# Import and re-export
from quantum_ai.quantum_ai_core import QuantumAICore

# Try to import format_response_for_display if available
try:
    from quantum_ai.quantum_ai_core import format_response_for_display
    __all__ = ['QuantumAICore', 'format_response_for_display']
except ImportError:
    __all__ = ['QuantumAICore']



