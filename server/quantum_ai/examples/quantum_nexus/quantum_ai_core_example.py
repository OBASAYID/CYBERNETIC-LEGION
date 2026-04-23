"""
Example: Complete QuantumAICore Workflow

This example demonstrates a complete machine learning workflow using
all the new modules in QuantumAICore v2.0:
1. Data preprocessing
2. Deep learning training
3. Model explanation
4. Visualization
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.datasets import make_classification

# Import QuantumAICore
from server.quantum_ai.quantum_ai_core import QuantumAICore

def main():
    """Main example function."""
    
    print("="*70)
    print("QuantumAICore v2.0 - Complete Workflow Example")
    print("="*70)
    
    # Initialize Quantum AI Core
    print("\n1. Initializing QuantumAICore...")
    qai = QuantumAICore()
    print("   ✓ QuantumAICore initialized")
    print(f"   Deep learning framework: {qai.deep_learning.framework}")
    
    # ==================== Data Generation ====================
    print("\n" + "="*70)
    print("2. Generating Sample Data")
    print("="*70)
    
    X, y = make_classification(
        n_samples=1000,
        n_features=10,
        n_informative=5,
        n_redundant=2,
        n_classes=3,
        random_state=42
    )
    
    # Convert to DataFrame and add some missing values
    X_df = pd.DataFrame(X, columns=[f'feature_{i+1}' for i in range(X.shape[1])])
    
    # Introduce missing values
    np.random.seed(42)
    missing_indices = np.random.choice(
        X_df.size, 
        size=int(X_df.size * 0.05), 
        replace=False
    )
    X_df.values.flat[missing_indices] = np.nan
    
    print(f"   Data shape: {X_df.shape}")
    print(f"   Missing values: {X_df.isnull().sum().sum()}")
    print(f"   Classes: {len(np.unique(y))}")
    
    # ==================== Preprocessing ====================
    print("\n" + "="*70)
    print("3. Data Preprocessing")
    print("="*70)
    
    # Assess data quality
    print("   Assessing data quality...")
    quality = qai.preprocessing.assess_data_quality(X_df, y)
    print(f"   ✓ Quality assessed")
    print(f"     Missing: {quality['missing_values']['total_missing']}")
    print(f"     Duplicates: {quality['duplicates']}")
    
    # Handle missing values
    print("   Handling missing values...")
    X_clean = qai.preprocessing.handle_missing_values(
        X_df, strategy='knn', threshold=0.5
    )
    print(f"   ✓ Missing values handled")
    
    # Detect outliers
    print("   Detecting outliers...")
    X_array = X_clean.values
    X_no_outliers, outlier_mask = qai.preprocessing.detect_outliers(
        X_array, method='iqr', threshold=1.5
    )
    print(f"   ✓ Outliers detected: {outlier_mask.sum()} removed")
    
    # Scale features
    print("   Scaling features...")
    X_scaled, scaler = qai.preprocessing.scale_features(
        X_no_outliers, method='standard'
    )
    print(f"   ✓ Features scaled")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y[~outlier_mask], test_size=0.2, random_state=42
    )
    
    print(f"   Final training set: {X_train.shape}")
    print(f"   Final test set: {X_test.shape}")
    
    # ==================== Deep Learning ====================
    print("\n" + "="*70)
    print("4. Deep Learning Training")
    print("="*70)
    
    print("   Training PyTorch MLP...")
    try:
        results = qai.deep_learning.train_pytorch_mlp(
            X_train, y_train,
            X_val=X_test, y_val=y_test,
            hidden_sizes=[64, 32],
            epochs=20,  # Reduced for example
            batch_size=32,
            learning_rate=0.001
        )
        
        print(f"   ✓ Training complete")
        print(f"     Final loss: {results['train_losses'][-1]:.4f}")
        if results.get('val_losses'):
            print(f"     Val loss: {results['val_losses'][-1]:.4f}")
        
        model = results['model']
        
    except Exception as e:
        print(f"   ✗ Training failed: {e}")
        return
    
    # ==================== Visualization ====================
    print("\n" + "="*70)
    print("5. Visualization")
    print("="*70)
    
    # Training history
    print("   Plotting training history...")
    try:
        fig = qai.visualization.plot_training_history(
            train_loss=results['train_losses'],
            val_loss=results.get('val_losses'),
            train_metric=None,
            val_metric=None
        )
        print("   ✓ Training history plotted")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Clustering visualization
    print("   Plotting clusters...")
    try:
        from sklearn.cluster import KMeans
        kmeans = KMeans(n_clusters=3, random_state=42)
        labels = kmeans.fit_predict(X_test[:100])
        centers = kmeans.cluster_centers_
        
        # Reduce to 2D
        from sklearn.decomposition import PCA
        pca_2d = PCA(n_components=2)
        X_2d = pca_2d.fit_transform(X_test[:100])
        centers_2d = pca_2d.transform(centers)
        
        fig = qai.visualization.plot_clusters(
            X_2d, labels, centers=centers_2d
        )
        print("   ✓ Clusters plotted")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Explainability ====================
    print("\n" + "="*70)
    print("6. Model Explainability")
    print("="*70)
    
    # Get predictions
    print("   Getting model predictions...")
    try:
        import torch
        model.eval()
        X_test_tensor = torch.FloatTensor(X_test[:100])
        with torch.no_grad():
            predictions = model(X_test_tensor).numpy()
        
        y_pred = np.argmax(predictions, axis=1)
        print(f"   ✓ Predictions obtained")
    except Exception as e:
        print(f"   ✗ Error getting predictions: {e}")
        return
    
    # Confusion matrix
    print("   Plotting confusion matrix...")
    try:
        fig = qai.visualization.plot_confusion_matrix(
            y_test[:100], y_pred,
            class_names=[f'Class {i}' for i in range(3)]
        )
        print("   ✓ Confusion matrix plotted")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Feature importance
    print("   Calculating feature importance...")
    try:
        importance = qai.explainability.permutation_feature_importance(
            model, X_test[:100], y_test[:100],
            metric='accuracy',
            n_repeats=5
        )
        print("   ✓ Feature importance calculated")
        print("     Top 3 features:")
        for feat in importance['top_features'][:3]:
            print(f"       {feat['feature']}: {feat['importance_mean']:.4f}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Final Report ====================
    print("\n" + "="*70)
    print("7. Final EDA Report")
    print("="*70)
    
    print("   Generating comprehensive EDA report...")
    try:
        final_report = qai.preprocessing.generate_eda_report(X_scaled, y=y)
        print("   ✓ EDA report generated")
        print(f"     Shape: {final_report['shape']}")
        print(f"     Timestamp: {final_report['timestamp']}")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Processing Pathways ====================
    print("\n" + "="*70)
    print("8. Processing Pathways")
    print("="*70)
    
    modules = {
        'Preprocessing': qai.preprocessing,
        'Deep Learning': qai.deep_learning,
        'Visualization': qai.visualization,
        'Explainability': qai.explainability
    }
    
    for name, module in modules.items():
        pathway = module.get_processing_pathway()
        print(f"   {name}: {len(pathway)} steps")
    
    print("\n" + "="*70)
    print("Complete workflow finished successfully!")
    print("="*70)
    print("\nSummary:")
    print("  ✓ Data preprocessed")
    print("  ✓ Deep learning model trained")
    print("  ✓ Results visualized")
    print("  ✓ Model explained")
    print("  ✓ EDA report generated")


if __name__ == "__main__":
    main()



