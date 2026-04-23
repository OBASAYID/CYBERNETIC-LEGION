#!/usr/bin/env python3
"""
Scaled Quantum Intelligence Nexus Runner
Uses Ray for distributed processing across multiple nodes/CPUs
"""

import sys
import os
import time

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

try:
    import ray
    RAY_AVAILABLE = True
except ImportError:
    RAY_AVAILABLE = False
    print("Warning: Ray not available. Install with: pip install ray")

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus
from quantum_ai.core_algorithms.parallel_acceleration import ParallelAccelerationEngine

def check_ray_connection():
    """Check if Ray is running."""
    if not RAY_AVAILABLE:
        return False
    
    try:
        if not ray.is_initialized():
            print("Ray not initialized. Connecting to existing cluster...")
            ray.init(address='auto', ignore_reinit_error=True)
        return True
    except Exception as e:
        print(f"Failed to connect to Ray: {e}")
        return False

def main():
    print("=" * 60)
    print("Scaled Quantum Intelligence Nexus")
    print("=" * 60)
    print()
    
    # Check Ray connection
    if not check_ray_connection():
        print("Error: Ray cluster not available.")
        print("Start Ray with: ray start --head --num-cpus 8")
        sys.exit(1)
    
    print("✓ Connected to Ray cluster")
    print(f"  Ray nodes: {len(ray.nodes())}")
    print(f"  Available CPUs: {ray.cluster_resources().get('CPU', 0)}")
    print()
    
    # Initialize Nexus
    print("Initializing Quantum Intelligence Nexus...")
    nexus = QuantumIntelligenceNexus("ScaledNexus")
    
    # Configure for Ray
    print("Configuring parallel engine for Ray...")
    nexus.parallel_engine = ParallelAccelerationEngine(
        backend='ray',
        num_workers=8  # Use 8 workers
    )
    print(f"  Backend: {nexus.parallel_engine.backend}")
    print(f"  Workers: {nexus.parallel_engine.num_workers}")
    print()
    
    # Activate Nexus
    print("Activating Nexus...")
    nexus.activate()
    print("✓ Nexus activated")
    print()
    
    # Run scaled operations
    print("=" * 60)
    print("Running Scaled Operations")
    print("=" * 60)
    print()
    
    # Example 1: Parallel quantum simulations
    print("1. Parallel Quantum Simulations")
    print("-" * 60)
    
    def simulate_quantum_system(system_config):
        """Simulate a quantum system."""
        return nexus.quantum_reasoner.simulate_quantum_system(system_config)
    
    # Create multiple system configurations
    systems = [
        {'name': f'system_{i}', 'num_qubits': 2, 'gates': []}
        for i in range(10)
    ]
    
    print(f"  Simulating {len(systems)} quantum systems in parallel...")
    start_time = time.time()
    
    results = nexus.parallel_engine.parallel_execute(
        simulate_quantum_system,
        systems
    )
    
    elapsed = time.time() - start_time
    print(f"  ✓ Completed in {elapsed:.2f} seconds")
    print(f"  ✓ Results: {len(results)} simulations")
    print()
    
    # Example 2: Parallel evolution cycles
    print("2. Parallel Evolution Cycles")
    print("-" * 60)
    
    def run_evolution_cycle(cycle_id):
        """Run a single evolution cycle."""
        return nexus.evolution_core.evolve()
    
    print("  Running 5 evolution cycles in parallel...")
    start_time = time.time()
    
    # Create cycle tasks
    cycle_tasks = [None] * 5  # Placeholder tasks
    evolution_results = nexus.parallel_engine.parallel_execute(
        run_evolution_cycle,
        cycle_tasks
    )
    
    elapsed = time.time() - start_time
    print(f"  ✓ Completed in {elapsed:.2f} seconds")
    print(f"  ✓ Evolution cycles: {len(evolution_results)}")
    print()
    
    # Example 3: Distributed data processing
    print("3. Distributed Data Processing")
    print("-" * 60)
    
    import numpy as np
    
    def process_data_chunk(chunk):
        """Process a chunk of data."""
        # Simulate data processing
        return {
            'processed': len(chunk),
            'sum': np.sum(chunk),
            'mean': np.mean(chunk)
        }
    
    # Create data chunks
    data_chunks = [np.random.randn(1000) for _ in range(20)]
    
    print(f"  Processing {len(data_chunks)} data chunks in parallel...")
    start_time = time.time()
    
    processed = nexus.parallel_engine.parallel_execute(
        process_data_chunk,
        data_chunks
    )
    
    elapsed = time.time() - start_time
    print(f"  ✓ Completed in {elapsed:.2f} seconds")
    print(f"  ✓ Processed chunks: {len(processed)}")
    print()
    
    # Show system status
    print("=" * 60)
    print("System Status")
    print("=" * 60)
    print()
    
    status = nexus.get_system_status()
    print(f"Status: {status.get('status')}")
    print(f"Engines Operational: {len([k for k, v in status.get('engines', {}).items() if v == 'operational'])}")
    print()
    
    # Ray cluster info
    if RAY_AVAILABLE and ray.is_initialized():
        print("Ray Cluster Info:")
        print(f"  Nodes: {len(ray.nodes())}")
        print(f"  Available Resources: {ray.cluster_resources()}")
        print(f"  Used Resources: {ray.available_resources()}")
        print()
    
    # Deactivate
    print("Deactivating Nexus...")
    nexus.deactivate()
    print("✓ Nexus deactivated")
    print()
    
    print("=" * 60)
    print("Scaled Execution Complete!")
    print("=" * 60)

if __name__ == "__main__":
    main()

