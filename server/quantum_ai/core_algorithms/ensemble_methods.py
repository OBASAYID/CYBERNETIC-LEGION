"""
ensemble_methods.py
Advanced Ensemble Methods for Quantum Intelligence Nexus
Voting, stacking, blending, bagging, boosting, XGBoost, LightGBM integration.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Any, Callable
from datetime import datetime
from collections import deque
import warnings
warnings.filterwarnings('ignore')

try:
    from sklearn.ensemble import (
        VotingClassifier, VotingRegressor,
        BaggingClassifier, BaggingRegressor,
        AdaBoostClassifier, AdaBoostRegressor,
        GradientBoostingClassifier, GradientBoostingRegressor,
        RandomForestClassifier, RandomForestRegressor
    )
    from sklearn.model_selection import cross_val_score, KFold
    from sklearn.metrics import accuracy_score, mean_squared_error
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    import xgboost as xgb
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

try:
    import lightgbm as lgb
    LIGHTGBM_AVAILABLE = True
except ImportError:
    LIGHTGBM_AVAILABLE = False


class VotingEnsemble:
    """
    Voting ensemble (hard or soft voting).
    """
    
    def __init__(self, models: List[Any], voting: str = 'hard', weights: Optional[List[float]] = None):
        """
        Initialize voting ensemble.
        
        Args:
            models: List of trained models
            voting: 'hard' for classification, 'soft' for probability-based
            weights: Optional weights for each model
        """
        self.models = models
        self.voting = voting
        self.weights = weights or [1.0 / len(models)] * len(models)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make ensemble predictions."""
        if not SKLEARN_AVAILABLE:
            return self._simple_voting(X)
        
        if self.voting == 'hard':
            predictions = np.array([model.predict(X) for model in self.models])
            # Weighted majority vote
            unique_labels = np.unique(predictions)
            weighted_votes = np.zeros((X.shape[0], len(unique_labels)))
            
            for i, label in enumerate(unique_labels):
                mask = predictions == label
                weighted_votes[:, i] = np.sum(self.weights * mask.T, axis=1)
            
            return unique_labels[np.argmax(weighted_votes, axis=1)]
        else:
            # Soft voting
            probabilities = np.array([model.predict_proba(X) for model in self.models])
            weighted_probs = np.average(probabilities, axis=0, weights=self.weights)
            return np.argmax(weighted_probs, axis=1)
    
    def _simple_voting(self, X: np.ndarray) -> np.ndarray:
        """Simple voting without sklearn."""
        predictions = np.array([model.predict(X) for model in self.models])
        # Majority vote
        from scipy import stats
        return stats.mode(predictions, axis=0)[0].flatten()


class StackingEnsemble:
    """
    Stacking ensemble with meta-learner.
    """
    
    def __init__(self, base_models: List[Any], meta_model: Any, cv_folds: int = 5):
        """
        Initialize stacking ensemble.
        
        Args:
            base_models: List of base models
            meta_model: Meta-learner model
            cv_folds: Number of cross-validation folds
        """
        self.base_models = base_models
        self.meta_model = meta_model
        self.cv_folds = cv_folds
        self.is_fitted = False
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train stacking ensemble."""
        if not SKLEARN_AVAILABLE:
            raise ImportError("scikit-learn required for stacking")
        
        from sklearn.model_selection import KFold
        
        kf = KFold(n_splits=self.cv_folds, shuffle=True, random_state=42)
        meta_features = np.zeros((X.shape[0], len(self.base_models)))
        
        # Generate meta-features using cross-validation
        for i, model in enumerate(self.base_models):
            fold_predictions = np.zeros(X.shape[0])
            
            for train_idx, val_idx in kf.split(X):
                X_train_fold, X_val_fold = X[train_idx], X[val_idx]
                y_train_fold = y[train_idx]
                
                # Train base model on fold
                model_copy = self._clone_model(model)
                model_copy.fit(X_train_fold, y_train_fold)
                
                # Predict on validation fold
                if hasattr(model_copy, 'predict_proba'):
                    fold_predictions[val_idx] = model_copy.predict_proba(X_val_fold)[:, 1]
                else:
                    fold_predictions[val_idx] = model_copy.predict(X_val_fold)
            
            meta_features[:, i] = fold_predictions
        
        # Train meta-model on meta-features
        self.meta_model.fit(meta_features, y)
        self.is_fitted = True
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions with stacking ensemble."""
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call fit() first.")
        
        # Get base model predictions
        meta_features = np.zeros((X.shape[0], len(self.base_models)))
        for i, model in enumerate(self.base_models):
            if hasattr(model, 'predict_proba'):
                meta_features[:, i] = model.predict_proba(X)[:, 1]
            else:
                meta_features[:, i] = model.predict(X)
        
        # Meta-model prediction
        return self.meta_model.predict(meta_features)
    
    def _clone_model(self, model: Any) -> Any:
        """Clone a model for cross-validation."""
        from sklearn.base import clone
        try:
            return clone(model)
        except:
            # Fallback: return model (not ideal but works)
            return model


class BlendingEnsemble:
    """
    Blending ensemble (holdout-based stacking).
    """
    
    def __init__(self, base_models: List[Any], meta_model: Any, holdout_ratio: float = 0.2):
        """
        Initialize blending ensemble.
        
        Args:
            base_models: List of base models
            meta_model: Meta-learner model
            holdout_ratio: Ratio of data to hold out for meta-training
        """
        self.base_models = base_models
        self.meta_model = meta_model
        self.holdout_ratio = holdout_ratio
        self.is_fitted = False
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train blending ensemble."""
        # Split data
        split_idx = int(X.shape[0] * (1 - self.holdout_ratio))
        X_train, X_holdout = X[:split_idx], X[split_idx:]
        y_train, y_holdout = y[:split_idx], y[split_idx:]
        
        # Train base models on training set
        for model in self.base_models:
            model.fit(X_train, y_train)
        
        # Generate meta-features on holdout set
        meta_features = np.zeros((X_holdout.shape[0], len(self.base_models)))
        for i, model in enumerate(self.base_models):
            if hasattr(model, 'predict_proba'):
                meta_features[:, i] = model.predict_proba(X_holdout)[:, 1]
            else:
                meta_features[:, i] = model.predict(X_holdout)
        
        # Train meta-model
        self.meta_model.fit(meta_features, y_holdout)
        self.is_fitted = True
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions."""
        if not self.is_fitted:
            raise ValueError("Model not fitted. Call fit() first.")
        
        # Get base model predictions
        meta_features = np.zeros((X.shape[0], len(self.base_models)))
        for i, model in enumerate(self.base_models):
            if hasattr(model, 'predict_proba'):
                meta_features[:, i] = model.predict_proba(X)[:, 1]
            else:
                meta_features[:, i] = model.predict(X)
        
        return self.meta_model.predict(meta_features)


class BaggingEnsemble:
    """
    Bagging ensemble (Bootstrap Aggregating).
    """
    
    def __init__(self, base_model: Any, n_estimators: int = 10, max_samples: float = 1.0):
        """
        Initialize bagging ensemble.
        
        Args:
            base_model: Base model to bag
            n_estimators: Number of estimators
            max_samples: Fraction of samples for each bootstrap
        """
        self.base_model = base_model
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.models = []
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train bagging ensemble."""
        n_samples = int(X.shape[0] * self.max_samples)
        
        for i in range(self.n_estimators):
            # Bootstrap sample
            indices = np.random.choice(X.shape[0], size=n_samples, replace=True)
            X_bootstrap = X[indices]
            y_bootstrap = y[indices]
            
            # Train model on bootstrap
            model = self._clone_model(self.base_model)
            model.fit(X_bootstrap, y_bootstrap)
            self.models.append(model)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions."""
        predictions = np.array([model.predict(X) for model in self.models])
        # Average for regression, majority vote for classification
        if len(np.unique(predictions[0])) > 10:  # Regression
            return np.mean(predictions, axis=0)
        else:  # Classification
            from scipy import stats
            return stats.mode(predictions, axis=0)[0].flatten()
    
    def _clone_model(self, model: Any) -> Any:
        """Clone model."""
        from sklearn.base import clone
        try:
            return clone(model)
        except:
            return model


class BoostingEnsemble:
    """
    Boosting ensemble (AdaBoost, Gradient Boosting).
    """
    
    def __init__(self, base_model: Any, n_estimators: int = 50, learning_rate: float = 0.1):
        """
        Initialize boosting ensemble.
        
        Args:
            base_model: Weak base learner
            n_estimators: Number of estimators
            learning_rate: Learning rate
        """
        self.base_model = base_model
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.models = []
        self.weights = []
    
    def fit(self, X: np.ndarray, y: np.ndarray):
        """Train boosting ensemble (simplified AdaBoost)."""
        n_samples = X.shape[0]
        sample_weights = np.ones(n_samples) / n_samples
        
        for i in range(self.n_estimators):
            # Train weak learner
            model = self._clone_model(self.base_model)
            model.fit(X, y, sample_weight=sample_weights)
            
            # Make predictions
            predictions = model.predict(X)
            
            # Calculate error
            error = np.sum(sample_weights * (predictions != y)) / np.sum(sample_weights)
            
            if error >= 0.5:
                break  # Stop if error too high
            
            # Calculate model weight
            alpha = self.learning_rate * np.log((1 - error) / (error + 1e-10))
            self.models.append(model)
            self.weights.append(alpha)
            
            # Update sample weights
            sample_weights *= np.exp(alpha * (predictions != y))
            sample_weights /= np.sum(sample_weights)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions."""
        predictions = np.zeros(X.shape[0])
        
        for model, weight in zip(self.models, self.weights):
            predictions += weight * model.predict(X)
        
        # For classification, convert to classes
        if len(np.unique(predictions)) < 10:
            return (predictions > 0).astype(int)
        
        return predictions
    
    def _clone_model(self, model: Any) -> Any:
        """Clone model."""
        from sklearn.base import clone
        try:
            return clone(model)
        except:
            return model


class XGBoostEnsemble:
    """
    XGBoost ensemble wrapper.
    """
    
    def __init__(self, **params):
        """Initialize XGBoost ensemble."""
        if not XGBOOST_AVAILABLE:
            raise ImportError("XGBoost not installed. Install with: pip install xgboost")
        
        self.params = params
        self.model = None
    
    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs):
        """Train XGBoost model."""
        # Determine task type
        if len(np.unique(y)) < 10:
            # Classification
            self.model = xgb.XGBClassifier(**self.params)
        else:
            # Regression
            self.model = xgb.XGBRegressor(**self.params)
        
        self.model.fit(X, y, **kwargs)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions."""
        if self.model is None:
            raise ValueError("Model not fitted. Call fit() first.")
        return self.model.predict(X)
    
    def get_feature_importance(self) -> Dict:
        """Get feature importance."""
        if self.model is None:
            raise ValueError("Model not fitted.")
        return {
            'importance': self.model.feature_importances_.tolist(),
            'type': 'xgboost'
        }


class LightGBMEnsemble:
    """
    LightGBM ensemble wrapper.
    """
    
    def __init__(self, **params):
        """Initialize LightGBM ensemble."""
        if not LIGHTGBM_AVAILABLE:
            raise ImportError("LightGBM not installed. Install with: pip install lightgbm")
        
        self.params = params
        self.model = None
    
    def fit(self, X: np.ndarray, y: np.ndarray, **kwargs):
        """Train LightGBM model."""
        # Determine task type
        if len(np.unique(y)) < 10:
            # Classification
            self.model = lgb.LGBMClassifier(**self.params)
        else:
            # Regression
            self.model = lgb.LGBMRegressor(**self.params)
        
        self.model.fit(X, y, **kwargs)
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """Make predictions."""
        if self.model is None:
            raise ValueError("Model not fitted. Call fit() first.")
        return self.model.predict(X)
    
    def get_feature_importance(self) -> Dict:
        """Get feature importance."""
        if self.model is None:
            raise ValueError("Model not fitted.")
        return {
            'importance': self.model.feature_importances_.tolist(),
            'type': 'lightgbm'
        }


class EnsembleMethodsEngine:
    """
    Main ensemble methods engine.
    """
    
    def __init__(self):
        self.ensembles = {}
        self.processing_pathway = []
    
    def _log_step(self, message: str):
        """Log processing step."""
        self.processing_pathway.append({
            'module': 'EnsembleMethodsEngine',
            'step': message,
            'timestamp': datetime.now().isoformat()
        })
    
    def create_voting_ensemble(self, models: List[Any], voting: str = 'hard',
                               weights: Optional[List[float]] = None,
                               ensemble_id: str = 'voting') -> VotingEnsemble:
        """Create voting ensemble."""
        self._log_step(f"Creating voting ensemble: {voting} voting, {len(models)} models")
        ensemble = VotingEnsemble(models, voting, weights)
        self.ensembles[ensemble_id] = ensemble
        return ensemble
    
    def create_stacking_ensemble(self, base_models: List[Any], meta_model: Any,
                                 cv_folds: int = 5,
                                 ensemble_id: str = 'stacking') -> StackingEnsemble:
        """Create stacking ensemble."""
        self._log_step(f"Creating stacking ensemble: {len(base_models)} base models")
        ensemble = StackingEnsemble(base_models, meta_model, cv_folds)
        self.ensembles[ensemble_id] = ensemble
        return ensemble
    
    def create_blending_ensemble(self, base_models: List[Any], meta_model: Any,
                                 holdout_ratio: float = 0.2,
                                 ensemble_id: str = 'blending') -> BlendingEnsemble:
        """Create blending ensemble."""
        self._log_step(f"Creating blending ensemble: {len(base_models)} base models")
        ensemble = BlendingEnsemble(base_models, meta_model, holdout_ratio)
        self.ensembles[ensemble_id] = ensemble
        return ensemble
    
    def create_bagging_ensemble(self, base_model: Any, n_estimators: int = 10,
                                ensemble_id: str = 'bagging') -> BaggingEnsemble:
        """Create bagging ensemble."""
        self._log_step(f"Creating bagging ensemble: {n_estimators} estimators")
        ensemble = BaggingEnsemble(base_model, n_estimators)
        self.ensembles[ensemble_id] = ensemble
        return ensemble
    
    def create_boosting_ensemble(self, base_model: Any, n_estimators: int = 50,
                                 learning_rate: float = 0.1,
                                 ensemble_id: str = 'boosting') -> BoostingEnsemble:
        """Create boosting ensemble."""
        self._log_step(f"Creating boosting ensemble: {n_estimators} estimators")
        ensemble = BoostingEnsemble(base_model, n_estimators, learning_rate)
        self.ensembles[ensemble_id] = ensemble
        return ensemble
    
    def create_xgboost_ensemble(self, **params) -> XGBoostEnsemble:
        """Create XGBoost ensemble."""
        self._log_step("Creating XGBoost ensemble")
        ensemble = XGBoostEnsemble(**params)
        return ensemble
    
    def create_lightgbm_ensemble(self, **params) -> LightGBMEnsemble:
        """Create LightGBM ensemble."""
        self._log_step("Creating LightGBM ensemble")
        ensemble = LightGBMEnsemble(**params)
        return ensemble
    
    def calculate_diversity(self, models: List[Any], X: np.ndarray) -> Dict:
        """Calculate diversity metrics between models."""
        self._log_step("Calculating ensemble diversity")
        
        predictions = np.array([model.predict(X) for model in models])
        
        # Pairwise disagreement
        disagreements = []
        for i in range(len(models)):
            for j in range(i + 1, len(models)):
                disagreement = np.mean(predictions[i] != predictions[j])
                disagreements.append(disagreement)
        
        return {
            'mean_disagreement': float(np.mean(disagreements)),
            'std_disagreement': float(np.std(disagreements)),
            'diversity_score': float(np.mean(disagreements))  # Higher = more diverse
        }
    
    def get_processing_pathway(self) -> List[Dict]:
        """Get processing pathway."""
        return self.processing_pathway.copy()
    
    def reset_pathway(self):
        """Reset pathway."""
        self.processing_pathway = []
