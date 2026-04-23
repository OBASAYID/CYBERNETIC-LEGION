# Quick Start Guide

## Installation

```bash
pip install -r requirements.txt
```

## Basic Usage

### 1. Simple Research Query

```python
from quantum_ai_core import QuantumAICore, format_response_for_display
import numpy as np

# Initialize
qai = QuantumAICore()

# Generate or load your data
data = np.random.randn(1000, 50)

# Process request
response = qai.process('research', data)

# Display with full engineering pathway
print(format_response_for_display(response))
```

### 2. Clustering Request

```python
# Generate clustered data
cluster1 = np.random.randn(100, 2) + [2, 2]
cluster2 = np.random.randn(100, 2) + [-2, -2]
data = np.vstack([cluster1, cluster2])

# Process clustering
response = qai.process('clustering', data, k=2)
print(format_response_for_display(response))
```

### 3. Topic Modeling

```python
documents = [
    "Machine learning algorithms process data",
    "Deep learning uses neural networks",
    "Data science combines statistics and computing"
]

response = qai.process('topic_modeling', documents, n_topics=2)
print(format_response_for_display(response))
```

### 4. Direct Module Access

```python
# Access specific algorithms directly
svd_results = qai.svd.compute_svd(data)
pca_results = qai.svd.principal_component_analysis(data, n_components=10)

cluster_results = qai.clustering.kmeans_clustering(data, k=5)
ml_results = qai.ml.support_vector_machine(X, y)
```

## Understanding the Response

Every response includes:

1. **Processing Summary**: What modules were used
2. **Engineering Pathway**: Complete processing steps
3. **Results**: Formatted results from all modules
4. **Interpretation**: Human-readable explanation
5. **Confidence Metrics**: Quality scores
6. **Recommendations**: Next steps

## Request Types

- `'research'`, `'query'`, `'question'`, `'analysis'` → Comprehensive analysis
- `'clustering'`, `'grouping'`, `'segmentation'` → Clustering algorithms
- `'classification'`, `'prediction'`, `'learning'` → Machine learning
- `'topic_modeling'`, `'document_analysis'` → Topic modeling
- `'graph_analysis'`, `'network_analysis'` → Graph algorithms

## Next Steps

- See `example_usage.py` for more examples
- Read `README.md` for detailed documentation
- Explore individual modules in `core_algorithms/`

