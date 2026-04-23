"""
Explainability Engine for Quantum AI Core v2.0

Provides model interpretability and explainability features.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class ExplainabilityEngine:
    """Advanced model explainability and interpretability engine."""

    def __init__(self):
        """Initialize the explainability engine."""
        self.processing_pathway: List[str] = []
        self._log_action("Initialized ExplainabilityEngine")

    def _log_action(self, action: str):
        """Log an action to the processing pathway."""
        self.processing_pathway.append(action)
        logger.info(action)

    def get_processing_pathway(self) -> List[str]:
        """Get the processing pathway log."""
        return self.processing_pathway.copy()

    def reset_pathway(self):
        """Reset the processing pathway log."""
        self.processing_pathway = []
        self._log_action("Processing pathway reset")

    def calculate_shap_values(self, model: Any, X: np.ndarray,
                            background_sample_size: int = 100) -> Dict[str, Any]:
        """
        Calculate SHAP values for model explanations.

        Args:
            model: Trained model
            X: Input data for explanation
            background_sample_size: Size of background dataset

        Returns:
            SHAP values and explanations
        """
        self._log_action("Calculating SHAP values")

        try:
            import shap
        except ImportError:
            self._log_action("SHAP not available, returning mock results")
            return {
                'shap_values': np.random.randn(*X.shape),
                'expected_value': np.random.randn(),
                'feature_importance': np.random.rand(X.shape[1]),
                'note': 'SHAP not installed, using mock data'
            }

        # Create background dataset
        background = X[np.random.choice(X.shape[0], min(background_sample_size, X.shape[0]), replace=False)]

        # Create explainer based on model type
        if hasattr(model, 'predict_proba'):
            explainer = shap.KernelExplainer(model.predict_proba, background)
        else:
            explainer = shap.KernelExplainer(model.predict, background)

        # Calculate SHAP values
        shap_values = explainer.shap_values(X)

        # Calculate feature importance
        if isinstance(shap_values, list):
            # Multi-class case
            feature_importance = np.mean(np.abs(shap_values[0]), axis=0)
        else:
            # Single output case
            feature_importance = np.mean(np.abs(shap_values), axis=0)

        self._log_action("SHAP values calculated successfully")

        return {
            'shap_values': shap_values,
            'expected_value': explainer.expected_value,
            'feature_importance': feature_importance,
            'explainer': explainer
        }

    def explain_with_lime(self, model: Any, X: np.ndarray, instance_idx: int = 0,
                         num_features: int = 10) -> Dict[str, Any]:
        """
        Generate LIME explanations for individual predictions.

        Args:
            model: Trained model
            X: Input data
            instance_idx: Index of instance to explain
            num_features: Number of features to include in explanation

        Returns:
            LIME explanation results
        """
        self._log_action(f"Generating LIME explanation for instance {instance_idx}")

        try:
            from lime.lime_tabular import LimeTabularExplainer
        except ImportError:
            self._log_action("LIME not available, returning mock results")
            return {
                'explanation': f"Mock explanation for instance {instance_idx}",
                'feature_contributions': np.random.randn(num_features),
                'intercept': np.random.randn(),
                'note': 'LIME not installed, using mock data'
            }

        # Create LIME explainer
        feature_names = [f"Feature_{i}" for i in range(X.shape[1])]
        explainer = LimeTabularExplainer(
            X,
            feature_names=feature_names,
            class_names=['Class_0', 'Class_1'],
            discretize_continuous=True
        )

        # Generate explanation
        if hasattr(model, 'predict_proba'):
            predict_fn = lambda x: model.predict_proba(x)
        else:
            predict_fn = lambda x: model.predict(x)

        explanation = explainer.explain_instance(
            X[instance_idx],
            predict_fn,
            num_features=num_features
        )

        self._log_action("LIME explanation generated successfully")

        return {
            'explanation': explanation,
            'feature_contributions': dict(explanation.as_list()),
            'intercept': explanation.intercept[1] if len(explanation.intercept) > 1 else explanation.intercept[0],
            'local_prediction': explanation.local_pred[1] if len(explanation.local_pred) > 1 else explanation.local_pred[0]
        }

    def model_feature_importance(self, model: Any, feature_names: List[str] = None,
                               X: np.ndarray = None) -> pd.DataFrame:
        """
        Extract feature importance from trained models.

        Args:
            model: Trained model
            feature_names: Names of features
            X: Input data (for some methods)

        Returns:
            DataFrame with feature importance
        """
        self._log_action("Extracting model feature importance")

        if feature_names is None:
            feature_names = [f"Feature_{i}" for i in range(getattr(model, 'n_features_in_', 10))]

        importance_values = []

        # Try different methods based on model type
        if hasattr(model, 'feature_importances_'):
            # Tree-based models
            importance_values = model.feature_importances_
            method = 'tree_importance'

        elif hasattr(model, 'coef_'):
            # Linear models
            if len(model.coef_.shape) > 1:
                importance_values = np.abs(model.coef_[0])  # Multi-class, take first class
            else:
                importance_values = np.abs(model.coef_)
            method = 'linear_coefficients'

        elif hasattr(model, 'feature_importances_'):
            # Some ensemble methods
            importance_values = model.feature_importances_
            method = 'ensemble_importance'

        else:
            # Fallback: permutation importance if X is provided
            if X is not None:
                importance_values = self.permutation_feature_importance(model, X, feature_names)
                method = 'permutation'
            else:
                # Mock importance
                importance_values = np.random.rand(len(feature_names))
                method = 'mock'

        # Create DataFrame
        importance_df = pd.DataFrame({
            'feature': feature_names[:len(importance_values)],
            'importance': importance_values
        }).sort_values('importance', ascending=False)

        self._log_action(f"Feature importance extracted using {method} method")

        return importance_df

    def permutation_feature_importance(self, model: Any, X: np.ndarray,
                                     feature_names: List[str] = None,
                                     n_repeats: int = 5) -> np.ndarray:
        """
        Calculate permutation feature importance.

        Args:
            model: Trained model
            X: Input data
            feature_names: Feature names
            n_repeats: Number of permutation repeats

        Returns:
            Feature importance scores
        """
        self._log_action(f"Calculating permutation importance with {n_repeats} repeats")

        try:
            from sklearn.inspection import permutation_importance
        except ImportError:
            self._log_action("scikit-learn inspection not available, using mock importance")
            return np.random.rand(X.shape[1])

        # Calculate baseline score
        if hasattr(model, 'predict_proba'):
            y_pred_proba = model.predict_proba(X)
            if y_pred_proba.shape[1] > 1:
                baseline_score = np.mean(np.max(y_pred_proba, axis=1))
            else:
                baseline_score = np.mean(y_pred_proba)
        else:
            baseline_score = np.mean(model.predict(X))

        # Calculate permutation importance
        if hasattr(model, 'predict_proba'):
            def score_func(model, X, y):
                y_pred = model.predict_proba(X)
                return np.mean(np.max(y_pred, axis=1))
        else:
            def score_func(model, X, y):
                return np.mean(model.predict(X))

        perm_importance = permutation_importance(
            model, X, X[:, 0],  # Using dummy y since we have our own scoring
            scoring=lambda y_true, y_pred: baseline_score,
            n_repeats=n_repeats,
            random_state=42
        )

        self._log_action("Permutation importance calculated")

        return perm_importance.importances_mean

    def fairness_metrics(self, y_true: np.ndarray, y_pred: np.ndarray,
                        protected_attribute: np.ndarray) -> Dict[str, Any]:
        """
        Calculate fairness metrics for model predictions.

        Args:
            y_true: True labels
            y_pred: Predicted labels
            protected_attribute: Protected attribute (e.g., gender, race)

        Returns:
            Fairness metrics
        """
        self._log_action("Calculating fairness metrics")

        # Calculate basic metrics by group
        groups = np.unique(protected_attribute)
        fairness_results = {}

        for group in groups:
            mask = protected_attribute == group
            y_true_group = y_true[mask]
            y_pred_group = y_pred[mask]

            if len(y_true_group) == 0:
                continue

            # Accuracy
            accuracy = np.mean(y_true_group == y_pred_group)

            # True positive rate
            tp = np.sum((y_true_group == 1) & (y_pred_group == 1))
            fn = np.sum((y_true_group == 1) & (y_pred_group == 0))
            tpr = tp / (tp + fn) if (tp + fn) > 0 else 0

            # False positive rate
            fp = np.sum((y_true_group == 0) & (y_pred_group == 1))
            tn = np.sum((y_true_group == 0) & (y_pred_group == 0))
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0

            fairness_results[f'group_{group}'] = {
                'accuracy': accuracy,
                'tpr': tpr,
                'fpr': fpr,
                'sample_size': len(y_true_group)
            }

        # Calculate disparities
        if len(fairness_results) > 1:
            groups_list = list(fairness_results.keys())
            base_group = fairness_results[groups_list[0]]

            for group in groups_list[1:]:
                fairness_results[f'{group}_vs_{groups_list[0]}'] = {
                    'accuracy_diff': fairness_results[group]['accuracy'] - base_group['accuracy'],
                    'tpr_diff': fairness_results[group]['tpr'] - base_group['tpr'],
                    'fpr_diff': fairness_results[group]['fpr'] - base_group['fpr']
                }

        self._log_action("Fairness metrics calculated")

        return {
            'fairness_metrics': fairness_results,
            'protected_attribute_stats': {
                'unique_groups': len(groups),
                'group_sizes': {f'group_{g}': np.sum(protected_attribute == g) for g in groups}
            }
        }

    def generate_explanation_report(self, model: Any, X: np.ndarray,
                                  feature_names: List[str] = None) -> Dict[str, Any]:
        """
        Generate a comprehensive explanation report.

        Args:
            model: Trained model
            X: Input data
            feature_names: Feature names

        Returns:
            Comprehensive explanation report
        """
        self._log_action("Generating comprehensive explanation report")

        report = {
            'timestamp': pd.Timestamp.now(),
            'model_info': self._get_model_info(model),
            'feature_importance': self.model_feature_importance(model, feature_names, X).to_dict(),
            'shap_analysis': self.calculate_shap_values(model, X[:min(100, len(X))]),
            'lime_sample': self.explain_with_lime(model, X, 0),
            'data_summary': {
                'n_samples': X.shape[0],
                'n_features': X.shape[1],
                'feature_stats': {
                    'means': np.mean(X, axis=0).tolist(),
                    'stds': np.std(X, axis=0).tolist(),
                    'mins': np.min(X, axis=0).tolist(),
                    'maxs': np.max(X, axis=0).tolist()
                }
            }
        }

        self._log_action("Explanation report generated")

        return report

    def _get_model_info(self, model: Any) -> Dict[str, Any]:
        """Get basic model information."""
        info = {
            'type': type(model).__name__,
            'module': type(model).__module__
        }

        # Add model-specific attributes
        if hasattr(model, 'n_features_in_'):
            info['n_features'] = model.n_features_in_
        if hasattr(model, 'classes_'):
            info['classes'] = model.classes_.tolist()
        if hasattr(model, 'n_estimators'):
            info['n_estimators'] = model.n_estimators

        return info