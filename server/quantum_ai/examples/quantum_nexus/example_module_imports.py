"""
Example: Direct Module Imports
Demonstrates the clean import pattern for Quantum Intelligence Nexus modules.
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

import pandas as pd
import numpy as np

# Clean import pattern - import modules directly
from quantum_ai.core_algorithms import data_preprocessing, deep_learning, nlp_engine

def example_auto_eda():
    """Example: Using AutoEDA for exploratory data analysis"""
    print("\n" + "="*80)
    print("EXAMPLE: AutoEDA - Automated Exploratory Data Analysis")
    print("="*80)
    
    # Create sample data
    np.random.seed(42)
    data = pd.DataFrame({
        'feature1': np.random.randn(100),
        'feature2': np.random.randn(100),
        'feature3': np.random.randn(100),
        'category': np.random.choice(['A', 'B', 'C'], 100),
        'target': np.random.randint(0, 2, 100)
    })
    
    # Use AutoEDA
    eda = data_preprocessing.AutoEDA()
    report = eda.analyze(data, target_col='target')
    
    print("\nEDA Report Summary:")
    print(f"  Dataset Shape: {report['dataset_info']['shape']}")
    print(f"  Missing Values: {sum(report['missing_values']['total_missing'].values())}")
    print(f"  Duplicate Rows: {report['duplicates']['duplicate_rows']}")
    print(f"  Unique Values per Column:")
    for col, count in list(report['unique_values'].items())[:3]:
        print(f"    - {col}: {count}")
    
    return report


def example_deep_learning():
    """Example: Using DeepLearningProcessor"""
    print("\n" + "="*80)
    print("EXAMPLE: DeepLearningProcessor - Neural Network Training")
    print("="*80)
    
    # Generate sample data
    np.random.seed(42)
    X_train = np.random.randn(100, 10)
    y_train = np.random.randint(0, 3, 100)
    
    # Use DeepLearningProcessor
    dl = deep_learning.DeepLearningProcessor(framework='auto')
    
    # Build and train model
    model = dl.build_neural_network([10, 32, 3], framework='auto')
    result = dl.train_model(X_train, y_train, validation_split=0.2, epochs=5)
    
    print("\nTraining Results:")
    print(f"  Framework: {result.get('framework', 'numpy')}")
    print(f"  Final Train Loss: {result.get('train_losses', [0])[-1]:.4f}")
    if 'val_losses' in result:
        print(f"  Final Val Loss: {result['val_losses'][-1]:.4f}")
    
    return result


def example_nlp():
    """Example: Using NLPEngine"""
    print("\n" + "="*80)
    print("EXAMPLE: NLPEngine - Natural Language Processing")
    print("="*80)
    
    # Use NLPEngine
    nlp = nlp_engine.NLPEngine()
    
    # Test sentiment analysis
    text = "This is an amazing product! I love it!"
    sentiment = nlp.analyze_sentiment(text)
    
    print(f"\nText: '{text}'")
    print(f"Sentiment: {sentiment.get('sentiment', 'unknown')}")
    print(f"Confidence: {sentiment.get('score', 0):.4f}")
    
    # Test text preprocessing
    tokens = nlp.preprocess_text(text, remove_stop=True, lemmatize=True)
    print(f"Preprocessed Tokens: {tokens[:5]}...")  # Show first 5
    
    return sentiment


def example_all_modules():
    """Example: Using multiple modules together"""
    print("\n" + "="*80)
    print("EXAMPLE: Complete Workflow - Multiple Modules")
    print("="*80)
    
    # 1. Data Preprocessing
    print("\n1. Data Preprocessing...")
    data = pd.DataFrame({
        'feature1': np.random.randn(50),
        'feature2': np.random.randn(50),
        'target': np.random.randint(0, 2, 50)
    })
    
    eda = data_preprocessing.AutoEDA()
    eda_report = eda.analyze(data)
    print(f"   ✓ EDA complete: {eda_report['dataset_info']['shape']}")
    
    # 2. Deep Learning
    print("\n2. Deep Learning...")
    X = data[['feature1', 'feature2']].values
    y = data['target'].values
    
    dl = deep_learning.DeepLearningProcessor()
    dl_result = dl.train_model(X, y, epochs=3, validation_split=0.2)
    print(f"   ✓ Model trained: {dl_result.get('framework', 'numpy')}")
    
    # 3. NLP (if available)
    print("\n3. NLP Analysis...")
    try:
        nlp = nlp_engine.NLPEngine()
        sentiment = nlp.analyze_sentiment("Great results from the model!")
        print(f"   ✓ Sentiment analyzed: {sentiment.get('sentiment', 'unknown')}")
    except Exception as e:
        print(f"   ⚠️ NLP not available: {type(e).__name__}")
    
    print("\n✓ Complete workflow executed successfully!")


if __name__ == "__main__":
    print("\n" + "="*80)
    print("QUANTUM INTELLIGENCE NEXUS - MODULE IMPORT EXAMPLES")
    print("="*80)
    
    # Run individual examples
    example_auto_eda()
    example_deep_learning()
    example_nlp()
    
    # Run complete workflow
    example_all_modules()
    
    print("\n" + "="*80)
    print("All examples completed successfully!")
    print("="*80 + "\n")



