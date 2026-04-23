"""
Topic Modeling and NMF Module
Implements algorithms from Chapter 9: Topic Models, NMF, HMM, Graphical Models

Key concepts:
- Nonnegative Matrix Factorization (NMF)
- Latent Dirichlet Allocation (LDA)
- Topic modeling
- Anchor terms
"""

import numpy as np
from typing import Dict, List, Tuple, Optional
from sklearn.decomposition import NMF, LatentDirichletAllocation
from sklearn.feature_extraction.text import CountVectorizer
import warnings
warnings.filterwarnings('ignore')


class TopicModelingEngine:
    """
    Engine for topic modeling and nonnegative matrix factorization.
    """
    
    def __init__(self):
        """Initialize topic modeling engine."""
        self.processing_pathway = []
    
    def nonnegative_matrix_factorization(self, data: np.ndarray, n_components: int,
                                        max_iter: int = 200) -> Dict:
        """
        Nonnegative Matrix Factorization.
        Based on Section 9.3
        
        Args:
            data: Non-negative input matrix (n_samples, n_features)
            n_components: Number of components/topics
            max_iter: Maximum iterations
            
        Returns:
            NMF results
        """
        self._log_step(f"NMF: {n_components} components, matrix shape {data.shape}")
        
        # Ensure non-negative
        data = np.maximum(data, 0)
        
        nmf = NMF(n_components=n_components, max_iter=max_iter,
                 random_state=42, init='random')
        W = nmf.fit_transform(data)
        H = nmf.components_
        
        # Reconstruct
        reconstruction = W @ H
        reconstruction_error = np.linalg.norm(data - reconstruction, 'fro')
        relative_error = reconstruction_error / np.linalg.norm(data, 'fro') if np.linalg.norm(data, 'fro') > 0 else 0
        
        results = {
            'W': W,  # Document-topic matrix
            'H': H,  # Topic-term matrix
            'reconstruction': reconstruction,
            'reconstruction_error': reconstruction_error,
            'relative_error': relative_error,
            'n_components': n_components,
            'n_iter': nmf.n_iter_
        }
        
        self._log_step(f"NMF complete: relative error={relative_error:.4f}, iterations={results['n_iter']}")
        return results
    
    def nmf_with_anchor_terms(self, data: np.ndarray, n_components: int,
                             anchor_terms: List[int] = None) -> Dict:
        """
        NMF with anchor terms initialization.
        Based on Section 9.4
        
        Args:
            data: Input matrix (n_samples, n_features)
            n_components: Number of components
            anchor_terms: Indices of anchor terms (one per component)
            
        Returns:
            NMF results with anchor terms
        """
        self._log_step(f"NMF with anchor terms: {n_components} components")
        
        if anchor_terms is None:
            # Select anchor terms automatically (highest variance terms)
            term_variances = np.var(data, axis=0)
            anchor_terms = np.argsort(term_variances)[-n_components:][::-1]
        
        # Initialize H using anchor terms
        H_init = np.zeros((n_components, data.shape[1]))
        for i, anchor_idx in enumerate(anchor_terms[:n_components]):
            H_init[i, anchor_idx] = 1.0
        
        # Normalize
        H_init = H_init / np.sum(H_init, axis=1, keepdims=True)
        
        # Run NMF with initialization
        nmf = NMF(n_components=n_components, init='custom',
                 H_init=H_init, random_state=42)
        W = nmf.fit_transform(data)
        H = nmf.components_
        
        results = {
            'W': W,
            'H': H,
            'anchor_terms': anchor_terms[:n_components],
            'n_components': n_components
        }
        
        self._log_step(f"NMF with anchors complete: anchors={anchor_terms[:n_components]}")
        return results
    
    def latent_dirichlet_allocation(self, documents: List[str], n_topics: int,
                                   max_iter: int = 10) -> Dict:
        """
        Latent Dirichlet Allocation for topic modeling.
        Based on Section 9.6
        
        Args:
            documents: List of document strings
            n_topics: Number of topics
            max_iter: Maximum iterations
            
        Returns:
            LDA results
        """
        self._log_step(f"LDA: {n_topics} topics, {len(documents)} documents")
        
        # Vectorize documents
        vectorizer = CountVectorizer(max_features=1000, stop_words='english')
        doc_term_matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        
        # Fit LDA
        lda = LatentDirichletAllocation(n_components=n_topics, max_iter=max_iter,
                                       random_state=42, learning_method='batch')
        lda.fit(doc_term_matrix)
        
        # Get topic-term distributions
        topic_term = lda.components_
        
        # Get document-topic distributions
        doc_topic = lda.transform(doc_term_matrix)
        
        # Extract top words per topic
        top_words_per_topic = []
        for topic_idx in range(n_topics):
            top_indices = np.argsort(topic_term[topic_idx])[-10:][::-1]
            top_words = [feature_names[idx] for idx in top_indices]
            top_words_per_topic.append(top_words)
        
        results = {
            'n_topics': n_topics,
            'topic_term_distribution': topic_term,
            'doc_topic_distribution': doc_topic,
            'top_words_per_topic': top_words_per_topic,
            'feature_names': feature_names,
            'log_likelihood': lda.score(doc_term_matrix),
            'perplexity': lda.perplexity(doc_term_matrix)
        }
        
        self._log_step(f"LDA complete: log-likelihood={results['log_likelihood']:.2f}, perplexity={results['perplexity']:.2f}")
        return results
    
    def extract_topics_from_nmf(self, nmf_results: Dict, feature_names: List[str],
                               top_n: int = 10) -> Dict:
        """
        Extract interpretable topics from NMF results.
        
        Args:
            nmf_results: Results from NMF
            feature_names: Names of features/terms
            top_n: Number of top terms per topic
            
        Returns:
            Topic interpretations
        """
        self._log_step(f"Extracting topics from NMF: top {top_n} terms per topic")
        
        H = nmf_results['H']
        n_topics = H.shape[0]
        
        topics = []
        for topic_idx in range(n_topics):
            top_indices = np.argsort(H[topic_idx])[-top_n:][::-1]
            top_terms = [(feature_names[idx], H[topic_idx, idx]) for idx in top_indices]
            topics.append({
                'topic_id': topic_idx,
                'top_terms': top_terms,
                'topic_strength': np.sum(H[topic_idx])
            })
        
        results = {
            'topics': topics,
            'n_topics': n_topics
        }
        
        self._log_step(f"Topic extraction complete: {n_topics} topics")
        return results
    
    def dominant_admixture_model(self, data: np.ndarray, n_topics: int) -> Dict:
        """
        Dominant admixture model for topic modeling.
        Based on Section 9.7
        
        Args:
            data: Document-term matrix (n_docs, n_terms)
            n_topics: Number of topics
            
        Returns:
            Dominant admixture results
        """
        self._log_step(f"Dominant admixture model: {n_topics} topics")
        
        # Find anchor terms (terms that appear predominantly in one topic)
        term_topic_scores = np.zeros((data.shape[1], n_topics))
        
        # Initialize with NMF
        nmf_results = self.nonnegative_matrix_factorization(data, n_topics)
        H = nmf_results['H']
        
        # Normalize H to get topic distributions
        H_normalized = H / np.sum(H, axis=0, keepdims=True)
        
        # Find dominant topics for each term
        dominant_topics = np.argmax(H_normalized, axis=0)
        
        results = {
            'topic_term_matrix': H,
            'dominant_topics': dominant_topics,
            'nmf_results': nmf_results,
            'n_topics': n_topics
        }
        
        self._log_step("Dominant admixture model complete")
        return results
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'TopicModelingEngine',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

