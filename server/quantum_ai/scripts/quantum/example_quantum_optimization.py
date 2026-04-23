#!/usr/bin/env python3
"""
Quantum Optimization Engine - Complete Example
Demonstrates QAOA, Grover's search, adiabatic optimization, constraint satisfaction,
and portfolio optimization through the Quantum Intelligence Nexus
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 80)
print("Quantum Optimization Engine - Complete Example")
print("=" * 80)
print()

# Create Nexus
print("1. Creating Quantum Intelligence Nexus...")
nexus = QuantumIntelligenceNexus("Optimization_Example")
print("✓ Nexus created")
print()

# Activate (optional, but recommended for full functionality)
print("2. Activating Nexus...")
nexus.activate()
print("✓ Nexus activated")
print()

# QAOA Optimization
print("3. Running QAOA (Quantum Approximate Optimization Algorithm)...")
print("-" * 80)
try:
    problem = {
        'num_variables': 5,
        'known_optimum': 10
    }
    qaoa_result = nexus.optimization_engine.qaoa_optimize(
        problem,
        num_layers=2,
        max_iterations=20
    )
    
    print(f"✓ Best value: {qaoa_result.get('best_value', 'N/A'):.4f}")
    print(f"  Optimal solution: {qaoa_result.get('optimal_solution', 'N/A')}")
    print(f"  Convergence: {qaoa_result.get('converged', 'N/A')}")
    print(f"  Iterations: {qaoa_result.get('iterations', 'N/A')}")
    
    if 'optimization_history' in qaoa_result:
        history = qaoa_result['optimization_history']
        if history:
            print(f"  Initial value: {history[0]:.4f}")
            print(f"  Final value: {history[-1]:.4f}")
except Exception as e:
    print(f"⚠ Error running QAOA: {e}")
    qaoa_result = None
print()

# Grover's Search
print("4. Running Grover's Search Algorithm...")
print("-" * 80)
try:
    def oracle_fn(x):
        """Oracle function that marks the target value."""
        return x == 42
    
    grover_result = nexus.optimization_engine.grovers_search(
        search_space_size=256,
        oracle_fn=oracle_fn,
        num_marked_items=1
    )
    
    speedup = grover_result.get('speedup', 'N/A')
    if isinstance(speedup, (int, float)):
        print(f"✓ Speedup: {speedup:.2f}x")
    else:
        print(f"✓ Speedup: {speedup}")
    print(f"  Solution index: {grover_result.get('solution_index', 'N/A')}")
    print(f"  Success probability: {grover_result.get('success_probability', 'N/A'):.4f}" if isinstance(grover_result.get('success_probability'), (int, float)) else f"  Success probability: {grover_result.get('success_probability', 'N/A')}")
    print(f"  Classical iterations: {grover_result.get('classical_iterations', 'N/A')}")
    print(f"  Quantum iterations: {grover_result.get('quantum_iterations', 'N/A')}")
except Exception as e:
    print(f"⚠ Error running Grover's search: {e}")
    grover_result = None
print()

# Adiabatic Optimization
print("5. Running Adiabatic Quantum Optimization...")
print("-" * 80)
try:
    import numpy as np
    
    # Create simple Ising Hamiltonians
    num_qubits = 4
    initial_hamiltonian = np.eye(2**num_qubits)  # Identity (transverse field)
    final_hamiltonian = np.random.randn(2**num_qubits, 2**num_qubits)
    final_hamiltonian = (final_hamiltonian + final_hamiltonian.T) / 2  # Make symmetric
    
    adiabatic_result = nexus.optimization_engine.adiabatic_optimization(
        initial_hamiltonian=initial_hamiltonian,
        final_hamiltonian=final_hamiltonian,
        evolution_time=5.0,
        num_steps=100
    )
    
    print(f"✓ Ground state energy: {adiabatic_result.get('ground_state_energy', 'N/A'):.4f}")
    print(f"  Ground state: {adiabatic_result.get('ground_state', 'N/A')}")
    print(f"  Evolution time: {adiabatic_result.get('evolution_time', 'N/A')}")
    print(f"  Adiabatic condition satisfied: {adiabatic_result.get('adiabatic_condition', 'N/A')}")
except Exception as e:
    print(f"⚠ Error running adiabatic optimization: {e}")
    adiabatic_result = None
print()

# Constraint Satisfaction Problem
print("6. Solving Constraint Satisfaction Problem (CSP)...")
print("-" * 80)
try:
    constraints = [
        {'type': 'equality', 'variables': [0, 1], 'value': 1},
        {'type': 'inequality', 'variables': [1, 2], 'operator': '<=', 'value': 2}
    ]
    
    csp_result = nexus.optimization_engine.solve_constraint_satisfaction(
        constraints=constraints,
        num_variables=3,
        max_iterations=100
    )
    
    print(f"✓ All constraints satisfied: {csp_result.get('all_satisfied', 'N/A')}")
    print(f"  Solution: {csp_result.get('best_assignment', 'N/A')}")
    print(f"  Constraint satisfaction: {csp_result.get('constraint_satisfaction', 'N/A'):.2%}" if isinstance(csp_result.get('constraint_satisfaction'), (int, float)) else f"  Constraint satisfaction: {csp_result.get('constraint_satisfaction', 'N/A')}")
    print(f"  Satisfied constraints: {csp_result.get('satisfied_constraints', 'N/A')}/{len(constraints)}")
except Exception as e:
    print(f"⚠ Error solving CSP: {e}")
    csp_result = None
print()

# Portfolio Optimization
print("7. Quantum Portfolio Optimization...")
print("-" * 80)
try:
    import numpy as np
    
    assets = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA']
    returns = np.array([0.12, 0.08, 0.15, 0.10, 0.09])
    covariance = np.array([
        [0.04, 0.01, 0.02, 0.01, 0.01],
        [0.01, 0.03, 0.01, 0.01, 0.01],
        [0.02, 0.01, 0.05, 0.02, 0.01],
        [0.01, 0.01, 0.02, 0.03, 0.01],
        [0.01, 0.01, 0.01, 0.01, 0.02]
    ])
    
    portfolio_result = nexus.optimization_engine.quantum_portfolio_optimization(
        assets=assets,
        returns=returns,
        covariance=covariance,
        risk_aversion=0.5
    )
    
    print(f"✓ Optimal portfolio weights: {portfolio_result.get('optimal_weights', 'N/A')}")
    expected_return = portfolio_result.get('expected_return', 'N/A')
    portfolio_risk = portfolio_result.get('portfolio_risk', 'N/A')
    sharpe_ratio = portfolio_result.get('sharpe_ratio', 'N/A')
    
    if isinstance(expected_return, (int, float)):
        print(f"  Expected return: {expected_return:.4f}")
    else:
        print(f"  Expected return: {expected_return}")
    
    if isinstance(portfolio_risk, (int, float)):
        print(f"  Portfolio risk: {portfolio_risk:.4f}")
    else:
        print(f"  Portfolio risk: {portfolio_risk}")
    
    if isinstance(sharpe_ratio, (int, float)):
        print(f"  Sharpe ratio: {sharpe_ratio:.4f}")
    else:
        print(f"  Sharpe ratio: {sharpe_ratio}")
except Exception as e:
    print(f"⚠ Error optimizing portfolio: {e}")
    portfolio_result = None
print()

# System status
print("8. System Status:")
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
print("QUANTUM OPTIMIZATION EXAMPLE COMPLETE")
print("=" * 80)
print()

