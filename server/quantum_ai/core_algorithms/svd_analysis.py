"""
Singular Value Decomposition (SVD) Analysis Module
Implements algorithms from Chapter 3: Best-Fit Subspaces and SVD

Key concepts:
- Singular Value Decomposition
- Best rank-k approximations
- Principal Component Analysis
- Power method for SVD
- Applications: clustering, ranking, optimization
"""

import numpy as np
from typing import Tuple, Dict, List, Optional
from scipy.linalg import svd as scipy_svd
from sklearn.decomposition import PCA
import math


class SVDAnalyzer:
    """
    Analyzer for Singular Value Decomposition and related techniques.
    """
    
    def __init__(self):
        """Initialize SVD analyzer."""
        self.processing_pathway = []
    
    def compute_svd(self, data: np.ndarray, full_matrices: bool = False) -> Dict:
        """
        Compute full SVD decomposition.
        Based on Section 3.4
        
        Args:
            data: Input matrix (n_samples, n_features)
            full_matrices: Whether to compute full matrices
            
        Returns:
            SVD decomposition with U, S, Vt
        """
        self._log_step(f"Computing SVD for matrix shape {data.shape}")
        
        U, s, Vt = scipy_svd(data, full_matrices=full_matrices)
        
        # Calculate explained variance
        variance_explained = s ** 2 / np.sum(s ** 2)
        cumulative_variance = np.cumsum(variance_explained)
        
        results = {
            'U': U,
            'S': s,
            'Vt': Vt,
            'singular_values': s,
            'variance_explained': variance_explained,
            'cumulative_variance': cumulative_variance,
            'rank': np.sum(s > 1e-10),
            'condition_number': s[0] / s[-1] if len(s) > 0 and s[-1] > 0 else np.inf
        }
        
        self._log_step(f"SVD complete: rank={results['rank']}, condition={results['condition_number']:.2e}")
        return results
    
    def best_rank_k_approximation(self, data: np.ndarray, k: int) -> Tuple[np.ndarray, Dict]:
        """
        Compute best rank-k approximation using SVD.
        Based on Section 3.5
        
        Args:
            data: Input matrix (n_samples, n_features)
            k: Target rank
            
        Returns:
            Rank-k approximation and metadata
        """
        self._log_step(f"Computing best rank-{k} approximation")
        
        U, s, Vt = scipy_svd(data, full_matrices=False)
        
        # Truncate to rank k
        U_k = U[:, :k]
        s_k = s[:k]
        Vt_k = Vt[:k, :]
        
        # Reconstruct
        approximation = U_k @ np.diag(s_k) @ Vt_k
        
        # Calculate error
        frobenius_error = np.linalg.norm(data - approximation, 'fro')
        frobenius_norm = np.linalg.norm(data, 'fro')
        relative_error = frobenius_error / frobenius_norm if frobenius_norm > 0 else 0
        
        # Variance explained
        total_variance = np.sum(s ** 2)
        explained_variance = np.sum(s_k ** 2) / total_variance if total_variance > 0 else 0
        
        metadata = {
            'rank': k,
            'frobenius_error': frobenius_error,
            'relative_error': relative_error,
            'variance_explained': explained_variance,
            'singular_values': s_k,
            'U_k': U_k,
            'Vt_k': Vt_k
        }
        
        self._log_step(f"Rank-{k} approximation: error={relative_error:.4f}, variance={explained_variance:.4f}")
        return approximation, metadata
    
    def power_method_svd(self, data: np.ndarray, k: int = 1, 
                        max_iter: int = 100, tol: float = 1e-6) -> Dict:
        """
        Power method for computing top-k singular vectors.
        Based on Section 3.7
        
        Args:
            data: Input matrix (n_samples, n_features)
            k: Number of top singular vectors
            max_iter: Maximum iterations
            tol: Convergence tolerance
            
        Returns:
            Top-k singular vectors and values
        """
        self._log_step(f"Power method for top-{k} singular vectors")
        
        n_samples, n_features = data.shape
        A = data
        
        # Compute A^T A for right singular vectors
        ATA = A.T @ A
        
        singular_vectors = []
        singular_values = []
        remaining_A = A.copy()
        
        for i in range(k):
            # Initialize random vector
            v = np.random.randn(n_features)
            v = v / np.linalg.norm(v)
            
            for iteration in range(max_iter):
                v_old = v.copy()
                v = ATA @ v
                v = v / np.linalg.norm(v)
                
                if np.linalg.norm(v - v_old) < tol:
                    break
            
            # Compute singular value
            Av = A @ v
            sigma = np.linalg.norm(Av)
            u = Av / sigma if sigma > 0 else Av
            
            singular_vectors.append((u, v))
            singular_values.append(sigma)
            
            # Deflate
            remaining_A = remaining_A - sigma * np.outer(u, v)
            ATA = remaining_A.T @ remaining_A
        
        results = {
            'singular_values': np.array(singular_values),
            'left_vectors': np.array([u for u, v in singular_vectors]),
            'right_vectors': np.array([v for u, v in singular_vectors]),
            'iterations': iteration + 1
        }
        
        self._log_step(f"Power method complete: top singular value={singular_values[0]:.4f}")
        return results
    
    def principal_component_analysis(self, data: np.ndarray, n_components: Optional[int] = None) -> Dict:
        """
        Principal Component Analysis using SVD.
        Based on Section 3.9.2
        
        Args:
            data: Input data (n_samples, n_features)
            n_components: Number of components (None for all)
            
        Returns:
            PCA results
        """
        self._log_step(f"Computing PCA for {data.shape[0]} samples, {data.shape[1]} features")
        
        # Center data
        mean = np.mean(data, axis=0)
        centered_data = data - mean
        
        # Compute SVD
        svd_results = self.compute_svd(centered_data)
        
        # Select components
        if n_components is None:
            n_components = min(data.shape[0], data.shape[1])
        
        n_components = min(n_components, len(svd_results['singular_values']))
        
        # Principal components (right singular vectors)
        components = svd_results['Vt'][:n_components, :].T
        
        # Projected data
        projected = centered_data @ components
        
        results = {
            'components': components,
            'explained_variance': svd_results['variance_explained'][:n_components],
            'cumulative_variance': svd_results['cumulative_variance'][:n_components],
            'singular_values': svd_results['singular_values'][:n_components],
            'mean': mean,
            'projected_data': projected,
            'n_components': n_components
        }
        
        self._log_step(f"PCA complete: {n_components} components explain {results['cumulative_variance'][-1]:.2%} variance")
        return results
    
    def cluster_mixture_gaussians(self, data: np.ndarray, n_clusters: int) -> Dict:
        """
        Cluster mixture of spherical Gaussians using SVD.
        Based on Section 3.9.3
        
        Args:
            data: Input data (n_samples, n_features)
            n_clusters: Number of clusters
            
        Returns:
            Clustering results
        """
        self._log_step(f"Clustering {n_clusters} spherical Gaussians using SVD")
        
        # Project to top k-1 dimensions
        pca_results = self.principal_component_analysis(data, n_components=n_clusters-1)
        projected = pca_results['projected_data']
        
        # Apply k-means in projected space
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
        labels = kmeans.fit_predict(projected)
        
        results = {
            'labels': labels,
            'centers': kmeans.cluster_centers_,
            'inertia': kmeans.inertia_,
            'projected_data': projected,
            'pca_variance_explained': pca_results['cumulative_variance'][-1]
        }
        
        self._log_step(f"Clustering complete: {n_clusters} clusters, inertia={kmeans.inertia_:.2f}")
        return results
    
    def rank_documents(self, document_term_matrix: np.ndarray, query: Optional[np.ndarray] = None) -> Dict:
        """
        Rank documents using SVD (Latent Semantic Indexing).
        Based on Section 3.9.4
        
        Args:
            document_term_matrix: Matrix (n_documents, n_terms)
            query: Query vector (n_terms,) or None for general ranking
            
        Returns:
            Ranking results
        """
        self._log_step("Ranking documents using SVD-based LSI")
        
        # Compute SVD
        svd_results = self.compute_svd(document_term_matrix)
        
        # Use top components
        k = min(50, document_term_matrix.shape[1])
        U_k = svd_results['U'][:, :k]
        s_k = svd_results['S'][:k]
        Vt_k = svd_results['Vt'][:k, :]
        
        if query is not None:
            # Project query to latent space
            query_projected = (query @ Vt_k.T) / s_k
            # Compute similarities
            similarities = U_k @ query_projected
            rankings = np.argsort(similarities)[::-1]
        else:
            # Rank by first principal component
            rankings = np.argsort(U_k[:, 0])[::-1]
            similarities = U_k[:, 0]
        
        results = {
            'rankings': rankings,
            'similarities': similarities,
            'svd_rank': k,
            'singular_values': s_k
        }
        
        self._log_step(f"Document ranking complete: top document index={rankings[0]}")
        return results
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'SVDAnalyzer',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

