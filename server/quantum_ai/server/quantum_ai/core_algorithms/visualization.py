"""
Visualization Engine for Quantum AI Core v2.0

Provides advanced data and model visualization capabilities.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class VisualizationEngine:
    """Advanced visualization engine for data and models."""

    def __init__(self):
        """Initialize the visualization engine."""
        self.processing_pathway: List[str] = []
        self._log_action("Initialized VisualizationEngine")

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

    def plot_clusters(self, X: np.ndarray, labels: np.ndarray,
                     centers: np.ndarray = None, title: str = "Cluster Visualization") -> Dict[str, Any]:
        """
        Create cluster visualization plot.

        Args:
            X: Input data (2D or reducible to 2D)
            labels: Cluster labels
            centers: Cluster centers
            title: Plot title

        Returns:
            Plot data and metadata
        """
        self._log_action(f"Creating cluster plot: {title}")

        try:
            import matplotlib.pyplot as plt
            import seaborn as sns
            from sklearn.decomposition import PCA
        except ImportError:
            self._log_action("Visualization libraries not available, returning plot data")
            return {
                'plot_type': 'cluster_plot',
                'data': {
                    'X': X.tolist() if X.shape[1] <= 2 else None,
                    'labels': labels.tolist(),
                    'centers': centers.tolist() if centers is not None else None
                },
                'title': title,
                'note': 'matplotlib/seaborn not available'
            }

        # Reduce dimensionality if needed
        if X.shape[1] > 2:
            pca = PCA(n_components=2, random_state=42)
            X_plot = pca.fit_transform(X)
            explained_var = pca.explained_variance_ratio_
            xlabel = f'PC1 ({explained_var[0]:.1%})'
            ylabel = f'PC2 ({explained_var[1]:.1%})'
        else:
            X_plot = X
            xlabel = 'Feature 1'
            ylabel = 'Feature 2'

        # Create plot
        plt.figure(figsize=(10, 8))
        scatter = plt.scatter(X_plot[:, 0], X_plot[:, 1], c=labels, cmap='viridis', alpha=0.7)

        if centers is not None:
            if centers.shape[1] > 2:
                centers_plot = pca.transform(centers)
            else:
                centers_plot = centers
            plt.scatter(centers_plot[:, 0], centers_plot[:, 1],
                       c='red', marker='x', s=200, linewidth=3, label='Centers')

        plt.title(title)
        plt.xlabel(xlabel)
        plt.ylabel(ylabel)
        plt.colorbar(scatter, label='Cluster')
        plt.legend()
        plt.grid(True, alpha=0.3)

        # Save plot data
        plot_data = {
            'plot_type': 'cluster_plot',
            'data': {
                'X': X_plot.tolist(),
                'labels': labels.tolist(),
                'centers': centers.tolist() if centers is not None else None
            },
            'metadata': {
                'n_clusters': len(np.unique(labels)),
                'n_samples': len(X),
                'dimensionality_reduced': X.shape[1] > 2
            },
            'title': title
        }

        plt.close()  # Don't display, just create data
        self._log_action("Cluster plot created successfully")

        return plot_data

    def plot_pca(self, X: np.ndarray, labels: np.ndarray = None,
                n_components: int = 2, title: str = "PCA Visualization") -> Dict[str, Any]:
        """
        Create PCA visualization plot.

        Args:
            X: Input data
            labels: Optional labels for coloring
            n_components: Number of PCA components
            title: Plot title

        Returns:
            Plot data and metadata
        """
        self._log_action(f"Creating PCA plot: {title}")

        try:
            import matplotlib.pyplot as plt
            from sklearn.decomposition import PCA
        except ImportError:
            self._log_action("Visualization libraries not available, returning plot data")
            return {
                'plot_type': 'pca_plot',
                'data': {'X': X.tolist()},
                'title': title,
                'note': 'matplotlib/sklearn not available'
            }

        # Perform PCA
        pca = PCA(n_components=n_components, random_state=42)
        X_pca = pca.fit_transform(X)

        explained_variance = pca.explained_variance_ratio_

        # Create plot
        plt.figure(figsize=(10, 8))

        if labels is not None:
            scatter = plt.scatter(X_pca[:, 0], X_pca[:, 1], c=labels, cmap='viridis', alpha=0.7)
            plt.colorbar(scatter, label='Label')
        else:
            plt.scatter(X_pca[:, 0], X_pca[:, 1], alpha=0.7)

        plt.title(title)
        plt.xlabel(f'PC1 ({explained_variance[0]:.1%} variance)')
        plt.ylabel(f'PC2 ({explained_variance[1]:.1%} variance)' if n_components > 1 else f'PC1 ({explained_variance[0]:.1%} variance)')
        plt.grid(True, alpha=0.3)

        plot_data = {
            'plot_type': 'pca_plot',
            'data': {
                'X_pca': X_pca.tolist(),
                'labels': labels.tolist() if labels is not None else None
            },
            'metadata': {
                'explained_variance': explained_variance.tolist(),
                'cumulative_variance': np.cumsum(explained_variance).tolist(),
                'n_components': n_components
            },
            'title': title
        }

        plt.close()
        self._log_action("PCA plot created successfully")

        return plot_data

    def plot_feature_importance(self, feature_names: List[str], importance_values: np.ndarray,
                              title: str = "Feature Importance") -> Dict[str, Any]:
        """
        Create feature importance bar plot.

        Args:
            feature_names: Names of features
            importance_values: Importance values
            title: Plot title

        Returns:
            Plot data and metadata
        """
        self._log_action(f"Creating feature importance plot: {title}")

        try:
            import matplotlib.pyplot as plt
        except ImportError:
            self._log_action("matplotlib not available, returning plot data")
            return {
                'plot_type': 'feature_importance',
                'data': {
                    'features': feature_names,
                    'importance': importance_values.tolist()
                },
                'title': title,
                'note': 'matplotlib not available'
            }

        # Sort by importance
        sorted_idx = np.argsort(importance_values)[::-1]
        sorted_features = [feature_names[i] for i in sorted_idx]
        sorted_importance = importance_values[sorted_idx]

        # Create plot
        plt.figure(figsize=(12, 8))
        bars = plt.barh(range(len(sorted_features)), sorted_importance)
        plt.yticks(range(len(sorted_features)), sorted_features)
        plt.xlabel('Importance')
        plt.title(title)
        plt.grid(True, alpha=0.3)

        # Add value labels
        for i, (bar, value) in enumerate(zip(bars, sorted_importance)):
            plt.text(value + max(sorted_importance) * 0.01, i,
                    f'{value:.3f}', va='center')

        plot_data = {
            'plot_type': 'feature_importance',
            'data': {
                'features': sorted_features,
                'importance': sorted_importance.tolist()
            },
            'metadata': {
                'top_feature': sorted_features[0],
                'max_importance': float(sorted_importance[0])
            },
            'title': title
        }

        plt.close()
        self._log_action("Feature importance plot created successfully")

        return plot_data

    def plot_training_history(self, train_loss: List[float], val_loss: List[float] = None,
                            train_acc: List[float] = None, val_acc: List[float] = None,
                            title: str = "Training History") -> Dict[str, Any]:
        """
        Create training history plot.

        Args:
            train_loss: Training loss values
            val_loss: Validation loss values
            train_acc: Training accuracy values
            val_acc: Validation accuracy values
            title: Plot title

        Returns:
            Plot data and metadata
        """
        self._log_action(f"Creating training history plot: {title}")

        try:
            import matplotlib.pyplot as plt
        except ImportError:
            self._log_action("matplotlib not available, returning plot data")
            return {
                'plot_type': 'training_history',
                'data': {
                    'train_loss': train_loss,
                    'val_loss': val_loss,
                    'train_acc': train_acc,
                    'val_acc': val_acc
                },
                'title': title,
                'note': 'matplotlib not available'
            }

        epochs = list(range(1, len(train_loss) + 1))

        # Create subplots
        fig, axes = plt.subplots(1, 2, figsize=(15, 6))

        # Loss plot
        axes[0].plot(epochs, train_loss, 'b-', label='Training Loss', linewidth=2)
        if val_loss:
            axes[0].plot(epochs, val_loss, 'r-', label='Validation Loss', linewidth=2)
        axes[0].set_xlabel('Epoch')
        axes[0].set_ylabel('Loss')
        axes[0].set_title('Training and Validation Loss')
        axes[0].legend()
        axes[0].grid(True, alpha=0.3)

        # Accuracy plot (if available)
        if train_acc:
            axes[1].plot(epochs, train_acc, 'b-', label='Training Accuracy', linewidth=2)
            if val_acc:
                axes[1].plot(epochs, val_acc, 'r-', label='Validation Accuracy', linewidth=2)
            axes[1].set_xlabel('Epoch')
            axes[1].set_ylabel('Accuracy')
            axes[1].set_title('Training and Validation Accuracy')
            axes[1].legend()
            axes[1].grid(True, alpha=0.3)
        else:
            axes[1].text(0.5, 0.5, 'No accuracy data available',
                        transform=axes[1].transAxes, ha='center', va='center')
            axes[1].set_title('Accuracy (Not Available)')

        plt.suptitle(title)
        plt.tight_layout()

        plot_data = {
            'plot_type': 'training_history',
            'data': {
                'epochs': epochs,
                'train_loss': train_loss,
                'val_loss': val_loss,
                'train_acc': train_acc,
                'val_acc': val_acc
            },
            'metadata': {
                'final_train_loss': train_loss[-1],
                'final_val_loss': val_loss[-1] if val_loss else None,
                'best_epoch': np.argmin(val_loss) + 1 if val_loss else None,
                'total_epochs': len(train_loss)
            },
            'title': title
        }

        plt.close()
        self._log_action("Training history plot created successfully")

        return plot_data

    def plot_correlation_matrix(self, data: pd.DataFrame,
                              title: str = "Correlation Matrix") -> Dict[str, Any]:
        """
        Create correlation matrix heatmap.

        Args:
            data: Input DataFrame
            title: Plot title

        Returns:
            Plot data and metadata
        """
        self._log_action(f"Creating correlation matrix plot: {title}")

        try:
            import matplotlib.pyplot as plt
            import seaborn as sns
        except ImportError:
            correlation_matrix = data.corr().values.tolist()
            return {
                'plot_type': 'correlation_matrix',
                'data': {
                    'correlation_matrix': correlation_matrix,
                    'columns': data.columns.tolist()
                },
                'title': title,
                'note': 'matplotlib/seaborn not available'
            }

        # Calculate correlation matrix
        corr_matrix = data.corr()

        # Create heatmap
        plt.figure(figsize=(12, 10))
        mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
        sns.heatmap(corr_matrix, mask=mask, annot=True, cmap='coolwarm',
                   center=0, square=True, linewidths=0.5)
        plt.title(title)

        plot_data = {
            'plot_type': 'correlation_matrix',
            'data': {
                'correlation_matrix': corr_matrix.values.tolist(),
                'columns': data.columns.tolist()
            },
            'metadata': {
                'shape': corr_matrix.shape,
                'max_corr': float(corr_matrix.max().max()),
                'min_corr': float(corr_matrix.min().min())
            },
            'title': title
        }

        plt.close()
        self._log_action("Correlation matrix plot created successfully")

        return plot_data

    def plot_distribution(self, data: pd.DataFrame, column: str,
                         title: str = None) -> Dict[str, Any]:
        """
        Create distribution plot for a column.

        Args:
            data: Input DataFrame
            column: Column name to plot
            title: Plot title

        Returns:
            Plot data and metadata
        """
        if title is None:
            title = f"Distribution of {column}"

        self._log_action(f"Creating distribution plot: {title}")

        try:
            import matplotlib.pyplot as plt
            import seaborn as sns
        except ImportError:
            values = data[column].dropna().values.tolist()
            return {
                'plot_type': 'distribution',
                'data': {
                    'values': values,
                    'column': column
                },
                'title': title,
                'note': 'matplotlib/seaborn not available'
            }

        # Create distribution plot
        plt.figure(figsize=(10, 6))

        if data[column].dtype in ['int64', 'float64']:
            # Histogram with KDE
            sns.histplot(data[column], kde=True, alpha=0.7)
            plt.xlabel(column)
        else:
            # Count plot for categorical
            sns.countplot(data=data, x=column)
            plt.xticks(rotation=45)

        plt.title(title)
        plt.grid(True, alpha=0.3)

        # Calculate statistics
        stats = data[column].describe()

        plot_data = {
            'plot_type': 'distribution',
            'data': {
                'values': data[column].dropna().values.tolist(),
                'column': column
            },
            'metadata': {
                'dtype': str(data[column].dtype),
                'statistics': stats.to_dict(),
                'missing_values': data[column].isnull().sum()
            },
            'title': title
        }

        plt.close()
        self._log_action("Distribution plot created successfully")

        return plot_data

    def create_visualization_report(self, data: pd.DataFrame,
                                  target_column: str = None) -> Dict[str, Any]:
        """
        Create a comprehensive visualization report.

        Args:
            data: Input DataFrame
            target_column: Target column for analysis

        Returns:
            Comprehensive visualization report
        """
        self._log_action("Creating comprehensive visualization report")

        report = {
            'timestamp': pd.Timestamp.now(),
            'data_summary': {
                'shape': data.shape,
                'columns': data.columns.tolist(),
                'dtypes': data.dtypes.astype(str).to_dict()
            },
            'plots': {}
        }

        # Correlation matrix
        if len(data.select_dtypes(include=[np.number]).columns) > 1:
            report['plots']['correlation_matrix'] = self.plot_correlation_matrix(
                data.select_dtypes(include=[np.number])
            )

        # Distribution plots for numeric columns
        numeric_columns = data.select_dtypes(include=[np.number]).columns[:5]  # Limit to 5
        for col in numeric_columns:
            report['plots'][f'distribution_{col}'] = self.plot_distribution(data, col)

        # PCA plot if enough numeric columns
        numeric_data = data.select_dtypes(include=[np.number])
        if numeric_data.shape[1] >= 2:
            labels = data[target_column].values if target_column and target_column in data.columns else None
            report['plots']['pca'] = self.plot_pca(numeric_data.values, labels)

        self._log_action("Visualization report created successfully")

        return report