"""
Preprocessing and EDA Engine for Quantum AI Core v2.0

Provides data preprocessing, cleaning, and exploratory data analysis capabilities.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple, Union
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler
from sklearn.impute import SimpleImputer, KNNImputer
import logging

logger = logging.getLogger(__name__)

class PreprocessingEngine:
    """Advanced data preprocessing and EDA engine."""

    def __init__(self):
        """Initialize the preprocessing engine."""
        self.processing_pathway: List[str] = []
        self._log_action("Initialized PreprocessingEngine")

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

    def assess_data_quality(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Assess the quality of input data.

        Args:
            data: Input DataFrame

        Returns:
            Data quality assessment
        """
        self._log_action("Assessing data quality")

        quality_report = {
            'shape': data.shape,
            'columns': len(data.columns),
            'total_cells': data.shape[0] * data.shape[1],
            'missing_values': {},
            'duplicates': data.duplicated().sum(),
            'data_types': data.dtypes.astype(str).to_dict(),
            'memory_usage': data.memory_usage(deep=True).sum()
        }

        # Missing values analysis
        missing_summary = data.isnull().sum()
        quality_report['missing_values'] = {
            'total_missing': missing_summary.sum(),
            'missing_percentage': (missing_summary.sum() / quality_report['total_cells'] * 100).round(2),
            'columns_with_missing': (missing_summary > 0).sum(),
            'missing_by_column': missing_summary.to_dict()
        }

        # Data type distribution
        quality_report['dtype_distribution'] = data.dtypes.value_counts().to_dict()

        # Basic statistics for numeric columns
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            quality_report['numeric_summary'] = data[numeric_cols].describe().to_dict()

        # Categorical columns analysis
        categorical_cols = data.select_dtypes(include=['object', 'category']).columns
        if len(categorical_cols) > 0:
            cat_summary = {}
            for col in categorical_cols:
                value_counts = data[col].value_counts()
                cat_summary[col] = {
                    'unique_values': len(value_counts),
                    'most_common': value_counts.index[0] if len(value_counts) > 0 else None,
                    'most_common_count': value_counts.iloc[0] if len(value_counts) > 0 else 0
                }
            quality_report['categorical_summary'] = cat_summary

        self._log_action("Data quality assessment completed")

        return quality_report

    def handle_missing_values(self, data: pd.DataFrame,
                            strategy: str = 'mean',
                            columns: List[str] = None) -> pd.DataFrame:
        """
        Handle missing values in the dataset.

        Args:
            data: Input DataFrame
            strategy: Imputation strategy ('mean', 'median', 'most_frequent', 'constant', 'knn')
            columns: Specific columns to impute (None for all)

        Returns:
            DataFrame with imputed values
        """
        self._log_action(f"Handling missing values with strategy: {strategy}")

        data_processed = data.copy()

        if columns is None:
            columns = data.select_dtypes(include=[np.number]).columns.tolist()

        if strategy == 'knn':
            try:
                imputer = KNNImputer(n_neighbors=5)
                data_processed[columns] = imputer.fit_transform(data_processed[columns])
            except Exception as e:
                self._log_action(f"KNN imputation failed: {e}, falling back to mean")
                strategy = 'mean'
                imputer = SimpleImputer(strategy=strategy)
                data_processed[columns] = imputer.fit_transform(data_processed[columns])
        else:
            imputer = SimpleImputer(strategy=strategy)
            data_processed[columns] = imputer.fit_transform(data_processed[columns])

        self._log_action(f"Missing values handled for {len(columns)} columns")

        return data_processed

    def scale_features(self, X: np.ndarray, method: str = 'standard') -> Tuple[np.ndarray, Any]:
        """
        Scale features using various scaling methods.

        Args:
            X: Input features
            method: Scaling method ('standard', 'minmax', 'robust')

        Returns:
            Scaled features and scaler object
        """
        self._log_action(f"Scaling features with method: {method}")

        if method == 'standard':
            scaler = StandardScaler()
        elif method == 'minmax':
            scaler = MinMaxScaler()
        elif method == 'robust':
            scaler = RobustScaler()
        else:
            raise ValueError(f"Unknown scaling method: {method}")

        X_scaled = scaler.fit_transform(X)

        self._log_action("Feature scaling completed")

        return X_scaled, scaler

    def detect_outliers(self, X: np.ndarray, method: str = 'iqr',
                       threshold: float = 1.5) -> Tuple[np.ndarray, np.ndarray]:
        """
        Detect outliers in the dataset.

        Args:
            X: Input features
            method: Outlier detection method ('iqr', 'zscore', 'isolation_forest')
            threshold: Threshold for outlier detection

        Returns:
            Cleaned data and outlier mask
        """
        self._log_action(f"Detecting outliers with method: {method}")

        if method == 'iqr':
            # IQR method for each feature
            outlier_mask = np.zeros(X.shape[0], dtype=bool)

            for i in range(X.shape[1]):
                Q1 = np.percentile(X[:, i], 25)
                Q3 = np.percentile(X[:, i], 75)
                IQR = Q3 - Q1

                lower_bound = Q1 - threshold * IQR
                upper_bound = Q3 + threshold * IQR

                feature_outliers = (X[:, i] < lower_bound) | (X[:, i] > upper_bound)
                outlier_mask |= feature_outliers

        elif method == 'zscore':
            from scipy import stats
            z_scores = np.abs(stats.zscore(X))
            outlier_mask = (z_scores > threshold).any(axis=1)

        elif method == 'isolation_forest':
            try:
                from sklearn.ensemble import IsolationForest
                iso_forest = IsolationForest(contamination=0.1, random_state=42)
                outlier_mask = iso_forest.fit_predict(X) == -1
            except ImportError:
                self._log_action("IsolationForest not available, falling back to IQR")
                return self.detect_outliers(X, 'iqr', threshold)

        else:
            raise ValueError(f"Unknown outlier detection method: {method}")

        X_clean = X[~outlier_mask]

        self._log_action(f"Detected {outlier_mask.sum()} outliers out of {X.shape[0]} samples")

        return X_clean, outlier_mask

    def remove_duplicates(self, data: pd.DataFrame, subset: List[str] = None) -> pd.DataFrame:
        """
        Remove duplicate rows from the dataset.

        Args:
            data: Input DataFrame
            subset: Columns to consider for duplicates (None for all columns)

        Returns:
            DataFrame with duplicates removed
        """
        initial_shape = data.shape
        data_clean = data.drop_duplicates(subset=subset)
        final_shape = data_clean.shape

        self._log_action(f"Removed {initial_shape[0] - final_shape[0]} duplicate rows")

        return data_clean

    def encode_categorical(self, data: pd.DataFrame, method: str = 'onehot',
                          columns: List[str] = None) -> Tuple[pd.DataFrame, Any]:
        """
        Encode categorical variables.

        Args:
            data: Input DataFrame
            method: Encoding method ('onehot', 'label', 'ordinal')
            columns: Columns to encode (None for all categorical)

        Returns:
            Encoded DataFrame and encoder information
        """
        self._log_action(f"Encoding categorical variables with method: {method}")

        if columns is None:
            columns = data.select_dtypes(include=['object', 'category']).columns.tolist()

        data_encoded = data.copy()
        encoders = {}

        if method == 'onehot':
            data_encoded = pd.get_dummies(data_encoded, columns=columns, drop_first=True)
            encoders = {'method': 'onehot', 'columns': columns}

        elif method == 'label':
            from sklearn.preprocessing import LabelEncoder
            for col in columns:
                le = LabelEncoder()
                data_encoded[col] = le.fit_transform(data_encoded[col].astype(str))
                encoders[col] = le

        elif method == 'ordinal':
            from sklearn.preprocessing import OrdinalEncoder
            oe = OrdinalEncoder()
            data_encoded[columns] = oe.fit_transform(data_encoded[columns].astype(str))
            encoders = {'method': 'ordinal', 'encoder': oe, 'columns': columns}

        self._log_action(f"Categorical encoding completed for {len(columns)} columns")

        return data_encoded, encoders

    def feature_selection(self, X: np.ndarray, y: np.ndarray, method: str = 'mutual_info',
                         k: int = 10) -> Tuple[np.ndarray, List[int]]:
        """
        Perform feature selection.

        Args:
            X: Input features
            y: Target variable
            method: Feature selection method ('mutual_info', 'chi2', 'f_classif')
            k: Number of features to select

        Returns:
            Selected features and feature indices
        """
        self._log_action(f"Performing feature selection with method: {method}")

        try:
            if method == 'mutual_info':
                from sklearn.feature_selection import SelectKBest, mutual_info_classif
                selector = SelectKBest(mutual_info_classif, k=min(k, X.shape[1]))
            elif method == 'chi2':
                from sklearn.feature_selection import SelectKBest, chi2
                selector = SelectKBest(chi2, k=min(k, X.shape[1]))
            elif method == 'f_classif':
                from sklearn.feature_selection import SelectKBest, f_classif
                selector = SelectKBest(f_classif, k=min(k, X.shape[1]))
            else:
                raise ValueError(f"Unknown feature selection method: {method}")

            X_selected = selector.fit_transform(X, y)
            selected_indices = selector.get_support(indices=True)

        except ImportError:
            self._log_action(f"Feature selection method {method} not available, returning all features")
            X_selected = X
            selected_indices = list(range(X.shape[1]))

        self._log_action(f"Selected {len(selected_indices)} features")

        return X_selected, selected_indices

    def generate_eda_report(self, data: pd.DataFrame, target_column: str = None, y: np.ndarray = None) -> Dict[str, Any]:
        """
        Generate a comprehensive EDA report.

        Args:
            data: Input DataFrame
            target_column: Target column for analysis

        Returns:
            Comprehensive EDA report
        """
        self._log_action("Generating comprehensive EDA report")

        report = {
            'timestamp': pd.Timestamp.now(),
            'quality_assessment': self.assess_data_quality(data),
            'data_profile': {},
            'shape': data.shape,
            'summary_statistics': {},
            'correlations': {},
            'distributions': {},
            'outliers': {},
            'recommendations': []
        }

        # Summary statistics
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            report['summary_statistics'] = data[numeric_cols].describe().to_dict()

        # Correlations
        if len(numeric_cols) > 1:
            corr_matrix = data[numeric_cols].corr()
            report['correlations'] = {
                'matrix': corr_matrix.to_dict(),
                'strong_correlations': self._find_strong_correlations(corr_matrix)
            }

        # Distribution analysis
        for col in numeric_cols[:5]:  # Limit to first 5 columns
            report['distributions'][col] = {
                'skewness': float(data[col].skew()),
                'kurtosis': float(data[col].kurtosis()),
                'normality_test': self._test_normality(data[col])
            }

        # Outlier detection
        if len(numeric_cols) > 0:
            X_numeric = data[numeric_cols].values
            _, outlier_mask = self.detect_outliers(X_numeric)
            report['outliers'] = {
                'total_outliers': int(outlier_mask.sum()),
                'outlier_percentage': float(outlier_mask.sum() / len(data) * 100)
            }

        # Target analysis if provided
        if target_column and target_column in data.columns:
            report['target_analysis'] = self._analyze_target(data, target_column)

        # Generate recommendations
        report['recommendations'] = self._generate_recommendations(report)

        self._log_action("EDA report generated successfully")

        return report

    def _find_strong_correlations(self, corr_matrix: pd.DataFrame,
                                threshold: float = 0.7) -> List[Dict[str, Any]]:
        """Find strongly correlated feature pairs."""
        strong_corr = []

        for i in range(len(corr_matrix.columns)):
            for j in range(i + 1, len(corr_matrix.columns)):
                corr_value = abs(corr_matrix.iloc[i, j])
                if corr_value > threshold:
                    strong_corr.append({
                        'feature1': corr_matrix.columns[i],
                        'feature2': corr_matrix.columns[j],
                        'correlation': float(corr_value)
                    })

        return strong_corr

    def _test_normality(self, series: pd.Series) -> Dict[str, Any]:
        """Test if a distribution is normal."""
        try:
            from scipy import stats
            _, p_value = stats.shapiro(series.dropna().sample(min(5000, len(series))))
            return {
                'is_normal': p_value > 0.05,
                'p_value': float(p_value),
                'test': 'shapiro'
            }
        except ImportError:
            return {
                'is_normal': None,
                'p_value': None,
                'test': 'not_available'
            }

    def _analyze_target(self, data: pd.DataFrame, target_column: str) -> Dict[str, Any]:
        """Analyze the target variable."""
        target_data = data[target_column]
        analysis = {
            'type': str(target_data.dtype),
            'unique_values': target_data.nunique(),
            'missing_values': target_data.isnull().sum()
        }

        if target_data.dtype in ['int64', 'float64']:
            analysis['distribution'] = {
                'mean': float(target_data.mean()),
                'std': float(target_data.std()),
                'min': float(target_data.min()),
                'max': float(target_data.max())
            }
        else:
            value_counts = target_data.value_counts()
            analysis['value_counts'] = value_counts.to_dict()

        return analysis

    def _generate_recommendations(self, report: Dict[str, Any]) -> List[str]:
        """Generate preprocessing recommendations based on the report."""
        recommendations = []

        # Missing values
        missing_pct = report['quality_assessment']['missing_values']['missing_percentage']
        if missing_pct > 20:
            recommendations.append("High percentage of missing values detected. Consider advanced imputation methods.")
        elif missing_pct > 5:
            recommendations.append("Moderate missing values detected. Consider imputation strategies.")

        # Outliers
        if 'outliers' in report and report['outliers']['outlier_percentage'] > 10:
            recommendations.append("High percentage of outliers detected. Consider robust scaling or outlier treatment.")

        # Correlations
        if 'correlations' in report and len(report['correlations']['strong_correlations']) > 0:
            recommendations.append("Strong correlations detected between features. Consider feature selection or dimensionality reduction.")

        # Data types
        dtype_dist = report['quality_assessment']['dtype_distribution']
        if 'object' in dtype_dist and dtype_dist['object'] > len(report['quality_assessment']['data_types']) * 0.5:
            recommendations.append("High proportion of categorical variables. Consider encoding strategies.")

        return recommendations

    def create_preprocessing_pipeline(self, data: pd.DataFrame,
                                    config: Dict[str, Any] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Create and execute a complete preprocessing pipeline.

        Args:
            data: Input DataFrame
            config: Preprocessing configuration

        Returns:
            Processed DataFrame and pipeline metadata
        """
        if config is None:
            config = {
                'handle_missing': 'mean',
                'scaling': 'standard',
                'outlier_method': 'iqr',
                'encode_categorical': 'onehot',
                'remove_duplicates': True
            }

        self._log_action("Creating preprocessing pipeline")

        processed_data = data.copy()
        pipeline_steps = []

        # Remove duplicates
        if config.get('remove_duplicates', True):
            initial_shape = processed_data.shape
            processed_data = self.remove_duplicates(processed_data)
            pipeline_steps.append({
                'step': 'remove_duplicates',
                'removed': initial_shape[0] - processed_data.shape[0]
            })

        # Handle missing values
        if config.get('handle_missing'):
            numeric_cols = processed_data.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                processed_data = self.handle_missing_values(
                    processed_data,
                    strategy=config['handle_missing'],
                    columns=numeric_cols.tolist()
                )
                pipeline_steps.append({
                    'step': 'handle_missing',
                    'strategy': config['handle_missing'],
                    'columns': len(numeric_cols)
                })

        # Encode categorical variables
        if config.get('encode_categorical'):
            categorical_cols = processed_data.select_dtypes(include=['object', 'category']).columns
            if len(categorical_cols) > 0:
                processed_data, encoders = self.encode_categorical(
                    processed_data,
                    method=config['encode_categorical'],
                    columns=categorical_cols.tolist()
                )
                pipeline_steps.append({
                    'step': 'encode_categorical',
                    'method': config['encode_categorical'],
                    'columns': len(categorical_cols)
                })

        # Scale features
        if config.get('scaling'):
            numeric_cols = processed_data.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                X_scaled, scaler = self.scale_features(
                    processed_data[numeric_cols].values,
                    method=config['scaling']
                )
                processed_data[numeric_cols] = X_scaled
                pipeline_steps.append({
                    'step': 'scale_features',
                    'method': config['scaling'],
                    'columns': len(numeric_cols)
                })

        # Handle outliers
        if config.get('outlier_method'):
            numeric_cols = processed_data.select_dtypes(include=[np.number]).columns
            if len(numeric_cols) > 0:
                X_numeric = processed_data[numeric_cols].values
                X_clean, outlier_mask = self.detect_outliers(
                    X_numeric,
                    method=config['outlier_method']
                )
                if outlier_mask.sum() > 0:
                    processed_data = processed_data[~outlier_mask]
                    pipeline_steps.append({
                        'step': 'detect_outliers',
                        'method': config['outlier_method'],
                        'removed': int(outlier_mask.sum())
                    })

        pipeline_metadata = {
            'original_shape': data.shape,
            'final_shape': processed_data.shape,
            'steps': pipeline_steps,
            'config': config
        }

        self._log_action("Preprocessing pipeline completed")

        return processed_data, pipeline_metadata