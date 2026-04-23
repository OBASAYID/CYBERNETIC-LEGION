"""
Random Graphs Analysis Module
Implements algorithms from Chapter 8: Random Graphs

Key concepts:
- G(n,p) model
- Phase transitions
- Giant component
- Degree distribution
- Small world networks
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
import networkx as nx
from scipy.stats import poisson
import math


class GraphAnalyzer:
    """
    Analyzer for random graphs and network properties.
    """
    
    def __init__(self):
        """Initialize graph analyzer."""
        self.processing_pathway = []
    
    def generate_gnp_graph(self, n: int, p: float) -> Tuple[nx.Graph, Dict]:
        """
        Generate G(n,p) random graph.
        Based on Section 8.1
        
        Args:
            n: Number of nodes
            p: Edge probability
            
        Returns:
            Graph and statistics
        """
        self._log_step(f"Generating G(n,p) graph: n={n}, p={p}")
        
        G = nx.erdos_renyi_graph(n, p, seed=42)
        
        # Calculate statistics
        n_edges = G.number_of_edges()
        expected_edges = n * (n - 1) * p / 2
        
        # Degree distribution
        degrees = [d for n, d in G.degree()]
        degree_dist = np.bincount(degrees)
        
        results = {
            'graph': G,
            'n_nodes': n,
            'n_edges': n_edges,
            'expected_edges': expected_edges,
            'edge_density': 2 * n_edges / (n * (n - 1)) if n > 1 else 0,
            'degree_distribution': degree_dist,
            'mean_degree': np.mean(degrees) if len(degrees) > 0 else 0,
            'expected_degree': (n - 1) * p
        }
        
        self._log_step(f"Graph generated: {n_edges} edges, mean degree={results['mean_degree']:.2f}")
        return G, results
    
    def analyze_phase_transition(self, n: int, p_values: np.ndarray) -> Dict:
        """
        Analyze phase transitions in G(n,p).
        Based on Section 8.2
        
        Args:
            n: Number of nodes
            p_values: Array of p values to test
            
        Returns:
            Phase transition analysis
        """
        self._log_step(f"Analyzing phase transitions: n={n}, {len(p_values)} p values")
        
        critical_p = 1.0 / n
        results = {
            'p_values': p_values,
            'critical_p': critical_p,
            'giant_component_sizes': [],
            'n_components': [],
            'mean_cluster_sizes': []
        }
        
        for p in p_values:
            G, stats = self.generate_gnp_graph(n, p)
            
            # Find connected components
            components = list(nx.connected_components(G))
            component_sizes = [len(c) for c in components]
            
            if component_sizes:
                giant_size = max(component_sizes)
                results['giant_component_sizes'].append(giant_size / n)
                results['n_components'].append(len(components))
                results['mean_cluster_sizes'].append(np.mean(component_sizes))
            else:
                results['giant_component_sizes'].append(0)
                results['n_components'].append(0)
                results['mean_cluster_sizes'].append(0)
        
        self._log_step(f"Phase transition analysis complete: critical p={critical_p:.6f}")
        return results
    
    def analyze_degree_distribution(self, G: nx.Graph) -> Dict:
        """
        Analyze degree distribution.
        Based on Section 8.1.1
        
        Args:
            G: Input graph
            
        Returns:
            Degree distribution analysis
        """
        self._log_step("Analyzing degree distribution")
        
        degrees = [d for n, d in G.degree()]
        
        if len(degrees) == 0:
            return {'error': 'Empty graph'}
        
        results = {
            'degrees': degrees,
            'mean_degree': np.mean(degrees),
            'std_degree': np.std(degrees),
            'min_degree': np.min(degrees),
            'max_degree': np.max(degrees),
            'degree_distribution': np.bincount(degrees),
            'is_poisson': self._test_poisson_distribution(degrees)
        }
        
        self._log_step(f"Degree analysis: mean={results['mean_degree']:.2f}, std={results['std_degree']:.2f}")
        return results
    
    def find_giant_component(self, G: nx.Graph) -> Dict:
        """
        Find and analyze giant component.
        Based on Section 8.3
        
        Args:
            G: Input graph
            
        Returns:
            Giant component analysis
        """
        self._log_step("Finding giant component")
        
        components = list(nx.connected_components(G))
        component_sizes = [len(c) for c in components]
        
        if not component_sizes:
            return {'error': 'No components found'}
        
        giant_idx = np.argmax(component_sizes)
        giant_component = G.subgraph(components[giant_idx])
        
        results = {
            'giant_component': giant_component,
            'giant_size': component_sizes[giant_idx],
            'total_nodes': G.number_of_nodes(),
            'giant_fraction': component_sizes[giant_idx] / G.number_of_nodes(),
            'n_components': len(components),
            'component_sizes': component_sizes
        }
        
        self._log_step(f"Giant component: {results['giant_size']} nodes ({results['giant_fraction']:.2%})")
        return results
    
    def small_world_analysis(self, G: nx.Graph) -> Dict:
        """
        Analyze small world properties.
        Based on Section 8.10
        
        Args:
            G: Input graph
            
        Returns:
            Small world metrics
        """
        self._log_step("Analyzing small world properties")
        
        # Average shortest path length
        if nx.is_connected(G):
            avg_path_length = nx.average_shortest_path_length(G)
        else:
            # Use largest component
            components = list(nx.connected_components(G))
            largest = G.subgraph(max(components, key=len))
            avg_path_length = nx.average_shortest_path_length(largest)
        
        # Clustering coefficient
        clustering = nx.clustering(G)
        avg_clustering = np.mean(list(clustering.values()))
        
        # Compare to random graph
        n = G.number_of_nodes()
        m = G.number_of_edges()
        p_random = 2 * m / (n * (n - 1)) if n > 1 else 0
        G_random = nx.erdos_renyi_graph(n, p_random, seed=42)
        clustering_random = nx.clustering(G_random)
        avg_clustering_random = np.mean(list(clustering_random.values()))
        
        results = {
            'avg_path_length': avg_path_length,
            'avg_clustering': avg_clustering,
            'clustering_random': avg_clustering_random,
            'small_world_ratio': avg_clustering / avg_clustering_random if avg_clustering_random > 0 else 0,
            'n_nodes': n,
            'n_edges': m
        }
        
        self._log_step(f"Small world: path_length={avg_path_length:.2f}, clustering={avg_clustering:.4f}")
        return results
    
    def _test_poisson_distribution(self, degrees: List[int]) -> bool:
        """Test if degree distribution follows Poisson."""
        if len(degrees) == 0:
            return False
        mean_deg = np.mean(degrees)
        # Simple test: check if variance ≈ mean (Poisson property)
        variance = np.var(degrees)
        return abs(variance - mean_deg) / mean_deg < 0.2 if mean_deg > 0 else False
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'GraphAnalyzer',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

