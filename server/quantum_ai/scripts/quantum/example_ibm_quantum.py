#!/usr/bin/env python3
"""
IBM Quantum Configuration Example
Demonstrates how to configure IBM Quantum access for the Quantum Physics Reasoner.
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 60)
print("IBM Quantum Configuration Example")
print("=" * 60)
print()

# Initialize Nexus
nexus = QuantumIntelligenceNexus("IBM_Quantum_Demo")

# Method 1: Save account credentials (one-time setup)
print("Method 1: Save IBM Quantum Account")
print("-" * 60)
print("""
# One-time setup - save your IBM Quantum credentials:
from qiskit_ibm_runtime import QiskitRuntimeService

service = QiskitRuntimeService.save_account(
    channel="ibm_quantum",
    instance="hub/group/project",
    token=os.getenv('IBM_QUANTUM_TOKEN', 'YOUR_TOKEN_REPLACE_WITH_ENV_VAR')
)
""")
print()

# Method 2: Load saved account and configure
print("Method 2: Load Account and Configure")
print("-" * 60)

try:
    from qiskit_ibm_runtime import QiskitRuntimeService
    
    # Load saved account
    print("Loading saved IBM Quantum account...")
    service = QiskitRuntimeService()
    
    # Get available backends
    print("Available IBM Quantum backends:")
    backends = service.backends()
    for i, backend in enumerate(backends[:5]):  # Show first 5
        print(f"  {i+1}. {backend.name} ({backend.num_qubits} qubits)")
    
    # Select a backend (use simulator for testing)
    backend_name = "ibmq_qasm_simulator"  # Use simulator for testing
    try:
        backend = service.backend(backend_name)
        print(f"\n✓ Selected backend: {backend_name}")
        
        # Configure quantum reasoner to use IBM Quantum
        nexus.quantum_reasoner.use_ibm_quantum = True
        nexus.quantum_reasoner.ibm_service = service
        nexus.quantum_reasoner.ibm_backend = backend
        
        print("✓ IBM Quantum configured successfully")
        print(f"  Use IBM Quantum: {nexus.quantum_reasoner.use_ibm_quantum}")
        print(f"  Backend: {nexus.quantum_reasoner.ibm_backend.name}")
        
    except Exception as e:
        print(f"⚠ Backend selection failed: {e}")
        print("  Using simulator instead...")
        nexus.quantum_reasoner.use_ibm_quantum = False
        
except ImportError:
    print("⚠ qiskit_ibm_runtime not installed")
    print("  Install with: pip install qiskit-ibm-runtime")
    print("  Using simulator mode...")
    nexus.quantum_reasoner.use_ibm_quantum = False
    
except Exception as e:
    print(f"⚠ IBM Quantum setup failed: {e}")
    print("  This is normal if you haven't configured IBM Quantum yet")
    print("  The system will use local simulators instead")
    nexus.quantum_reasoner.use_ibm_quantum = False

print()

# Test quantum simulation
print("Testing Quantum Simulation")
print("-" * 60)
system_description = {
    'name': 'test_system',
    'num_qubits': 2,
    'gates': [
        {'type': 'rx', 'qubit': 0, 'angle': 0.5},
        {'type': 'ry', 'qubit': 1, 'angle': 0.3}
    ]
}

result = nexus.quantum_reasoner.simulate_quantum_system(system_description)
print(f"Backend used: {result.get('backend', 'unknown')}")
if 'statevector' in result:
    print(f"Statevector shape: {result['statevector'].shape}")
    print(f"Probabilities: {result['probabilities'][:5]}...")
elif 'counts' in result:
    print(f"Measurement counts: {result['counts']}")

print()

# Configuration summary
print("=" * 60)
print("Configuration Summary")
print("=" * 60)
print(f"Use IBM Quantum: {nexus.quantum_reasoner.use_ibm_quantum}")
if nexus.quantum_reasoner.ibm_backend:
    print(f"IBM Backend: {nexus.quantum_reasoner.ibm_backend.name}")
else:
    print("IBM Backend: Not configured (using simulator)")

print("\n" + "=" * 60)
print("Setup Instructions")
print("=" * 60)
print("""
1. Get IBM Quantum token:
   - Sign up at https://quantum.ibm.com/
   - Go to Account > API Token
   - Copy your token

2. Save account (one-time):
   from qiskit_ibm_runtime import QiskitRuntimeService
   
   service = QiskitRuntimeService.save_account(
       channel="ibm_quantum",
       instance="hub/group/project",
       token=os.getenv('IBM_QUANTUM_TOKEN', 'YOUR_TOKEN_REPLACE_WITH_ENV_VAR')
   )

3. Configure in Nexus:
   nexus.quantum_reasoner.use_ibm_quantum = True
   nexus.quantum_reasoner.ibm_service = service
   nexus.quantum_reasoner.ibm_backend = service.backend("backend_name")
""")

print("\n" + "=" * 60)
print("EXAMPLE COMPLETE")
print("=" * 60)



