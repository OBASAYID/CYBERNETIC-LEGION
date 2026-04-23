"""
Clustering Module
Implements algorithms from Chapter 7: Clustering

Key concepts:
- k-Means clustering
- k-Center clustering
- Spectral clustering
- Approximation stability
- Dense submatrices
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from sklearn.cluster import KMeans, SpectralClustering
from sklearn.metrics import silhouette_score
import scipy.sparse as sp


class ClusteringEngine:
    """
    Comprehensive clustering engine with multiple algorithms.
    """
    
    def __init__(self):
        """Initialize clustering engine."""
        self.processing_pathway = []
    
    def kmeans_clustering(self, data: np.ndarray, k: int,
                         max_iter: int = 300, n_init: int = 10) -> Dict:
        """
        k-Means clustering (Lloyd's algorithm).
        Based on Section 7.2
        
        Args:
            data: Input data (n_samples, n_features)
            k: Number of clusters
            max_iter: Maximum iterations
            n_init: Number of initializations
            
        Returns:
            Clustering results
        """
        self._log_step(f"k-Means clustering: k={k}, {data.shape[0]} samples")
        
        kmeans = KMeans(n_clusters=k, max_iter=max_iter, n_init=n_init,
                       random_state=42, algorithm='lloyd')
        labels = kmeans.fit_predict(data)
        
        # Calculate metrics
        inertia = kmeans.inertia_
        silhouette = silhouette_score(data, labels)
        
        # Calculate within-cluster sum of squares
        wcss = 0
        for i in range(k):
            cluster_points = data[labels == i]
            if len(cluster_points) > 0:
                wcss += np.sum((cluster_points - kmeans.cluster_centers_[i]) ** 2)
        
        results = {
            'labels': labels,
            'centers': kmeans.cluster_centers_,
            'inertia': inertia,
            'wcss': wcss,
            'silhouette_score': silhouette,
            'n_clusters': k,
            'n_iter': kmeans.n_iter_
        }
        
        self._log_step(f"k-Means complete: inertia={inertia:.2f}, silhouette={silhouette:.4f}")
        return results
    
    def kcenter_clustering(self, data: np.ndarray, k: int) -> Dict:
        """
        k-Center clustering (greedy algorithm).
        Based on Section 7.3
        
        Args:
            data: Input data (n_samples, n_features)
            k: Number of centers
            
        Returns:
            k-Center clustering results
        """
        self._log_step(f"k-Center clustering: k={k}, {data.shape[0]} samples")
        
        n_samples = data.shape[0]
        centers = []
        distances = np.full(n_samples, np.inf)
        
        # Greedy algorithm: pick point farthest from current centers
        # First center: random
        first_center = np.random.randint(n_samples)
        centers.append(first_center)
        distances = np.linalg.norm(data - data[first_center], axis=1)
        
        for _ in range(k - 1):
            # Find point farthest from all centers
            farthest_idx = np.argmax(distances)
            centers.append(farthest_idx)
            
            # Update distances
            new_distances = np.linalg.norm(data - data[farthest_idx], axis=1)
            distances = np.minimum(distances, new_distances)
        
        # Assign points to nearest center
        center_points = data[centers]
        labels = np.argmin(np.linalg.norm(data[:, None, :] - center_points[None, :, :], axis=2), axis=1)
        
        # Calculate radius
        max_radius = np.max([np.max(np.linalg.norm(data[labels == i] - center_points[i], axis=1))
                            for i in range(k)])
        
        results = {
            'labels': labels,
            'centers': center_points,
            'center_indices': centers,
            'max_radius': max_radius,
            'n_clusters': k
        }
        
        self._log_step(f"k-Center complete: max radius={max_radius:.4f}")
        return results
    
    def spectral_clustering(self, data: np.ndarray, k: int,
                          affinity: str = 'rbf', gamma: float = 1.0) -> Dict:
        """
        Spectral clustering.
        Based on Section 7.5
        
        Args:
            data: Input data (n_samples, n_features)
            k: Number of clusters
            affinity: Affinity matrix type ('rbf', 'nearest_neighbors')
            gamma: RBF kernel parameter
            
        Returns:
            Spectral clustering results
        """
        self._log_step(f"Spectral clustering: k={k}, affinity={affinity}")
        
        spectral = SpectralClustering(n_clusters=k, affinity=affinity,
                                     gamma=gamma, random_state=42)
        labels = spectral.fit_predict(data)
        
        # Compute Laplacian eigenvalues
        if hasattr(spectral, 'affinity_matrix_'):
            affinity_matrix = spectral.affinity_matrix_
            degree_matrix = np.diag(np.sum(affinity_matrix, axis=1))
            laplacian = degree_matrix - affinity_matrix
            eigenvalues = np.linalg.eigvals(laplacian)
            eigenvalues = np.sort(np.real(eigenvalues))
        else:
            eigenvalues = None
        
        results = {
            'labels': labels,
            'n_clusters': k,
            'laplacian_eigenvalues': eigenvalues,
            'silhouette_score': silhouette_score(data, labels)
        }
        
        self._log_step(f"Spectral clustering complete: silhouette={results['silhouette_score']:.4f}")
        return results
    
    def find_dense_submatrix(self, matrix: np.ndarray, min_density: float = 0.5) -> Dict:
        """
        Find dense submatrix.
        Based on Section 7.10
        
        Args:
            matrix: Input matrix
            min_density: Minimum density threshold
            
        Returns:
            Dense submatrix results
        """
        self._log_step(f"Finding dense submatrix: min_density={min_density}")
        
        m, n = matrix.shape
        best_density = 0
        best_submatrix = None
        best_indices = None
        
        # Greedy approach: find rows/columns with high average
        row_sums = np.sum(matrix, axis=1)
        col_sums = np.sum(matrix, axis=0)
        
        # Start with top rows and columns
        top_rows = np.argsort(row_sums)[-min(10, m):]
        top_cols = np.argsort(col_sums)[-min(10, n):]
        
        submatrix = matrix[np.ix_(top_rows, top_cols)]
        density = np.mean(submatrix)
        
        if density >= min_density:
            best_density = density
            best_submatrix = submatrix
            best_indices = (top_rows, top_cols)
        
        results = {
            'submatrix': best_submatrix,
            'indices': best_indices,
            'density': best_density,
            'size': best_submatrix.shape if best_submatrix is not None else (0, 0)
        }
        
        self._log_step(f"Dense submatrix found: density={best_density:.4f}, size={results['size']}")
        return results
    
    def hierarchical_clustering(self, data: np.ndarray, method: str = 'ward') -> Dict:
        """
        Hierarchical clustering.
        
        Args:
            data: Input data (n_samples, n_features)
            method: Linkage method
            
        Returns:
            Hierarchical clustering results
        """
        self._log_step(f"Hierarchical clustering: method={method}")
        
        from scipy.cluster.hierarchy import linkage, fcluster, dendrogram
        
        # Compute linkage
        Z = linkage(data, method=method)
        
        # Extract dendrogram info
        dendro_info = dendrogram(Z, no_plot=True)
        
        results = {
            'linkage_matrix': Z,
            'dendrogram': dendro_info,
            'n_clusters_range': range(2, min(10, data.shape[0]))
        }
        
        self._log_step("Hierarchical clustering complete")
        return results
    
    def evaluate_clustering(self, data: np.ndarray, labels: np.ndarray) -> Dict:
        """
        Evaluate clustering quality.
        
        Args:
            data: Input data (n_samples, n_features)
            labels: Cluster labels
            
        Returns:
            Evaluation metrics
        """
        self._log_step("Evaluating clustering quality")
        
        from sklearn.metrics import (silhouette_score, calinski_harabasz_score,
                                   davies_bouldin_score)
        
        n_clusters = len(np.unique(labels))
        
        metrics = {
            'silhouette_score': silhouette_score(data, labels),
            'calinski_harabasz_score': calinski_harabasz_score(data, labels),
            'davies_bouldin_score': davies_bouldin_score(data, labels),
            'n_clusters': n_clusters,
            'cluster_sizes': [np.sum(labels == i) for i in range(n_clusters)]
        }
        
        self._log_step(f"Evaluation complete: silhouette={metrics['silhouette_score']:.4f}")
        return metrics
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'ClusteringEngine',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

