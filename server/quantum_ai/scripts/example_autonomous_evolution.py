#!/usr/bin/env python3
"""
Autonomous Evolution - Complete Example
Demonstrates the self-evolving kernel's autonomous learning capabilities
through the Quantum Intelligence Nexus
"""

import sys
import os
import time
import json

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 80)
print("Autonomous Evolution - Complete Example")
print("=" * 80)
print()

# Create Nexus
print("1. Creating Quantum Intelligence Nexus...")
nexus = QuantumIntelligenceNexus("Evolution_Example")
print("✓ Nexus created")
print()

# Activate
print("2. Activating Nexus...")
nexus.activate()
print("✓ Nexus activated")
print()

# Check initial state
print("3. Initial Evolution State:")
print("-" * 80)
initial_introspection = nexus.evolution_core.introspect()
print(f"  Algorithms: {initial_introspection.get('capabilities', {}).get('algorithms', 'N/A')}")
print(f"  Knowledge nodes: {initial_introspection.get('capabilities', {}).get('knowledge_nodes', 'N/A')}")
print(f"  Evolution cycles: {initial_introspection.get('capabilities', {}).get('evolution_cycles', 'N/A')}")
print()

# Start autonomous evolution
print("4. Starting Autonomous Evolution...")
print("-" * 80)
print("   The evolution core will now:")
print("   - Run continuous evolution cycles")
print("   - Generate algorithm mutations")
print("   - Build knowledge graph")
print("   - Self-improve autonomously")
print("-" * 80)
print()

try:
    nexus.evolution_core.start_autonomous_learning()
    print("✓ Autonomous learning started")
    print()
    
    # Let it run
    print("5. Running Autonomous Evolution...")
    print("-" * 80)
    print("   Evolution running for 30 seconds...")
    print("   (This will run in the background)")
    print()
    
    start_time = time.time()
    last_cycle_count = initial_introspection.get('capabilities', {}).get('evolution_cycles', 0)
    
    # Run for 30 seconds
    time.sleep(30)
    elapsed = time.time() - start_time
    
    print(f"✓ Evolution ran for {elapsed:.1f} seconds")
    print()
    
    # Introspect evolution
    print("6. Evolution Status After Autonomous Learning:")
    print("-" * 80)
    introspection = nexus.evolution_core.introspect()
    
    capabilities = introspection.get('capabilities', {})
    print(f"  Algorithms: {capabilities.get('algorithms', 'N/A')}")
    print(f"  Knowledge nodes: {capabilities.get('knowledge_nodes', 'N/A')}")
    print(f"  Evolution cycles: {capabilities.get('evolution_cycles', 'N/A')}")
    print()
    
    # Show evolution history
    if 'evolution_history' in introspection:
        history = introspection['evolution_history']
        if history:
            print("  Recent Evolution History:")
            for i, cycle in enumerate(history[-5:]):  # Last 5 cycles
                mutations_gen = cycle.get('mutations_generated', 0)
                mutations_succ = cycle.get('mutations_successful', 0)
                timestamp = cycle.get('timestamp', 'N/A')
                print(f"    Cycle {i+1}: {mutations_gen} mutations generated, "
                      f"{mutations_succ} successful ({timestamp[:19] if len(str(timestamp)) > 19 else timestamp})")
    print()
    
    # Show knowledge graph summary
    if 'knowledge_graph' in introspection:
        kg = introspection['knowledge_graph']
        print(f"  Knowledge Graph:")
        print(f"    Total nodes: {len(kg) if isinstance(kg, dict) else 'N/A'}")
        if isinstance(kg, dict) and kg:
            print(f"    Sample nodes: {list(kg.keys())[:5]}")
    print()
    
    # Show algorithm library
    if 'algorithm_library' in introspection:
        algo_lib = introspection['algorithm_library']
        print(f"  Algorithm Library:")
        print(f"    Total algorithms: {len(algo_lib) if isinstance(algo_lib, dict) else 'N/A'}")
        if isinstance(algo_lib, dict) and algo_lib:
            print(f"    Algorithm names: {list(algo_lib.keys())[:10]}")
    print()
    
    # Stop autonomous evolution
    print("7. Stopping Autonomous Evolution...")
    print("-" * 80)
    nexus.evolution_core.stop_autonomous_learning()
    print("✓ Autonomous learning stopped")
    print()
    
except Exception as e:
    print(f"⚠ Error during autonomous evolution: {e}")
    import traceback
    traceback.print_exc()
    # Make sure to stop if there was an error
    try:
        nexus.evolution_core.stop_autonomous_learning()
    except:
        pass
print()

# System status
print("8. Final System Status:")
print("-" * 80)
status = nexus.introspect()
print(f"  Machine: {status.get('machine_name', 'N/A')}")
print(f"  Status: {status.get('status', 'N/A')}")
print(f"  Total Operations: {status.get('total_operations', 0)}")
print()

# Deactivate
print("9. Deactivating Nexus...")
nexus.deactivate()
print("✓ Nexus deactivated")
print()

print("=" * 80)
print("AUTONOMOUS EVOLUTION EXAMPLE COMPLETE")
print("=" * 80)
print()

