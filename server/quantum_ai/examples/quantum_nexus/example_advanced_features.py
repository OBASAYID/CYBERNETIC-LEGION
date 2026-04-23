"""
Examples demonstrating all v2.0 advanced features
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
import pandas as pd

# Import QuantumAICore and modules
try:
    from quantum_ai_core import QuantumAICore, format_response_for_display
except ImportError:
    from server.quantum_ai.quantum_ai_core import QuantumAICore

from core_algorithms.deep_learning import DeepLearningProcessor
from core_algorithms.explainability import ExplainabilityEngine
from core_algorithms.visualization import VisualizationEngine
from core_algorithms.preprocessing_eda import PreprocessingEngine


def example_deep_learning():
    """Example: Train deep learning models"""
    print("\n" + "="*80)
    print("EXAMPLE: Deep Learning with PyTorch")
    print("="*80)
    
    dl = DeepLearningProcessor(framework='pytorch')
    
    # Generate sample data
    np.random.seed(42)
    X_train = np.random.randn(1000, 20)
    y_train = np.random.randint(0, 3, 1000)
    
    # Train MLP
    results = dl.train_pytorch_mlp(
        X_train, y_train,
        hidden_sizes=[128, 64, 32],
        epochs=50,
        batch_size=32
    )
    
    print(f"\nTraining complete!")
    print(f"Final loss: {results['train_losses'][-1]:.4f}")
    print(f"Model device: {results['device']}")


def example_explainability():
    """Example: Explain model predictions"""
    print("\n" + "="*80)
    print("EXAMPLE: Model Explainability with SHAP")
    print("="*80)
    
    from sklearn.ensemble import RandomForestClassifier
    
    xai = ExplainabilityEngine()
    
    # Generate data and train model
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    
    model = RandomForestClassifier(n_estimators=10, random_state=42)
    model.fit(X, y)
    
    # Get SHAP values
    shap_results = xai.calculate_shap_values(model, X[:50])
    print(f"SHAP values shape: {shap_results['shap_values'].shape}")
    
    # Get feature importance
    importance_df = xai.model_feature_importance(model)
    print("\nTop 5 Important Features:")
    print(importance_df.head())
    
    # Fairness metrics
    protected_attr = np.random.randint(0, 2, 200)
    fairness = xai.fairness_metrics(y, model.predict(X), protected_attr)
    print("\nFairness Metrics:")
    for group, metrics in fairness.items():
        print(f"{group}: {metrics}")


def example_visualization():
    """Example: Advanced visualizations"""
    print("\n" + "="*80)
    print("EXAMPLE: Advanced Visualizations")
    print("="*80)
    
    viz = VisualizationEngine()
    
    # Generate clustering data
    np.random.seed(42)
    X = np.vstack([
        np.random.randn(100, 2) + [2, 2],
        np.random.randn(100, 2) + [-2, -2],
        np.random.randn(100, 2) + [2, -2]
    ])
    labels = np.repeat([0, 1, 2], 100)
    
    # Plot clusters
    plot = viz.plot_clusters(X, labels)
    print("Cluster plot generated (base64 encoded)")
    
    # Feature importance
    feature_names = [f"Feature_{i}" for i in range(10)]
    importance = np.random.rand(10)
    plot = viz.plot_feature_importance(feature_names, importance)
    print("Feature importance plot generated")


def example_preprocessing():
    """Example: Data preprocessing"""
    print("\n" + "="*80)
    print("EXAMPLE: Data Preprocessing & EDA")
    print("="*80)
    
    prep = PreprocessingEngine()
    
    # Create sample data with missing values
    np.random.seed(42)
    X = np.random.randn(100, 5)
    X[np.random.choice(100, 10), np.random.choice(5, 10)] = np.nan
    
    X_df = pd.DataFrame(X, columns=[f"Feature_{i}" for i in range(5)])
    
    # Assess quality
    quality = prep.assess_data_quality(X_df)
    print(f"Missing values: {quality['missing_values']['total_missing']}")
    print(f"Shape: {quality['shape']}")
    
    # Handle missing values
    X_clean = prep.handle_missing_values(X_df, strategy='knn')
    print(f"Cleaned shape: {X_clean.shape}")
    
    # Scale features
    X_scaled, scaler = prep.scale_features(X_clean.values, method='standard')
    print(f"Scaled shape: {X_scaled.shape}")
    
    # Generate EDA report
    report = prep.generate_eda_report(X_clean)
    print("\nEDA Report generated successfully")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("QUANTUM AI CORE v2.0 - ADVANCED FEATURES EXAMPLES")
    print("="*80)
    
    example_deep_learning()
    example_explainability()
    example_visualization()
    example_preprocessing()
    
    print("\n" + "="*80)
    print("All examples completed!")
    print("="*80)

