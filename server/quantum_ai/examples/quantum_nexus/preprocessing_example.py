"""
Example: Using PreprocessingEngine for Data Preprocessing

This example demonstrates how to use the PreprocessingEngine to:
1. Handle missing values
2. Scale features
3. Detect outliers
4. Encode categorical variables
5. Generate EDA reports
"""

import sys
import os

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
import pandas as pd
from sklearn.datasets import make_classification

# Import PreprocessingEngine
from server.quantum_ai.core_algorithms.preprocessing_eda import PreprocessingEngine

def main():
    """Main example function."""
    
    print("="*60)
    print("PreprocessingEngine Example")
    print("="*60)
    
    # Generate sample data with missing values
    print("\n1. Generating sample data...")
    X, y = make_classification(
        n_samples=200,
        n_features=5,
        n_informative=3,
        n_classes=2,
        random_state=42
    )
    
    # Convert to DataFrame and add some missing values
    X_df = pd.DataFrame(X, columns=[f'feature_{i+1}' for i in range(X.shape[1])])
    
    # Introduce missing values
    np.random.seed(42)
    missing_indices = np.random.choice(X_df.size, size=int(X_df.size * 0.1), replace=False)
    X_df.values.flat[missing_indices] = np.nan
    
    print(f"   Data shape: {X_df.shape}")
    print(f"   Missing values: {X_df.isnull().sum().sum()}")
    
    # Initialize PreprocessingEngine
    print("\n2. Initializing PreprocessingEngine...")
    prep = PreprocessingEngine()
    
    # ==================== Data Quality Assessment ====================
    print("\n" + "="*60)
    print("3. Data Quality Assessment")
    print("="*60)
    
    quality = prep.assess_data_quality(X_df, y)
    print(f"   Shape: {quality['shape']}")
    print(f"   Total missing: {quality['missing_values']['total_missing']}")
    print(f"   Duplicates: {quality['duplicates']}")
    print(f"   Memory usage: {quality['memory_usage']:.2f} MB")
    
    # ==================== Missing Value Handling ====================
    print("\n" + "="*60)
    print("4. Missing Value Handling")
    print("="*60)
    
    print("   Handling missing values with KNN imputation...")
    X_clean = prep.handle_missing_values(X_df, strategy='knn', threshold=0.5)
    print(f"   ✓ Missing values handled")
    print(f"   Remaining missing: {X_clean.isnull().sum().sum()}")
    
    # ==================== Outlier Detection ====================
    print("\n" + "="*60)
    print("5. Outlier Detection")
    print("="*60)
    
    X_array = X_clean.values
    
    print("   Detecting outliers using IQR method...")
    X_no_outliers, outlier_mask = prep.detect_outliers(
        X_array, method='iqr', threshold=1.5
    )
    print(f"   ✓ Outliers detected")
    print(f"   Found {outlier_mask.sum()} outliers")
    print(f"   Clean data shape: {X_no_outliers.shape}")
    
    # ==================== Feature Scaling ====================
    print("\n" + "="*60)
    print("6. Feature Scaling")
    print("="*60)
    
    print("   Scaling features using standard scaler...")
    X_scaled, scaler = prep.scale_features(X_no_outliers, method='standard')
    print(f"   ✓ Features scaled")
    print(f"   Scaled data shape: {X_scaled.shape}")
    print(f"   Scaler type: {type(scaler).__name__}")
    
    # ==================== Categorical Encoding ====================
    print("\n" + "="*60)
    print("7. Categorical Encoding (Example)")
    print("="*60)
    
    # Create sample categorical data
    X_cat = pd.DataFrame({
        'numeric': np.random.randn(100),
        'category1': np.random.choice(['A', 'B', 'C'], 100),
        'category2': np.random.choice(['X', 'Y'], 100)
    })
    
    print("   Encoding categorical variables...")
    X_encoded, encoders = prep.encode_categorical(
        X_cat, method='onehot'
    )
    print(f"   ✓ Categorical variables encoded")
    print(f"   Original shape: {X_cat.shape}")
    print(f"   Encoded shape: {X_encoded.shape}")
    
    # ==================== Feature Engineering ====================
    print("\n" + "="*60)
    print("8. Feature Engineering")
    print("="*60)
    
    print("   Creating polynomial features...")
    X_poly = prep.create_polynomial_features(X_scaled, degree=2, include_bias=False)
    print(f"   ✓ Polynomial features created")
    print(f"   Original features: {X_scaled.shape[1]}")
    print(f"   Polynomial features: {X_poly.shape[1]}")
    
    print("\n   Creating interaction features...")
    X_interactions = prep.create_interaction_features(X_scaled)
    print(f"   ✓ Interaction features created")
    print(f"   With interactions: {X_interactions.shape[1]}")
    
    # ==================== Data Profiling ====================
    print("\n" + "="*60)
    print("9. Data Profiling")
    print("="*60)
    
    X_final = pd.DataFrame(X_scaled, columns=[f'feature_{i+1}' for i in range(X_scaled.shape[1])])
    
    print("   Generating data profile...")
    profile = prep.profile_data(X_final)
    print(f"   ✓ Data profile generated")
    print(f"   Profiled {len(profile)} features")
    
    # Show sample profile
    first_feature = list(profile.keys())[0]
    print(f"\n   Sample profile for {first_feature}:")
    stats = profile[first_feature]
    if stats['type'] == 'numeric':
        print(f"     Mean: {stats['mean']:.4f}")
        print(f"     Std: {stats['std']:.4f}")
        print(f"     Min: {stats['min']:.4f}")
        print(f"     Max: {stats['max']:.4f}")
    
    # ==================== EDA Report ====================
    print("\n" + "="*60)
    print("10. Automated EDA Report")
    print("="*60)
    
    print("   Generating comprehensive EDA report...")
    report = prep.generate_eda_report(X_final, y=y)
    print(f"   ✓ EDA report generated")
    
    print("\n   Report Summary:")
    print(f"     Shape: {report['shape']}")
    print(f"     Timestamp: {report['timestamp']}")
    
    if 'target_analysis' in report:
        ta = report['target_analysis']
        print(f"     Target unique values: {ta['unique_values']}")
        print(f"     Class balance: {ta['class_balance']['balanced']}")
    
    # ==================== Processing Pathway ====================
    print("\n" + "="*60)
    print("11. Processing Pathway")
    print("="*60)
    
    pathway = prep.get_processing_pathway()
    print(f"   Total processing steps: {len(pathway)}")
    print("\n   First 10 steps:")
    for step in pathway[:10]:
        print(f"     [{step['timestamp']}] {step['step']}")
    
    print("\n" + "="*60)
    print("Example completed successfully!")
    print("="*60)
    print("\nComplete preprocessing pipeline:")
    print("  1. Assess data quality")
    print("  2. Handle missing values")
    print("  3. Detect outliers")
    print("  4. Scale features")
    print("  5. Encode categorical (if needed)")
    print("  6. Feature engineering (optional)")
    print("  7. Generate EDA report")


if __name__ == "__main__":
    main()



