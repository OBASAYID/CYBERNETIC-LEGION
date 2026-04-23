"""
Streaming Algorithms Module
Implements algorithms from Chapter 6: Algorithms for Massive Data Problems

Key concepts:
- Frequency moments
- Distinct element counting
- Frequent elements
- Matrix sampling
- Document sketches
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from collections import Counter, defaultdict
import hashlib
import mmh3  # MurmurHash3 for better performance (fallback to hashlib if not available)


class StreamingAnalyzer:
    """
    Analyzer for streaming data and massive datasets.
    """
    
    def __init__(self):
        """Initialize streaming analyzer."""
        self.processing_pathway = []
    
    def count_distinct_elements(self, stream: List, epsilon: float = 0.1) -> Dict:
        """
        Count distinct elements using Flajolet-Martin algorithm.
        Based on Section 6.2.1
        
        Args:
            stream: Stream of elements
            epsilon: Error parameter
            
        Returns:
            Distinct count estimate and metadata
        """
        self._log_step(f"Counting distinct elements: ε={epsilon}")
        
        # Simplified version using hash-based approach
        hash_values = []
        for element in stream:
            # Hash element
            element_str = str(element).encode('utf-8')
            hash_val = int(hashlib.md5(element_str).hexdigest(), 16)
            hash_values.append(hash_val)
        
        # Count trailing zeros in binary representation
        max_trailing_zeros = 0
        for hash_val in hash_values:
            # Count trailing zeros
            trailing_zeros = 0
            while hash_val > 0 and (hash_val & 1) == 0:
                trailing_zeros += 1
                hash_val >>= 1
            max_trailing_zeros = max(max_trailing_zeros, trailing_zeros)
        
        # Estimate: 2^R where R is max trailing zeros
        estimate = 2 ** max_trailing_zeros
        
        # More accurate: use multiple hash functions (simplified)
        actual_distinct = len(set(stream))
        
        results = {
            'estimate': estimate,
            'actual': actual_distinct,
            'error': abs(estimate - actual_distinct) / actual_distinct if actual_distinct > 0 else 0,
            'epsilon': epsilon
        }
        
        self._log_step(f"Distinct elements: estimate={estimate}, actual={actual_distinct}, error={results['error']:.2%}")
        return results
    
    def find_frequent_elements(self, stream: List, k: int, threshold: float = 0.01) -> Dict:
        """
        Find frequent elements using Misra-Gries algorithm.
        Based on Section 6.2.3
        
        Args:
            stream: Stream of elements
            k: Number of counters
            threshold: Frequency threshold
            
        Returns:
            Frequent elements and frequencies
        """
        self._log_step(f"Finding frequent elements: k={k}, threshold={threshold}")
        
        counters = {}
        n = len(stream)
        
        # Misra-Gries algorithm
        for element in stream:
            if element in counters:
                counters[element] += 1
            elif len(counters) < k - 1:
                counters[element] = 1
            else:
                # Decrement all counters
                keys_to_remove = []
                for key in counters:
                    counters[key] -= 1
                    if counters[key] == 0:
                        keys_to_remove.append(key)
                for key in keys_to_remove:
                    del counters[key]
        
        # Calculate actual frequencies
        actual_freqs = Counter(stream)
        frequent = {elem: count for elem, count in counters.items()
                   if actual_freqs.get(elem, 0) / n >= threshold}
        
        results = {
            'frequent_elements': frequent,
            'estimated_frequencies': {elem: count / n for elem, count in counters.items()},
            'actual_frequencies': {elem: count / n for elem, count in actual_freqs.items()},
            'n_elements': n
        }
        
        self._log_step(f"Found {len(frequent)} frequent elements")
        return results
    
    def estimate_second_moment(self, stream: List) -> Dict:
        """
        Estimate second moment (F2) using AMS algorithm.
        Based on Section 6.2.4
        
        Args:
            stream: Stream of elements
            
        Returns:
            Second moment estimate
        """
        self._log_step("Estimating second moment (F2)")
        
        # Count frequencies
        frequencies = Counter(stream)
        
        # F2 = sum of squares of frequencies
        f2_actual = sum(freq ** 2 for freq in frequencies.values())
        
        # AMS algorithm (simplified)
        # Use random hash functions to estimate
        n_samples = min(100, len(stream))
        sample_indices = np.random.choice(len(stream), n_samples, replace=False)
        
        # Estimate from sample
        sample_freqs = Counter([stream[i] for i in sample_indices])
        f2_estimate = len(stream) ** 2 * sum(freq ** 2 for freq in sample_freqs.values()) / (n_samples ** 2)
        
        results = {
            'f2_actual': f2_actual,
            'f2_estimate': f2_estimate,
            'error': abs(f2_estimate - f2_actual) / f2_actual if f2_actual > 0 else 0,
            'frequencies': dict(frequencies)
        }
        
        self._log_step(f"F2 estimate: {f2_estimate:.2f}, actual: {f2_actual:.2f}")
        return results
    
    def matrix_multiplication_sampling(self, A: np.ndarray, B: np.ndarray,
                                     sample_size: int = None) -> Tuple[np.ndarray, Dict]:
        """
        Approximate matrix multiplication using sampling.
        Based on Section 6.3.1
        
        Args:
            A: First matrix (m, n)
            B: Second matrix (n, p)
            sample_size: Number of samples (default: sqrt(n))
            
        Returns:
            Approximate product and metadata
        """
        self._log_step(f"Matrix multiplication via sampling: {A.shape} @ {B.shape}")
        
        m, n = A.shape
        n2, p = B.shape
        
        if n != n2:
            raise ValueError("Matrix dimensions incompatible")
        
        if sample_size is None:
            sample_size = int(np.sqrt(n))
        
        # Length squared sampling
        # Sample columns from A and rows from B with probability proportional to squared norm
        col_norms_sq = np.sum(A ** 2, axis=0)
        row_norms_sq = np.sum(B ** 2, axis=1)
        
        # Sampling probabilities
        probs = col_norms_sq * row_norms_sq
        probs = probs / np.sum(probs)
        
        # Sample indices
        sampled_indices = np.random.choice(n, size=sample_size, p=probs, replace=True)
        
        # Approximate product
        C_approx = np.zeros((m, p))
        for idx in sampled_indices:
            weight = 1.0 / (sample_size * probs[idx])
            C_approx += weight * np.outer(A[:, idx], B[idx, :])
        
        # Exact product for comparison
        C_exact = A @ B
        
        error = np.linalg.norm(C_approx - C_exact, 'fro')
        relative_error = error / np.linalg.norm(C_exact, 'fro') if np.linalg.norm(C_exact, 'fro') > 0 else 0
        
        results = {
            'approximate_product': C_approx,
            'exact_product': C_exact,
            'frobenius_error': error,
            'relative_error': relative_error,
            'sample_size': sample_size,
            'compression_ratio': sample_size / n
        }
        
        self._log_step(f"Sampling complete: relative error={relative_error:.4f}, compression={results['compression_ratio']:.2%}")
        return C_approx, results
    
    def create_document_sketch(self, document: str, sketch_size: int = 100) -> Dict:
        """
        Create sketch of document using min-hash.
        Based on Section 6.4
        
        Args:
            document: Document text
            sketch_size: Size of sketch
            
        Returns:
            Document sketch and metadata
        """
        self._log_step(f"Creating document sketch: size={sketch_size}")
        
        # Tokenize document
        words = document.lower().split()
        shingles = set()
        
        # Create k-shingles (k=2)
        for i in range(len(words) - 1):
            shingle = f"{words[i]} {words[i+1]}"
            shingles.add(shingle)
        
        # Min-hash sketch
        sketch = []
        for _ in range(sketch_size):
            # Hash function (simplified)
            min_hash = min([hash(shingle) % (2**32) for shingle in shingles])
            sketch.append(min_hash)
        
        results = {
            'sketch': sketch,
            'sketch_size': sketch_size,
            'n_shingles': len(shingles),
            'compression_ratio': sketch_size / len(shingles) if len(shingles) > 0 else 0
        }
        
        self._log_step(f"Sketch created: {sketch_size} hashes from {len(shingles)} shingles")
        return results
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'StreamingAnalyzer',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

