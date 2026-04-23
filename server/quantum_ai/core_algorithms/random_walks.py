"""
Random Walks and Markov Chains Module
Implements algorithms from Chapter 4: Random Walks and Markov Chains

Key concepts:
- Stationary distributions
- Markov Chain Monte Carlo (MCMC)
- Metropolis-Hastings algorithm
- Gibbs sampling
- Convergence on graphs
- Electrical networks
"""

import numpy as np
from typing import Dict, List, Optional, Callable


class RandomWalkAnalyzer:
    """
    Analyzer for random walks and Markov chain processes.
    """
    
    def __init__(self):
        """Initialize random walk analyzer."""
        self.processing_pathway = []
    
    def compute_stationary_distribution(self, transition_matrix: np.ndarray) -> Dict:
        """
        Compute stationary distribution of Markov chain.
        Based on Section 4.1
        
        Args:
            transition_matrix: Transition probability matrix (n_states, n_states)
            
        Returns:
            Stationary distribution and metadata
        """
        self._log_step(f"Computing stationary distribution for {transition_matrix.shape[0]} states")
        
        # Find left eigenvector with eigenvalue 1
        eigenvalues, eigenvectors = np.linalg.eig(transition_matrix.T)
        
        # Find eigenvalue closest to 1
        idx = np.argmin(np.abs(eigenvalues - 1.0))
        stationary = np.real(eigenvectors[:, idx])
        stationary = np.abs(stationary)  # Ensure non-negative
        stationary = stationary / np.sum(stationary)  # Normalize
        
        # Verify it's actually stationary
        verification = stationary @ transition_matrix
        error = np.linalg.norm(verification - stationary)
        
        results = {
            'stationary_distribution': stationary,
            'verification_error': error,
            'eigenvalues': eigenvalues,
            'mixing_time_estimate': self._estimate_mixing_time(transition_matrix, stationary)
        }
        
        self._log_step(f"Stationary distribution computed: error={error:.2e}")
        return results
    
    def metropolis_hastings(self, target_distribution: Callable, proposal_distribution: Callable,
                           proposal_sample: Callable, initial_state: np.ndarray,
                           n_samples: int = 1000, burn_in: int = 100) -> Dict:
        """
        Metropolis-Hastings MCMC algorithm.
        Based on Section 4.2.1
        
        Args:
            target_distribution: Function returning log probability
            proposal_distribution: Function returning log proposal probability
            proposal_sample: Function sampling from proposal
            initial_state: Starting state
            n_samples: Number of samples
            burn_in: Burn-in period
            
        Returns:
            MCMC samples and statistics
        """
        self._log_step(f"Metropolis-Hastings MCMC: {n_samples} samples")
        
        samples = []
        current_state = initial_state.copy()
        current_log_prob = target_distribution(current_state)
        acceptances = 0
        
        for i in range(n_samples + burn_in):
            # Propose new state
            proposed_state = proposal_sample(current_state)
            proposed_log_prob = target_distribution(proposed_state)
            
            # Compute acceptance probability
            log_acceptance = (proposed_log_prob - current_log_prob +
                            proposal_distribution(current_state, proposed_state) -
                            proposal_distribution(proposed_state, current_state))
            
            acceptance_prob = min(1.0, np.exp(log_acceptance))
            
            # Accept or reject
            if np.random.rand() < acceptance_prob:
                current_state = proposed_state
                current_log_prob = proposed_log_prob
                acceptances += 1
            
            if i >= burn_in:
                samples.append(current_state.copy())
        
        samples = np.array(samples)
        acceptance_rate = acceptances / (n_samples + burn_in)
        
        results = {
            'samples': samples,
            'acceptance_rate': acceptance_rate,
            'mean': np.mean(samples, axis=0),
            'std': np.std(samples, axis=0),
            'n_samples': len(samples)
        }
        
        self._log_step(f"MCMC complete: acceptance rate={acceptance_rate:.2%}")
        return results
    
    def gibbs_sampling(self, conditional_distributions: List[Callable],
                      initial_state: np.ndarray, n_samples: int = 1000,
                      burn_in: int = 100) -> Dict:
        """
        Gibbs sampling MCMC algorithm.
        Based on Section 4.2.2
        
        Args:
            conditional_distributions: List of functions sampling from conditionals
            initial_state: Starting state
            n_samples: Number of samples
            burn_in: Burn-in period
            
        Returns:
            Gibbs samples and statistics
        """
        self._log_step(f"Gibbs sampling: {n_samples} samples, {len(conditional_distributions)} variables")
        
        samples = []
        current_state = initial_state.copy()
        
        for i in range(n_samples + burn_in):
            # Sample each variable from its conditional
            for j, conditional in enumerate(conditional_distributions):
                current_state[j] = conditional(current_state, j)
            
            if i >= burn_in:
                samples.append(current_state.copy())
        
        samples = np.array(samples)
        
        results = {
            'samples': samples,
            'mean': np.mean(samples, axis=0),
            'std': np.std(samples, axis=0),
            'n_samples': len(samples)
        }
        
        self._log_step("Gibbs sampling complete")
        return results
    
    def random_walk_on_graph(self, adjacency_matrix: np.ndarray, start_node: int = 0,
                            n_steps: int = 1000) -> Dict:
        """
        Perform random walk on undirected graph.
        Based on Section 4.4
        
        Args:
            adjacency_matrix: Graph adjacency matrix
            start_node: Starting node
            n_steps: Number of steps
            
        Returns:
            Random walk results
        """
        self._log_step(f"Random walk on graph: {n_steps} steps from node {start_node}")
        
        n_nodes = adjacency_matrix.shape[0]
        
        # Compute transition matrix
        degrees = np.sum(adjacency_matrix, axis=1)
        transition_matrix = adjacency_matrix / degrees[:, None]
        transition_matrix = np.nan_to_num(transition_matrix, nan=0.0)
        
        # Perform walk
        current_node = start_node
        visited = np.zeros(n_nodes)
        path = [start_node]
        
        for _ in range(n_steps):
            visited[current_node] += 1
            # Sample next node
            probs = transition_matrix[current_node, :]
            if np.sum(probs) > 0:
                next_node = np.random.choice(n_nodes, p=probs)
                current_node = next_node
                path.append(current_node)
        
        # Estimate stationary distribution
        visit_frequencies = visited / np.sum(visited)
        stationary = degrees / np.sum(degrees)  # Theoretical stationary
        
        results = {
            'path': path,
            'visit_frequencies': visit_frequencies,
            'stationary_distribution': stationary,
            'transition_matrix': transition_matrix,
            'mixing_time_estimate': self._estimate_mixing_time(transition_matrix, stationary)
        }
        
        self._log_step(f"Random walk complete: visited {len(set(path))} unique nodes")
        return results
    
    def estimate_mixing_time(self, transition_matrix: np.ndarray,
                           stationary: Optional[np.ndarray] = None,
                           epsilon: float = 0.01) -> float:
        """
        Estimate mixing time of Markov chain.
        Based on Section 4.4
        
        Args:
            transition_matrix: Transition probability matrix
            stationary: Stationary distribution (computed if None)
            epsilon: Convergence threshold
            
        Returns:
            Estimated mixing time
        """
        self._log_step(f"Estimating mixing time (ε={epsilon})")
        
        if stationary is None:
            stat_results = self.compute_stationary_distribution(transition_matrix)
            stationary = stat_results['stationary_distribution']
        
        # Use second largest eigenvalue
        eigenvalues = np.linalg.eigvals(transition_matrix)
        eigenvalues = np.sort(np.abs(eigenvalues))[::-1]
        
        if len(eigenvalues) > 1:
            lambda2 = eigenvalues[1]
            mixing_time = np.log(1 / epsilon) / (1 - lambda2) if lambda2 < 1 else np.inf
        else:
            mixing_time = 0
        
        self._log_step(f"Mixing time estimate: {mixing_time:.2f}")
        return mixing_time
    
    def quantum_walk_on_graph(self, adjacency_matrix: np.ndarray, start_node: int = 0,
                             n_steps: int = 100, coin_type: str = 'hadamard') -> Dict:
        """
        Perform quantum walk on undirected graph.
        Based on quantum walk algorithms for enhanced search and optimization.
        
        Args:
            adjacency_matrix: Graph adjacency matrix
            start_node: Starting node
            n_steps: Number of walk steps
            coin_type: Type of coin operator ('hadamard', 'grover')
            
        Returns:
            Quantum walk results
        """
        self._log_step(f"Quantum walk on graph: {n_steps} steps from node {start_node}")
        
        n_nodes = adjacency_matrix.shape[0]
        
        # Initialize quantum state at start node (position space only for simplicity)
        state = np.zeros(n_nodes, dtype=complex)
        state[start_node] = 1.0
        
        # Create coin operator
        if coin_type == 'hadamard':
            coin = np.array([[1, 1], [1, -1]], dtype=complex) / np.sqrt(2)
        elif coin_type == 'grover':
            # Grover coin for optimal search
            coin = np.array([[1, 1], [1, -1]], dtype=complex) * 2/3 - np.eye(2, dtype=complex) * 1/3
            coin = coin / np.linalg.norm(coin)
        else:
            raise ValueError(f"Unknown coin type: {coin_type}")
        
        # Create simplified evolution operator (coin + shift)
        evolution_op = self._create_simplified_evolution(adjacency_matrix, coin)
        
        # Track probabilities at each step
        probabilities = []
        path_probabilities = np.zeros((n_steps + 1, n_nodes))
        path_probabilities[0, start_node] = 1.0
        
        for step in range(n_steps):
            # Apply evolution
            state = evolution_op @ state
            
            # Compute position probabilities
            position_probs = np.abs(state)**2
            probabilities.append(position_probs)
            path_probabilities[step + 1] = position_probs
        
        # Find most probable positions
        final_probs = path_probabilities[-1]
        most_probable = np.argmax(final_probs)
        
        results = {
            'final_state': state,
            'position_probabilities': path_probabilities,
            'most_probable_node': most_probable,
            'probability_distribution': final_probs,
            'coin_type': coin_type,
            'n_steps': n_steps,
            'quantum_advantage': self._compute_quantum_advantage(path_probabilities, adjacency_matrix)
        }
        
        self._log_step(f"Quantum walk complete: most probable node {most_probable}")
        return results
    
    def _create_simplified_evolution(self, adjacency_matrix: np.ndarray, coin: np.ndarray) -> np.ndarray:
        """Create simplified quantum walk evolution operator."""
        n_nodes = adjacency_matrix.shape[0]
        
        # Create shift operator based on adjacency
        shift_op = np.zeros((n_nodes, n_nodes), dtype=complex)
        
        for i in range(n_nodes):
            neighbors = np.where(adjacency_matrix[i] > 0)[0]
            if len(neighbors) > 0:
                # Apply coin operation and shift to neighbors
                amplitude = 1.0 / np.sqrt(len(neighbors))
                for neighbor in neighbors:
                    # Simplified: direct transition with coin influence
                    shift_op[neighbor, i] = amplitude * (coin[0, 0] + coin[0, 1]) / np.sqrt(2)
                    shift_op[i, neighbor] = amplitude * (coin[1, 0] + coin[1, 1]) / np.sqrt(2)
        
        # Make sure it's unitary (approximate)
        # Normalize columns
        for i in range(n_nodes):
            col_norm = np.linalg.norm(shift_op[:, i])
            if col_norm > 0:
                shift_op[:, i] /= col_norm
        
        return shift_op
    
    def _compute_quantum_advantage(self, path_probabilities: np.ndarray,
                                  adjacency_matrix: np.ndarray) -> float:
        """Compute quantum advantage over classical random walk."""
        # Compare final distribution spread
        final_quantum = path_probabilities[-1]
        
        # Classical stationary distribution
        degrees = np.sum(adjacency_matrix, axis=1)
        classical_stationary = degrees / np.sum(degrees)
        
        # Measure advantage by variance difference
        quantum_var = np.var(final_quantum)
        classical_var = np.var(classical_stationary)
        
        advantage = quantum_var / classical_var if classical_var > 0 else 1.0
        
        return advantage
    
    def quantum_search_algorithm(self, search_space: np.ndarray,
                                oracle_function: Callable,
                                n_qubits: int = 4) -> Dict:
        """
        Quantum search algorithm (simplified Grover's algorithm variant).
        For searching unstructured databases with quantum speedup.
        
        Args:
            search_space: Array of items to search
            oracle_function: Function that marks target items
            n_qubits: Number of qubits for search space
            
        Returns:
            Search results
        """
        self._log_step(f"Quantum search: {len(search_space)} items")
        
        n_items = len(search_space)
        
        # For simplicity, work directly in the search space dimension
        # Initialize uniform superposition
        state = np.ones(n_items, dtype=complex) / np.sqrt(n_items)
        
        # Find target index
        target_indices = [i for i, item in enumerate(search_space) if oracle_function(item)]
        
        if not target_indices:
            return {'found': False, 'found_item': None, 'most_likely_index': -1, 'probability': 0.0}
        
        target_index = target_indices[0]  # Take first target
        
        # Simplified quantum search: amplitude amplification
        n_iterations = int(np.pi * np.sqrt(n_items) / 4)
        
        for _ in range(n_iterations):
            # Oracle: phase flip target state
            state[target_index] *= -1
            
            # Diffusion: invert about mean
            mean_amplitude = np.mean(state)
            state = 2 * mean_amplitude - state
            
            # Renormalize
            state = state / np.linalg.norm(state)
        
        # Measure
        probabilities = np.abs(state)**2
        most_likely_index = np.argmax(probabilities)
        found_item = search_space[most_likely_index]
        found = oracle_function(found_item)
        
        results = {
            'found_item': found_item,
            'found': found,
            'most_likely_index': most_likely_index,
            'probability': probabilities[most_likely_index],
            'n_iterations': n_iterations,
            'success_probability': probabilities[target_index] if target_index < len(probabilities) else 0.0
        }
        
        self._log_step(f"Quantum search complete: found={found}")
        return results
    
    def _create_search_oracle(self, search_space: np.ndarray,
                             oracle_function: Callable, n_qubits: int) -> np.ndarray:
        """Create oracle operator for quantum search."""
        n_states = 2**n_qubits
        oracle = np.eye(n_states, dtype=complex)
        
        for i, item in enumerate(search_space):
            if oracle_function(item):
                # Phase flip for marked state
                oracle[i, i] = -1
        
        return oracle
    
    def _create_diffusion_operator(self, n_qubits: int) -> np.ndarray:
        """Create Grover diffusion operator."""
        n_states = 2**n_qubits
        
        # Hadamard transform
        hadamard = np.ones((n_states, n_states), dtype=complex) / np.sqrt(n_states)
        
        # Phase flip for |0...0⟩
        phase_flip = np.eye(n_states, dtype=complex)
        phase_flip[0, 0] = -1
        
        # Diffusion operator
        diffusion = hadamard @ phase_flip @ hadamard
        
        return diffusion
    
    def _estimate_mixing_time(self, transition_matrix: np.ndarray,
                              stationary: np.ndarray) -> float:
        """Helper to estimate mixing time."""
        eigenvalues = np.linalg.eigvals(transition_matrix)
        eigenvalues = np.sort(np.abs(eigenvalues))[::-1]
        if len(eigenvalues) > 1 and eigenvalues[1] < 1:
            return np.log(100) / (1 - eigenvalues[1])
        return np.inf
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'RandomWalkAnalyzer',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

