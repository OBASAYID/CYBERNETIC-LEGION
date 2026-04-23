#!/usr/bin/env python3
"""
QAOA Optimization Example via Quantum Intelligence Nexus
Demonstrates quantum optimization capabilities.
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 60)
print("QAOA Optimization Example")
print("=" * 60)
print()

# Initialize Nexus
nexus = QuantumIntelligenceNexus("QAOA_Nexus")

# Run QAOA
print("Running QAOA optimization...")
result = nexus.optimization_engine.qaoa_optimize(
    {'num_variables': 5},
    num_layers=2,
    max_iterations=20
)

print(f"\n✓ QAOA optimization complete")
print(f"Best value: {result['best_value']:.6f}")
print(f"Method: {result.get('method', 'N/A')}")
print(f"Layers: {result.get('num_layers', 'N/A')}")
print(f"Converged: {result.get('converged', False)}")

if 'energy_history' in result and len(result['energy_history']) > 0:
    print(f"\nEnergy History:")
    print(f"  Initial: {result['energy_history'][0]:.6f}")
    print(f"  Final: {result['energy_history'][-1]:.6f}")
    print(f"  Improvement: {result['energy_history'][0] - result['energy_history'][-1]:.6f}")

print("\n" + "=" * 60)
print("EXAMPLE COMPLETE")
print("=" * 60)



