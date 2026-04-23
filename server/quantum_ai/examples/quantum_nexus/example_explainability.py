"""
Example: Explainability (XAI) Features
Demonstrates SHAP, LIME, feature importance, fairness metrics, and model transparency.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

from quantum_ai.core_algorithms import explainability

def example_shap_values():
    """Example: Calculate SHAP values for model interpretation"""
    print("\n" + "="*80)
    print("EXAMPLE: SHAP Values - Model Interpretation")
    print("="*80)
    
    # Generate sample data
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Calculate SHAP values
    xai = explainability.ExplainabilityEngine()
    
    try:
        shap_results = xai.calculate_shap_values(
            model, X[:50], 
            explainer_type='tree',
            sample_size=50
        )
        
        print("\nSHAP Results:")
        print(f"  Explainer Type: {shap_results['explainer_type']}")
        print(f"  Sample Size: {shap_results['sample_size']}")
        print(f"  Base Value: {shap_results.get('base_value', 'N/A')}")
        
        # Get force plot data for first instance
        force_plot = xai.plot_shap_force(
            shap_results['shap_values'],
            shap_results.get('base_value', 0.5),
            X[:50],
            sample_idx=0
        )
        
        print("\nTop Contributing Features (Sample 0):")
        for contrib in force_plot['top_positive'][:3]:
            print(f"  + {contrib['feature']}: {contrib['shap_value']:.4f}")
        for contrib in force_plot['top_negative'][:3]:
            print(f"  - {contrib['feature']}: {contrib['shap_value']:.4f}")
        
        return shap_results
        
    except Exception as e:
        print(f"⚠️ SHAP not available: {type(e).__name__}")
        print("   Install with: pip install shap")
        return None


def example_lime_explanation():
    """Example: Generate LIME explanations"""
    print("\n" + "="*80)
    print("EXAMPLE: LIME - Local Interpretable Model-agnostic Explanations")
    print("="*80)
    
    # Generate sample data
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Generate LIME explanation
    xai = explainability.ExplainabilityEngine()
    
    try:
        lime_result = xai.generate_lime_explanation(
            model, X[0], X,
            num_features=5
        )
        
        print("\nLIME Explanation:")
        print(f"  Prediction: {lime_result.get('prediction', 'N/A')}")
        print(f"  Top Features:")
        for feature, weight in lime_result.get('explanations', [])[:5]:
            print(f"    {feature}: {weight:.4f}")
        
        return lime_result
        
    except Exception as e:
        print(f"⚠️ LIME not available: {type(e).__name__}")
        print("   Install with: pip install lime")
        return None


def example_feature_importance():
    """Example: Permutation feature importance"""
    print("\n" + "="*80)
    print("EXAMPLE: Feature Importance - Permutation Importance")
    print("="*80)
    
    # Generate sample data
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Calculate feature importance
    xai = explainability.ExplainabilityEngine()
    
    importance = xai.feature_importance_permutation(
        model, X, y,
        n_repeats=5
    )
    
    print("\nTop 5 Most Important Features:")
    for i, feature_info in enumerate(importance['top_features'][:5], 1):
        print(f"  {i}. Feature {feature_info['feature']}: "
              f"{feature_info['importance_mean']:.4f} "
              f"(±{feature_info['importance_std']:.4f})")
    
    return importance


def example_fairness_audit():
    """Example: Fairness audit across protected groups"""
    print("\n" + "="*80)
    print("EXAMPLE: Fairness Audit - Multi-Group Analysis")
    print("="*80)
    
    # Generate sample data with protected groups
    np.random.seed(42)
    n_samples = 200
    X = np.random.randn(n_samples, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    
    # Create protected groups (e.g., gender)
    protected_groups = {
        'gender': np.random.randint(0, 2, n_samples),
        'age_group': np.random.randint(0, 3, n_samples)
    }
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    y_pred = model.predict(X)
    
    # Perform fairness audit
    xai = explainability.ExplainabilityEngine()
    
    audit = xai.fairness_audit(
        y_pred, protected_groups, y_true=y
    )
    
    print("\nFairness Audit Results:")
    print(f"  Protected Groups: {audit['protected_groups']}")
    
    for group_name, metrics in audit['group_metrics'].items():
        print(f"\n  {group_name}:")
        for group_val, group_data in metrics.items():
            if 'accuracy' in group_data:
                print(f"    {group_val}: Accuracy = {group_data['accuracy']:.4f}, "
                      f"Count = {group_data['count']}")
    
    if 'overall_fairness' in audit:
        print("\n  Overall Fairness Metrics:")
        for metric, value in audit['overall_fairness'].items():
            if isinstance(value, dict):
                print(f"    {metric}:")
                for k, v in value.items():
                    print(f"      {k}: {v}")
            else:
                print(f"    {metric}: {value}")
    
    return audit


def example_bias_mitigation():
    """Example: Bias mitigation strategies"""
    print("\n" + "="*80)
    print("EXAMPLE: Bias Mitigation Strategies")
    print("="*80)
    
    # Generate sample data with protected attribute
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    protected_attr = np.random.randint(0, 2, 200)
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X, y)
    
    # Apply bias mitigation
    xai = explainability.ExplainabilityEngine()
    
    # Test reweighing strategy
    mitigation = xai.bias_mitigation_strategies(
        model, X, y, protected_attr,
        strategy='reweighing'
    )
    
    print("\nBias Mitigation (Reweighing):")
    print(f"  Strategy: {mitigation['strategy']}")
    print(f"  Weight Statistics:")
    stats = mitigation['weight_statistics']
    print(f"    Mean: {stats['mean']:.4f}")
    print(f"    Std: {stats['std']:.4f}")
    print(f"    Min: {stats['min']:.4f}")
    print(f"    Max: {stats['max']:.4f}")
    print(f"\n  Recommendation: {mitigation['recommendation']}")
    
    return mitigation


def example_model_transparency():
    """Example: Model transparency report"""
    print("\n" + "="*80)
    print("EXAMPLE: Model Transparency Report")
    print("="*80)
    
    # Generate sample data
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train, y_train)
    
    # Generate transparency report
    xai = explainability.ExplainabilityEngine()
    
    report = xai.model_transparency_report(
        model, X_test, y_test,
        model_name="RandomForest_Classifier"
    )
    
    print("\nModel Transparency Report:")
    print(f"  Model Name: {report['model_name']}")
    print(f"  Model Type: {report['model_type']}")
    print(f"  Feature Count: {report['feature_count']}")
    print(f"  Sample Count: {report['sample_count']}")
    
    if 'performance' in report and 'accuracy' in report['performance']:
        print(f"  Test Accuracy: {report['performance']['accuracy']:.4f}")
    
    if report.get('has_feature_importance', False):
        print(f"  Feature Importance: Available ({len(report['feature_importance'])} features)")
    
    return report


def example_complete_workflow():
    """Example: Complete explainability workflow"""
    print("\n" + "="*80)
    print("EXAMPLE: Complete Explainability Workflow")
    print("="*80)
    
    # Generate sample data
    np.random.seed(42)
    X = np.random.randn(200, 10)
    y = (X[:, 0] + X[:, 1] > 0).astype(int)
    protected_attr = np.random.randint(0, 2, 200)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    model = RandomForestClassifier(n_estimators=50, random_state=42)
    model.fit(X_train, y_train)
    
    xai = explainability.ExplainabilityEngine()
    
    print("\n1. Feature Importance Analysis...")
    importance = xai.feature_importance_permutation(model, X_test, y_test, n_repeats=3)
    print(f"   ✓ Top feature: Feature {importance['top_features'][0]['feature']}")
    
    print("\n2. Model Transparency...")
    transparency = xai.model_transparency_report(model, X_test, y_test)
    print(f"   ✓ Model type: {transparency['model_type']}")
    
    print("\n3. Fairness Analysis...")
    y_pred = model.predict(X_test)
    protected_groups = {'group': protected_attr[:len(y_test)]}
    fairness = xai.fairness_audit(y_pred, protected_groups, y_true=y_test)
    print(f"   ✓ Analyzed {len(fairness['protected_groups'])} protected groups")
    
    print("\n4. Bias Mitigation...")
    mitigation = xai.bias_mitigation_strategies(
        model, X_train, y_train, protected_attr[:len(X_train)],
        strategy='reweighing'
    )
    print(f"   ✓ Strategy: {mitigation['strategy']}")
    
    print("\n✓ Complete explainability workflow executed!")
    
    return {
        'importance': importance,
        'transparency': transparency,
        'fairness': fairness,
        'mitigation': mitigation
    }


if __name__ == "__main__":
    print("\n" + "="*80)
    print("QUANTUM INTELLIGENCE NEXUS - EXPLAINABILITY EXAMPLES")
    print("="*80)
    
    # Run individual examples
    example_feature_importance()
    example_model_transparency()
    example_fairness_audit()
    example_bias_mitigation()
    
    # Try SHAP and LIME (may require additional dependencies)
    example_shap_values()
    example_lime_explanation()
    
    # Run complete workflow
    example_complete_workflow()
    
    print("\n" + "="*80)
    print("All explainability examples completed!")
    print("="*80 + "\n")



