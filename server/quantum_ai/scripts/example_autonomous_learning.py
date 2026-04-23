#!/usr/bin/env python3
"""
Autonomous Learning Example via Quantum Intelligence Nexus
Demonstrates self-evolution and continuous learning.
"""

import sys
import os
import time

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 60)
print("Autonomous Learning Example")
print("=" * 60)
print()

# Initialize Nexus
nexus = QuantumIntelligenceNexus("Autonomous_Learning_Demo")

# Run an evolution cycle to generate algorithms
print("Running initial evolution cycle...")
evolution_result = nexus.evolution_core.evolve()
print(f"  ✓ Mutations generated: {evolution_result.get('mutations_generated', 0)}")
print(f"  ✓ Mutations successful: {evolution_result.get('mutations_successful', 0)}")
print(f"  ✓ Algorithms in library: {len(nexus.evolution_core.algorithm_library)}")

# Start autonomous learning
print("\nStarting autonomous learning...")
nexus.evolution_core.start_autonomous_learning()

# Check initial status
print("\nInitial Status:")
initial_cycles = len(nexus.evolution_core.evolution_history)
initial_algorithms = len(nexus.evolution_core.algorithm_library)
print(f"  Evolution cycles: {initial_cycles}")
print(f"  Algorithms: {initial_algorithms}")

# Let it run for a bit
print("\nRunning autonomous learning for 10 seconds...")
print("(The evolution core will continuously learn and evolve)")
time.sleep(10)

# Check status after learning
print("\nStatus After Learning:")
final_cycles = len(nexus.evolution_core.evolution_history)
final_algorithms = len(nexus.evolution_core.algorithm_library)
print(f"  Evolution cycles: {final_cycles}")
print(f"  Algorithms: {final_algorithms}")
print(f"  New cycles: {final_cycles - initial_cycles}")

# Get introspection
print("\nDetailed Introspection:")
introspection = nexus.evolution_core.introspect()
print(f"  Total evolution cycles: {introspection.get('total_evolution_cycles', 0)}")
print(f"  Total algorithms: {introspection.get('total_algorithms', 0)}")
print(f"  Knowledge graph nodes: {introspection.get('knowledge_graph_nodes', 0)}")
print(f"  Is learning: {introspection.get('is_learning', False)}")

# Show evolution history
if len(nexus.evolution_core.evolution_history) > 0:
    print(f"\nEvolution History (showing all {len(nexus.evolution_core.evolution_history)} cycles):")
    for i, cycle in enumerate(nexus.evolution_core.evolution_history):
        print(f"  Cycle {i+1}:")
        print(f"    Mutations generated: {cycle.get('mutations_generated', 0)}")
        print(f"    Mutations successful: {cycle.get('mutations_successful', 0)}")
        print(f"    New capabilities: {len(cycle.get('new_capabilities', []))}")

# Stop autonomous learning
print("\nStopping autonomous learning...")
nexus.evolution_core.stop_autonomous_learning()

print("\n" + "=" * 60)
print("EXAMPLE COMPLETE")
print("=" * 60)
print()
print("✓ Autonomous learning demonstrated")
print("✓ Evolution cycles tracked")
print("✓ Learning progress monitored")

