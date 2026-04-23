# QuantumAICore Usage Guide

## Quick Start

```python
from server.quantum_ai.quantum_ai_core import QuantumAICore

qai = QuantumAICore()

# Access new modules
qai.deep_learning.train_pytorch_mlp(X, y)
qai.explainability.calculate_shap_values(model, X)
qai.visualization.plot_clusters(X, labels)
qai.preprocessing.assess_data_quality(X)
```

## Import Options

```python
# Option 1: Full path (recommended)
from server.quantum_ai.quantum_ai_core import QuantumAICore

# Option 2: If server is in path
from quantum_ai_core import QuantumAICore

# Option 3: Direct import
from server.quantum_ai import quantum_ai_core
qai = quantum_ai_core.QuantumAICore()
```

## Complete Examples

### 1. Deep Learning

```python
from server.quantum_ai.quantum_ai_core import QuantumAICore
import numpy as np

qai = QuantumAICore()

# Generate sample data
X = np.random.randn(1000, 10)
y = np.random.randint(0, 3, 1000)

# Train PyTorch MLP
results = qai.deep_learning.train_pytorch_mlp(
    X, y,
    hidden_sizes=[128, 64, 32],
    epochs=100,
    batch_size=32
)

# Auto-select model based on data type
results = qai.deep_learning.auto_select_model(
    X, y, data_type='tabular'
)

# Train TensorFlow model
results = qai.deep_learning.train_tensorflow_model(
    X, y,
    task='classification',
    epochs=50
)
```

### 2. Explainability

```python
from sklearn.ensemble import RandomForestClassifier

# Train a model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Calculate SHAP values
shap_results = qai.explainability.calculate_shap_values(
    model, X_test,
    explainer_type='tree'
)

# Generate LIME explanation
lime_explanation = qai.explainability.explain_with_lime(
    model, X_test,
    sample_idx=0,
    num_features=10
)

# Feature importance
importance = qai.explainability.permutation_feature_importance(
    model, X_test, y_test
)

# Fairness metrics
y_pred = model.predict(X_test)
protected_attr = X_test[:, 0] > np.median(X_test[:, 0])
fairness = qai.explainability.fairness_metrics(
    y_test, y_pred, protected_attr
)
```

### 3. Visualization

```python
from sklearn.cluster import KMeans

# Perform clustering
kmeans = KMeans(n_clusters=3)
labels = kmeans.fit_predict(X)
centers = kmeans.cluster_centers_

# Plot clusters
fig = qai.visualization.plot_clusters(
    X, labels, centers=centers
)

# PCA visualization
from sklearn.decomposition import PCA
pca = PCA(n_components=2)
X_pca = pca.fit_transform(X)

fig = qai.visualization.plot_pca(
    X_pca,
    pca_var=pca.explained_variance_ratio_,
    labels=labels
)

# Training history
fig = qai.visualization.plot_training_history(
    train_loss=[0.5, 0.4, 0.3],
    val_loss=[0.6, 0.5, 0.4],
    train_metric=[0.7, 0.8, 0.9],
    val_metric=[0.65, 0.75, 0.85]
)

# Confusion matrix
fig = qai.visualization.plot_confusion_matrix(
    y_true, y_pred,
    class_names=['Class A', 'Class B']
)
```

### 4. Preprocessing

```python
import pandas as pd
import numpy as np

# Create sample data
X = pd.DataFrame({
    'feature1': [1, 2, np.nan, 4, 5],
    'feature2': [10, np.nan, 30, 40, 50]
})

# Assess data quality
quality = qai.preprocessing.assess_data_quality(X)
print(f"Missing values: {quality['missing_values']['total_missing']}")

# Handle missing values
X_clean = qai.preprocessing.handle_missing_values(
    X, strategy='knn', threshold=0.5
)

# Scale features
X_scaled, scaler = qai.preprocessing.scale_features(
    X_clean, method='standard'
)

# Detect outliers
X_no_outliers, outlier_mask = qai.preprocessing.detect_outliers(
    X_scaled.values, method='iqr'
)

# Generate EDA report
report = qai.preprocessing.generate_eda_report(X_clean, y=y)
```

## Complete Workflow Example

```python
from server.quantum_ai.quantum_ai_core import QuantumAICore
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

# Initialize Quantum AI Core
qai = QuantumAICore()

# ==================== 1. Data Preprocessing ====================
print("Step 1: Preprocessing data...")

# Load or create data
X = pd.DataFrame(np.random.randn(1000, 10))
y = np.random.randint(0, 3, 1000)

# Assess quality
quality = qai.preprocessing.assess_data_quality(X, y)
print(f"Initial quality: {quality['shape']}")

# Handle missing values
X_clean = qai.preprocessing.handle_missing_values(X, strategy='knn')

# Detect outliers
X_no_outliers, outlier_mask = qai.preprocessing.detect_outliers(
    X_clean.values, method='iqr'
)
print(f"Removed {outlier_mask.sum()} outliers")

# Scale features
X_scaled, scaler = qai.preprocessing.scale_features(
    X_no_outliers, method='standard'
)

# Split data
X_train, X_test, y_train, y_test = train_test_split(
    X_scaled, y, test_size=0.2, random_state=42
)

# ==================== 2. Train Deep Learning Model ====================
print("\nStep 2: Training deep learning model...")

results = qai.deep_learning.train_pytorch_mlp(
    X_train, y_train,
    X_val=X_test, y_val=y_test,
    hidden_sizes=[128, 64, 32],
    epochs=50,
    batch_size=32
)

print(f"Final training loss: {results['train_losses'][-1]:.4f}")

# ==================== 3. Visualize Training ====================
print("\nStep 3: Visualizing training history...")

fig = qai.visualization.plot_training_history(
    train_loss=results['train_losses'],
    val_loss=results.get('val_losses'),
    train_metric=None,
    val_metric=None
)

# ==================== 4. Explain Model ====================
print("\nStep 4: Explaining model predictions...")

model = results['model']
model.eval()

# Get predictions
import torch
X_test_tensor = torch.FloatTensor(X_test)
with torch.no_grad():
    predictions = model(X_test_tensor).numpy()

y_pred = np.argmax(predictions, axis=1)

# SHAP values
shap_results = qai.explainability.calculate_shap_values(
    model, X_test[:100],  # Use subset for speed
    explainer_type='kernel'
)

# Feature importance
importance = qai.explainability.permutation_feature_importance(
    model, X_test, y_test
)

# ==================== 5. Visualize Results ====================
print("\nStep 5: Visualizing results...")

# Confusion matrix
fig = qai.visualization.plot_confusion_matrix(
    y_test, y_pred,
    class_names=[f'Class {i}' for i in range(3)]
)

# Feature importance
feature_names = [f'Feature {i}' for i in range(X_scaled.shape[1])]
fig = qai.visualization.plot_feature_importance(
    feature_names,
    importance['importances_mean'],
    top_n=10
)

# ==================== 6. Generate Final Report ====================
print("\nStep 6: Generating final EDA report...")

final_report = qai.preprocessing.generate_eda_report(X_scaled, y=y)
print("Complete workflow finished!")
```

## Available Modules

### Deep Learning (`qai.deep_learning`)
- `train_pytorch_mlp()` - Train PyTorch MLP
- `train_pytorch_lstm()` - Train PyTorch LSTM
- `train_tensorflow_model()` - Train TensorFlow model
- `auto_select_model()` - Auto-select architecture
- `_train_cnn()` - Train CNN (internal)

### Explainability (`qai.explainability`)
- `calculate_shap_values()` - SHAP values
- `plot_shap_summary()` - SHAP summary plots
- `plot_shap_force()` - SHAP force plots
- `explain_with_lime()` - LIME explanations
- `permutation_feature_importance()` - Permutation importance
- `model_feature_importance()` - Model-based importance
- `partial_dependence_analysis()` - Partial dependence
- `model_transparency_report()` - Transparency report
- `fairness_metrics()` - Fairness analysis

### Visualization (`qai.visualization`)
- `plot_clusters()` - Cluster visualization
- `plot_silhouette()` - Silhouette analysis
- `plot_pca()` - PCA visualization
- `plot_tsne()` - t-SNE visualization
- `plot_confusion_matrix()` - Confusion matrix
- `plot_roc_curve()` - ROC curve
- `plot_training_history()` - Training curves
- `plot_feature_importance()` - Feature importance
- `plot_correlation_matrix()` - Correlation matrix
- `plot_distributions()` - Feature distributions

### Preprocessing (`qai.preprocessing`)
- `assess_data_quality()` - Quality assessment
- `profile_data()` - Data profiling
- `handle_missing_values()` - Missing value handling
- `detect_outliers()` - Outlier detection
- `scale_features()` - Feature scaling
- `encode_categorical()` - Categorical encoding
- `create_polynomial_features()` - Polynomial features
- `create_interaction_features()` - Interaction features
- `generate_eda_report()` - EDA report

### Legacy Modules (Still Available)
- `qai.high_dim` - High-dimensional analysis
- `qai.svd` - SVD analysis
- `qai.ml` - Machine learning
- `qai.clustering` - Clustering
- `qai.graph` - Graph analysis
- `qai.topic_modeling` - Topic modeling
- `qai.preprocessor` - DataPreprocessor (alternative to preprocessing)

## Processing Pathway

All modules log their processing steps:

```python
# Get processing pathway from any module
pathway = qai.deep_learning.get_processing_pathway()
print(f"Deep learning steps: {len(pathway)}")

pathway = qai.explainability.get_processing_pathway()
print(f"Explainability steps: {len(pathway)}")

# Reset pathway
qai.deep_learning.reset_pathway()
```

## Configuration

```python
# Initialize with custom settings
qai = QuantumAICore(
    response_format='scientific',
    include_equations=True,
    equation_format='latex',
    writing_style='professional'
)

# Deep learning framework (set during initialization)
# Default: PyTorch
qai.deep_learning = DeepLearningProcessor(framework='pytorch')
# Or TensorFlow
qai.deep_learning = DeepLearningProcessor(framework='tensorflow')
```

## Error Handling

All modules handle missing dependencies gracefully:

```python
try:
    shap_results = qai.explainability.calculate_shap_values(model, X)
except ImportError:
    print("SHAP not installed. Install with: pip install shap")

try:
    fig = qai.visualization.plot_tsne(X, labels=y)
except ImportError:
    print("scikit-learn required for t-SNE")
```

## Best Practices

1. **Preprocess First**: Always preprocess data before training
2. **Visualize Early**: Use visualization to understand data
3. **Explain Models**: Use explainability to understand predictions
4. **Check Pathways**: Review processing pathways for transparency
5. **Handle Errors**: Check for missing dependencies

## Dependencies

All required dependencies are listed in `server/quantum_ai/requirements.txt`:
- numpy, scipy, scikit-learn
- torch, tensorflow
- shap, lime
- plotly, seaborn
- matplotlib, pandas

Install with:
```bash
pip install -r server/quantum_ai/requirements.txt
```



