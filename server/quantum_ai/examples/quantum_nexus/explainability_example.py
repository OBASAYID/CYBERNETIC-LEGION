"""
Example: Using ExplainabilityEngine for Model Interpretability

This example demonstrates how to use the ExplainabilityEngine to:
1. Calculate SHAP values for model explanations
2. Generate LIME explanations
3. Analyze feature importance
4. Assess model fairness
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.datasets import make_classification

# Import ExplainabilityEngine
from server.quantum_ai.core_algorithms.explainability import ExplainabilityEngine

def main():
    """Main example function."""
    
    # Generate sample data
    print("Generating sample classification dataset...")
    X, y = make_classification(
        n_samples=1000,
        n_features=10,
        n_informative=5,
        n_redundant=2,
        n_classes=2,
        random_state=42
    )
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train a model
    print("Training Random Forest model...")
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    # Get predictions
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    print(f"Model Accuracy: {np.mean(y_pred == y_test):.4f}")
    print()
    
    # Initialize ExplainabilityEngine
    print("Initializing ExplainabilityEngine...")
    xai = ExplainabilityEngine()
    
    # ==================== SHAP Values ====================
    print("\n" + "="*60)
    print("1. Calculating SHAP Values")
    print("="*60)
    
    try:
        shap_results = xai.calculate_shap_values(
            model, 
            X_test[:100],  # Use subset for faster computation
            explainer_type='tree'
        )
        
        print(f"SHAP values calculated successfully!")
        print(f"Base value: {shap_results['base_value']}")
        print(f"Sample size: {shap_results['sample_size']}")
        
        # Plot SHAP summary
        print("\nGenerating SHAP summary plot...")
        plot_data = xai.plot_shap_summary(
            shap_results['shap_values'],
            X_test[:100],
            plot_type='dot'
        )
        if plot_data:
            print("SHAP summary plot generated (base64 encoded)")
        
        # Force plot for first sample
        print("\nGenerating SHAP force plot for first sample...")
        force_plot = xai.plot_shap_force(
            shap_results['shap_values'],
            shap_results['base_value'],
            X_test[:100],
            sample_idx=0
        )
        print(f"Prediction: {force_plot['prediction']:.4f}")
        print(f"Top positive contributions:")
        for contrib in force_plot['top_positive'][:3]:
            print(f"  {contrib['feature']}: {contrib['shap_value']:.4f}")
        
    except ImportError as e:
        print(f"SHAP not available: {e}")
        print("Install with: pip install shap")
    except Exception as e:
        print(f"Error calculating SHAP values: {e}")
    
    # ==================== LIME Explanations ====================
    print("\n" + "="*60)
    print("2. Generating LIME Explanations")
    print("="*60)
    
    try:
        lime_explanation = xai.explain_with_lime(
            model,
            X_test,
            sample_idx=0,
            num_features=5,
            mode='classification'
        )
        
        print(f"LIME explanation generated!")
        print(f"Top contributing features:")
        for feature, contribution in lime_explanation['top_features'][:5]:
            print(f"  {feature}: {contribution:.4f}")
        
    except ImportError as e:
        print(f"LIME not available: {e}")
        print("Install with: pip install lime")
    except Exception as e:
        print(f"Error generating LIME explanation: {e}")
    
    # ==================== Feature Importance ====================
    print("\n" + "="*60)
    print("3. Feature Importance Analysis")
    print("="*60)
    
    try:
        # Permutation importance
        perm_importance = xai.permutation_feature_importance(
            model,
            X_test,
            y_test,
            metric='accuracy',
            n_repeats=10
        )
        
        print("Permutation Feature Importance (Top 5):")
        for feat in perm_importance['top_features'][:5]:
            print(f"  {feat['feature']}: {feat['importance_mean']:.4f} ± {feat['importance_std']:.4f}")
        
        # Model-based importance
        model_importance = xai.model_feature_importance(
            model,
            feature_names=[f"Feature_{i}" for i in range(X.shape[1])]
        )
        
        print("\nModel Feature Importance (Top 5):")
        for _, row in model_importance.head(5).iterrows():
            print(f"  {row['feature']}: {row['importance']:.4f}")
        
    except Exception as e:
        print(f"Error calculating feature importance: {e}")
    
    # ==================== Fairness Metrics ====================
    print("\n" + "="*60)
    print("4. Fairness Metrics Analysis")
    print("="*60)
    
    # Create a protected attribute (e.g., group membership)
    # In this example, we'll use a feature as a proxy for protected attribute
    protected_attr = X_test[:, 0] > np.median(X_test[:, 0])  # Binary split
    protected_attr = protected_attr.astype(int)
    
    try:
        fairness = xai.fairness_metrics(
            y_test,
            y_pred,
            protected_attr,
            group_names={0: 'Group A', 1: 'Group B'}
        )
        
        print("Fairness Metrics by Group:")
        for group_name, metrics in fairness.items():
            if group_name != 'fairness_metrics':
                print(f"\n{group_name}:")
                print(f"  Accuracy: {metrics['accuracy']:.4f}")
                print(f"  Precision: {metrics['precision']:.4f}")
                print(f"  Recall: {metrics['recall']:.4f}")
                print(f"  F1-Score: {metrics['f1_score']:.4f}")
                print(f"  Count: {metrics['count']}")
        
        if 'fairness_metrics' in fairness:
            print("\nOverall Fairness Metrics:")
            fm = fairness['fairness_metrics']
            print(f"  Accuracy Range: {fm['accuracy_range']:.4f}")
            print(f"  Accuracy Std: {fm['accuracy_std']:.4f}")
            print(f"  Disparate Impact: {fm['disparate_impact']:.4f}")
            print(f"  Equalized Odds: {fm['equalized_odds']}")
        
    except Exception as e:
        print(f"Error calculating fairness metrics: {e}")
    
    # ==================== Model Transparency ====================
    print("\n" + "="*60)
    print("5. Model Transparency Report")
    print("="*60)
    
    try:
        transparency_report = xai.model_transparency_report(
            model,
            X_test,
            y_test,
            model_name="Random Forest Classifier"
        )
        
        print("Model Transparency Report:")
        print(f"  Model Type: {transparency_report['model_type']}")
        print(f"  Feature Count: {transparency_report['feature_count']}")
        print(f"  Sample Count: {transparency_report['sample_count']}")
        print(f"  Performance:")
        for metric, value in transparency_report['performance'].items():
            if value is not None:
                print(f"    {metric}: {value:.4f}")
        
    except Exception as e:
        print(f"Error generating transparency report: {e}")
    
    # ==================== Processing Pathway ====================
    print("\n" + "="*60)
    print("6. Processing Pathway")
    print("="*60)
    
    pathway = xai.get_processing_pathway()
    print(f"Total processing steps: {len(pathway)}")
    print("\nFirst 5 steps:")
    for step in pathway[:5]:
        print(f"  [{step['timestamp']}] {step['step']}")
    
    print("\n" + "="*60)
    print("Example completed successfully!")
    print("="*60)


if __name__ == "__main__":
    main()

