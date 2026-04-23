"""
Deep Learning Processor for Quantum AI Core v2.0

Provides advanced deep learning capabilities with multiple framework support.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class DeepLearningProcessor:
    """Advanced deep learning processor with multi-framework support."""

    def __init__(self, framework: str = 'pytorch'):
        """
        Initialize the deep learning processor.

        Args:
            framework: The deep learning framework to use ('pytorch', 'tensorflow', 'sklearn')
        """
        self.framework = framework
        self.processing_pathway: List[str] = []
        self._log_action(f"Initialized DeepLearningProcessor with {framework} framework")

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

    def train_pytorch_mlp(self, X: np.ndarray, y: np.ndarray, epochs: int = 100,
                         hidden_dims: List[int] = None, learning_rate: float = 0.001) -> Dict[str, Any]:
        """
        Train a PyTorch MLP classifier.

        Args:
            X: Input features
            y: Target labels
            epochs: Number of training epochs
            hidden_dims: Hidden layer dimensions
            learning_rate: Learning rate

        Returns:
            Dictionary with training results
        """
        self._log_action(f"Starting PyTorch MLP training with {epochs} epochs")

        try:
            import torch
            import torch.nn as nn
            import torch.optim as optim
            from torch.utils.data import DataLoader, TensorDataset
        except ImportError:
            raise ImportError("PyTorch not available. Install with: pip install torch torchvision")

        if hidden_dims is None:
            hidden_dims = [64, 32]

        # Convert to tensors
        X_tensor = torch.FloatTensor(X)
        y_tensor = torch.LongTensor(y)

        # Create data loader
        dataset = TensorDataset(X_tensor, y_tensor)
        dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

        # Define model
        class MLP(nn.Module):
            def __init__(self, input_dim, hidden_dims, output_dim):
                super(MLP, self).__init__()
                layers = []
                prev_dim = input_dim

                for hidden_dim in hidden_dims:
                    layers.extend([
                        nn.Linear(prev_dim, hidden_dim),
                        nn.ReLU(),
                        nn.Dropout(0.2)
                    ])
                    prev_dim = hidden_dim

                layers.append(nn.Linear(prev_dim, output_dim))
                self.model = nn.Sequential(*layers)

            def forward(self, x):
                return self.model(x)

        input_dim = X.shape[1]
        output_dim = len(np.unique(y))

        model = MLP(input_dim, hidden_dims, output_dim)
        criterion = nn.CrossEntropyLoss()
        optimizer = optim.Adam(model.parameters(), lr=learning_rate)

        # Training loop
        train_losses = []

        for epoch in range(epochs):
            epoch_loss = 0.0
            for batch_X, batch_y in dataloader:
                optimizer.zero_grad()
                outputs = model(batch_X)
                loss = criterion(outputs, batch_y)
                loss.backward()
                optimizer.step()
                epoch_loss += loss.item()

            avg_loss = epoch_loss / len(dataloader)
            train_losses.append(avg_loss)

            if (epoch + 1) % 10 == 0:
                self._log_action(f"Epoch {epoch + 1}/{epochs}, Loss: {avg_loss:.4f}")

        self._log_action("PyTorch MLP training completed")

        return {
            'model': model,
            'train_losses': train_losses,
            'framework': 'pytorch',
            'epochs': epochs,
            'final_loss': train_losses[-1] if train_losses else None
        }

    def train_tensorflow_mlp(self, X: np.ndarray, y: np.ndarray, epochs: int = 100,
                           hidden_dims: List[int] = None, learning_rate: float = 0.001) -> Dict[str, Any]:
        """
        Train a TensorFlow/Keras MLP classifier.

        Args:
            X: Input features
            y: Target labels
            epochs: Number of training epochs
            hidden_dims: Hidden layer dimensions
            learning_rate: Learning rate

        Returns:
            Dictionary with training results
        """
        self._log_action(f"Starting TensorFlow MLP training with {epochs} epochs")

        try:
            import tensorflow as tf
            from tensorflow import keras
        except ImportError:
            raise ImportError("TensorFlow not available. Install with: pip install tensorflow")

        if hidden_dims is None:
            hidden_dims = [64, 32]

        # Define model
        model = keras.Sequential()
        model.add(keras.layers.Input(shape=(X.shape[1],)))

        for hidden_dim in hidden_dims:
            model.add(keras.layers.Dense(hidden_dim, activation='relu'))
            model.add(keras.layers.Dropout(0.2))

        model.add(keras.layers.Dense(len(np.unique(y)), activation='softmax'))

        model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=learning_rate),
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )

        # Train model
        history = model.fit(
            X, y,
            epochs=epochs,
            batch_size=32,
            verbose=0,
            validation_split=0.2
        )

        self._log_action("TensorFlow MLP training completed")

        return {
            'model': model,
            'history': history.history,
            'framework': 'tensorflow',
            'epochs': epochs
        }

    def train_sklearn_mlp(self, X: np.ndarray, y: np.ndarray, hidden_layer_sizes: Tuple = (100,),
                         max_iter: int = 1000, learning_rate: float = 0.001) -> Dict[str, Any]:
        """
        Train a scikit-learn MLP classifier.

        Args:
            X: Input features
            y: Target labels
            hidden_layer_sizes: Hidden layer sizes
            max_iter: Maximum iterations
            learning_rate: Learning rate

        Returns:
            Dictionary with training results
        """
        self._log_action(f"Starting scikit-learn MLP training with {max_iter} max iterations")

        try:
            from sklearn.neural_network import MLPClassifier
        except ImportError:
            raise ImportError("scikit-learn not available. Install with: pip install scikit-learn")

        model = MLPClassifier(
            hidden_layer_sizes=hidden_layer_sizes,
            max_iter=max_iter,
            learning_rate_init=learning_rate,
            random_state=42,
            verbose=False
        )

        model.fit(X, y)

        self._log_action("scikit-learn MLP training completed")

        return {
            'model': model,
            'framework': 'sklearn',
            'classes': model.classes_,
            'n_layers': model.n_layers_,
            'n_outputs': model.n_outputs_
        }

    def predict(self, model: Any, X: np.ndarray, framework: str = None) -> np.ndarray:
        """
        Make predictions using a trained model.

        Args:
            model: Trained model
            X: Input features
            framework: Framework override

        Returns:
            Predictions
        """
        framework = framework or self.framework
        self._log_action(f"Making predictions with {framework} model")

        if framework == 'pytorch':
            try:
                import torch
                model.eval()
                with torch.no_grad():
                    X_tensor = torch.FloatTensor(X)
                    outputs = model(X_tensor)
                    _, predicted = torch.max(outputs, 1)
                    return predicted.numpy()
            except ImportError:
                raise ImportError("PyTorch not available")

        elif framework == 'tensorflow':
            try:
                return np.argmax(model.predict(X), axis=1)
            except ImportError:
                raise ImportError("TensorFlow not available")

        elif framework == 'sklearn':
            return model.predict(X)

        else:
            raise ValueError(f"Unsupported framework: {framework}")

    def get_model_info(self, model: Any, framework: str = None) -> Dict[str, Any]:
        """
        Get information about a trained model.

        Args:
            model: Trained model
            framework: Framework override

        Returns:
            Model information
        """
        framework = framework or self.framework

        if framework == 'pytorch':
            try:
                import torch
                return {
                    'type': 'PyTorch',
                    'parameters': sum(p.numel() for p in model.parameters()),
                    'trainable_parameters': sum(p.numel() for p in model.parameters() if p.requires_grad)
                }
            except ImportError:
                return {'error': 'PyTorch not available'}

        elif framework == 'tensorflow':
            try:
                return {
                    'type': 'TensorFlow/Keras',
                    'summary': str(model.summary())
                }
            except ImportError:
                return {'error': 'TensorFlow not available'}

        elif framework == 'sklearn':
            return {
                'type': 'scikit-learn',
                'classes': getattr(model, 'classes_', None),
                'n_features': getattr(model, 'n_features_in_', None)
            }

        return {'error': f'Unsupported framework: {framework}'};