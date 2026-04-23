# Mathematical and Scientific Response Formatting

## Overview

The Quantum AI Core now supports generating responses with mathematical equations, scientific notation, and customizable format styles. This allows the system to present results in a way that reflects the mathematical and scientific rigor of the processing.

## Response Format Styles

### 1. Scientific Format (`'scientific'`)
- Emphasizes scientific methodology
- Includes mathematical equations in LaTeX format
- Provides statistical notation
- Shows theoretical foundations

### 2. Mathematical Format (`'mathematical'`)
- Emphasizes mathematical rigor
- Comprehensive equation formulations
- Mathematical descriptions of algorithms
- Theoretical basis with proofs/convergence properties

### 3. Engineering Format (`'engineering'`)
- Emphasizes engineering practices
- Systematic approach documentation
- Performance metrics
- Computational complexity analysis

### 4. Standard Format (`'standard'`)
- Standard presentation
- Minimal mathematical notation
- Focus on results and interpretation

## Usage Examples

### Basic Usage with Equations

```python
from quantum_ai_core import QuantumAICore, format_response_for_display
import numpy as np

# Initialize with scientific format and equations
qai = QuantumAICore(
    response_format='scientific',
    include_equations=True,
    equation_format='latex'
)

# Process request
data = np.random.randn(1000, 50)
response = qai.process('research', data)

# Display with equations
print(format_response_for_display(response, show_equations=True))
```

### Per-Request Format Control

```python
# Override format per request
response = qai.process(
    'research', 
    data,
    response_format='mathematical',  # Override default
    include_equations=True,
    equation_format='latex'
)
```

### Mathematical Format Example

```python
# Mathematical format emphasizes equations
qai = QuantumAICore(
    response_format='mathematical',
    include_equations=True,
    equation_format='latex'
)

response = qai.process('clustering', data, k=5)
print(format_response_for_display(response, show_equations=True))
```

## Supported Mathematical Equations

The system generates equations for:

### SVD (Singular Value Decomposition)
- `A = U Σ V^T`
- Rank-k approximation: `A_k = U_k Σ_k V_k^T`
- Frobenius norm error
- Variance explained

### PCA (Principal Component Analysis)
- Covariance matrix: `C = (1/(n-1)) X^T X`
- Eigenvalue decomposition: `C = V Λ V^T`
- Projection: `Y = X V_k`

### k-Means Clustering
- Objective function: `J = Σ Σ ||x - μ_i||²`
- Centroid update: `μ_i = (1/|C_i|) Σ x`
- Assignment rule

### Support Vector Machines
- Primal formulation
- Dual formulation
- Kernel functions

### Perceptron
- Weight update: `w_{t+1} = w_t + η y_i x_i`
- Prediction: `f(x) = sign(w^T x + b)`
- Margin calculation

### NMF (Nonnegative Matrix Factorization)
- Factorization: `V ≈ W H`
- Update rules
- Objective function

### Johnson-Lindenstrauss
- Projection formula
- Distance preservation bounds
- Dimension requirements

### Random Walks
- Transition probabilities
- Stationary distribution
- Mixing time

## Equation Formats

### LaTeX Format (Default)
- Standard LaTeX notation
- Can be rendered with LaTeX processors
- Example: `A = U \Sigma V^T`

### Unicode Format
- Mathematical Unicode symbols
- Readable in plain text
- Example: `A = U Σ Vᵀ`

### ASCII Format
- ASCII approximations
- Maximum compatibility
- Example: `A = U * S * V^T`

## Response Structure with Equations

When equations are included, responses contain:

1. **Mathematical Formulation Section**
   - Algorithm equations
   - Mathematical descriptions
   - Theoretical basis

2. **Algorithm Details with Equations**
   - Key equations per algorithm
   - Equation format specification
   - Mathematical notation

3. **Statistical Notation**
   - Mean: `μ = value`
   - Standard deviation: `σ = value`
   - Variance: `σ² = value`
   - Confidence intervals

## Customization

### Change Default Format

```python
# Set default format at initialization
qai = QuantumAICore(
    response_format='mathematical',  # Default format
    include_equations=True,
    equation_format='latex'
)
```

### Disable Equations

```python
# No equations in response
qai = QuantumAICore(include_equations=False)

# Or per request
response = qai.process('research', data, include_equations=False)
```

### Direct Equation Access

```python
from core_algorithms.mathematical_formatter import MathematicalFormatter

formatter = MathematicalFormatter()
equations = formatter.generate_algorithm_equations('svd')

for name, eq in equations.items():
    print(f"{name}: {eq}")
```

## Integration with Display

The `format_response_for_display()` function automatically:
- Shows mathematical equations when available
- Formats statistical notation
- Displays LaTeX equations (can be rendered)
- Organizes mathematical formulation section

## Best Practices

1. **Use Scientific Format** for research and analysis
2. **Use Mathematical Format** for theoretical work
3. **Use Engineering Format** for practical applications
4. **Include Equations** when mathematical rigor is important
5. **Use LaTeX Format** for publication-ready output

## Example Output

```
MATHEMATICAL FORMULATION:
  Algorithm: Singular Value Decomposition
  Description: Decomposes matrix A into UΣV^T where U and V are orthogonal
  
  Key Equations:
    Decomposition: A = U \Sigma V^T
    Rank K Approximation: A_k = U_k \Sigma_k V_k^T
    Frobenius Norm: \|A - A_k\|_F^2 = \sum_{i=k+1}^r \sigma_i^2
    Variance Explained: \text{Var}(k) = \frac{\sum_{i=1}^k \sigma_i^2}{\sum_{i=1}^r \sigma_i^2}
```

---

This mathematical formatting capability ensures that responses reflect the sophisticated mathematical and scientific processing capabilities of the Quantum AI Core.

