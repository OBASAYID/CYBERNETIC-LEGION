# Quantum AI Core v2.0 - API Reference

Complete API documentation for all modules and methods in Quantum AI Core v2.0.

## Table of Contents

- [Deep Learning Module](#deep-learning-module)
- [Explainability Module](#explainability-module)
- [Visualization Module](#visualization-module)
- [Preprocessing Module](#preprocessing-module)
- [QuantumAICore](#quantum-a-i-core)

---

## Deep Learning Module

### `DeepLearningProcessor`

Main processor for deep learning operations with PyTorch, TensorFlow, and NumPy support.

#### Initialization

```python
DeepLearningProcessor(framework: str = 'pytorch')
```

**Parameters:**
- `framework` (str): Framework to use. Options: `'pytorch'`, `'tensorflow'`, `'numpy'`, `'auto'`. Default: `'pytorch'`

**Example:**
```python
from core_algorithms.deep_learning import DeepLearningProcessor

dl = DeepLearningProcessor(framework='pytorch')
```

#### Methods

##### `train_pytorch_mlp()`

Train a PyTorch Multi-Layer Perceptron (MLP) for tabular data.

```python
train_pytorch_mlp(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray] = None,
    y_val: Optional[np.ndarray] = None,
    hidden_sizes: List[int] = None,
    epochs: int = 100,
    batch_size: int = 32,
    learning_rate: float = 0.001
) -> Dict
```

**Parameters:**
- `X_train` (np.ndarray): Training features
- `y_train` (np.ndarray): Training labels
- `X_val` (Optional[np.ndarray]): Validation features
- `y_val` (Optional[np.ndarray]): Validation labels
- `hidden_sizes` (List[int]): List of hidden layer sizes. Default: `[128, 64, 32]`
- `epochs` (int): Number of training epochs. Default: `100`
- `batch_size` (int): Batch size. Default: `32`
- `learning_rate` (float): Learning rate. Default: `0.001`

**Returns:**
- `Dict`: Dictionary containing:
  - `model`: Trained PyTorch model
  - `train_losses`: List of training losses per epoch
  - `val_losses`: List of validation losses (if validation data provided)
  - `device`: Device used (`cpu` or `cuda`)
  - `framework`: `'pytorch'`
  - `architecture`: `'MLP'`
  - `input_size`: Input feature size
  - `output_size`: Output class size

**Example:**
```python
results = dl.train_pytorch_mlp(
    X_train, y_train,
    X_val=X_test, y_val=y_test,
    hidden_sizes=[128, 64, 32],
    epochs=50,
    batch_size=32
)
```

##### `train_pytorch_lstm()`

Train a PyTorch LSTM network for sequence data.

```python
train_pytorch_lstm(
    X_train: np.ndarray,
    y_train: np.ndarray,
    sequence_length: int = 10,
    hidden_size: int = 128,
    epochs: int = 50,
    batch_size: int = 32,
    learning_rate: float = 0.001
) -> Dict
```

**Parameters:**
- `X_train` (np.ndarray): Training sequences
- `y_train` (np.ndarray): Target values
- `sequence_length` (int): Length of sequences. Default: `10`
- `hidden_size` (int): LSTM hidden size. Default: `128`
- `epochs` (int): Training epochs. Default: `50`
- `batch_size` (int): Batch size. Default: `32`
- `learning_rate` (float): Learning rate. Default: `0.001`

**Returns:**
- `Dict`: Dictionary containing model, training losses, and metadata

**Example:**
```python
results = dl.train_pytorch_lstm(
    X_train, y_train,
    sequence_length=20,
    hidden_size=128,
    epochs=50
)
```

##### `train_tensorflow_model()`

Train a TensorFlow model.

```python
train_tensorflow_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray] = None,
    y_val: Optional[np.ndarray] = None,
    hidden_sizes: List[int] = None,
    epochs: int = 100,
    batch_size: int = 32,
    task: str = 'classification'
) -> Dict
```

**Parameters:**
- `X_train` (np.ndarray): Training features
- `y_train` (np.ndarray): Training labels
- `X_val` (Optional[np.ndarray]): Validation features
- `y_val` (Optional[np.ndarray]): Validation labels
- `hidden_sizes` (List[int]): Hidden layer sizes. Default: `[128, 64, 32]`
- `epochs` (int): Training epochs. Default: `100`
- `batch_size` (int): Batch size. Default: `32`
- `task` (str): Task type. Options: `'classification'`, `'regression'`. Default: `'classification'`

**Returns:**
- `Dict`: Dictionary containing model, training history, and metadata

**Example:**
```python
results = dl.train_tensorflow_model(
    X_train, y_train,
    task='classification',
    epochs=50
)
```

##### `auto_select_model()`

Automatically select and train optimal model based on data characteristics.

```python
auto_select_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    data_type: str = 'tabular'
) -> Dict
```

**Parameters:**
- `X_train` (np.ndarray): Training data
- `y_train` (np.ndarray): Labels
- `data_type` (str): Data type. Options: `'tabular'`, `'image'`, `'sequence'`. Default: `'tabular'`

**Returns:**
- `Dict`: Training results with selected model

**Example:**
```python
results = dl.auto_select_model(X_train, y_train, data_type='tabular')
```

##### `get_processing_pathway()`

Get the processing pathway log.

```python
get_processing_pathway() -> List[Dict]
```

**Returns:**
- `List[Dict]`: List of processing steps with timestamps

##### `reset_pathway()`

Reset the processing pathway.

```python
reset_pathway() -> None
```

---

## Explainability Module

### `ExplainabilityEngine`

Comprehensive explainable AI tools for model interpretability.

#### Initialization

```python
ExplainabilityEngine()
```

**Example:**
```python
from core_algorithms.explainability import ExplainabilityEngine

xai = ExplainabilityEngine()
```

#### Methods

##### `calculate_shap_values()`

Calculate SHAP (SHapley Additive exPlanations) values for model predictions.

```python
calculate_shap_values(
    model: Any,
    X: np.ndarray,
    explainer_type: str = 'tree',
    feature_names: Optional[List[str]] = None
) -> Dict
```

**Parameters:**
- `model`: Trained model (must support SHAP explainers)
- `X` (np.ndarray): Feature matrix to explain
- `explainer_type` (str): SHAP explainer type. Options: `'tree'`, `'kernel'`, `'linear'`. Default: `'tree'`
- `feature_names` (Optional[List[str]]): Feature names. Default: `None`

**Returns:**
- `Dict`: Dictionary containing:
  - `shap_values`: SHAP values array
  - `base_value`: Base value for predictions
  - `sample_size`: Number of samples explained

**Example:**
```python
shap_results = xai.calculate_shap_values(
    model, X_test,
    explainer_type='tree'
)
```

##### `explain_with_lime()`

Generate LIME (Local Interpretable Model-agnostic Explanations) for individual predictions.

```python
explain_with_lime(
    model: Any,
    X: np.ndarray,
    sample_idx: int = 0,
    feature_names: Optional[List[str]] = None,
    num_features: int = 10,
    mode: str = 'classification'
) -> Dict
```

**Parameters:**
- `model`: Trained model
- `X` (np.ndarray): Feature matrix
- `sample_idx` (int): Index of sample to explain. Default: `0`
- `feature_names` (Optional[List[str]]): Feature names. Default: `None`
- `num_features` (int): Number of top features to show. Default: `10`
- `mode` (str): Explanation mode. Options: `'classification'`, `'regression'`. Default: `'classification'`

**Returns:**
- `Dict`: Dictionary containing:
  - `explanation`: LIME explanation object
  - `top_features`: List of top contributing features
  - `prediction`: Model prediction for the sample

**Example:**
```python
lime_explanation = xai.explain_with_lime(
    model, X_test,
    sample_idx=0,
    num_features=10
)
```

##### `permutation_feature_importance()`

Calculate permutation-based feature importance.

```python
permutation_feature_importance(
    model: Any,
    X: np.ndarray,
    y: np.ndarray,
    feature_names: Optional[List[str]] = None,
    metric: str = 'accuracy',
    n_repeats: int = 10
) -> Dict
```

**Parameters:**
- `model`: Trained model
- `X` (np.ndarray): Feature matrix
- `y` (np.ndarray): True labels
- `feature_names` (Optional[List[str]]): Feature names. Default: `None`
- `metric` (str): Metric to use. Options: `'accuracy'`, `'f1'`, `'r2'`, etc. Default: `'accuracy'`
- `n_repeats` (int): Number of permutation repeats. Default: `10`

**Returns:**
- `Dict`: Dictionary containing:
  - `importances_mean`: Mean importance values
  - `importances_std`: Standard deviation of importance values
  - `top_features`: List of top features sorted by importance

**Example:**
```python
importance = xai.permutation_feature_importance(
    model, X_test, y_test,
    metric='accuracy',
    n_repeats=10
)
```

##### `model_feature_importance()`

Extract built-in feature importance from model (for tree-based models).

```python
model_feature_importance(
    model: Any,
    feature_names: Optional[List[str]] = None
) -> pd.DataFrame
```

**Parameters:**
- `model`: Trained model with `feature_importances_` attribute
- `feature_names` (Optional[List[str]]): Feature names. Default: `None`

**Returns:**
- `pd.DataFrame`: DataFrame with feature names and importance values

**Example:**
```python
importance_df = xai.model_feature_importance(
    model,
    feature_names=[f"Feature_{i}" for i in range(10)]
)
```

##### `partial_dependence_analysis()`

Calculate partial dependence for a specific feature.

```python
partial_dependence_analysis(
    model: Any,
    X: np.ndarray,
    feature_idx: int,
    feature_names: Optional[List[str]] = None,
    num_points: int = 50
) -> Dict
```

**Parameters:**
- `model`: Trained model
- `X` (np.ndarray): Feature matrix
- `feature_idx` (int): Index of feature to analyze
- `feature_names` (Optional[List[str]]): Feature names. Default: `None`
- `num_points` (int): Number of points to evaluate. Default: `50`

**Returns:**
- `Dict`: Dictionary containing partial dependence values

**Example:**
```python
pd_results = xai.partial_dependence_analysis(
    model, X_test,
    feature_idx=0,
    num_points=50
)
```

##### `fairness_metrics()`

Calculate fairness metrics across protected groups.

```python
fairness_metrics(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    protected_attr: np.ndarray,
    group_names: Optional[Dict[int, str]] = None
) -> Dict
```

**Parameters:**
- `y_true` (np.ndarray): True labels
- `y_pred` (np.ndarray): Predicted labels
- `protected_attr` (np.ndarray): Protected attribute (group membership)
- `group_names` (Optional[Dict[int, str]]): Mapping of group IDs to names. Default: `None`

**Returns:**
- `Dict`: Dictionary containing:
  - Per-group metrics (accuracy, precision, recall, F1)
  - `fairness_metrics`: Overall fairness metrics (disparate impact, equalized odds)

**Example:**
```python
fairness = xai.fairness_metrics(
    y_test, y_pred, protected_attr,
    group_names={0: 'Group A', 1: 'Group B'}
)
```

##### `model_transparency_report()`

Generate comprehensive model transparency report.

```python
model_transparency_report(
    model: Any,
    X: np.ndarray,
    y: np.ndarray,
    model_name: str = "Model"
) -> Dict
```

**Parameters:**
- `model`: Trained model
- `X` (np.ndarray): Feature matrix
- `y` (np.ndarray): True labels
- `model_name` (str): Name of the model. Default: `"Model"`

**Returns:**
- `Dict`: Dictionary containing:
  - `model_type`: Type of model
  - `feature_count`: Number of features
  - `sample_count`: Number of samples
  - `performance`: Performance metrics

**Example:**
```python
report = xai.model_transparency_report(
    model, X_test, y_test,
    model_name="Random Forest"
)
```

##### `get_processing_pathway()` / `reset_pathway()`

Same as DeepLearningProcessor.

---

## Visualization Module

### `VisualizationEngine`

Advanced visualization tools with matplotlib and plotly support.

#### Initialization

```python
VisualizationEngine(backend: str = 'matplotlib', style: str = 'default')
```

**Parameters:**
- `backend` (str): Backend to use. Options: `'matplotlib'`, `'plotly'`. Default: `'matplotlib'`
- `style` (str): Plot style. Default: `'default'`

**Example:**
```python
from core_algorithms.visualization import VisualizationEngine

viz = VisualizationEngine(backend='matplotlib')
```

#### Methods

##### `plot_clusters()`

Plot clustering results with optional centroids.

```python
plot_clusters(
    X: np.ndarray,
    labels: np.ndarray,
    centers: Optional[np.ndarray] = None,
    title: str = "Clustering Results",
    interactive: bool = False
) -> Any
```

**Parameters:**
- `X` (np.ndarray): Feature matrix (2D for visualization)
- `labels` (np.ndarray): Cluster labels
- `centers` (Optional[np.ndarray]): Cluster centroids. Default: `None`
- `title` (str): Plot title. Default: `"Clustering Results"`
- `interactive` (bool): Use interactive plot (plotly). Default: `False`

**Returns:**
- `matplotlib.figure.Figure` or `plotly.graph_objects.Figure`: Plot figure

**Example:**
```python
fig = viz.plot_clusters(X, labels, centers=centroids, title="K-Means")
```

##### `plot_pca()`

Plot PCA (Principal Component Analysis) results.

```python
plot_pca(
    X: np.ndarray,
    pca_components: Optional[np.ndarray] = None,
    pca_var: Optional[np.ndarray] = None,
    labels: Optional[np.ndarray] = None,
    interactive: bool = False
) -> Any
```

**Parameters:**
- `X` (np.ndarray): PCA-transformed data (2D)
- `pca_components` (Optional[np.ndarray]): PCA components. Default: `None`
- `pca_var` (Optional[np.ndarray]): Explained variance ratios. Default: `None`
- `labels` (Optional[np.ndarray]): Optional labels for coloring. Default: `None`
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_pca(X_pca, pca_var=variance, labels=y)
```

##### `plot_tsne()`

Plot t-SNE (t-Distributed Stochastic Neighbor Embedding) visualization.

```python
plot_tsne(
    X: np.ndarray,
    perplexity: int = 30,
    labels: Optional[np.ndarray] = None,
    interactive: bool = False
) -> Any
```

**Parameters:**
- `X` (np.ndarray): Feature matrix
- `perplexity` (int): t-SNE perplexity parameter. Default: `30`
- `labels` (Optional[np.ndarray]): Optional labels for coloring. Default: `None`
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_tsne(X, perplexity=30, labels=y)
```

##### `plot_confusion_matrix()`

Plot confusion matrix heatmap.

```python
plot_confusion_matrix(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    class_names: Optional[List[str]] = None,
    interactive: bool = False
) -> Any
```

**Parameters:**
- `y_true` (np.ndarray): True labels
- `y_pred` (np.ndarray): Predicted labels
- `class_names` (Optional[List[str]]): Class names. Default: `None`
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_confusion_matrix(
    y_test, y_pred,
    class_names=['Class A', 'Class B']
)
```

##### `plot_roc_curve()`

Plot ROC (Receiver Operating Characteristic) curve.

```python
plot_roc_curve(
    y_true: np.ndarray,
    y_score: np.ndarray,
    interactive: bool = False
) -> Any
```

**Parameters:**
- `y_true` (np.ndarray): True binary labels
- `y_score` (np.ndarray): Predicted scores/probabilities
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_roc_curve(y_test, y_proba)
```

##### `plot_training_history()`

Plot training history (loss and metrics over epochs).

```python
plot_training_history(
    train_loss: List[float],
    val_loss: Optional[List[float]] = None,
    train_metric: Optional[List[float]] = None,
    val_metric: Optional[List[float]] = None,
    metric_name: str = 'Accuracy',
    interactive: bool = False
) -> Any
```

**Parameters:**
- `train_loss` (List[float]): Training loss per epoch
- `val_loss` (Optional[List[float]]): Validation loss per epoch. Default: `None`
- `train_metric` (Optional[List[float]]): Training metric per epoch. Default: `None`
- `val_metric` (Optional[List[float]]): Validation metric per epoch. Default: `None`
- `metric_name` (str): Name of the metric. Default: `'Accuracy'`
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_training_history(
    train_loss, val_loss,
    train_metric=train_acc,
    val_metric=val_acc,
    metric_name='Accuracy'
)
```

##### `plot_feature_importance()`

Plot feature importance bar chart.

```python
plot_feature_importance(
    feature_names: List[str],
    importance_values: np.ndarray,
    top_n: int = 20,
    interactive: bool = False
) -> Any
```

**Parameters:**
- `feature_names` (List[str]): List of feature names
- `importance_values` (np.ndarray): Importance values
- `top_n` (int): Number of top features to show. Default: `20`
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_feature_importance(
    feature_names, importances,
    top_n=10
)
```

##### `plot_correlation_matrix()`

Plot correlation matrix heatmap.

```python
plot_correlation_matrix(
    X: np.ndarray,
    feature_names: Optional[List[str]] = None,
    interactive: bool = False
) -> Any
```

**Parameters:**
- `X` (np.ndarray): Feature matrix
- `feature_names` (Optional[List[str]]): Feature names. Default: `None`
- `interactive` (bool): Use interactive plot. Default: `False`

**Returns:**
- Plot figure

**Example:**
```python
fig = viz.plot_correlation_matrix(X, feature_names=feature_names)
```

##### `save_figure()`

Save a matplotlib figure to file.

```python
save_figure(
    fig: Any,
    filename: str,
    format: str = 'png',
    dpi: int = 300
) -> None
```

**Parameters:**
- `fig`: Matplotlib figure object
- `filename` (str): Output filename
- `format` (str): File format. Default: `'png'`
- `dpi` (int): Resolution. Default: `300`

**Example:**
```python
viz.save_figure(fig, 'plot.png', format='png', dpi=300)
```

##### `get_processing_pathway()` / `reset_pathway()`

Same as DeepLearningProcessor.

---

## Preprocessing Module

### `PreprocessingEngine`

Comprehensive data preprocessing and EDA tools.

#### Initialization

```python
PreprocessingEngine()
```

**Example:**
```python
from core_algorithms.preprocessing_eda import PreprocessingEngine

prep = PreprocessingEngine()
```

#### Methods

##### `assess_data_quality()`

Comprehensive data quality assessment.

```python
assess_data_quality(
    X: Union[np.ndarray, pd.DataFrame],
    y: Optional[np.ndarray] = None
) -> Dict
```

**Parameters:**
- `X` (Union[np.ndarray, pd.DataFrame]): Feature matrix
- `y` (Optional[np.ndarray]): Optional target variable. Default: `None`

**Returns:**
- `Dict`: Dictionary containing:
  - `shape`: Data shape
  - `missing_values`: Dictionary with `count`, `percentage`, `total_missing`
  - `data_types`: Data types per column
  - `duplicates`: Number of duplicate rows
  - `numeric_summary`: Statistical summary
  - `memory_usage`: Memory usage in MB

**Example:**
```python
quality = prep.assess_data_quality(X, y=y)
print(f"Missing: {quality['missing_values']['total_missing']}")
```

##### `profile_data()`

Generate detailed data profile.

```python
profile_data(X: Union[np.ndarray, pd.DataFrame]) -> Dict
```

**Parameters:**
- `X` (Union[np.ndarray, pd.DataFrame]): Feature matrix

**Returns:**
- `Dict`: Dictionary with per-feature statistics

**Example:**
```python
profile = prep.profile_data(X)
```

##### `handle_missing_values()`

Handle missing values with multiple strategies.

```python
handle_missing_values(
    X: Union[np.ndarray, pd.DataFrame],
    strategy: str = 'mean',
    threshold: float = 0.5
) -> Union[np.ndarray, pd.DataFrame]
```

**Parameters:**
- `X` (Union[np.ndarray, pd.DataFrame]): Feature matrix
- `strategy` (str): Imputation strategy. Options: `'mean'`, `'median'`, `'knn'`, `'forward_fill'`, `'drop'`. Default: `'mean'`
- `threshold` (float): Maximum missing percentage per feature before dropping. Default: `0.5`

**Returns:**
- `Union[np.ndarray, pd.DataFrame]`: Data with imputed values (same type as input)

**Example:**
```python
X_clean = prep.handle_missing_values(X, strategy='knn', threshold=0.5)
```

##### `detect_outliers()`

Detect outliers using multiple methods.

```python
detect_outliers(
    X: np.ndarray,
    method: str = 'iqr',
    threshold: float = 1.5
) -> Tuple[np.ndarray, np.ndarray]
```

**Parameters:**
- `X` (np.ndarray): Feature matrix
- `method` (str): Detection method. Options: `'iqr'`, `'zscore'`, `'isolation_forest'`. Default: `'iqr'`
- `threshold` (float): Threshold parameter. Default: `1.5`

**Returns:**
- `Tuple[np.ndarray, np.ndarray]`: Tuple of (clean_data, outlier_mask)

**Example:**
```python
X_clean, outlier_mask = prep.detect_outliers(X, method='iqr', threshold=1.5)
```

##### `scale_features()`

Scale features using multiple methods.

```python
scale_features(
    X: np.ndarray,
    method: str = 'standard',
    fit_on_training: bool = True
) -> Tuple[np.ndarray, Any]
```

**Parameters:**
- `X` (np.ndarray): Feature matrix
- `method` (str): Scaling method. Options: `'standard'`, `'minmax'`, `'robust'`. Default: `'standard'`
- `fit_on_training` (bool): Whether to fit on this data. Default: `True`

**Returns:**
- `Tuple[np.ndarray, Any]`: Tuple of (scaled_data, scaler_object)

**Example:**
```python
X_scaled, scaler = prep.scale_features(X, method='standard')
```

##### `encode_categorical()`

Encode categorical variables.

```python
encode_categorical(
    X: pd.DataFrame,
    method: str = 'onehot',
    categorical_cols: Optional[List[str]] = None
) -> Tuple[pd.DataFrame, Dict]
```

**Parameters:**
- `X` (pd.DataFrame): Feature matrix
- `method` (str): Encoding method. Options: `'onehot'`, `'label'`, `'ordinal'`. Default: `'onehot'`
- `categorical_cols` (Optional[List[str]]): Columns to encode. Default: `None` (auto-detect)

**Returns:**
- `Tuple[pd.DataFrame, Dict]`: Tuple of (encoded_data, encoders_dict)

**Example:**
```python
X_encoded, encoders = prep.encode_categorical(X, method='onehot')
```

##### `create_polynomial_features()`

Create polynomial features.

```python
create_polynomial_features(
    X: np.ndarray,
    degree: int = 2,
    include_bias: bool = False
) -> np.ndarray
```

**Parameters:**
- `X` (np.ndarray): Feature matrix
- `degree` (int): Polynomial degree. Default: `2`
- `include_bias` (bool): Include bias term. Default: `False`

**Returns:**
- `np.ndarray`: Extended feature matrix

**Example:**
```python
X_poly = prep.create_polynomial_features(X, degree=2)
```

##### `create_interaction_features()`

Create interaction features (multiplicative).

```python
create_interaction_features(
    X: np.ndarray,
    feature_pairs: Optional[List[Tuple[int, int]]] = None
) -> np.ndarray
```

**Parameters:**
- `X` (np.ndarray): Feature matrix
- `feature_pairs` (Optional[List[Tuple[int, int]]]): List of feature index pairs. Default: `None` (all pairs)

**Returns:**
- `np.ndarray`: Extended feature matrix

**Example:**
```python
X_interactions = prep.create_interaction_features(X)
```

##### `generate_eda_report()`

Generate comprehensive EDA (Exploratory Data Analysis) report.

```python
generate_eda_report(
    X: Union[np.ndarray, pd.DataFrame],
    y: Optional[np.ndarray] = None
) -> Dict
```

**Parameters:**
- `X` (Union[np.ndarray, pd.DataFrame]): Feature matrix
- `y` (Optional[np.ndarray]): Optional target variable. Default: `None`

**Returns:**
- `Dict`: Dictionary containing:
  - `quality_assessment`: Data quality metrics
  - `data_profile`: Detailed data profile
  - `target_analysis`: Target variable analysis (if y provided)
  - `timestamp`: Report timestamp

**Example:**
```python
report = prep.generate_eda_report(X, y=y)
```

##### `get_processing_pathway()` / `reset_pathway()`

Same as DeepLearningProcessor.

---

## Quantum AI Core

### `QuantumAICore`

Main orchestration engine that integrates all modules.

#### Initialization

```python
QuantumAICore(
    response_format: str = 'scientific',
    include_equations: bool = True,
    equation_format: str = 'latex',
    writing_style: str = 'business'
)
```

**Parameters:**
- `response_format` (str): Format style. Options: `'scientific'`, `'engineering'`, `'mathematical'`, `'standard'`. Default: `'scientific'`
- `include_equations` (bool): Whether to include mathematical equations. Default: `True`
- `equation_format` (str): Equation format. Options: `'latex'`, `'unicode'`, `'ascii'`. Default: `'latex'`
- `writing_style` (str): Writing style. Options: `'professional'`, `'business'`, `'casual'`. Default: `'business'`

**Example:**
```python
from server.quantum_ai.quantum_ai_core import QuantumAICore

qai = QuantumAICore()
```

#### Available Modules

All modules are accessible as attributes:

- `qai.deep_learning` - DeepLearningProcessor instance
- `qai.explainability` - ExplainabilityEngine instance
- `qai.visualization` - VisualizationEngine instance
- `qai.preprocessing` - PreprocessingEngine instance
- `qai.preprocessor` - DataPreprocessor instance (legacy)

**Example:**
```python
# Use all modules through QuantumAICore
qai.deep_learning.train_neural_network(X, y)
qai.explainability.calculate_shap_values(model, X)
qai.visualization.plot_clusters(X, labels)
qai.preprocessing.assess_data_quality(X)
```

---

## Type Definitions

### Common Types

- `np.ndarray`: NumPy array
- `pd.DataFrame`: Pandas DataFrame
- `List[int]`: List of integers
- `Optional[T]`: Optional type T (can be None)
- `Union[A, B]`: Either type A or B
- `Dict`: Dictionary
- `Tuple[A, B]`: Tuple of types A and B

---

## Error Handling

All modules handle missing dependencies gracefully:

- **PyTorch/TensorFlow**: Falls back to NumPy if unavailable
- **SHAP/LIME**: Methods raise `ImportError` if not installed
- **Plotly**: Falls back to matplotlib if unavailable

Check for errors:
```python
try:
    results = dl.train_pytorch_mlp(X, y)
except ImportError:
    print("PyTorch not installed")
```

---

## Version

**Quantum AI Core v2.0.0**

All API methods are stable and production-ready.



