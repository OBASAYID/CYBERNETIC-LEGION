"""
Machine Learning Module
Implements algorithms from Chapter 5: Machine Learning

Key concepts:
- Perceptron algorithm
- Kernel functions
- VC-dimension
- Boosting
- Support Vector Machines
- Stochastic Gradient Descent
- Deep Learning concepts
"""

import numpy as np
from typing import Dict, List
from sklearn.svm import SVC
from sklearn.ensemble import AdaBoostClassifier


class MLProcessor:
    """
    Machine learning processor with comprehensive algorithms.
    """
    
    def __init__(self):
        """Initialize ML processor."""
        self.processing_pathway = []
    
    def perceptron_algorithm(self, X: np.ndarray, y: np.ndarray,
                            max_iter: int = 1000, learning_rate: float = 1.0) -> Dict:
        """
        Perceptron learning algorithm.
        Based on Section 5.2 and 5.8.3
        
        Args:
            X: Training features (n_samples, n_features)
            y: Training labels (-1 or +1)
            max_iter: Maximum iterations
            learning_rate: Learning rate
            
        Returns:
            Perceptron results
        """
        self._log_step(f"Perceptron algorithm: {X.shape[0]} samples, {X.shape[1]} features")
        
        n_samples, n_features = X.shape
        w = np.zeros(n_features)
        b = 0.0
        mistakes = 0
        iterations = 0
        
        for iteration in range(max_iter):
            error_found = False
            for i in range(n_samples):
                prediction = np.sign(w @ X[i] + b)
                if prediction != y[i]:
                    w = w + learning_rate * y[i] * X[i]
                    b = b + learning_rate * y[i]
                    mistakes += 1
                    error_found = True
            
            if not error_found:
                iterations = iteration + 1
                break
        
        # Calculate margin
        margins = y * (X @ w + b)
        min_margin = np.min(margins) if len(margins) > 0 else 0
        
        results = {
            'weights': w,
            'bias': b,
            'mistakes': mistakes,
            'iterations': iterations,
            'converged': not error_found,
            'min_margin': min_margin,
            'norm': np.linalg.norm(w)
        }
        
        self._log_step(f"Perceptron complete: {mistakes} mistakes, converged={results['converged']}")
        return results
    
    def kernel_function(self, X1: np.ndarray, X2: np.ndarray,
                       kernel_type: str = 'rbf', gamma: float = 1.0,
                       degree: int = 3) -> np.ndarray:
        """
        Compute kernel matrix.
        Based on Section 5.3
        
        Args:
            X1: First set of points (n1, n_features)
            X2: Second set of points (n2, n_features)
            kernel_type: 'rbf', 'polynomial', 'linear'
            gamma: RBF kernel parameter
            degree: Polynomial degree
            
        Returns:
            Kernel matrix (n1, n2)
        """
        self._log_step(f"Computing {kernel_type} kernel matrix")
        
        if kernel_type == 'linear':
            K = X1 @ X2.T
        elif kernel_type == 'polynomial':
            K = (gamma * X1 @ X2.T + 1) ** degree
        elif kernel_type == 'rbf':
            # RBF: exp(-gamma * ||x - y||^2)
            X1_norm = np.sum(X1 ** 2, axis=1, keepdims=True)
            X2_norm = np.sum(X2 ** 2, axis=1, keepdims=True)
            distances_sq = X1_norm - 2 * X1 @ X2.T + X2_norm.T
            K = np.exp(-gamma * distances_sq)
        else:
            raise ValueError(f"Unknown kernel type: {kernel_type}")
        
        self._log_step(f"Kernel matrix computed: shape {K.shape}")
        return K
    
    def quantum_kernel_matrix(self, X1: np.ndarray, X2: np.ndarray,
                             encoding_method: str = 'amplitude') -> np.ndarray:
        """
        Compute quantum kernel matrix using quantum feature encoding.
        Based on quantum machine learning principles.
        
        Args:
            X1: First set of points (n1, n_features)
            X2: Second set of points (n2, n_features)
            encoding_method: 'amplitude' or 'angle'
            
        Returns:
            Quantum kernel matrix (n1, n2)
        """
        self._log_step(f"Computing quantum kernel matrix: {encoding_method} encoding")
        
        n1, n_features = X1.shape
        n2 = X2.shape[0]
        K = np.zeros((n1, n2), dtype=complex)
        
        for i in range(n1):
            for j in range(n2):
                # Encode classical vectors to quantum states
                state1 = self._encode_to_quantum_state(X1[i], encoding_method)
                state2 = self._encode_to_quantum_state(X2[j], encoding_method)
                
                # Quantum kernel as overlap in Hilbert space
                K[i, j] = np.vdot(state1, state2)
        
        self._log_step(f"Quantum kernel matrix computed: shape {K.shape}")
        return K.real  # Return real part for compatibility
    
    def _encode_to_quantum_state(self, x: np.ndarray, method: str) -> np.ndarray:
        """
        Encode classical vector to quantum state.
        
        Args:
            x: Classical feature vector
            method: Encoding method ('amplitude' or 'angle')
            
        Returns:
            Normalized quantum state vector
        """
        # Normalize input
        x_norm = x / np.linalg.norm(x) if np.linalg.norm(x) > 0 else x
        
        # Determine number of qubits needed
        n_qubits = int(np.ceil(np.log2(len(x_norm))))
        state_size = 2**n_qubits
        
        # Pad or truncate to power of 2
        if len(x_norm) < state_size:
            padded = np.zeros(state_size)
            padded[:len(x_norm)] = x_norm
            x_norm = padded
        else:
            x_norm = x_norm[:state_size]
        
        # Re-normalize
        x_norm = x_norm / np.linalg.norm(x_norm)
        
        if method == 'amplitude':
            # Direct amplitude encoding
            return x_norm.astype(complex)
        elif method == 'angle':
            # Angle encoding using rotations
            state = np.zeros(state_size, dtype=complex)
            state[0] = 1.0  # Start with |0...0⟩
            
            # Apply rotations for each feature
            for i, angle in enumerate(x_norm):
                if i < n_qubits:
                    # Simplified: apply Z-rotation based on feature value
                    rotation = np.array([[np.exp(-1j * angle / 2), 0],
                                       [0, np.exp(1j * angle / 2)]], dtype=complex)
                    state = self._apply_single_gate(state, rotation, i)
            
            return state
        else:
            raise ValueError(f"Unknown encoding method: {method}")
    
    def _apply_single_gate(self, state: np.ndarray, gate: np.ndarray, qubit: int) -> np.ndarray:
        """Apply single-qubit gate to quantum state."""
        n_qubits = int(np.log2(len(state)))
        
        # Tensor product construction
        full_gate = np.array([[1.0]], dtype=complex)
        
        for i in range(n_qubits):
            if i == qubit:
                full_gate = np.kron(full_gate, gate)
            else:
                identity = np.eye(2, dtype=complex)
                full_gate = np.kron(full_gate, identity)
        
        return full_gate @ state
    
    def quantum_support_vector_machine(self, X: np.ndarray, y: np.ndarray,
                                      encoding_method: str = 'amplitude',
                                      C: float = 1.0) -> Dict:
        """
        Quantum-enhanced Support Vector Machine using quantum kernels.
        Combines quantum feature encoding with classical SVM optimization.
        
        Args:
            X: Training features (n_samples, n_features)
            y: Training labels (-1, +1)
            encoding_method: Quantum encoding method
            C: Regularization parameter
            
        Returns:
            Quantum SVM results
        """
        self._log_step(f"Quantum SVM training: {X.shape[0]} samples, encoding={encoding_method}")
        
        # Compute quantum kernel matrix
        K = self.quantum_kernel_matrix(X, X, encoding_method)
        
        # Use classical SVM with quantum kernel
        from sklearn.svm import SVC
        svm = SVC(kernel='precomputed', C=C, random_state=42)
        svm.fit(K, y)
        
        # Get predictions on training data
        predictions = svm.predict(K)
        accuracy = np.mean(predictions == y)
        
        results = {
            'support_vector_indices': svm.support_,
            'n_support_vectors': len(svm.support_),
            'dual_coef': svm.dual_coef_,
            'intercept': svm.intercept_,
            'training_accuracy': accuracy,
            'quantum_kernel_matrix': K,
            'encoding_method': encoding_method
        }
        
        self._log_step(f"Quantum SVM trained: {len(svm.support_)} support vectors, accuracy={accuracy:.3f}")
        return results
    
    def support_vector_machine(self, X: np.ndarray, y: np.ndarray,
                              kernel: str = 'rbf', C: float = 1.0,
                              gamma: float = 'scale') -> Dict:
        """
        Support Vector Machine.
        Based on Section 5.10
        
        Args:
            X: Training features (n_samples, n_features)
            y: Training labels
            kernel: Kernel type
            C: Regularization parameter
            gamma: Kernel coefficient
            
        Returns:
            SVM results
        """
        self._log_step(f"SVM training: {X.shape[0]} samples, kernel={kernel}")
        
        svm = SVC(kernel=kernel, C=C, gamma=gamma, random_state=42)
        svm.fit(X, y)
        
        results = {
            'support_vectors': svm.support_vectors_,
            'support_vector_indices': svm.support_,
            'n_support_vectors': len(svm.support_),
            'dual_coef': svm.dual_coef_,
            'intercept': svm.intercept_,
            'score': svm.score(X, y),
            'predictions': svm.predict(X)
        }
        
        self._log_step(f"SVM complete: {results['n_support_vectors']} support vectors, accuracy={results['score']:.4f}")
        return results
    
    def boosting(self, X: np.ndarray, y: np.ndarray,
                n_estimators: int = 50, learning_rate: float = 1.0) -> Dict:
        """
        AdaBoost algorithm.
        Based on Section 5.12
        
        Args:
            X: Training features (n_samples, n_features)
            y: Training labels
            n_estimators: Number of weak learners
            learning_rate: Learning rate
            
        Returns:
            Boosting results
        """
        self._log_step(f"AdaBoost: {n_estimators} estimators, {X.shape[0]} samples")
        
        boost = AdaBoostClassifier(n_estimators=n_estimators,
                                  learning_rate=learning_rate,
                                  random_state=42)
        boost.fit(X, y)
        
        results = {
            'n_estimators': n_estimators,
            'estimator_weights': boost.estimator_weights_,
            'estimator_errors': boost.estimator_errors_,
            'feature_importances': boost.feature_importances_,
            'score': boost.score(X, y),
            'staged_scores': list(boost.staged_score(X, y))
        }
        
        self._log_step(f"Boosting complete: final accuracy={results['score']:.4f}")
        return results
    
    def stochastic_gradient_descent(self, X: np.ndarray, y: np.ndarray,
                                  loss_function: str = 'hinge',
                                  learning_rate: float = 0.01,
                                  n_epochs: int = 100,
                                  batch_size: int = 1) -> Dict:
        """
        Stochastic Gradient Descent.
        Based on Section 5.13
        
        Args:
            X: Training features (n_samples, n_features)
            y: Training labels
            loss_function: 'hinge', 'logistic', 'squared'
            learning_rate: Learning rate
            n_epochs: Number of epochs
            batch_size: Batch size
            
        Returns:
            SGD results
        """
        self._log_step(f"SGD: {n_epochs} epochs, batch_size={batch_size}, loss={loss_function}")
        
        n_samples, n_features = X.shape
        w = np.zeros(n_features)
        b = 0.0
        
        losses = []
        
        for epoch in range(n_epochs):
            epoch_loss = 0
            indices = np.random.permutation(n_samples)
            
            for i in range(0, n_samples, batch_size):
                batch_indices = indices[i:i+batch_size]
                X_batch = X[batch_indices]
                y_batch = y[batch_indices]
                
                # Compute gradient
                predictions = X_batch @ w + b
                
                if loss_function == 'hinge':
                    # Hinge loss: max(0, 1 - y * (w^T x + b))
                    margin = y_batch * predictions
                    misclassified = margin < 1
                    if np.any(misclassified):
                        grad_w = -np.mean(y_batch[misclassified, None] * X_batch[misclassified], axis=0)
                        grad_b = -np.mean(y_batch[misclassified])
                    else:
                        grad_w = np.zeros(n_features)
                        grad_b = 0.0
                    epoch_loss += np.mean(np.maximum(0, 1 - margin))
                
                elif loss_function == 'logistic':
                    # Logistic loss: log(1 + exp(-y * (w^T x + b)))
                    exp_term = np.exp(-y_batch * predictions)
                    grad_w = -np.mean((y_batch * exp_term / (1 + exp_term))[:, None] * X_batch, axis=0)
                    grad_b = -np.mean(y_batch * exp_term / (1 + exp_term))
                    epoch_loss += np.mean(np.log(1 + exp_term))
                
                elif loss_function == 'squared':
                    # Squared loss: (y - (w^T x + b))^2
                    errors = y_batch - predictions
                    grad_w = -2 * np.mean(errors[:, None] * X_batch, axis=0)
                    grad_b = -2 * np.mean(errors)
                    epoch_loss += np.mean(errors ** 2)
                
                # Update weights
                w = w - learning_rate * grad_w
                b = b - learning_rate * grad_b
            
            losses.append(epoch_loss / (n_samples // batch_size))
        
        results = {
            'weights': w,
            'bias': b,
            'losses': losses,
            'final_loss': losses[-1],
            'predictions': X @ w + b
        }
        
        self._log_step(f"SGD complete: final loss={results['final_loss']:.4f}")
        return results
    
    def estimate_vc_dimension(self, model_complexity: int, n_samples: int,
                            generalization_error: float) -> float:
        """
        Estimate VC-dimension from generalization bounds.
        Based on Section 5.11
        
        Args:
            model_complexity: Model complexity measure
            n_samples: Number of training samples
            generalization_error: Observed generalization error
            
        Returns:
            Estimated VC-dimension
        """
        self._log_step("Estimating VC-dimension")
        
        # Using VC bound: error <= sqrt((d * log(n/d) + log(1/delta)) / n)
        # Solve for d given error
        # This is a simplified estimation
        vc_dim_estimate = (generalization_error ** 2) * n_samples / np.log(n_samples)
        
        results = {
            'vc_dimension_estimate': vc_dim_estimate,
            'model_complexity': model_complexity,
            'n_samples': n_samples,
            'generalization_error': generalization_error
        }
        
        self._log_step(f"VC-dimension estimate: {vc_dim_estimate:.2f}")
        return results
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'MLProcessor',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

