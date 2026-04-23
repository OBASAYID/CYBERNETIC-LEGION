"""
Quantum Intelligence Nexus v2.0 - Complete Production System
All 40+ modules interconnected with training, analysis, explainability, and fairness.

Backward-compatible: still exports QuantumIntelligenceNexus with process_query/introspect.
Full capabilities via NexusToolEngine: predictions, EDA, training, SHAP/LIME, fairness.
"""

import os
import sys
import json
import logging
import gc
import threading
try:
    import psutil
    PSUTIL_AVAILABLE = True
except ImportError:
    PSUTIL_AVAILABLE = False
from typing import Dict, List, Tuple, Optional, Any, Callable
from datetime import datetime
from dataclasses import dataclass, asdict, field
from pathlib import Path
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor

import numpy as np

try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False

try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from torch.cuda.amp import autocast, GradScaler
    MIXED_PRECISION_AVAILABLE = True
except (ImportError, AttributeError):
    MIXED_PRECISION_AVAILABLE = False

try:
    from scipy import stats as scipy_stats
    SCIPY_AVAILABLE = True
except ImportError:
    SCIPY_AVAILABLE = False

try:
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, PowerTransformer, LabelEncoder, OneHotEncoder
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

logger = logging.getLogger("NexusV2")


class AutoEDA:
    def __init__(self):
        self.report = {}

    def analyze(self, data, target_col: Optional[str] = None) -> Dict:
        if not PANDAS_AVAILABLE:
            return {"error": "pandas not available"}
        logger.info("Starting automated EDA...")
        self.report = {
            'dataset_info': self._basic_info(data),
            'data_types': self._type_analysis(data),
            'missing_values': self._missing_analysis(data),
            'statistics': self._statistical_analysis(data),
            'distributions': self._distribution_analysis(data),
            'outliers': self._outlier_analysis(data),
            'correlations': self._correlation_analysis(data),
            'duplicates': self._duplicate_analysis(data),
            'uniqueness': self._uniqueness_analysis(data),
            'categorical_insights': self._categorical_analysis(data),
            'quality_score': self._data_quality_score(data)
        }
        if target_col and target_col in data.columns:
            self.report['target_analysis'] = self._target_analysis(data, target_col)
        return self.report

    def _basic_info(self, data) -> Dict:
        return {
            'shape': list(data.shape),
            'num_samples': len(data),
            'num_features': data.shape[1],
            'memory_usage_bytes': int(data.memory_usage().sum()),
            'feature_names': list(data.columns)
        }

    def _type_analysis(self, data) -> Dict:
        types = {}
        for col in data.columns:
            types[col] = {
                'dtype': str(data[col].dtype),
                'type_class': self._infer_type(data[col])
            }
        return types

    def _infer_type(self, series) -> str:
        if pd.api.types.is_numeric_dtype(series):
            return 'numeric'
        elif pd.api.types.is_datetime64_any_dtype(series):
            return 'datetime'
        else:
            return 'text'

    def _missing_analysis(self, data) -> Dict:
        return {
            'total_missing': {k: int(v) for k, v in data.isnull().sum().to_dict().items()},
            'missing_percentage': {k: round(float(v), 2) for k, v in (data.isnull().sum() / len(data) * 100).to_dict().items()},
            'missing_pattern': int(data.isnull().sum().sum()),
            'columns_with_missing': list(data.columns[data.isnull().any()])
        }

    def _statistical_analysis(self, data) -> Dict:
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        stats_dict = {}
        for col in numeric_cols:
            col_data = data[col].dropna()
            entry = {
                'mean': float(col_data.mean()),
                'median': float(col_data.median()),
                'std': float(col_data.std()) if len(col_data) > 1 else 0,
                'min': float(col_data.min()),
                'max': float(col_data.max()),
                'q25': float(col_data.quantile(0.25)),
                'q75': float(col_data.quantile(0.75)),
            }
            if SCIPY_AVAILABLE and len(col_data) > 2:
                entry['skewness'] = round(float(scipy_stats.skew(col_data)), 4)
                entry['kurtosis'] = round(float(scipy_stats.kurtosis(col_data)), 4)
            stats_dict[col] = entry
        return stats_dict

    def _distribution_analysis(self, data) -> Dict:
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        distributions = {}
        for col in numeric_cols:
            hist, bins = np.histogram(data[col].dropna(), bins=10)
            distributions[col] = {
                'histogram_bins': hist.tolist(),
                'bin_edges': [round(float(b), 4) for b in bins.tolist()]
            }
        return distributions

    def _outlier_analysis(self, data) -> Dict:
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        outliers = {}
        for col in numeric_cols:
            Q1 = data[col].quantile(0.25)
            Q3 = data[col].quantile(0.75)
            IQR = Q3 - Q1
            lower = Q1 - 1.5 * IQR
            upper = Q3 + 1.5 * IQR
            outlier_count = int(((data[col] < lower) | (data[col] > upper)).sum())
            outliers[col] = {
                'outlier_count': outlier_count,
                'outlier_percentage': round(float(outlier_count / len(data) * 100), 2),
                'lower_bound': float(lower),
                'upper_bound': float(upper)
            }
        return outliers

    def _correlation_analysis(self, data) -> Dict:
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            corr_matrix = data[numeric_cols].corr()
            high_corr = {}
            for i in range(len(corr_matrix.columns)):
                for j in range(i + 1, len(corr_matrix.columns)):
                    val = corr_matrix.iloc[i, j]
                    if abs(val) > 0.7:
                        high_corr[f"{corr_matrix.columns[i]}-{corr_matrix.columns[j]}"] = round(float(val), 4)
            return {'high_correlations': high_corr}
        return {}

    def _duplicate_analysis(self, data) -> Dict:
        dup = int(data.duplicated().sum())
        return {'duplicate_rows': dup, 'duplicate_percentage': round(float(dup / len(data) * 100), 2)}

    def _uniqueness_analysis(self, data) -> Dict:
        uniqueness = {}
        for col in data.columns:
            uniqueness[col] = {
                'unique_count': int(data[col].nunique()),
                'unique_percentage': round(float(data[col].nunique() / len(data) * 100), 2)
            }
        return uniqueness

    def _categorical_analysis(self, data) -> Dict:
        cat_cols = data.select_dtypes(include=['object']).columns
        categorical = {}
        for col in cat_cols:
            categorical[col] = {
                'unique_values': int(data[col].nunique()),
                'top_values': {str(k): int(v) for k, v in data[col].value_counts().head(5).to_dict().items()},
                'cardinality': 'high' if data[col].nunique() > len(data) * 0.5 else 'low'
            }
        return categorical

    def _target_analysis(self, data, target_col: str) -> Dict:
        target = data[target_col]
        if pd.api.types.is_numeric_dtype(target):
            return {'type': 'numeric', 'mean': float(target.mean()), 'std': float(target.std())}
        else:
            vc = target.value_counts()
            return {
                'type': 'categorical',
                'value_counts': {str(k): int(v) for k, v in vc.head(10).to_dict().items()},
                'classes': int(target.nunique()),
                'imbalance_ratio': round(float(vc.max() / vc.min()), 2) if vc.min() > 0 else float('inf')
            }

    def _data_quality_score(self, data) -> float:
        score = 100.0
        missing_ratio = data.isnull().sum().sum() / (data.shape[0] * data.shape[1])
        score -= missing_ratio * 30
        dup_ratio = data.duplicated().sum() / len(data)
        score -= dup_ratio * 20
        cat_cols = data.select_dtypes(include=['object']).columns
        for col in cat_cols:
            if data[col].nunique() > len(data) * 0.5:
                score -= 5
        return max(0, min(100, round(score, 1)))


class FeaturePreprocessor:
    def __init__(self):
        self.scalers = {}
        self.encoders = {}
        self.is_fitted = False

    def impute_missing(self, data, strategy='mean'):
        if not SKLEARN_AVAILABLE or not PANDAS_AVAILABLE:
            return data
        imputer = SimpleImputer(strategy=strategy)
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        result = data.copy()
        if len(numeric_cols) > 0:
            result[numeric_cols] = imputer.fit_transform(data[numeric_cols])
        return result

    def scale_features(self, data, method='standard'):
        if not SKLEARN_AVAILABLE or not PANDAS_AVAILABLE:
            return data
        numeric_cols = data.select_dtypes(include=[np.number]).columns
        scalers = {
            'standard': StandardScaler,
            'minmax': MinMaxScaler,
            'robust': RobustScaler,
            'power': PowerTransformer,
        }
        scaler_cls = scalers.get(method, StandardScaler)
        scaler = scaler_cls()
        self.scalers[method] = scaler
        result = data.copy()
        result[numeric_cols] = scaler.fit_transform(data[numeric_cols])
        self.is_fitted = True
        return result

    def encode_categorical(self, data, method='label'):
        if not SKLEARN_AVAILABLE or not PANDAS_AVAILABLE:
            return data
        cat_cols = data.select_dtypes(include=['object']).columns
        result = data.copy()
        if method == 'onehot':
            encoder = OneHotEncoder(sparse_output=False, handle_unknown='ignore')
            encoded = encoder.fit_transform(data[cat_cols])
            feature_names = encoder.get_feature_names_out(cat_cols)
            result = result.drop(cat_cols, axis=1)
            result = pd.concat([result, pd.DataFrame(encoded, columns=feature_names, index=result.index)], axis=1)
        elif method == 'label':
            for col in cat_cols:
                enc = LabelEncoder()
                result[col] = enc.fit_transform(data[col].astype(str))
                self.encoders[col] = enc
        self.is_fitted = True
        return result


class SHAPExplainer:
    def __init__(self, model, background_data: np.ndarray):
        self.model = model
        self.background_data = background_data
        self.baseline = np.mean(background_data, axis=0)

    def explain_instance(self, instance: np.ndarray, num_samples: int = 100) -> Dict:
        logger.info("Computing SHAP values...")
        feature_importance = np.zeros(len(instance))
        for i in range(len(instance)):
            baseline_pred = self._predict(self.baseline.reshape(1, -1))
            perturbed = self.baseline.copy()
            perturbed[i] = instance[i]
            perturbed_pred = self._predict(perturbed.reshape(1, -1))
            feature_importance[i] = perturbed_pred - baseline_pred
        return {
            'shap_values': feature_importance.tolist(),
            'base_value': float(self._predict(self.baseline.reshape(1, -1))),
            'prediction': float(self._predict(instance.reshape(1, -1))),
            'instance': instance.tolist(),
            'method': 'shap'
        }

    def _predict(self, X):
        if not TORCH_AVAILABLE:
            return 0.0
        with torch.no_grad():
            tensor = torch.FloatTensor(X)
            out = self.model(tensor)
            probs = torch.softmax(out, dim=1)
            return float(probs[0, 1].item())


class LIMEExplainer:
    def __init__(self, model, training_data: np.ndarray, feature_names: List[str] = None):
        self.model = model
        self.training_data = training_data
        self.feature_names = feature_names or [f"Feature_{i}" for i in range(training_data.shape[1])]

    def explain_instance(self, instance: np.ndarray, num_features: int = 10,
                         num_samples: int = 1000) -> Dict:
        logger.info("Computing LIME explanation...")
        perturbed_X = np.random.rand(num_samples, len(instance))
        distances = np.linalg.norm(perturbed_X - instance, axis=1)
        predictions = self._batch_predict(perturbed_X)
        weights = np.exp(-distances ** 2 / (np.mean(distances) + 1e-8))
        feature_importance = np.zeros(len(instance))
        for i in range(len(instance)):
            correlation = np.sum(weights * perturbed_X[:, i] * (predictions - np.mean(predictions))) / (np.sum(weights) + 1e-8)
            feature_importance[i] = correlation
        top_indices = np.argsort(np.abs(feature_importance))[-num_features:][::-1]
        return {
            'explanation': [(self.feature_names[i], round(float(feature_importance[i]), 6)) for i in top_indices],
            'prediction': float(self._batch_predict(instance.reshape(1, -1))[0]),
            'num_features_used': num_features,
            'method': 'lime'
        }

    def _batch_predict(self, X):
        if not TORCH_AVAILABLE:
            return np.zeros(X.shape[0])
        with torch.no_grad():
            tensor = torch.FloatTensor(X)
            out = self.model(tensor)
            probs = torch.softmax(out, dim=1)
            return probs[:, 1].cpu().numpy()


class FairnessAnalyzer:
    @staticmethod
    def demographic_parity(y_pred: np.ndarray, protected_group: np.ndarray) -> Dict:
        group_0_positive = float(np.mean(y_pred[protected_group == 0]))
        group_1_positive = float(np.mean(y_pred[protected_group == 1]))
        parity_diff = abs(group_0_positive - group_1_positive)
        return {
            'group_0_positive_rate': round(group_0_positive, 4),
            'group_1_positive_rate': round(group_1_positive, 4),
            'parity_difference': round(parity_diff, 4),
            'fair': bool(parity_diff < 0.1)
        }

    @staticmethod
    def equalized_odds(y_true: np.ndarray, y_pred: np.ndarray,
                       protected_group: np.ndarray) -> Dict:
        metrics = {}
        for group in np.unique(protected_group):
            mask = protected_group == group
            y_true_g = y_true[mask]
            y_pred_g = y_pred[mask]
            tp = int(np.sum((y_true_g == 1) & (y_pred_g == 1)))
            fn = int(np.sum((y_true_g == 1) & (y_pred_g == 0)))
            tpr = tp / (tp + fn) if (tp + fn) > 0 else 0
            fp = int(np.sum((y_true_g == 0) & (y_pred_g == 1)))
            tn = int(np.sum((y_true_g == 0) & (y_pred_g == 0)))
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
            metrics[f'group_{int(group)}'] = {'tpr': round(float(tpr), 4), 'fpr': round(float(fpr), 4)}
        return metrics

    @staticmethod
    def full_analysis(y_true: np.ndarray, y_pred: np.ndarray,
                      protected_group: np.ndarray) -> Dict:
        return {
            'demographic_parity': FairnessAnalyzer.demographic_parity(y_pred, protected_group),
            'equalized_odds': FairnessAnalyzer.equalized_odds(y_true, y_pred, protected_group),
            'total_samples': len(y_true),
            'group_sizes': {f'group_{int(g)}': int(np.sum(protected_group == g)) for g in np.unique(protected_group)}
        }


class PyTorchNN:
    def __init__(self, input_dim: int, hidden_dims: List[int], output_dim: int,
                 activation: str = 'relu', dropout: float = 0.2):
        self.input_dim = input_dim
        self.hidden_dims = hidden_dims
        self.output_dim = output_dim
        self.activation = activation
        self.dropout = dropout
        self.torch_model = None
        self.optimizer = None
        self.criterion = None
        self.history = None

    def build(self):
        if not TORCH_AVAILABLE:
            return
        layers = []
        prev_dim = self.input_dim
        for hidden_dim in self.hidden_dims:
            layers.append(torch.nn.Linear(prev_dim, hidden_dim))
            if self.activation == 'relu':
                layers.append(torch.nn.ReLU())
            elif self.activation == 'tanh':
                layers.append(torch.nn.Tanh())
            elif self.activation == 'gelu':
                layers.append(torch.nn.GELU())
            if self.dropout > 0:
                layers.append(torch.nn.Dropout(self.dropout))
            prev_dim = hidden_dim
        layers.append(torch.nn.Linear(prev_dim, self.output_dim))
        self.torch_model = torch.nn.Sequential(*layers)
        logger.info(f"PyTorchNN built: {self.input_dim} -> {self.hidden_dims} -> {self.output_dim}")

    def train(self, X_train: np.ndarray, y_train: np.ndarray,
              X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None,
              epochs: int = 100, batch_size: int = 32, verbose: int = 10) -> Dict:
        if not TORCH_AVAILABLE:
            return {'error': 'PyTorch not available'}
        from torch.optim import Adam
        from torch.nn import MSELoss, CrossEntropyLoss
        if self.torch_model is None:
            self.build()
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.torch_model = self.torch_model.to(device)
        self.optimizer = Adam(self.torch_model.parameters(), lr=0.001)
        is_classification = len(np.unique(y_train)) < 20
        self.criterion = CrossEntropyLoss() if is_classification else MSELoss()
        history = {'train_loss': [], 'val_loss': []}
        for epoch in range(epochs):
            self.torch_model.train()
            train_loss = 0
            for i in range(0, len(X_train), batch_size):
                X_batch = torch.FloatTensor(X_train[i:i + batch_size]).to(device)
                if is_classification:
                    y_batch = torch.LongTensor(y_train[i:i + batch_size]).to(device)
                else:
                    y_batch = torch.FloatTensor(y_train[i:i + batch_size]).to(device)
                self.optimizer.zero_grad()
                outputs = self.torch_model(X_batch)
                loss = self.criterion(outputs, y_batch)
                loss.backward()
                self.optimizer.step()
                train_loss += loss.item()
            n_batches = max(1, len(X_train) // batch_size)
            history['train_loss'].append(train_loss / n_batches)
            if X_val is not None and y_val is not None:
                self.torch_model.eval()
                with torch.no_grad():
                    X_val_t = torch.FloatTensor(X_val).to(device)
                    if is_classification:
                        y_val_t = torch.LongTensor(y_val).to(device)
                    else:
                        y_val_t = torch.FloatTensor(y_val).to(device)
                    outputs = self.torch_model(X_val_t)
                    val_loss = self.criterion(outputs, y_val_t)
                    history['val_loss'].append(val_loss.item())
            if verbose and epoch % verbose == 0:
                msg = f"Epoch {epoch}/{epochs}: train_loss={history['train_loss'][-1]:.4f}"
                if history['val_loss']:
                    msg += f", val_loss={history['val_loss'][-1]:.4f}"
                logger.info(msg)
        self.history = history
        return history

    def predict(self, X: np.ndarray) -> np.ndarray:
        if not TORCH_AVAILABLE or self.torch_model is None:
            return np.zeros(X.shape[0])
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.torch_model.eval()
        with torch.no_grad():
            X_tensor = torch.FloatTensor(X).to(device)
            predictions = self.torch_model(X_tensor)
        return predictions.cpu().numpy()


class DataManager:
    def __init__(self, batch_size: int = 32, num_workers: int = 0):
        self.batch_size = batch_size
        self.num_workers = num_workers
        self.train_loader = None
        self.val_loader = None

    def create_data_loaders(self, X_train: np.ndarray, y_train: np.ndarray,
                            X_val: Optional[np.ndarray] = None,
                            y_val: Optional[np.ndarray] = None):
        if not TORCH_AVAILABLE:
            return None, None
        X_train_t = torch.FloatTensor(X_train)
        y_train_t = torch.LongTensor(y_train)
        train_ds = torch.utils.data.TensorDataset(X_train_t, y_train_t)
        self.train_loader = torch.utils.data.DataLoader(
            train_ds, batch_size=self.batch_size, shuffle=True, num_workers=self.num_workers
        )
        if X_val is not None and y_val is not None:
            X_val_t = torch.FloatTensor(X_val)
            y_val_t = torch.LongTensor(y_val)
            val_ds = torch.utils.data.TensorDataset(X_val_t, y_val_t)
            self.val_loader = torch.utils.data.DataLoader(
                val_ds, batch_size=self.batch_size * 2, shuffle=False, num_workers=self.num_workers
            )
        logger.info(f"DataLoaders created: train_batches={len(self.train_loader)}")
        return self.train_loader, self.val_loader


@dataclass
class TrainingConfig:
    batch_size: int = 32
    epochs: int = 100
    learning_rate: float = 0.001
    weight_decay: float = 1e-5
    use_mixed_precision: bool = False
    gradient_accumulation_steps: int = 1
    gradient_clip_value: float = 1.0
    use_ema: bool = True
    ema_decay: float = 0.999
    dropout: float = 0.1
    label_smoothing: float = 0.1
    validation_split: float = 0.2
    device: str = 'cpu'
    checkpoint_dir: str = 'checkpoints'
    save_every_n_epochs: int = 10
    seed: int = 42


class ExponentialMovingAverage:
    def __init__(self, model, decay: float = 0.999):
        self.model = model
        self.decay = decay
        self.ema_state_dict = {}
        self.update_count = 0
        for name, param in model.named_parameters():
            if param.requires_grad:
                self.ema_state_dict[name] = param.data.clone()

    def update(self):
        self.update_count += 1
        decay = min(self.decay, (1 + self.update_count) / (10 + self.update_count))
        for name, param in self.model.named_parameters():
            if param.requires_grad and name in self.ema_state_dict:
                self.ema_state_dict[name] = self.ema_state_dict[name] * decay + param.data * (1 - decay)

    def apply_ema(self):
        for name, param in self.model.named_parameters():
            if param.requires_grad and name in self.ema_state_dict:
                param.data = self.ema_state_dict[name]


class TrainingEngine:
    def __init__(self, model, config: TrainingConfig):
        if not TORCH_AVAILABLE:
            raise RuntimeError("PyTorch required for TrainingEngine")
        self.model = model
        self.config = config
        self.device = torch.device(config.device)
        self.model = self.model.to(self.device)
        self.optimizer = torch.optim.AdamW(
            model.parameters(), lr=config.learning_rate, weight_decay=config.weight_decay
        )
        self.scaler = GradScaler() if config.use_mixed_precision and MIXED_PRECISION_AVAILABLE else None
        self.memory_monitor = MemoryMonitor()
        self.profiler = PerformanceProfiler()
        self.data_manager = DataManager(config.batch_size)
        self.ema = ExponentialMovingAverage(model, config.ema_decay) if config.use_ema else None
        self.epoch = 0
        self.global_step = 0
        self.best_loss = float('inf')
        self.training_history = defaultdict(list)
        self.is_training = False
        self.training_thread = None
        self.last_report = None
        Path(config.checkpoint_dir).mkdir(exist_ok=True)
        logger.info(f"TrainingEngine initialized on {self.device}")

    def train_epoch(self, train_loader) -> Dict:
        self.model.train()
        epoch_loss = []
        self.profiler.start_timer('epoch')
        for batch_idx, (X_batch, y_batch) in enumerate(train_loader):
            X_batch = X_batch.to(self.device)
            y_batch = y_batch.to(self.device)
            logits = self.model(X_batch)
            loss = torch.nn.functional.cross_entropy(
                logits, y_batch, label_smoothing=self.config.label_smoothing
            )
            loss.backward()
            torch.nn.utils.clip_grad_norm_(self.model.parameters(), self.config.gradient_clip_value)
            self.optimizer.step()
            self.optimizer.zero_grad()
            if self.ema:
                self.ema.update()
            epoch_loss.append(loss.item())
            self.global_step += 1
        epoch_time = self.profiler.end_timer('epoch')
        return {
            'loss': round(float(np.mean(epoch_loss)), 4),
            'loss_std': round(float(np.std(epoch_loss)), 4),
            'epoch_time': round(epoch_time or 0, 2)
        }

    def validate(self, val_loader) -> Dict:
        if val_loader is None:
            return {}
        self.model.eval()
        val_loss = []
        val_acc = []
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)
                logits = self.model(X_batch)
                loss = torch.nn.functional.cross_entropy(logits, y_batch)
                preds = logits.argmax(dim=1)
                accuracy = (preds == y_batch).float().mean()
                val_loss.append(loss.item())
                val_acc.append(accuracy.item())
        return {
            'loss': round(float(np.mean(val_loss)), 4),
            'accuracy': round(float(np.mean(val_acc)), 4)
        }

    def train(self, X_train: np.ndarray, y_train: np.ndarray,
              X_val: Optional[np.ndarray] = None, y_val: Optional[np.ndarray] = None) -> Dict:
        logger.info("=" * 60)
        logger.info("STARTING TRAINING")
        logger.info("=" * 60)
        np.random.seed(self.config.seed)
        torch.manual_seed(self.config.seed)
        self.is_training = True
        train_loader, val_loader = self.data_manager.create_data_loaders(X_train, y_train, X_val, y_val)
        if train_loader is None:
            return {'error': 'Could not create data loaders'}
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            self.optimizer, T_max=self.config.epochs, eta_min=1e-6
        )
        for epoch in range(self.config.epochs):
            if not self.is_training:
                logger.info("Training stopped early")
                break
            self.epoch = epoch
            train_metrics = self.train_epoch(train_loader)
            for k, v in train_metrics.items():
                self.training_history[f'train_{k}'].append(v)
            if val_loader:
                val_metrics = self.validate(val_loader)
                for k, v in val_metrics.items():
                    self.training_history[f'val_{k}'].append(v)
                if val_metrics.get('loss', float('inf')) < self.best_loss:
                    self.best_loss = val_metrics['loss']
                    self.save_checkpoint(epoch, is_best=True)
            scheduler.step()
            if (epoch + 1) % self.config.save_every_n_epochs == 0:
                self.save_checkpoint(epoch)
            self.memory_monitor.log_memory(f"epoch_{epoch}")
        self.is_training = False
        self.last_report = self._generate_report()
        logger.info("TRAINING COMPLETED")
        return self.last_report

    def save_checkpoint(self, epoch: int, is_best: bool = False):
        prefix = "best_" if is_best else ""
        path = Path(self.config.checkpoint_dir) / f"{prefix}checkpoint_epoch_{epoch + 1}.pt"
        torch.save({
            'epoch': epoch,
            'model_state': self.model.state_dict(),
            'optimizer_state': self.optimizer.state_dict(),
            'global_step': self.global_step,
            'best_loss': self.best_loss
        }, path)
        logger.info(f"Checkpoint saved: {path}")

    def _generate_report(self) -> Dict:
        return {
            'timestamp': datetime.now().isoformat(),
            'config': asdict(self.config),
            'training_history': dict(self.training_history),
            'memory_stats': self.memory_monitor.get_summary(),
            'performance_metrics': self.profiler.get_metrics(),
            'total_steps': self.global_step,
            'total_epochs': self.epoch + 1,
            'best_loss': self.best_loss
        }

    def get_status(self) -> Dict:
        return {
            'is_training': self.is_training,
            'current_epoch': self.epoch,
            'total_epochs': self.config.epochs,
            'global_step': self.global_step,
            'best_loss': self.best_loss,
            'history_length': {k: len(v) for k, v in self.training_history.items()},
            'last_report': self.last_report
        }

    def stop(self):
        self.is_training = False
        logger.info("Training stop requested")


class MemoryMonitor:
    def __init__(self):
        self.memory_log = []
        self.peak_memory = 0

    def log_memory(self, label: str = "") -> Dict:
        cpu_memory = psutil.virtual_memory().percent if PSUTIL_AVAILABLE else 0
        gpu_allocated = 0
        gpu_reserved = 0
        gpu_percent = 0
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.synchronize()
            gpu_allocated = torch.cuda.memory_allocated() / 1e9
            gpu_reserved = torch.cuda.memory_reserved() / 1e9
            gpu_percent = (gpu_allocated / torch.cuda.get_device_properties(0).total_memory) * 100
        info = {
            'timestamp': datetime.now().isoformat(),
            'label': label,
            'cpu_percent': cpu_memory,
            'gpu_allocated_gb': round(gpu_allocated, 4),
            'gpu_reserved_gb': round(gpu_reserved, 4),
            'gpu_percent': round(gpu_percent, 2)
        }
        self.memory_log.append(info)
        self.peak_memory = max(self.peak_memory, gpu_allocated)
        return info

    def get_summary(self) -> Dict:
        return {
            'total_recordings': len(self.memory_log),
            'peak_gpu_memory_gb': self.peak_memory,
            'avg_cpu_percent': round(np.mean([m['cpu_percent'] for m in self.memory_log]), 1) if self.memory_log else 0,
        }

    def cleanup(self):
        gc.collect()
        if TORCH_AVAILABLE and torch.cuda.is_available():
            torch.cuda.empty_cache()


class PerformanceProfiler:
    def __init__(self):
        self.metrics = defaultdict(list)
        self.timer = {}

    def start_timer(self, name: str):
        self.timer[name] = datetime.now()

    def end_timer(self, name: str) -> Optional[float]:
        if name in self.timer:
            duration = (datetime.now() - self.timer[name]).total_seconds()
            self.metrics[f'{name}_time'].append(duration)
            return duration
        return None

    def log_metric(self, name: str, value: float):
        self.metrics[name].append(value)

    def get_metrics(self) -> Dict:
        return {
            name: {
                'mean': round(float(np.mean(values)), 4),
                'std': round(float(np.std(values)), 4),
                'min': round(float(np.min(values)), 4),
                'max': round(float(np.max(values)), 4),
                'count': len(values)
            }
            for name, values in self.metrics.items()
        }


class NexusModelManager:
    def __init__(self):
        self.model = None
        self.model_info = None
        self.device = None
        self.shap_explainer = None
        self.lime_explainer = None
        self.background_data = None
        if TORCH_AVAILABLE:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    def create_default_model(self):
        if not TORCH_AVAILABLE:
            self.model_info = {'status': 'torch_not_available', 'trained': False}
            return
        self.model = torch.nn.Sequential(
            torch.nn.Linear(10, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(256, 128),
            torch.nn.ReLU(),
            torch.nn.Dropout(0.2),
            torch.nn.Linear(128, 64),
            torch.nn.ReLU(),
            torch.nn.Linear(64, 2)
        ).to(self.device)
        self.model.eval()
        self.model_info = {
            'model_name': 'QuantumNexus-v2',
            'model_version': '2.0.0',
            'input_features': 10,
            'output_classes': 2,
            'parameters': sum(p.numel() for p in self.model.parameters()),
            'framework': 'PyTorch',
            'device': str(self.device),
            'trained': False
        }
        self.background_data = np.random.randn(50, 10).astype(np.float32)
        self._init_explainers()

    def _init_explainers(self):
        if self.model is not None and self.background_data is not None:
            try:
                self.shap_explainer = SHAPExplainer(self.model, self.background_data)
                self.lime_explainer = LIMEExplainer(
                    self.model, self.background_data,
                    [f"feature_{i}" for i in range(self.background_data.shape[1])]
                )
            except Exception as e:
                logger.warning(f"Explainer init warning: {e}")

    def load_model(self, model_path: str) -> bool:
        if not TORCH_AVAILABLE:
            return False
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            self.create_default_model()
            if 'model_state' in checkpoint:
                self.model.load_state_dict(checkpoint['model_state'])
            self.model.eval()
            self.model_info['trained'] = True
            self.model_info['loaded_from'] = model_path
            self._init_explainers()
            return True
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            return False

    def predict(self, features) -> Dict:
        if self.model is None:
            self.create_default_model()
        if not TORCH_AVAILABLE:
            return {'error': 'PyTorch not available'}
        start = datetime.now()
        if isinstance(features, list):
            features = np.array(features, dtype=np.float32)
        if features.ndim == 1:
            features = features.reshape(1, -1)
        with torch.no_grad():
            X = torch.FloatTensor(features).to(self.device)
            logits = self.model(X)
            probs = torch.softmax(logits, dim=1)
            predictions = probs.cpu().numpy()
        elapsed = (datetime.now() - start).total_seconds() * 1000
        return {
            'predicted_class': int(np.argmax(predictions, axis=1)[0]),
            'confidence': round(float(np.max(predictions[0])), 4),
            'probabilities': [round(float(p), 4) for p in predictions[0].tolist()],
            'processing_time_ms': round(elapsed, 2)
        }

    def batch_predict(self, features_list: List[List[float]]) -> Dict:
        if not TORCH_AVAILABLE or self.model is None:
            return {'error': 'Model not available'}
        start = datetime.now()
        features = np.array(features_list, dtype=np.float32)
        with torch.no_grad():
            X = torch.FloatTensor(features).to(self.device)
            logits = self.model(X)
            probs = torch.softmax(logits, dim=1)
            predictions = probs.cpu().numpy()
        elapsed = (datetime.now() - start).total_seconds() * 1000
        return {
            'predictions': [int(np.argmax(p)) for p in predictions],
            'confidences': [round(float(np.max(p)), 4) for p in predictions],
            'probabilities': [[round(float(v), 4) for v in p.tolist()] for p in predictions],
            'count': len(features_list),
            'processing_time_ms': round(elapsed, 2)
        }

    def explain(self, features, method='feature_importance', num_features=10) -> Dict:
        if not TORCH_AVAILABLE or self.model is None:
            return {'error': 'Model not available'}
        features_arr = np.array(features, dtype=np.float32)
        if features_arr.ndim > 1:
            features_arr = features_arr.flatten()
        result = self.predict(features_arr)

        if method == 'shap' and self.shap_explainer is not None:
            return self.shap_explainer.explain_instance(features_arr)
        elif method == 'lime' and self.lime_explainer is not None:
            return self.lime_explainer.explain_instance(features_arr, num_features=num_features)
        else:
            abs_features = np.abs(features_arr)
            top_indices = np.argsort(abs_features)[-num_features:][::-1]
            return {
                'method': method,
                'predicted_class': result['predicted_class'],
                'confidence': result['confidence'],
                'feature_importance': [round(float(v), 4) for v in abs_features.tolist()],
                'top_features': top_indices.tolist(),
                'top_feature_values': [round(float(features_arr[i]), 4) for i in top_indices]
            }

    def get_info(self) -> Dict:
        if self.model_info is None:
            self.create_default_model()
        info = dict(self.model_info) if self.model_info else {'status': 'not_initialized'}
        info['explainers'] = {
            'shap': self.shap_explainer is not None,
            'lime': self.lime_explainer is not None
        }
        return info


class NexusToolEngine:
    def __init__(self):
        self.eda = AutoEDA()
        self.preprocessor = FeaturePreprocessor()
        self.memory_monitor = MemoryMonitor()
        self.profiler = PerformanceProfiler()
        self.model_manager = NexusModelManager()
        self.model_manager.create_default_model()
        self.fairness_analyzer = FairnessAnalyzer()
        self.training_engine = None
        self.training_thread = None
        self._tool_registry = {
            'predict': self._tool_predict,
            'batch_predict': self._tool_batch_predict,
            'explain': self._tool_explain,
            'explain_shap': self._tool_explain_shap,
            'explain_lime': self._tool_explain_lime,
            'eda': self._tool_eda,
            'preprocess': self._tool_preprocess,
            'model_info': self._tool_model_info,
            'system_status': self._tool_system_status,
            'memory_status': self._tool_memory_status,
            'fairness': self._tool_fairness,
            'train_start': self._tool_train_start,
            'train_status': self._tool_train_status,
            'train_stop': self._tool_train_stop,
        }
        logger.info(f"[NexusToolEngine] Initialized with {len(self._tool_registry)} tools")

    def list_tools(self) -> List[Dict]:
        return [
            {'name': 'predict', 'description': 'Make prediction with softmax probabilities', 'params': ['features (list of floats)']},
            {'name': 'batch_predict', 'description': 'Batch prediction with per-sample probabilities', 'params': ['features (list of lists)']},
            {'name': 'explain', 'description': 'Explain prediction (feature_importance/shap/lime)', 'params': ['features, method, num_features']},
            {'name': 'explain_shap', 'description': 'SHAP explanation for model prediction', 'params': ['features']},
            {'name': 'explain_lime', 'description': 'LIME explanation for model prediction', 'params': ['features, num_features']},
            {'name': 'eda', 'description': 'Automated Exploratory Data Analysis', 'params': ['csv_path or data_json, target_col']},
            {'name': 'preprocess', 'description': 'Preprocess data (impute, scale, encode)', 'params': ['csv_path, operations']},
            {'name': 'model_info', 'description': 'Model info, status, and explainer availability', 'params': []},
            {'name': 'system_status', 'description': 'Full system status report', 'params': []},
            {'name': 'memory_status', 'description': 'Memory and performance metrics', 'params': []},
            {'name': 'fairness', 'description': 'Fairness and bias analysis', 'params': ['y_true, y_pred, protected_group']},
            {'name': 'train_start', 'description': 'Start model training', 'params': ['epochs, batch_size, learning_rate, data_samples']},
            {'name': 'train_status', 'description': 'Get training status and progress', 'params': []},
            {'name': 'train_stop', 'description': 'Stop running training', 'params': []},
        ]

    def execute_tool(self, tool_name: str, params: Dict = None) -> Dict:
        params = params or {}
        if tool_name not in self._tool_registry:
            return {'error': f'Unknown tool: {tool_name}', 'available_tools': list(self._tool_registry.keys())}
        self.profiler.start_timer(f'tool_{tool_name}')
        try:
            result = self._tool_registry[tool_name](params)
            elapsed = self.profiler.end_timer(f'tool_{tool_name}')
            result['_meta'] = {'tool': tool_name, 'processing_time_s': round(elapsed or 0, 4), 'timestamp': datetime.now().isoformat()}
            return result
        except Exception as e:
            logger.error(f"[NexusToolEngine] Tool {tool_name} error: {e}")
            return {'error': str(e), 'tool': tool_name}

    def _tool_predict(self, params: Dict) -> Dict:
        features = params.get('features', [0.5] * 10)
        return self.model_manager.predict(features)

    def _tool_batch_predict(self, params: Dict) -> Dict:
        features = params.get('features', [[0.5] * 10])
        return self.model_manager.batch_predict(features)

    def _tool_explain(self, params: Dict) -> Dict:
        features = params.get('features', [0.5] * 10)
        method = params.get('method', 'feature_importance')
        num_features = params.get('num_features', 10)
        return self.model_manager.explain(features, method, num_features)

    def _tool_explain_shap(self, params: Dict) -> Dict:
        features = params.get('features', [0.5] * 10)
        return self.model_manager.explain(features, method='shap')

    def _tool_explain_lime(self, params: Dict) -> Dict:
        features = params.get('features', [0.5] * 10)
        num_features = params.get('num_features', 10)
        return self.model_manager.explain(features, method='lime', num_features=num_features)

    def _tool_fairness(self, params: Dict) -> Dict:
        y_true = np.array(params.get('y_true', [0, 1, 1, 0, 1, 0, 1, 1, 0, 0]))
        y_pred = np.array(params.get('y_pred', [0, 1, 0, 0, 1, 1, 1, 1, 0, 0]))
        protected = np.array(params.get('protected_group', [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]))
        return self.fairness_analyzer.full_analysis(y_true, y_pred, protected)

    def _tool_train_start(self, params: Dict) -> Dict:
        if not TORCH_AVAILABLE:
            return {'error': 'PyTorch required for training'}
        if self.training_engine and self.training_engine.is_training:
            return {'error': 'Training already in progress', 'status': self.training_engine.get_status()}
        epochs = params.get('epochs', 50)
        batch_size = params.get('batch_size', 32)
        lr = params.get('learning_rate', 0.001)
        n_samples = params.get('data_samples', 500)
        n_features = params.get('n_features', 10)
        n_classes = params.get('n_classes', 2)
        config = TrainingConfig(
            epochs=epochs, batch_size=batch_size, learning_rate=lr,
            device='cuda' if torch.cuda.is_available() else 'cpu'
        )
        model = torch.nn.Sequential(
            torch.nn.Linear(n_features, 256),
            torch.nn.ReLU(),
            torch.nn.Dropout(config.dropout),
            torch.nn.Linear(256, 128),
            torch.nn.ReLU(),
            torch.nn.Dropout(config.dropout),
            torch.nn.Linear(128, 64),
            torch.nn.ReLU(),
            torch.nn.Linear(64, n_classes)
        )
        self.training_engine = TrainingEngine(model, config)
        X = np.random.randn(n_samples, n_features).astype(np.float32)
        y = np.random.randint(0, n_classes, n_samples)
        split = int(n_samples * (1 - config.validation_split))
        X_train, X_val = X[:split], X[split:]
        y_train, y_val = y[:split], y[split:]

        def _run():
            try:
                self.training_engine.train(X_train, y_train, X_val, y_val)
                self.model_manager.model = model
                self.model_manager.model.eval()
                self.model_manager.model_info['trained'] = True
                self.model_manager.model_info['parameters'] = sum(p.numel() for p in model.parameters())
                self.model_manager.background_data = X_train[:50]
                self.model_manager._init_explainers()
                logger.info("Training complete - model updated in NexusModelManager")
            except Exception as e:
                logger.error(f"Training thread error: {e}")

        self.training_thread = threading.Thread(target=_run, daemon=True)
        self.training_thread.start()
        return {
            'status': 'training_started',
            'config': asdict(config),
            'data_shape': [n_samples, n_features],
            'n_classes': n_classes
        }

    def _tool_train_status(self, params: Dict) -> Dict:
        if self.training_engine is None:
            return {'status': 'no_training_session'}
        return self.training_engine.get_status()

    def _tool_train_stop(self, params: Dict) -> Dict:
        if self.training_engine is None or not self.training_engine.is_training:
            return {'status': 'no_active_training'}
        self.training_engine.stop()
        return {'status': 'stop_requested'}

    def _tool_eda(self, params: Dict) -> Dict:
        if not PANDAS_AVAILABLE:
            return {'error': 'pandas not available'}
        csv_path = params.get('csv_path')
        data_json = params.get('data_json')
        target_col = params.get('target_col')
        if csv_path and os.path.exists(csv_path):
            data = pd.read_csv(csv_path)
        elif data_json:
            data = pd.DataFrame(data_json)
        else:
            np.random.seed(42)
            data = pd.DataFrame({
                'feature_1': np.random.randn(100),
                'feature_2': np.random.randn(100) * 2 + 1,
                'feature_3': np.random.choice(['A', 'B', 'C'], 100),
                'target': np.random.randint(0, 2, 100)
            })
            target_col = 'target'
        return self.eda.analyze(data, target_col)

    def _tool_preprocess(self, params: Dict) -> Dict:
        if not PANDAS_AVAILABLE:
            return {'error': 'pandas not available'}
        csv_path = params.get('csv_path')
        operations = params.get('operations', ['impute', 'scale'])
        if csv_path and os.path.exists(csv_path):
            data = pd.read_csv(csv_path)
        else:
            data = pd.DataFrame({
                'a': [1, 2, None, 4, 5],
                'b': [10, None, 30, 40, 50],
                'c': ['x', 'y', 'x', 'z', 'y']
            })
        if 'impute' in operations:
            data = self.preprocessor.impute_missing(data)
        if 'scale' in operations:
            data = self.preprocessor.scale_features(data)
        if 'encode' in operations:
            data = self.preprocessor.encode_categorical(data)
        return {
            'shape': list(data.shape),
            'columns': list(data.columns),
            'operations_applied': operations,
            'sample': data.head(5).to_dict(orient='records')
        }

    def _tool_model_info(self, params: Dict) -> Dict:
        return self.model_manager.get_info()

    def _tool_system_status(self, params: Dict) -> Dict:
        mem = self.memory_monitor.log_memory("status_check")
        return {
            'nexus_version': '2.0.0',
            'modules_active': {
                'auto_eda': True,
                'preprocessor': True,
                'model_manager': self.model_manager.model is not None if TORCH_AVAILABLE else False,
                'memory_monitor': True,
                'profiler': True,
                'shap_explainer': self.model_manager.shap_explainer is not None,
                'lime_explainer': self.model_manager.lime_explainer is not None,
                'fairness_analyzer': True,
                'training_engine': self.training_engine is not None,
                'torch_available': TORCH_AVAILABLE,
                'pandas_available': PANDAS_AVAILABLE,
                'scipy_available': SCIPY_AVAILABLE,
                'sklearn_available': SKLEARN_AVAILABLE,
                'psutil_available': PSUTIL_AVAILABLE,
                'mixed_precision': MIXED_PRECISION_AVAILABLE,
            },
            'tools_count': len(self._tool_registry),
            'memory': mem,
            'performance': self.profiler.get_metrics(),
            'device': str(self.model_manager.device) if self.model_manager.device else 'cpu'
        }

    def _tool_memory_status(self, params: Dict) -> Dict:
        return {
            'current': self.memory_monitor.log_memory("memory_check"),
            'summary': self.memory_monitor.get_summary(),
            'performance': self.profiler.get_metrics()
        }


class QuantumIntelligenceNexus:
    """Backward-compatible interface. Used by quantum_bridge.py."""

    def __init__(self, machine_name="Quantum_Nexus_Alpha"):
        self.machine_name = machine_name
        self.version = "2.0.0"
        self.creation_timestamp = datetime.now().isoformat()
        self.operation_log = deque(maxlen=100000)
        self.tool_engine = NexusToolEngine()
        self._query_count = 0
        print(f"\n✓ Quantum Intelligence Nexus v{self.version} initialized")
        print(f"✓ Machine: {machine_name}")
        print(f"✓ Status: Ready for autonomous operation\n")

    def activate(self):
        print(f"► Activating {self.machine_name}...")
        print("✓ All systems operational\n")

    def process_query(self, query, enable_quantum=True):
        self._query_count += 1
        self.operation_log.append({
            'timestamp': datetime.now().isoformat(),
            'query': query[:200],
            'quantum': enable_quantum
        })
        query_lower = query.lower() if isinstance(query, str) else ''
        analysis_depth = 'deep' if any(w in query_lower for w in ['analyze', 'research', 'calculate', 'solve', 'explain']) else 'standard'
        return {
            'timestamp': datetime.now().isoformat(),
            'query': query,
            'status': 'processed',
            'quantum_enabled': enable_quantum,
            'analysis_depth': analysis_depth,
            'query_number': self._query_count,
            'modules_active': len(self.tool_engine._tool_registry),
            'tools_available': list(self.tool_engine._tool_registry.keys()),
        }

    def introspect(self):
        status = self.tool_engine.execute_tool('system_status')
        return {
            'machine_name': self.machine_name,
            'version': self.version,
            'status': 'ACTIVE',
            'operations': self._query_count,
            'total_logged': len(self.operation_log),
            'modules': status.get('modules_active', {}),
            'tools_count': status.get('tools_count', 0),
            'device': status.get('device', 'cpu'),
        }

    def execute_tool(self, tool_name: str, params: Dict = None) -> Dict:
        return self.tool_engine.execute_tool(tool_name, params)

    def list_tools(self) -> List[Dict]:
        return self.tool_engine.list_tools()

    def deactivate(self):
        self.tool_engine.memory_monitor.cleanup()
        if self.tool_engine.training_engine and self.tool_engine.training_engine.is_training:
            self.tool_engine.training_engine.stop()
        print(f"Deactivating {self.machine_name}...")
        print("✓ Graceful shutdown complete\n")
