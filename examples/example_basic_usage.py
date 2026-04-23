#!/usr/bin/env python3
"""
Quantum Intelligence Nexus - Complete Usage Example
Demonstrates the full lifecycle of the Nexus
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 80)
print("Quantum Intelligence Nexus - Complete Example")
print("=" * 80)
print()

# Create machine
print("1. Creating Nexus...")
nexus = QuantumIntelligenceNexus("Example_Nexus")
print("✓ Nexus created")
print()

# Activate
print("2. Activating Nexus...")
nexus.activate()
print("✓ Nexus activated")
print()

# Process query
print("3. Processing query...")
print("   Query: 'What are the applications of quantum computing?'")
print()

# Process query with quantum processing enabled
response = nexus.process_query(
    "What are the applications of quantum computing?",
    enable_quantum=True
)

print("✓ Query processed")
print()

# Extract response
if isinstance(response, dict):
    # Try different response structures
    response_text = (
        response.get('results', {}).get('interaction', {}).get('response') or
        response.get('response') or
        response.get('interaction', {}).get('response') or
        str(response)
    )
else:
    response_text = str(response)

print(f"Response: {response_text[:200]}..." if len(str(response_text)) > 200 else f"Response: {response_text}")
print()

# Introspect
print("4. System Status:")
print("-" * 80)
status = nexus.introspect()
print(f"  Machine: {status.get('machine_name', 'N/A')}")
print(f"  Status: {status.get('status', 'N/A')}")
print(f"  Total Operations: {status.get('total_operations', 0)}")
print()

# Show engine status
if 'engines' in status:
    print("  Engines:")
    for engine_name, engine_status in status['engines'].items():
        print(f"    - {engine_name}: {engine_status}")
print()

# Deactivate
print("5. Deactivating Nexus...")
nexus.deactivate()
print("✓ Nexus deactivated")
print()

print("=" * 80)
print("EXAMPLE COMPLETE")
print("=" * 80)
print()

