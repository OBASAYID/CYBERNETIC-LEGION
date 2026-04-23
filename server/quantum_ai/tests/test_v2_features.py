"""
Pytest tests for Quantum AI Core v2.0 features

Tests for:
- Deep Learning module
- Explainability module
- Visualization module
- Preprocessing module
"""

import sys
import os

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'server'))

import numpy as np
import pandas as pd
import pytest

# Import modules
try:
    from quantum_ai.core_algorithms.deep_learning import DeepLearningProcessor
    HAS_DEEP_LEARNING = True
except ImportError:
    HAS_DEEP_LEARNING = False

try:
    from quantum_ai.core_algorithms.explainability import ExplainabilityEngine
    HAS_EXPLAINABILITY = True
except ImportError:
    HAS_EXPLAINABILITY = False

try:
    from quantum_ai.core_algorithms.visualization import VisualizationEngine
    HAS_VISUALIZATION = True
except ImportError:
    HAS_VISUALIZATION = False

try:
    from quantum_ai.core_algorithms.preprocessing_eda import PreprocessingEngine
    HAS_PREPROCESSING = True
except ImportError:
    HAS_PREPROCESSING = False


@pytest.mark.skipif(not HAS_DEEP_LEARNING, reason="DeepLearningProcessor not available")
class TestDeepLearning:
    """Tests for DeepLearningProcessor."""
    
    @pytest.mark.skipif(not HAS_DEEP_LEARNING, reason="DeepLearningProcessor not available")
    def test_initialization(self):
        """Test DeepLearningProcessor initialization."""
        dl = DeepLearningProcessor(framework='pytorch')
        assert dl.framework == 'pytorch'
        assert hasattr(dl, 'processing_pathway')
    
    def test_train_pytorch_mlp(self):
        """Test PyTorch MLP training."""
        try:
            dl = DeepLearningProcessor(framework='pytorch')
            X = np.random.randn(100, 10)
            y = np.random.randint(0, 2, 100)
            results = dl.train_pytorch_mlp(X, y, epochs=5)
            
            assert 'model' in results
            assert 'train_losses' in results
            assert 'framework' in results
            assert results['framework'] == 'pytorch'
            assert len(results['train_losses']) == 5
        except ImportError:
            pytest.skip("PyTorch not available")
    
    def test_processing_pathway(self):
        """Test processing pathway logging."""
        dl = DeepLearningProcessor(framework='pytorch')
        pathway = dl.get_processing_pathway()
        assert isinstance(pathway, list)
        
        dl.reset_pathway()
        assert len(dl.get_processing_pathway()) == 0


@pytest.mark.skipif(not HAS_EXPLAINABILITY, reason="ExplainabilityEngine not available")
class TestExplainability:
    """Tests for ExplainabilityEngine."""
    
    def test_initialization(self):
        """Test ExplainabilityEngine initialization."""
        xai = ExplainabilityEngine()
        assert hasattr(xai, 'calculate_shap_values')
        assert hasattr(xai, 'explain_with_lime')
        assert hasattr(xai, 'fairness_metrics')
        assert hasattr(xai, 'model_feature_importance')
        assert hasattr(xai, 'permutation_feature_importance')
    
    def test_model_feature_importance(self):
        """Test model feature importance extraction."""
        from sklearn.ensemble import RandomForestClassifier
        
        xai = ExplainabilityEngine()
        X = np.random.randn(100, 5)
        y = np.random.randint(0, 2, 100)
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X, y)
        
        importance_df = xai.model_feature_importance(
            model,
            feature_names=[f"Feature_{i}" for i in range(5)]
        )
        
        assert 'feature' in importance_df.columns
        assert 'importance' in importance_df.columns
        assert len(importance_df) == 5
    
    def test_fairness_metrics(self):
        """Test fairness metrics calculation."""
        from sklearn.ensemble import RandomForestClassifier
        
        xai = ExplainabilityEngine()
        X = np.random.randn(200, 5)
        y = np.random.randint(0, 2, 200)
        
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X, y)
        y_pred = model.predict(X)
        
        protected_attr = np.random.randint(0, 2, 200)
        fairness = xai.fairness_metrics(y, y_pred, protected_attr)
        
        assert 'fairness_metrics' in fairness
        assert isinstance(fairness, dict)
    
    def test_processing_pathway(self):
        """Test processing pathway logging."""
        xai = ExplainabilityEngine()
        pathway = xai.get_processing_pathway()
        assert isinstance(pathway, list)


@pytest.mark.skipif(not HAS_VISUALIZATION, reason="VisualizationEngine not available")
class TestVisualization:
    """Tests for VisualizationEngine."""
    
    def test_initialization(self):
        """Test VisualizationEngine initialization."""
        viz = VisualizationEngine()
        assert hasattr(viz, 'plot_clusters')
        assert hasattr(viz, 'plot_pca')
        assert hasattr(viz, 'plot_training_history')
        assert hasattr(viz, 'plot_feature_importance')
    
    def test_plot_clusters(self):
        """Test cluster plotting."""
        viz = VisualizationEngine()
        X = np.random.randn(100, 2)
        labels = np.random.randint(0, 3, 100)
        
        plot = viz.plot_clusters(X, labels)
        assert plot is not None
    
    def test_plot_feature_importance(self):
        """Test feature importance plotting."""
        viz = VisualizationEngine()
        feature_names = [f"Feature_{i}" for i in range(10)]
        importance_values = np.random.rand(10)
        
        plot = viz.plot_feature_importance(feature_names, importance_values)
        assert plot is not None
    
    def test_plot_training_history(self):
        """Test training history plotting."""
        viz = VisualizationEngine()
        train_loss = [0.5, 0.4, 0.3, 0.2, 0.1]
        val_loss = [0.6, 0.5, 0.4, 0.3, 0.2]
        
        plot = viz.plot_training_history(train_loss, val_loss)
        assert plot is not None
    
    def test_processing_pathway(self):
        """Test processing pathway logging."""
        viz = VisualizationEngine()
        pathway = viz.get_processing_pathway()
        assert isinstance(pathway, list)


@pytest.mark.skipif(not HAS_PREPROCESSING, reason="PreprocessingEngine not available")
class TestPreprocessing:
    """Tests for PreprocessingEngine."""
    
    def test_initialization(self):
        """Test PreprocessingEngine initialization."""
        prep = PreprocessingEngine()
        assert hasattr(prep, 'assess_data_quality')
        assert hasattr(prep, 'handle_missing_values')
        assert hasattr(prep, 'scale_features')
        assert hasattr(prep, 'detect_outliers')
    
    def test_assess_data_quality(self):
        """Test data quality assessment."""
        prep = PreprocessingEngine()
        X = np.random.randn(100, 5)
        X_df = pd.DataFrame(X)
        
        quality = prep.assess_data_quality(X_df)
        
        assert 'shape' in quality
        assert 'missing_values' in quality
        assert 'duplicates' in quality
        assert quality['shape'] == (100, 5)
        assert isinstance(quality['missing_values'], dict)
    
    def test_handle_missing_values(self):
        """Test missing value handling."""
        prep = PreprocessingEngine()
        X = pd.DataFrame({
            'feature1': [1, 2, np.nan, 4, 5],
            'feature2': [10, np.nan, 30, 40, 50]
        })
        
        X_clean = prep.handle_missing_values(X, strategy='mean')
        assert X_clean.isnull().sum().sum() == 0
    
    def test_scale_features(self):
        """Test feature scaling."""
        prep = PreprocessingEngine()
        X = np.random.randn(100, 5)
        
        X_scaled, scaler = prep.scale_features(X, method='standard')
        
        assert X_scaled.shape == X.shape
        assert scaler is not None
    
    def test_detect_outliers(self):
        """Test outlier detection."""
        prep = PreprocessingEngine()
        X = np.random.randn(100, 5)
        
        X_clean, outlier_mask = prep.detect_outliers(X, method='iqr')
        
        assert X_clean.shape[0] <= X.shape[0]
        assert isinstance(outlier_mask, np.ndarray)
        assert outlier_mask.dtype == bool
    
    def test_generate_eda_report(self):
        """Test EDA report generation."""
        prep = PreprocessingEngine()
        X = pd.DataFrame(np.random.randn(100, 5))
        y = np.random.randint(0, 2, 100)
        
        report = prep.generate_eda_report(X, y=y)
        
        assert 'timestamp' in report
        assert 'quality_assessment' in report
        assert 'data_profile' in report
        assert 'shape' in report
    
    def test_processing_pathway(self):
        """Test processing pathway logging."""
        prep = PreprocessingEngine()
        pathway = prep.get_processing_pathway()
        assert isinstance(pathway, list)


class TestIntegration:
    """Integration tests for complete workflows."""
    
    @pytest.mark.skipif(not HAS_PREPROCESSING or not HAS_EXPLAINABILITY, reason="Required engines not available")
    def test_complete_workflow(self):
        """Test complete preprocessing -> training -> explanation workflow."""
        from sklearn.ensemble import RandomForestClassifier
        
        # Initialize
        prep = PreprocessingEngine()
        xai = ExplainabilityEngine()
        
        # Generate data
        X = pd.DataFrame(np.random.randn(200, 10))
        y = np.random.randint(0, 2, 200)
        
        # Preprocess
        X_clean = prep.handle_missing_values(X, strategy='mean')
        X_scaled, scaler = prep.scale_features(X_clean.values)
        
        # Train model
        model = RandomForestClassifier(n_estimators=10, random_state=42)
        model.fit(X_scaled, y)
        
        # Explain
        importance_df = xai.model_feature_importance(
            model,
            feature_names=[f"F{i}" for i in range(X_scaled.shape[1])]
        )
        
        assert len(importance_df) == X_scaled.shape[1]
        assert 'importance' in importance_df.columns


if __name__ == '__main__':
    pytest.main([__file__, '-v'])



