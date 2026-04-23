#!/usr/bin/env python3
"""
Basic Usage Example for Quantum Intelligence Nexus
Simple demonstration of the core workflow
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 80)
print("Quantum Intelligence Nexus - Basic Usage Example")
print("=" * 80)
print()

# Create Nexus
nexus = QuantumIntelligenceNexus("Basic_Example")
print()

# Activate
nexus.activate()
print()

# Process query
print("Processing query...")
response = nexus.process_query("Your query here", enable_quantum=True)
print(f"✓ Query processed successfully")
print()

# Show response summary
if isinstance(response, dict):
    results = response.get('results', {})
    interaction = results.get('interaction', {})
    print(f"Response status: {interaction.get('status', 'processed')}")
    if 'response' in interaction:
        response_text = interaction['response']
        if isinstance(response_text, str) and len(response_text) > 0:
            preview = response_text[:100] + "..." if len(response_text) > 100 else response_text
            print(f"Response preview: {preview}")
print()

# Deactivate
nexus.deactivate()
print()

print("=" * 80)
print("Example Complete")
print("=" * 80)
print()
