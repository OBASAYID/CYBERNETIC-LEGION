#!/usr/bin/env python3
"""
Quantum Chemistry Engine - Complete Example
Demonstrates molecular system creation, Hamiltonian generation, VQE optimization,
and property prediction through the Quantum Intelligence Nexus
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 80)
print("Quantum Chemistry Engine - Complete Example")
print("=" * 80)
print()

# Create Nexus
print("1. Creating Quantum Intelligence Nexus...")
nexus = QuantumIntelligenceNexus("Chemistry_Example")
print("✓ Nexus created")
print()

# Activate (optional, but recommended for full functionality)
print("2. Activating Nexus...")
nexus.activate()
print("✓ Nexus activated")
print()

# Create H2O molecule
print("3. Creating H2O molecule...")
print("-" * 80)
try:
    molecule = nexus.chemistry_engine.create_molecular_system(
        "H2O",
        atoms=[
            {'atomic_number': 8},  # Oxygen
            {'atomic_number': 1},  # Hydrogen 1
            {'atomic_number': 1}   # Hydrogen 2
        ],
        bonds=[(0, 1), (0, 2)]  # O-H bonds
    )
    
    print(f"✓ Molecule: {molecule.get('name', 'H2O')}")
    print(f"  Electrons: {molecule.get('num_electrons', 'N/A')}")
    print(f"  Required Qubits: {molecule.get('num_qubits', 'N/A')}")
    print(f"  Atoms: {len(molecule.get('atoms', []))}")
    print(f"  Bonds: {len(molecule.get('bonds', []))}")
except Exception as e:
    print(f"⚠ Error creating molecule: {e}")
    molecule = None
print()

# Generate Hamiltonian
print("4. Generating Hamiltonian...")
print("-" * 80)
try:
    hamiltonian = nexus.chemistry_engine.generate_molecular_hamiltonian("H2O")
    
    print(f"✓ One-body terms: {len(hamiltonian.get('one_body_terms', []))}")
    print(f"  Two-body terms: {len(hamiltonian.get('two_body_terms', []))}")
    print(f"  Total terms: {len(hamiltonian.get('one_body_terms', [])) + len(hamiltonian.get('two_body_terms', []))}")
    
    if hamiltonian.get('one_body_terms'):
        print(f"  Sample one-body term: {hamiltonian['one_body_terms'][0]}")
    if hamiltonian.get('two_body_terms'):
        print(f"  Sample two-body term: {hamiltonian['two_body_terms'][0]}")
except Exception as e:
    print(f"⚠ Error generating Hamiltonian: {e}")
    hamiltonian = None
print()

# VQE optimization
print("5. Running VQE (Variational Quantum Eigensolver)...")
print("-" * 80)
try:
    vqe_result = nexus.chemistry_engine.vqe_optimize("H2O", max_iterations=20)
    
    print(f"✓ Ground state energy: {vqe_result.get('ground_state_energy', 'N/A')}")
    print(f"  Optimization iterations: {vqe_result.get('iterations', 'N/A')}")
    print(f"  Converged: {vqe_result.get('converged', 'N/A')}")
    
    if 'optimization_history' in vqe_result:
        history = vqe_result['optimization_history']
        if history:
            print(f"  Initial energy: {history[0]:.6f}")
            print(f"  Final energy: {history[-1]:.6f}")
except Exception as e:
    print(f"⚠ Error running VQE: {e}")
    vqe_result = None
print()

# Predict properties
print("6. Predicting molecular properties...")
print("-" * 80)
try:
    properties = nexus.chemistry_engine.predict_molecular_properties("H2O")
    
    print(f"✓ Dipole moment: {properties.get('dipole_moment', 0):.4f} D")
    print(f"  Ionization energy: {properties.get('ionization_energy', 0):.4f} eV")
    print(f"  Electron affinity: {properties.get('electron_affinity', 0):.4f} eV")
    print(f"  HOMO-LUMO gap: {properties.get('homo_lumo_gap', 0):.4f} eV")
    
    if 'molecular_orbitals' in properties:
        print(f"  Molecular orbitals: {len(properties['molecular_orbitals'])}")
except Exception as e:
    print(f"⚠ Error predicting properties: {e}")
    properties = None
print()

# Additional: Quantum Phase Estimation
print("7. Quantum Phase Estimation (QPE)...")
print("-" * 80)
try:
    qpe_result = nexus.chemistry_engine.quantum_phase_estimation(
        "H2O",
        num_counting_qubits=5
    )
    
    print(f"✓ Phase estimate: {qpe_result.get('phase_estimate', 'N/A')}")
    print(f"  Energy estimate: {qpe_result.get('energy_estimate', 'N/A')}")
    print(f"  Counting qubits: {qpe_result.get('num_counting_qubits', 'N/A')}")
    if 'circuit_depth' in qpe_result:
        print(f"  Circuit depth: {qpe_result['circuit_depth']}")
except Exception as e:
    print(f"⚠ Error running QPE: {e}")
    qpe_result = None
print()

# Additional: Reaction pathway simulation
print("8. Simulating reaction pathway...")
print("-" * 80)
try:
    reaction_result = nexus.chemistry_engine.simulate_reaction_pathway(
        reactants=["H2O"],
        products=["H+", "OH-"],
        num_steps=5
    )
    
    print(f"✓ Reaction steps: {len(reaction_result.get('pathway', []))}")
    print(f"  Activation energy: {reaction_result.get('activation_energy', 'N/A')}")
    print(f"  Reaction energy: {reaction_result.get('reaction_energy', 'N/A')}")
except Exception as e:
    print(f"⚠ Error simulating reaction: {e}")
    reaction_result = None
print()

# System status
print("9. System Status:")
print("-" * 80)
status = nexus.introspect()
print(f"  Machine: {status.get('machine_name', 'N/A')}")
print(f"  Status: {status.get('status', 'N/A')}")
print(f"  Total Operations: {status.get('total_operations', 0)}")
print()

# Deactivate
print("10. Deactivating Nexus...")
nexus.deactivate()
print("✓ Nexus deactivated")
print()

print("=" * 80)
print("QUANTUM CHEMISTRY EXAMPLE COMPLETE")
print("=" * 80)
print()

