"""
Mathematical and Scientific Equation Formatter

Generates mathematical equations, formulas, and scientific notation
for algorithm descriptions and results.
"""

from typing import Dict, List, Optional, Any
import numpy as np


class MathematicalFormatter:
    """
    Formats mathematical equations and scientific notation for responses.
    """
    
    def __init__(self):
        """Initialize mathematical formatter."""
        self.processing_pathway = []
    
    def generate_algorithm_equations(self, algorithm_name: str, 
                                   parameters: Dict = None) -> Dict:
        """
        Generate mathematical equations for an algorithm.
        
        Args:
            algorithm_name: Name of the algorithm
            parameters: Algorithm parameters
            
        Returns:
            Dictionary with LaTeX equations and descriptions
        """
        equations = {}
        
        if algorithm_name == 'svd':
            equations = {
                'decomposition': r'A = U \Sigma V^T',
                'rank_k_approximation': r'A_k = U_k \Sigma_k V_k^T',
                'frobenius_norm': r'\|A - A_k\|_F^2 = \sum_{i=k+1}^r \sigma_i^2',
                'variance_explained': r'\text{Var}(k) = \frac{\sum_{i=1}^k \sigma_i^2}{\sum_{i=1}^r \sigma_i^2}'
            }
        
        elif algorithm_name == 'pca':
            equations = {
                'covariance': r'C = \frac{1}{n-1} X^T X',
                'eigenvalue_decomposition': r'C = V \Lambda V^T',
                'projection': r'Y = X V_k',
                'variance': r'\text{Var}(PC_i) = \lambda_i'
            }
        
        elif algorithm_name == 'kmeans':
            equations = {
                'objective': r'J = \sum_{i=1}^k \sum_{x \in C_i} \|x - \mu_i\|^2',
                'centroid': r'\mu_i = \frac{1}{|C_i|} \sum_{x \in C_i} x',
                'assignment': r'C_i = \{x : \|x - \mu_i\| \leq \|x - \mu_j\|, \forall j\}'
            }
        
        elif algorithm_name == 'perceptron':
            equations = {
                'update': r'w_{t+1} = w_t + \eta y_i x_i',
                'prediction': r'f(x) = \text{sign}(w^T x + b)',
                'margin': r'\gamma = \min_i \frac{y_i (w^T x_i + b)}{\|w\|}'
            }
        
        elif algorithm_name == 'svm':
            equations = {
                'primal': r'\min_{w,b} \frac{1}{2}\|w\|^2 + C\sum_{i=1}^n \xi_i',
                'constraints': r'y_i(w^T x_i + b) \geq 1 - \xi_i, \xi_i \geq 0',
                'dual': r'\max_{\alpha} \sum_{i=1}^n \alpha_i - \frac{1}{2}\sum_{i,j} \alpha_i \alpha_j y_i y_j K(x_i, x_j)',
                'kernel': r'K(x_i, x_j) = \phi(x_i)^T \phi(x_j)'
            }
        
        elif algorithm_name == 'johnson_lindenstrauss':
            equations = {
                'projection': r'y = \frac{1}{\sqrt{k}} R x',
                'distance_preservation': r'(1-\epsilon)\|x_i - x_j\|^2 \leq \|y_i - y_j\|^2 \leq (1+\epsilon)\|x_i - x_j\|^2',
                'dimension': r'k \geq \frac{4 \ln n}{\epsilon^2}'
            }
        
        elif algorithm_name == 'gaussian_mixture':
            equations = {
                'density': r'p(x) = \sum_{i=1}^k \pi_i \mathcal{N}(x; \mu_i, \Sigma_i)',
                'gaussian': r'\mathcal{N}(x; \mu, \Sigma) = \frac{1}{(2\pi)^{d/2}|\Sigma|^{1/2}} \exp\left(-\frac{1}{2}(x-\mu)^T\Sigma^{-1}(x-\mu)\right)',
                'log_likelihood': r'\ell(\theta) = \sum_{i=1}^n \log \sum_{j=1}^k \pi_j \mathcal{N}(x_i; \mu_j, \Sigma_j)'
            }
        
        elif algorithm_name == 'random_walk':
            equations = {
                'transition': r'P_{ij} = \frac{A_{ij}}{\sum_k A_{ik}}',
                'stationary': r'\pi = \pi P',
                'mixing_time': r'\tau(\epsilon) = \min\{t : \|P^t(i, \cdot) - \pi\|_{TV} \leq \epsilon\}'
            }
        
        elif algorithm_name == 'nmf':
            equations = {
                'factorization': r'V \approx W H',
                'objective': r'\|V - WH\|_F^2',
                'update_w': r'W_{ik} \leftarrow W_{ik} \frac{(VH^T)_{ik}}{(WHH^T)_{ik}}',
                'update_h': r'H_{kj} \leftarrow H_{kj} \frac{(W^TV)_{kj}}{(W^TWH)_{kj}}'
            }
        
        elif algorithm_name == 'lda':
            equations = {
                'document_topic': r'p(z_d | \alpha) = \text{Dirichlet}(\alpha)',
                'topic_word': r'p(w | z, \beta) = \text{Multinomial}(\beta_z)',
                'generative': r'p(w, z | \alpha, \beta) = p(z | \alpha) p(w | z, \beta)'
            }
        
        return equations
    
    def format_result_with_equations(self, result: Dict, algorithm_name: str) -> Dict:
        """
        Format result with mathematical equations.
        
        Args:
            result: Algorithm result dictionary
            algorithm_name: Name of algorithm used
            
        Returns:
            Formatted result with equations
        """
        equations = self.generate_algorithm_equations(algorithm_name)
        
        formatted = {
            'equations': equations,
            'result': result,
            'mathematical_description': self._generate_mathematical_description(
                algorithm_name, result, equations
            )
        }
        
        return formatted
    
    def _generate_mathematical_description(self, algorithm_name: str,
                                          result: Dict, equations: Dict) -> str:
        """Generate mathematical description of results."""
        desc = f"Algorithm: {algorithm_name}\n\n"
        desc += "Mathematical Formulation:\n"
        
        for key, eq in equations.items():
            desc += f"{key.replace('_', ' ').title()}: ${eq}$\n"
        
        if result:
            desc += "\nComputed Results:\n"
            for key, value in result.items():
                if isinstance(value, (int, float)):
                    desc += f"{key}: {value:.6f}\n"
                elif isinstance(value, np.ndarray) and value.size < 10:
                    desc += f"{key}: {value}\n"
        
        return desc
    
    def generate_latex_response(self, content: Dict, format_style: str = 'scientific') -> str:
        """
        Generate LaTeX-formatted response.
        
        Args:
            content: Content dictionary
            format_style: 'scientific', 'engineering', 'mathematical'
            
        Returns:
            LaTeX-formatted string
        """
        latex = []
        
        if format_style == 'scientific':
            latex.append(r"\documentclass{article}")
            latex.append(r"\usepackage{amsmath, amssymb, amsthm}")
            latex.append(r"\begin{document}")
            latex.append(r"\title{Quantum AI Processing Results}")
            latex.append(r"\maketitle")
        
        # Add sections based on content
        if 'algorithm' in content:
            latex.append(r"\section{Algorithm}")
            latex.append(f"\\textbf{{Algorithm}}: {content['algorithm']}")
        
        if 'equations' in content:
            latex.append(r"\section{Mathematical Formulation}")
            for name, eq in content['equations'].items():
                latex.append(f"\\textbf{{{name.replace('_', ' ').title()}}}:")
                latex.append(f"\\[{eq}\\]")
        
        if 'results' in content:
            latex.append(r"\section{Results}")
            for key, value in content['results'].items():
                if isinstance(value, (int, float)):
                    latex.append(f"${key} = {value:.6f}$")
        
        if format_style == 'scientific':
            latex.append(r"\end{document}")
        
        return "\n".join(latex)
    
    def format_statistical_result(self, result: Dict) -> str:
        """Format statistical result with mathematical notation."""
        formatted = []
        
        if 'mean' in result:
            formatted.append(f"Mean: $\\mu = {result['mean']:.6f}$")
        if 'std' in result:
            formatted.append(f"Standard Deviation: $\\sigma = {result['std']:.6f}$")
        if 'variance' in result:
            formatted.append(f"Variance: $\\sigma^2 = {result['variance']:.6f}$")
        if 'confidence_interval' in result:
            ci = result['confidence_interval']
            formatted.append(f"95% CI: $[{ci[0]:.6f}, {ci[1]:.6f}]$")
        
        return "\n".join(formatted)
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'MathematicalFormatter',
            'step': message,
            'timestamp': None
        })
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get the processing pathway for this analysis."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset the processing pathway."""
        self.processing_pathway = []

