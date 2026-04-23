#!/usr/bin/env python3
"""
Comprehensive Test Suite for Quantum-Enhanced CYRUS Algorithms
Tests all quantum mathematics enhanced algorithms for correctness and functionality.
"""

import numpy as np
import time
from server.quantum_ai.core_algorithms import (
    QuantumEnhancedProcessor,
    QuantumKernelSVM,
    QuantumWalkOptimizer,
    QuantumEntanglementClustering,
    VariationalQuantumOptimizer,
    QuantumApproximateOptimizationAlgorithm,
    QuantumPrincipalComponentAnalysis,
    QuantumNeuralNetwork,
    VariationalQuantumEigensolver,
    QuantumAmplitudeEstimation
)
from server.quantum_ai.core_algorithms.machine_learning import MLProcessor
from server.quantum_ai.core_algorithms.random_walks import RandomWalkAnalyzer
from server.quantum_ai.core_algorithms.clustering import ClusteringEngine

def test_quantum_processor():
    """Test basic quantum processor functionality."""
    print("🧪 Testing Quantum Enhanced Processor...")

    processor = QuantumEnhancedProcessor()

    # Test quantum state creation
    state = processor.create_quantum_state(4)
    assert state.shape == (16,), f"Expected shape (16,), got {state.shape}"
    assert np.isclose(np.linalg.norm(state), 1.0), "State should be normalized"

    # Test quantum gate application
    hadamard = np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)
    new_state = processor.apply_quantum_gate(state, hadamard, [0])
    assert new_state.shape == state.shape, "Gate application should preserve shape"

    # Test QFT
    qft_state = processor.quantum_fourier_transform(state[:8])  # 3-qubit state
    assert qft_state.shape == (8,), "QFT should preserve state size"

    print("✅ Quantum Processor tests passed")

def test_quantum_kernel_svm():
    """Test Quantum Kernel SVM."""
    print("🧪 Testing Quantum Kernel SVM...")

    processor = QuantumEnhancedProcessor()
    qksvm = QuantumKernelSVM(processor)

    # Create test data - simple separable classes
    np.random.seed(42)
    # Class 1: centered at [1, 1, 0, 0]
    X1 = np.random.randn(25, 4) * 0.5 + np.array([1, 1, 0, 0])
    # Class 2: centered at [-1, -1, 0, 0] 
    X2 = np.random.randn(25, 4) * 0.5 + np.array([-1, -1, 0, 0])
    X = np.vstack([X1, X2])
    y = np.array([1] * 25 + [-1] * 25)

    # Train
    results = qksvm.fit(X[:40], y[:40])
    assert 'n_support_vectors' in results, "Should return support vector count"
    assert results['n_support_vectors'] > 0, "Should find support vectors"

    # Predict
    predictions = qksvm.predict(X[40:])
    accuracy = np.mean(predictions == y[40:])
    assert accuracy >= 0.5, f"Accuracy should be >= 0.5, got {accuracy:.3f}"

    print(f"✅ Quantum SVM test: accuracy={accuracy:.3f}, support_vectors={results['n_support_vectors']}")
def test_quantum_walk_optimizer():
    """Test Quantum Walk Optimizer."""
    print("🧪 Testing Quantum Walk Optimizer...")

    processor = QuantumEnhancedProcessor()
    optimizer = QuantumWalkOptimizer(processor)

    # Rosenbrock function
    def rosenbrock(x):
        return (1 - x[0])**2 + 100 * (x[1] - x[0]**2)**2

    bounds = [(-2, 2), (-2, 2)]

    results = optimizer.quantum_walk_optimization(rosenbrock, bounds, n_qubits=3, n_steps=20)

    assert 'best_solution' in results, "Should return best solution"
    assert 'best_value' in results, "Should return best value"
    assert results['best_value'] < 1.0, f"Should find good solution (Rosenbrock minimum is 0), got {results['best_value']:.4f}"

    print(f"✅ Quantum Walk Optimization: best_value={results['best_value']:.4f}")
def test_quantum_entanglement_clustering():
    """Test Quantum Entanglement Clustering."""
    print("🧪 Testing Quantum Entanglement Clustering...")

    processor = QuantumEnhancedProcessor()
    clusterer = QuantumEntanglementClustering(processor)

    # Create test data with 3 clusters
    np.random.seed(42)
    centers = np.array([[2, 2], [-2, -2], [2, -2]])
    X = []
    y_true = []

    for i, center in enumerate(centers):
        points = np.random.normal(center, 0.5, (30, 2))
        X.extend(points)
        y_true.extend([i] * 30)

    X = np.array(X)

    results = clusterer.fit(X, n_clusters=3)
    assert results['n_clusters'] == 3, "Should create 3 clusters"
    assert 'labels' in results, "Should return cluster labels"
    assert len(results['labels']) == len(X), "Should label all points"

    print(f"✅ Quantum Clustering: inertia={results['inertia']:.4f}, silhouette={results['silhouette_score']:.4f}")

def test_enhanced_ml_processor():
    """Test enhanced ML processor with quantum kernels."""
    print("🧪 Testing Enhanced ML Processor...")

    ml = MLProcessor()

    # Test quantum kernel matrix (square matrix for Hermitian check)
    X = np.random.randn(10, 3)
    K = ml.quantum_kernel_matrix(X, X)
    assert K.shape == (10, 10), f"Expected shape (10, 10), got {K.shape}"
    assert np.allclose(K, K.conj().T), "Kernel matrix should be Hermitian"

    # Test quantum SVM
    X = np.random.randn(30, 4)
    y = (X[:, 0] > 0).astype(int) * 2 - 1

    results = ml.quantum_support_vector_machine(X[:25], y[:25])
    assert 'training_accuracy' in results, "Should return training accuracy"

    print(f"✅ Enhanced ML: accuracy={results['training_accuracy']:.3f}")
def test_enhanced_random_walks():
    """Test enhanced random walks with quantum algorithms."""
    print("🧪 Testing Enhanced Random Walks...")

    rw = RandomWalkAnalyzer()

    # Create test graph
    n_nodes = 6
    adjacency = np.array([
        [0, 1, 1, 0, 0, 0],
        [1, 0, 1, 1, 0, 0],
        [1, 1, 0, 0, 1, 0],
        [0, 1, 0, 0, 1, 1],
        [0, 0, 1, 1, 0, 1],
        [0, 0, 0, 1, 1, 0]
    ])

    # Test quantum walk
    results = rw.quantum_walk_on_graph(adjacency, start_node=0, n_steps=10)
    assert 'most_probable_node' in results, "Should return most probable node"
    assert 'quantum_advantage' in results, "Should compute quantum advantage"

    # Test quantum search
    search_space = ['apple', 'banana', 'cherry', 'date', 'elderberry']
    oracle = lambda x: x == 'cherry'

    search_results = rw.quantum_search_algorithm(search_space, oracle)
    assert search_results['found'] == True, "Should find the target item"

    print("✅ Enhanced Random Walks tests passed")

def test_enhanced_clustering():
    """Test enhanced clustering with quantum entanglement."""
    print("🧪 Testing Enhanced Clustering...")

    ce = ClusteringEngine()

    # Create test data
    np.random.seed(42)
    X = np.random.randn(60, 3)

    # Test quantum entanglement clustering
    results = ce.quantum_entanglement_clustering(X, n_clusters=3)
    assert results['n_clusters'] == 3, "Should create 3 clusters"
    assert 'inertia' in results, "Should return inertia"

    print(f"✅ Enhanced Clustering: inertia={results['inertia']:.4f}")

def test_quantum_approximate_optimization():
    """Test Quantum Approximate Optimization Algorithm."""
    print("🧪 Testing Quantum Approximate Optimization Algorithm...")

    processor = QuantumEnhancedProcessor()
    qaoa = QuantumApproximateOptimizationAlgorithm(processor)

    # Test Max-Cut problem on a simple graph
    # Triangle graph: nodes 0,1,2 with edges between all pairs
    graph = [[1, 2], [0, 2], [0, 1]]

    results = qaoa.solve_max_cut(graph, p=2, max_iter=50)

    assert 'cut_value' in results, "Should return cut value"
    assert 'partition' in results, "Should return partition"
    assert results['cut_value'] >= 2.0, f"Triangle Max-Cut should be at least 2, got {results['cut_value']:.3f}"

    print(f"✅ QAOA Max-Cut: cut_value={results['cut_value']:.3f}, partition={results['partition']}")

    # Test Ising model
    # Simple 2-spin Ising model with ferromagnetic coupling
    J = np.array([[0, -1], [-1, 0]])  # Ferromagnetic coupling
    h = np.array([0.1, -0.1])         # Small fields

    ising_results = qaoa.solve_ising(J, h, p=1, max_iter=30)

    assert 'ground_energy' in ising_results, "Should return ground energy"
    assert 'spin_configuration' in ising_results, "Should return spin configuration"
    # For ferromagnetic Ising, ground state should have aligned spins
    expected_energy = -1 + 0.1*(-1) + (-0.1)*1  # J*σ₁σ₂ + h₁σ₁ + h₂σ₂
    assert ising_results['ground_energy'] <= expected_energy + 0.5, "Energy should be close to expected ground state"

    print(f"✅ QAOA Ising: ground_energy={ising_results['ground_energy']:.3f}")

def test_quantum_principal_component_analysis():
    """Test Quantum Principal Component Analysis."""
    print("🧪 Testing Quantum Principal Component Analysis...")

    processor = QuantumEnhancedProcessor()
    qpca = QuantumPrincipalComponentAnalysis(processor)

    # Create test data with known structure
    np.random.seed(42)
    n_samples, n_features = 50, 6
    X = np.random.randn(n_samples, n_features)

    # Add structure: first two features are correlated
    X[:, 0] = X[:, 1] + 0.5 * np.random.randn(n_samples)
    X[:, 2] = -X[:, 3] + 0.3 * np.random.randn(n_samples)

    # Fit QPCA
    fit_results = qpca.fit(X, n_components=3)

    assert 'components' in fit_results, "Should return components"
    assert 'explained_variance' in fit_results, "Should return explained variance"
    assert fit_results['components'].shape == (3, n_features), f"Components shape should be (3, {n_features})"
    assert len(fit_results['explained_variance']) == 3, "Should have 3 explained variances"

    # Transform data
    X_transformed = qpca.transform(X)
    assert X_transformed.shape == (n_samples, 3), f"Transformed shape should be ({n_samples}, 3)"

    print(f"✅ QPCA: explained variance ratio = {fit_results['explained_variance_ratio']}")

def test_quantum_neural_network():
    """Test Quantum Neural Network."""
    print("🧪 Testing Quantum Neural Network...")

    processor = QuantumEnhancedProcessor()
    qnn = QuantumNeuralNetwork(processor, n_qubits=4, n_layers=2)

    # Create simple test data
    np.random.seed(42)
    n_samples = 30
    X = np.random.randn(n_samples, 4)
    y = (X[:, 0] + X[:, 1] > 0).astype(float)  # Simple binary classification

    # Train QNN
    train_results = qnn.fit(X, y, learning_rate=0.1, max_iter=20)

    assert 'final_loss' in train_results, "Should return final loss"
    assert 'parameters' in train_results, "Should return parameters"
    assert 'n_parameters' in train_results, "Should return number of parameters"
    assert train_results['n_parameters'] == 4 * 2 * 3, "Should have correct number of parameters"

    # Test predictions
    predictions = qnn.predict(X)
    assert len(predictions) == n_samples, "Should predict all samples"
    assert all(0 <= p <= 1 for p in predictions), "Predictions should be in [0,1]"

    print(f"✅ QNN: final_loss={train_results['final_loss']:.4f}, n_parameters={train_results['n_parameters']}")

def test_variational_quantum_eigensolver():
    """Test Variational Quantum Eigensolver."""
    print("🧪 Testing Variational Quantum Eigensolver...")

    processor = QuantumEnhancedProcessor()
    vqe = VariationalQuantumEigensolver(processor)

    # Simple 2-qubit Hamiltonian: H = Z⊗I + I⊗Z + 0.5*X⊗X
    I = np.eye(2)
    Z = np.array([[1, 0], [0, -1]])
    X = np.array([[0, 1], [1, 0]])

    H = np.kron(Z, I) + np.kron(I, Z) + 0.5 * np.kron(X, X)

    # Run VQE
    results = vqe.find_ground_state(H, n_qubits=2, ansatz_depth=2, max_iter=30)

    assert 'ground_energy' in results, "Should return ground energy"
    assert 'optimal_parameters' in results, "Should return optimal parameters"
    assert 'energy_history' in results, "Should return energy history"

    # Check against classical eigenvalue
    classical_eigenvalues = np.linalg.eigvals(H)
    classical_ground = np.min(classical_eigenvalues)

    energy_error = abs(results['ground_energy'] - classical_ground)
    assert energy_error < 1.0, f"VQE energy error too large: {energy_error:.4f}"

    print(f"✅ VQE: ground_energy={results['ground_energy']:.4f}, classical={classical_ground:.4f}, error={energy_error:.4f}")

def test_quantum_amplitude_estimation():
    """Test Quantum Amplitude Estimation."""
    print("🧪 Testing Quantum Amplitude Estimation...")

    processor = QuantumEnhancedProcessor()
    qae = QuantumAmplitudeEstimation(processor)

    # Simple oracle function for testing
    def test_oracle(state):
        """Simple oracle that marks certain states."""
        marked_state = state.copy()
        # Mark the state with index 1 (arbitrary choice for testing)
        if len(marked_state) > 1:
            marked_state[1] *= -1  # Phase flip
        return marked_state

    # Run QAE
    results = qae.estimate_amplitude(test_oracle, n_evaluation_qubits=2)

    assert 'estimated_amplitude' in results, "Should return estimated amplitude"
    assert 'measurements' in results, "Should return measurements"
    assert 'confidence_interval' in results, "Should return confidence interval"

    amplitude = results['estimated_amplitude']
    assert 0 <= amplitude <= 1, f"Amplitude should be in [0,1], got {amplitude}"

    ci_lower, ci_upper = results['confidence_interval']
    assert ci_lower <= amplitude <= ci_upper, "Amplitude should be in confidence interval"

    print(f"✅ QAE: amplitude={amplitude:.4f}, CI=[{ci_lower:.4f}, {ci_upper:.4f}]")

def run_all_tests():
    """Run all quantum algorithm tests."""
    print("🚀 Starting Comprehensive Quantum Algorithm Tests")
    print("=" * 60)

    start_time = time.time()

    try:
        test_quantum_processor()
        test_quantum_kernel_svm()
        test_quantum_walk_optimizer()
        test_quantum_entanglement_clustering()
        test_quantum_approximate_optimization()
        test_quantum_principal_component_analysis()
        test_quantum_neural_network()
        test_variational_quantum_eigensolver()
        test_quantum_amplitude_estimation()
        test_enhanced_ml_processor()
        test_enhanced_random_walks()
        test_enhanced_clustering()

        end_time = time.time()

        print("=" * 60)
        print("🎉 ALL TESTS PASSED!")
        print(f"⏱️  Total test time: {end_time - start_time:.2f} seconds")
        print("✅ Quantum mathematics enhanced algorithms are fully functional")

    except Exception as e:
        print(f"❌ TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return False

    return True

if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)