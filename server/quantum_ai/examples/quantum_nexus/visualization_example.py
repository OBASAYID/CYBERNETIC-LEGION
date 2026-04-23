"""
Example: Using VisualizationEngine for Data Visualization

This example demonstrates how to use the VisualizationEngine to:
1. Visualize clustering results
2. Plot dimensionality reduction (PCA, t-SNE)
3. Display classification metrics
4. Show training history
5. Analyze features
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.datasets import make_classification
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier

# Import VisualizationEngine
from server.quantum_ai.core_algorithms.visualization import VisualizationEngine

def main():
    """Main example function."""
    
    print("="*60)
    print("VisualizationEngine Example")
    print("="*60)
    
    # Generate sample data
    print("\n1. Generating sample data...")
    X, y = make_classification(
        n_samples=200,
        n_features=10,
        n_informative=5,
        n_classes=3,
        random_state=42
    )
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.3, random_state=42
    )
    
    print(f"   Data shape: {X.shape}")
    print(f"   Classes: {len(np.unique(y))}")
    
    # Initialize VisualizationEngine
    print("\n2. Initializing VisualizationEngine...")
    viz = VisualizationEngine(backend='matplotlib', style='seaborn')
    
    # ==================== Clustering ====================
    print("\n" + "="*60)
    print("3. Clustering Visualization")
    print("="*60)
    
    # Perform clustering
    kmeans = KMeans(n_clusters=3, random_state=42)
    labels = kmeans.fit_predict(X_train)
    centers = kmeans.cluster_centers_
    
    print("   Performing K-Means clustering...")
    print(f"   Clusters: {len(np.unique(labels))}")
    
    # Plot clusters (2D projection)
    print("   Plotting clusters...")
    try:
        # Reduce to 2D for visualization
        pca_2d = PCA(n_components=2)
        X_2d = pca_2d.fit_transform(X_train)
        centers_2d = pca_2d.transform(centers)
        
        fig = viz.plot_clusters(
            X_2d,
            labels,
            centers=centers_2d,
            title="K-Means Clustering Results"
        )
        print("   ✓ Cluster plot generated")
        
        # Silhouette plot
        print("   Generating silhouette plot...")
        fig = viz.plot_silhouette(X_train, labels)
        print("   ✓ Silhouette plot generated")
        
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Dimensionality Reduction ====================
    print("\n" + "="*60)
    print("4. Dimensionality Reduction")
    print("="*60)
    
    # PCA
    print("   Performing PCA...")
    pca = PCA(n_components=2)
    X_pca = pca.fit_transform(X_train)
    
    try:
        fig = viz.plot_pca(
            X_pca,
            pca_components=pca.components_,
            pca_var=pca.explained_variance_ratio_,
            labels=y_train
        )
        print("   ✓ PCA plot generated")
        print(f"   Explained variance: {pca.explained_variance_ratio_.sum():.2%}")
        
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # t-SNE (if available)
    print("   Performing t-SNE...")
    try:
        fig = viz.plot_tsne(X_train, perplexity=30, labels=y_train)
        print("   ✓ t-SNE plot generated")
    except ImportError:
        print("   ✗ t-SNE requires scikit-learn")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Classification Metrics ====================
    print("\n" + "="*60)
    print("5. Classification Metrics")
    print("="*60)
    
    # Train a classifier
    print("   Training classifier...")
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    y_pred = clf.predict(X_test)
    y_proba = clf.predict_proba(X_test)[:, 1] if len(np.unique(y)) == 2 else None
    
    print(f"   Accuracy: {np.mean(y_pred == y_test):.4f}")
    
    # Confusion matrix
    print("   Plotting confusion matrix...")
    try:
        fig = viz.plot_confusion_matrix(
            y_test,
            y_pred,
            class_names=[f'Class {i}' for i in range(len(np.unique(y)))]
        )
        print("   ✓ Confusion matrix generated")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ROC curve (for binary classification)
    if y_proba is not None:
        print("   Plotting ROC curve...")
        try:
            # Convert to binary for ROC
            y_test_binary = (y_test == 1).astype(int)
            fig = viz.plot_roc_curve(y_test_binary, y_proba)
            print("   ✓ ROC curve generated")
        except Exception as e:
            print(f"   ✗ Error: {e}")
    
    # ==================== Training History ====================
    print("\n" + "="*60)
    print("6. Training History")
    print("="*60)
    
    # Simulate training history
    epochs = 20
    train_loss = [0.5 * (0.95 ** i) for i in range(epochs)]
    val_loss = [0.55 * (0.95 ** i) for i in range(epochs)]
    train_acc = [0.6 + 0.3 * (1 - 0.95 ** i) for i in range(epochs)]
    val_acc = [0.55 + 0.3 * (1 - 0.95 ** i) for i in range(epochs)]
    
    print("   Plotting training history...")
    try:
        fig = viz.plot_training_history(
            train_loss=train_loss,
            val_loss=val_loss,
            train_metric=train_acc,
            val_metric=val_acc,
            metric_name='Accuracy'
        )
        print("   ✓ Training history plot generated")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Feature Analysis ====================
    print("\n" + "="*60)
    print("7. Feature Analysis")
    print("="*60)
    
    # Feature importance
    print("   Plotting feature importance...")
    try:
        feature_names = [f'Feature {i+1}' for i in range(X.shape[1])]
        importances = clf.feature_importances_
        
        fig = viz.plot_feature_importance(
            feature_names,
            importances,
            top_n=5
        )
        print("   ✓ Feature importance plot generated")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Correlation matrix
    print("   Plotting correlation matrix...")
    try:
        fig = viz.plot_correlation_matrix(
            X_train,
            feature_names=[f'F{i+1}' for i in range(X.shape[1])]
        )
        print("   ✓ Correlation matrix generated")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # Feature distributions
    print("   Plotting feature distributions...")
    try:
        fig = viz.plot_distributions(
            X_train,
            feature_names=[f'F{i+1}' for i in range(min(9, X.shape[1]))],
            max_features=9
        )
        print("   ✓ Feature distributions plot generated")
    except Exception as e:
        print(f"   ✗ Error: {e}")
    
    # ==================== Processing Pathway ====================
    print("\n" + "="*60)
    print("8. Processing Pathway")
    print("="*60)
    
    pathway = viz.get_processing_pathway()
    print(f"   Total visualization steps: {len(pathway)}")
    print("\n   First 5 steps:")
    for step in pathway[:5]:
        print(f"     [{step['timestamp']}] {step['step']}")
    
    print("\n" + "="*60)
    print("Example completed successfully!")
    print("="*60)
    print("\nNote: All plots are matplotlib Figure objects.")
    print("To save plots, use: viz.save_figure(fig, 'filename.png')")


if __name__ == "__main__":
    main()



