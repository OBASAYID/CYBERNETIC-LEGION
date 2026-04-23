#!/usr/bin/env python3
"""
Quantum Machine Learning Algorithms - Complete Example
Demonstrates QNN, QSVM, QPCA, Quantum Clustering, and Quantum RL
through the Quantum Intelligence Nexus
"""

import sys
import os
import numpy as np

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

from quantum_ai.quantum_intelligence_nexus import QuantumIntelligenceNexus

print("=" * 80)
print("Quantum Machine Learning Algorithms - Complete Example")
print("=" * 80)
print()

# Create Nexus
print("1. Creating Quantum Intelligence Nexus...")
nexus = QuantumIntelligenceNexus("ML_Example")
print("✓ Nexus created")
print()

# Activate (optional, but recommended for full functionality)
print("2. Activating Nexus...")
nexus.activate()
print("✓ Nexus activated")
print()

# Generate sample data
print("3. Generating sample data...")
np.random.seed(42)
X_train = np.random.randn(20, 5)
y_train = (X_train[:, 0] + X_train[:, 1] > 0).astype(int)
X_test = np.random.randn(10, 5)
y_test = (X_test[:, 0] + X_test[:, 1] > 0).astype(int)

print(f"✓ Training set: {X_train.shape[0]} samples, {X_train.shape[1]} features")
print(f"  Test set: {X_test.shape[0]} samples")
print(f"  Classes: {len(np.unique(y_train))}")
print()

# Train Quantum Neural Network
print("4. Training Quantum Neural Network (QNN)...")
print("-" * 80)
try:
    qnn_result = nexus.ml_algorithms.train_quantum_neural_network(
        X_train, y_train,
        num_qubits=4,
        num_layers=2,
        epochs=20
    )
    
    final_accuracy = qnn_result.get('final_accuracy', 'N/A')
    if isinstance(final_accuracy, (int, float)):
        print(f"✓ Final accuracy: {final_accuracy:.2%}")
    else:
        print(f"✓ Final accuracy: {final_accuracy}")
    
    print(f"  Training loss: {qnn_result.get('final_loss', 'N/A'):.4f}" if isinstance(qnn_result.get('final_loss'), (int, float)) else f"  Training loss: {qnn_result.get('final_loss', 'N/A')}")
    print(f"  Epochs: {qnn_result.get('epochs', 'N/A')}")
    print(f"  Num qubits: {qnn_result.get('num_qubits', 'N/A')}")
    print(f"  Num layers: {qnn_result.get('num_layers', 'N/A')}")
    
    if 'accuracy_history' in qnn_result:
        history = qnn_result['accuracy_history']
        if history:
            print(f"  Initial accuracy: {history[0]:.2%}" if isinstance(history[0], (int, float)) else f"  Initial accuracy: {history[0]}")
            print(f"  Final accuracy: {history[-1]:.2%}" if isinstance(history[-1], (int, float)) else f"  Final accuracy: {history[-1]}")
except Exception as e:
    print(f"⚠ Error training QNN: {e}")
    qnn_result = None
print()

# Train Quantum SVM
print("5. Training Quantum Support Vector Machine (QSVM)...")
print("-" * 80)
try:
    qsvm_result = nexus.ml_algorithms.quantum_svm(X_train, y_train)
    
    print(f"✓ Support vectors: {qsvm_result.get('num_support_vectors', 'N/A')}")
    print(f"  Training accuracy: {qsvm_result.get('training_accuracy', 'N/A'):.2%}" if isinstance(qsvm_result.get('training_accuracy'), (int, float)) else f"  Training accuracy: {qsvm_result.get('training_accuracy', 'N/A')}")
    print(f"  Kernel type: {qsvm_result.get('kernel_type', 'N/A')}")
    print(f"  Num qubits: {qsvm_result.get('num_qubits', 'N/A')}")
    
    if 'support_vectors' in qsvm_result:
        print(f"  Support vector indices: {qsvm_result['support_vectors'][:5]}..." if len(qsvm_result['support_vectors']) > 5 else f"  Support vector indices: {qsvm_result['support_vectors']}")
except Exception as e:
    print(f"⚠ Error training QSVM: {e}")
    qsvm_result = None
print()

# Run Quantum PCA
print("6. Running Quantum Principal Component Analysis (QPCA)...")
print("-" * 80)
try:
    qpca_result = nexus.ml_algorithms.quantum_pca(
        X_train, 
        num_components=3
    )
    
    cumulative_variance = qpca_result.get('cumulative_variance', [])
    if cumulative_variance:
        print(f"✓ Variance explained: {cumulative_variance[-1]:.2%}" if isinstance(cumulative_variance[-1], (int, float)) else f"✓ Variance explained: {cumulative_variance[-1]}")
    else:
        print(f"✓ Variance explained: {qpca_result.get('variance_explained', 'N/A')}")
    
    print(f"  Components: {qpca_result.get('num_components', 'N/A')}")
    print(f"  Original dimensions: {X_train.shape[1]}")
    print(f"  Reduced dimensions: {qpca_result.get('num_components', 'N/A')}")
    
    if 'explained_variance_ratio' in qpca_result:
        ratios = qpca_result['explained_variance_ratio']
        print(f"  Variance per component: {ratios}")
except Exception as e:
    print(f"⚠ Error running QPCA: {e}")
    qpca_result = None
print()

# Quantum Clustering
print("7. Running Quantum Clustering...")
print("-" * 80)
try:
    qclustering_result = nexus.ml_algorithms.quantum_clustering(
        X_train,
        num_clusters=2,
        algorithm='qk_means'
    )
    
    print(f"✓ Clusters: {qclustering_result.get('num_clusters', 'N/A')}")
    labels = qclustering_result.get('labels', [])
    if isinstance(labels, (list, np.ndarray)) and len(labels) > 10:
        print(f"  Labels: {labels[:10]}...")
    else:
        print(f"  Labels: {labels}")
    
    inertia = qclustering_result.get('inertia', 'N/A')
    if isinstance(inertia, (int, float)):
        print(f"  Inertia: {inertia:.4f}")
    else:
        print(f"  Inertia: {inertia}")
    
    print(f"  Algorithm: {qclustering_result.get('method', 'N/A')}")
    
    if 'centroids' in qclustering_result:
        centroids = qclustering_result['centroids']
        if centroids is not None:
            print(f"  Centroids shape: {np.array(centroids).shape}")
except Exception as e:
    print(f"⚠ Error running quantum clustering: {e}")
    qclustering_result = None
print()

# Quantum Reinforcement Learning
print("8. Running Quantum Reinforcement Learning...")
print("-" * 80)
try:
    # Create a simple environment
    environment = {
        'state_space': 4,
        'action_space': 2,
        'reward_range': (-1, 1)
    }
    
    qrl_result = nexus.ml_algorithms.quantum_reinforcement_learning(
        environment=environment,
        num_actions=2,
        episodes=10
    )
    
    print(f"✓ Episodes: {qrl_result.get('num_episodes', 'N/A')}")
    average_reward = qrl_result.get('average_reward', 'N/A')
    if isinstance(average_reward, (int, float)):
        print(f"  Average reward: {average_reward:.4f}")
    else:
        print(f"  Average reward: {average_reward}")
    
    q_function = qrl_result.get('q_function', [])
    if q_function:
        print(f"  Q-function shape: {np.array(q_function).shape}")
    else:
        print(f"  Q-function: N/A")
    
    print(f"  Num actions: {qrl_result.get('num_actions', 'N/A')}")
    print(f"  Best episode reward: {qrl_result.get('best_episode_reward', 'N/A'):.4f}" if isinstance(qrl_result.get('best_episode_reward'), (int, float)) else f"  Best episode reward: {qrl_result.get('best_episode_reward', 'N/A')}")
    
    if 'episode_rewards' in qrl_result:
        history = qrl_result['episode_rewards']
        if history:
            if isinstance(history[0], (int, float)):
                print(f"  Initial episode reward: {history[0]:.4f}")
            else:
                print(f"  Initial episode reward: {history[0]}")
            if isinstance(history[-1], (int, float)):
                print(f"  Final episode reward: {history[-1]:.4f}")
            else:
                print(f"  Final episode reward: {history[-1]}")
except Exception as e:
    print(f"⚠ Error running quantum RL: {e}")
    qrl_result = None
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
print("QUANTUM MACHINE LEARNING EXAMPLE COMPLETE")
print("=" * 80)
print()

