"""
High-Dimensional Space Analysis Module
Implements algorithms from Chapter 2: High-Dimensional Space

Key concepts:
- Law of Large Numbers in high dimensions
- Geometry of high dimensions
- Unit ball properties
- Random projections (Johnson-Lindenstrauss)
- Gaussian separation
"""

import numpy as np
from typing import Tuple, Dict, List, Optional
from scipy.special import gamma
from scipy.stats import norm
import math


class HighDimensionalAnalyzer:
    """
    Analyzer for high-dimensional spaces with geometric and statistical properties.
    """
    
    def __init__(self, dimension: int = None):
        """
        Initialize high-dimensional analyzer.
        
        Args:
            dimension: Default dimension for analysis
        """
        self.dimension = dimension
        self.processing_pathway = []
    
    def unit_ball_volume(self, d: int) -> float:
        """
        Calculate volume of d-dimensional unit ball.
        Based on Section 2.4.1
        
        Args:
            d: Dimension
            
        Returns:
            Volume of unit ball
        """
        self._log_step(f"Computing unit ball volume in {d} dimensions")
        
        if d % 2 == 0:
            # Even dimension
            k = d // 2
            volume = (math.pi ** k) / math.factorial(k)
        else:
            # Odd dimension
            k = (d - 1) // 2
            volume = (2 * (2 * math.pi) ** k * math.factorial(k)) / math.factorial(d)
        
        self._log_step(f"Unit ball volume: {volume:.6e}")
        return volume
    
    def volume_near_equator(self, d: int, epsilon: float = 0.1) -> float:
        """
        Calculate volume of unit ball near equator.
        Based on Section 2.4.2
        
        Args:
            d: Dimension
            epsilon: Distance from equator
            
        Returns:
            Fraction of volume near equator
        """
        self._log_step(f"Computing volume near equator (d={d}, ε={epsilon})")
        
        # Using concentration of measure
        # Most volume is concentrated near the equator in high dimensions
        fraction = 1 - 2 * norm.cdf(-epsilon * math.sqrt(d))
        
        self._log_step(f"Volume fraction near equator: {fraction:.4f}")
        return fraction
    
    def generate_uniform_ball(self, n_points: int, d: int, radius: float = 1.0) -> np.ndarray:
        """
        Generate points uniformly at random from d-dimensional ball.
        Based on Section 2.5
        
        Args:
            n_points: Number of points to generate
            d: Dimension
            radius: Radius of ball
            
        Returns:
            Array of shape (n_points, d)
        """
        self._log_step(f"Generating {n_points} uniform points from {d}D ball (r={radius})")
        
        # Generate from Gaussian and normalize
        points = np.random.normal(0, 1, (n_points, d))
        norms = np.linalg.norm(points, axis=1, keepdims=True)
        points = points / norms
        
        # Scale by radius and apply uniform scaling for volume
        u = np.random.uniform(0, 1, (n_points, 1))
        points = points * radius * (u ** (1/d))
        
        self._log_step(f"Generated {n_points} points with mean norm: {np.mean(np.linalg.norm(points, axis=1)):.4f}")
        return points
    
    def johnson_lindenstrauss_projection(self, data: np.ndarray, target_dim: int, 
                                        epsilon: float = 0.1) -> Tuple[np.ndarray, Dict]:
        """
        Random projection using Johnson-Lindenstrauss Lemma.
        Based on Section 2.7
        
        Args:
            data: Input data (n_samples, n_features)
            target_dim: Target dimension
            epsilon: Distortion parameter
            
        Returns:
            Projected data and metadata
        """
        self._log_step(f"Johnson-Lindenstrauss projection: {data.shape[1]}D -> {target_dim}D (ε={epsilon})")
        
        n_samples, n_features = data.shape
        
        # Calculate required dimension (conservative bound)
        k_min = int(4 * np.log(n_samples) / (epsilon ** 2))
        if target_dim < k_min:
            self._log_step(f"Warning: target_dim {target_dim} < recommended {k_min}")
        
        # Generate random projection matrix
        projection = np.random.normal(0, 1 / np.sqrt(target_dim), (n_features, target_dim))
        
        # Project data
        projected = data @ projection
        
        # Calculate distortion
        original_distances = np.linalg.norm(data[:, None, :] - data[None, :, :], axis=2)
        projected_distances = np.linalg.norm(projected[:, None, :] - projected[None, :, :], axis=2)
        
        # Avoid division by zero
        mask = original_distances > 1e-10
        distortion = np.abs(projected_distances[mask] / original_distances[mask] - 1)
        max_distortion = np.max(distortion) if np.any(mask) else 0
        
        metadata = {
            'original_dim': n_features,
            'target_dim': target_dim,
            'epsilon': epsilon,
            'recommended_dim': k_min,
            'max_distortion': max_distortion,
            'mean_distortion': np.mean(distortion) if np.any(mask) else 0
        }
        
        self._log_step(f"Projection complete. Max distortion: {max_distortion:.4f}")
        return projected, metadata
    
    def separate_gaussians(self, data: np.ndarray, n_components: int = 2) -> Dict:
        """
        Separate mixture of Gaussians.
        Based on Section 2.8
        
        Args:
            data: Input data (n_samples, n_features)
            n_components: Number of Gaussian components
            
        Returns:
            Separation results with means and covariances
        """
        self._log_step(f"Separating {n_components} Gaussians from {data.shape[0]} samples")
        
        from sklearn.mixture import GaussianMixture
        
        gmm = GaussianMixture(n_components=n_components, random_state=42)
        gmm.fit(data)
        
        results = {
            'means': gmm.means_,
            'covariances': gmm.covariances_,
            'weights': gmm.weights_,
            'labels': gmm.predict(data),
            'log_likelihood': gmm.score(data),
            'bic': gmm.bic(data),
            'aic': gmm.aic(data)
        }
        
        # Calculate separation metrics
        if n_components == 2:
            mean_separation = np.linalg.norm(results['means'][0] - results['means'][1])
            avg_std = np.mean([np.sqrt(np.trace(cov)) for cov in results['covariances']])
            separation_ratio = mean_separation / avg_std if avg_std > 0 else 0
            results['separation_ratio'] = separation_ratio
            self._log_step(f"Gaussian separation ratio: {separation_ratio:.4f}")
        
        return results
    
    def fit_spherical_gaussian(self, data: np.ndarray) -> Dict:
        """
        Fit spherical Gaussian to data.
        Based on Section 2.9
        
        Args:
            data: Input data (n_samples, n_features)
            
        Returns:
            Fitted Gaussian parameters
        """
        self._log_step(f"Fitting spherical Gaussian to {data.shape[0]} samples in {data.shape[1]}D")
        
        mean = np.mean(data, axis=0)
        centered = data - mean
        variance = np.mean(np.sum(centered ** 2, axis=1))
        std = np.sqrt(variance)
        
        results = {
            'mean': mean,
            'variance': variance,
            'std': std,
            'dimension': data.shape[1],
            'n_samples': data.shape[0]
        }
        
        self._log_step(f"Fitted Gaussian: mean norm={np.linalg.norm(mean):.4f}, std={std:.4f}")
        return results
    
    def analyze_high_dim_properties(self, data: np.ndarray) -> Dict:
        """
        Comprehensive analysis of high-dimensional properties.
        
        Args:
            data: Input data (n_samples, n_features)
            
        Returns:
            Comprehensive analysis results
        """
        self._log_step("Starting comprehensive high-dimensional analysis")
        
        n_samples, n_features = data.shape
        
        # Distance concentration
        distances = []
        for i in range(min(100, n_samples)):
            for j in range(i+1, min(100, n_samples)):
                dist = np.linalg.norm(data[i] - data[j])
                distances.append(dist)
        distances = np.array(distances)
        
        # Concentration of measure
        mean_dist = np.mean(distances)
        std_dist = np.std(distances)
        cv = std_dist / mean_dist if mean_dist > 0 else 0
        
        results = {
            'dimension': n_features,
            'n_samples': n_samples,
            'mean_pairwise_distance': mean_dist,
            'std_pairwise_distance': std_dist,
            'coefficient_of_variation': cv,
            'unit_ball_volume': self.unit_ball_volume(n_features),
            'volume_near_equator': self.volume_near_equator(n_features),
            'data_norm_stats': {
                'mean': np.mean(np.linalg.norm(data, axis=1)),
                'std': np.std(np.linalg.norm(data, axis=1)),
                'min': np.min(np.linalg.norm(data, axis=1)),
                'max': np.max(np.linalg.norm(data, axis=1))
            }
        }
        
        self._log_step("High-dimensional analysis complete")
        return results
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'HighDimensionalAnalyzer',
            'step': message,
            'timestamp': None  # Could add actual timestamps
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

