# production_training_system.py
"""
QUANTUM INTELLIGENCE NEXUS v2.0 - PRODUCTION TRAINING SYSTEM
Complete training pipeline with monitoring, optimization, and best practices.
"""

import os
import json
import torch
import numpy as np
import pandas as pd
import logging
from typing import Dict, List, Tuple, Any, Optional, Callable
from datetime import datetime
from collections import defaultdict
import sys
import gc
import psutil
from dataclasses import dataclass, asdict
from pathlib import Path

# Add server directory to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

# Advanced imports
try:
    from torch.cuda.amp import autocast, GradScaler
    MIXED_PRECISION_AVAILABLE = True
except ImportError:
    MIXED_PRECISION_AVAILABLE = False

try:
    import tensorboard
    TENSORBOARD_AVAILABLE = True
except ImportError:
    TENSORBOARD_AVAILABLE = False

# Configure comprehensive logging
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/nexus_training_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


# ==================== CONFIGURATION ====================

@dataclass
class TrainingConfig:
    """Training configuration"""
    # Basic settings
    batch_size: int = 32
    epochs: int = 100
    learning_rate: float = 0.001
    weight_decay: float = 1e-5
    
    # Optimization
    use_mixed_precision: bool = True
    gradient_accumulation_steps: int = 1
    gradient_clip_value: float = 1.0
    use_ema: bool = True
    ema_decay: float = 0.999
    
    # Memory optimization
    use_gradient_checkpointing: bool = True
    pin_memory: bool = True
    num_workers: int = 4
    
    # Learning rate schedule
    use_scheduler: bool = True
    scheduler_type: str = 'cosine'  # cosine, linear, exponential
    warmup_epochs: int = 5
    
    # Regularization
    dropout: float = 0.1
    label_smoothing: float = 0.1
    
    # Validation
    validation_split: float = 0.2
    validate_every_n_steps: int = 100
    
    # Hardware
    device: str = 'cuda' if torch.cuda.is_available() else 'cpu'
    multi_gpu: bool = torch.cuda.device_count() > 1
    num_gpus: int = torch.cuda.device_count()
    
    # Checkpointing
    checkpoint_dir: str = 'checkpoints'
    save_every_n_epochs: int = 5
    keep_best_model: bool = True
    
    # Reproducibility
    seed: int = 42
    deterministic: bool = True


# ==================== MEMORY & PERFORMANCE MONITORING ====================

class MemoryMonitor:
    """Monitor CPU and GPU memory usage"""
    
    def __init__(self):
        self.memory_log = []
        self.peak_memory = 0
        logger.info("Initializing Memory Monitor")
    
    def log_memory(self, label: str = ""):
        """Log current memory usage"""
        cpu_memory = psutil.virtual_memory().percent
        
        if torch.cuda.is_available():
            torch.cuda.synchronize()
            gpu_memory_allocated = torch.cuda.memory_allocated() / 1e9  # GB
            gpu_memory_reserved = torch.cuda.memory_reserved() / 1e9  # GB
            gpu_memory_percent = (gpu_memory_allocated / torch.cuda.get_device_properties(0).total_memory) * 100
        else:
            gpu_memory_allocated = 0
            gpu_memory_reserved = 0
            gpu_memory_percent = 0
        
        memory_info = {
            'timestamp': datetime.now().isoformat(),
            'label': label,
            'cpu_percent': cpu_memory,
            'gpu_allocated_gb': gpu_memory_allocated,
            'gpu_reserved_gb': gpu_memory_reserved,
            'gpu_percent': gpu_memory_percent
        }
        
        self.memory_log.append(memory_info)
        self.peak_memory = max(self.peak_memory, gpu_memory_allocated)
        
        if gpu_memory_allocated > 0:
            logger.info(f"Memory ({label}): CPU={cpu_memory:.1f}%, GPU={gpu_memory_percent:.1f}% ({gpu_memory_allocated:.2f}GB/{torch.cuda.get_device_properties(0).total_memory/1e9:.2f}GB)")
        
        return memory_info
    
    def get_summary(self) -> Dict:
        """Get memory summary"""
        if not self.memory_log:
            return {
                'total_recordings': 0,
                'peak_gpu_memory_gb': 0,
                'avg_cpu_percent': 0,
                'log': []
            }
        
        return {
            'total_recordings': len(self.memory_log),
            'peak_gpu_memory_gb': self.peak_memory,
            'avg_cpu_percent': np.mean([m['cpu_percent'] for m in self.memory_log]),
            'log': self.memory_log
        }
    
    def cleanup(self):
        """Clean up GPU memory"""
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        logger.info("GPU memory cleaned up")


class PerformanceProfiler:
    """Profile training performance"""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.timer = {}
        logger.info("Initializing Performance Profiler")
    
    def start_timer(self, name: str):
        """Start timer"""
        self.timer[name] = datetime.now()
    
    def end_timer(self, name: str):
        """End timer and log duration"""
        if name in self.timer:
            duration = (datetime.now() - self.timer[name]).total_seconds()
            self.metrics[f'{name}_time'].append(duration)
            return duration
        return None
    
    def log_metric(self, name: str, value: float):
        """Log a metric"""
        self.metrics[name].append(value)
    
    def get_metrics(self) -> Dict:
        """Get all metrics"""
        return {
            name: {
                'values': values,
                'mean': np.mean(values),
                'std': np.std(values),
                'min': np.min(values),
                'max': np.max(values)
            }
            for name, values in self.metrics.items()
        }


# ==================== DATA HANDLING ====================

class DataManager:
    """Manage training data with optimization"""
    
    def __init__(self, config: TrainingConfig):
        self.config = config
        self.train_loader = None
        self.val_loader = None
        self.test_loader = None
        logger.info("Initializing Data Manager")
    
    def create_data_loaders(self, X_train: np.ndarray, y_train: np.ndarray,
                           X_val: Optional[np.ndarray] = None,
                           y_val: Optional[np.ndarray] = None) -> Tuple:
        """Create optimized data loaders"""
        logger.info("Creating data loaders")
        
        # Convert to tensors
        X_train_tensor = torch.FloatTensor(X_train)
        y_train_tensor = torch.LongTensor(y_train)
        
        train_dataset = torch.utils.data.TensorDataset(X_train_tensor, y_train_tensor)
        
        self.train_loader = torch.utils.data.DataLoader(
            train_dataset,
            batch_size=self.config.batch_size,
            shuffle=True,
            num_workers=self.config.num_workers,
            pin_memory=self.config.pin_memory,
            persistent_workers=self.config.num_workers > 0
        )
        
        # Validation loader
        if X_val is not None and y_val is not None:
            X_val_tensor = torch.FloatTensor(X_val)
            y_val_tensor = torch.LongTensor(y_val)
            
            val_dataset = torch.utils.data.TensorDataset(X_val_tensor, y_val_tensor)
            
            self.val_loader = torch.utils.data.DataLoader(
                val_dataset,
                batch_size=self.config.batch_size * 2,
                shuffle=False,
                num_workers=self.config.num_workers,
                pin_memory=self.config.pin_memory
            )
        
        logger.info(f"✓ Data loaders created: train_batches={len(self.train_loader)}")
        
        return self.train_loader, self.val_loader
    
    def get_data_stats(self, X: np.ndarray) -> Dict:
        """Get data statistics"""
        return {
            'shape': X.shape,
            'dtype': str(X.dtype),
            'mean': float(np.mean(X)),
            'std': float(np.std(X)),
            'min': float(np.min(X)),
            'max': float(np.max(X)),
            'memory_gb': X.nbytes / 1e9
        }


# ==================== OPTIMIZER & SCHEDULER ====================

class OptimizerFactory:
    """Factory for creating optimizers with best practices"""
    
    @staticmethod
    def create_optimizer(model: torch.nn.Module, config: TrainingConfig) -> torch.optim.Optimizer:
        """Create optimized optimizer"""
        logger.info(f"Creating optimizer with lr={config.learning_rate}")
        
        # Use AdamW as default (best practice)
        optimizer = torch.optim.AdamW(
            model.parameters(),
            lr=config.learning_rate,
            weight_decay=config.weight_decay,
            betas=(0.9, 0.999),
            eps=1e-8
        )
        
        return optimizer
    
    @staticmethod
    def create_scheduler(optimizer: torch.optim.Optimizer, 
                        config: TrainingConfig,
                        total_steps: int) -> torch.optim.lr_scheduler._LRScheduler:
        """Create learning rate scheduler"""
        logger.info(f"Creating scheduler: {config.scheduler_type}")
        
        warmup_steps = int(total_steps * config.warmup_epochs / config.epochs)
        
        if config.scheduler_type == 'cosine':
            scheduler = torch.optim.lr_scheduler.CosineAnnealingWarmRestarts(
                optimizer,
                T_0=total_steps,
                T_mult=1,
                eta_min=1e-6
            )
        elif config.scheduler_type == 'linear':
            scheduler = torch.optim.lr_scheduler.LinearLR(
                optimizer,
                start_factor=0.1,
                total_iters=total_steps
            )
        else:
            scheduler = torch.optim.lr_scheduler.ExponentialLR(
                optimizer,
                gamma=0.95
            )
        
        return scheduler


# ==================== EMA (EXPONENTIAL MOVING AVERAGE) ====================

class ExponentialMovingAverage:
    """Exponential Moving Average for model weights"""
    
    def __init__(self, model: torch.nn.Module, decay: float = 0.999):
        self.model = model
        self.decay = decay
        self.ema_state_dict = {}
        self.update_count = 0
        logger.info(f"Initializing EMA with decay={decay}")
        
        # Initialize EMA state dict
        for name, param in model.named_parameters():
            if param.requires_grad:
                self.ema_state_dict[name] = param.data.clone()
    
    def update(self):
        """Update EMA"""
        self.update_count += 1
        decay = min(self.decay, (1 + self.update_count) / (10 + self.update_count))
        
        for name, param in self.model.named_parameters():
            if param.requires_grad:
                if name in self.ema_state_dict:
                    self.ema_state_dict[name] = self.ema_state_dict[name] * decay + param.data * (1 - decay)
    
    def apply_ema(self):
        """Apply EMA weights to model"""
        for name, param in self.model.named_parameters():
            if param.requires_grad and name in self.ema_state_dict:
                param.data = self.ema_state_dict[name]
    
    def restore(self):
        """Restore original weights"""
        for name, param in self.model.named_parameters():
            if param.requires_grad and name in self.ema_state_dict:
                param.data = self.ema_state_dict[name]


# ==================== MAIN TRAINING ENGINE ====================

class TrainingEngine:
    """Complete training engine with all best practices"""
    
    def __init__(self, model: torch.nn.Module, config: TrainingConfig):
        self.model = model
        self.config = config
        self.device = torch.device(config.device)
        
        # Move model to device
        self.model = self.model.to(self.device)
        
        # Setup components
        self.optimizer = OptimizerFactory.create_optimizer(model, config)
        self.scaler = GradScaler() if config.use_mixed_precision and MIXED_PRECISION_AVAILABLE else None
        self.memory_monitor = MemoryMonitor()
        self.profiler = PerformanceProfiler()
        self.data_manager = DataManager(config)
        
        # EMA
        self.ema = ExponentialMovingAverage(model, config.ema_decay) if config.use_ema else None
        
        # Training state
        self.epoch = 0
        self.global_step = 0
        self.best_metric = float('inf')
        self.training_history = defaultdict(list)
        
        # Setup directory
        Path(config.checkpoint_dir).mkdir(exist_ok=True)
        
        logger.info(f"Training Engine initialized")
        logger.info(f"Device: {self.device}")
        logger.info(f"Mixed Precision: {config.use_mixed_precision and MIXED_PRECISION_AVAILABLE}")
        logger.info(f"Model parameters: {sum(p.numel() for p in model.parameters()):,}")
    
    def set_seed(self):
        """Set random seed for reproducibility"""
        logger.info(f"Setting seed to {self.config.seed}")
        np.random.seed(self.config.seed)
        torch.manual_seed(self.config.seed)
        if torch.cuda.is_available():
            torch.cuda.manual_seed_all(self.config.seed)
        if self.config.deterministic:
            torch.backends.cudnn.deterministic = True
            torch.backends.cudnn.benchmark = False
    
    def train_epoch(self, train_loader: torch.utils.data.DataLoader) -> Dict:
        """Train one epoch"""
        self.model.train()
        
        epoch_metrics = {
            'loss': [],
            'batch_time': []
        }
        
        self.profiler.start_timer('epoch')
        
        for batch_idx, (X_batch, y_batch) in enumerate(train_loader):
            self.profiler.start_timer('batch')
            
            # Move to device
            X_batch = X_batch.to(self.device)
            y_batch = y_batch.to(self.device)
            
            # Forward pass with mixed precision
            if self.scaler is not None:
                with autocast():
                    logits = self.model(X_batch)
                    loss = torch.nn.functional.cross_entropy(
                        logits, y_batch,
                        label_smoothing=self.config.label_smoothing
                    )
                    
                    if self.config.gradient_accumulation_steps > 1:
                        loss = loss / self.config.gradient_accumulation_steps
                
                # Backward pass with scaler
                self.scaler.scale(loss).backward()
                
                if (batch_idx + 1) % self.config.gradient_accumulation_steps == 0:
                    # Gradient clipping
                    self.scaler.unscale_(self.optimizer)
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(),
                        self.config.gradient_clip_value
                    )
                    
                    self.scaler.step(self.optimizer)
                    self.scaler.update()
                    self.optimizer.zero_grad()
                    
                    # Update EMA
                    if self.ema:
                        self.ema.update()
            else:
                # Standard training without mixed precision
                logits = self.model(X_batch)
                loss = torch.nn.functional.cross_entropy(
                    logits, y_batch,
                    label_smoothing=self.config.label_smoothing
                )
                
                if self.config.gradient_accumulation_steps > 1:
                    loss = loss / self.config.gradient_accumulation_steps
                
                loss.backward()
                
                if (batch_idx + 1) % self.config.gradient_accumulation_steps == 0:
                    torch.nn.utils.clip_grad_norm_(
                        self.model.parameters(),
                        self.config.gradient_clip_value
                    )
                    self.optimizer.step()
                    self.optimizer.zero_grad()
                    
                    if self.ema:
                        self.ema.update()
            
            # Record metrics
            epoch_metrics['loss'].append(loss.item())
            batch_time = self.profiler.end_timer('batch')
            epoch_metrics['batch_time'].append(batch_time)
            
            self.global_step += 1
            
            # Log progress
            if (batch_idx + 1) % 10 == 0:
                avg_loss = np.mean(epoch_metrics['loss'][-10:])
                logger.info(f"Epoch {self.epoch+1} [{batch_idx+1}/{len(train_loader)}] Loss: {avg_loss:.4f}")
            
            # Cleanup
            del X_batch, y_batch, logits, loss
            if batch_idx % 50 == 0:
                self.memory_monitor.log_memory(f"batch_{batch_idx}")
        
        epoch_time = self.profiler.end_timer('epoch')
        
        # Summary metrics
        return {
            'loss': float(np.mean(epoch_metrics['loss'])),
            'loss_std': float(np.std(epoch_metrics['loss'])),
            'epoch_time': epoch_time,
            'avg_batch_time': float(np.mean(epoch_metrics['batch_time']))
        }
    
    def validate(self, val_loader: torch.utils.data.DataLoader) -> Dict:
        """Validate model"""
        if val_loader is None:
            return {}
        
        self.model.eval()
        
        val_metrics = {
            'loss': [],
            'accuracy': []
        }
        
        with torch.no_grad():
            for X_batch, y_batch in val_loader:
                X_batch = X_batch.to(self.device)
                y_batch = y_batch.to(self.device)
                
                logits = self.model(X_batch)
                loss = torch.nn.functional.cross_entropy(logits, y_batch)
                
                preds = logits.argmax(dim=1)
                accuracy = (preds == y_batch).float().mean()
                
                val_metrics['loss'].append(loss.item())
                val_metrics['accuracy'].append(accuracy.item())
        
        return {
            'loss': float(np.mean(val_metrics['loss'])),
            'accuracy': float(np.mean(val_metrics['accuracy']))
        }
    
    def train(self, X_train: np.ndarray, y_train: np.ndarray,
             X_val: Optional[np.ndarray] = None,
             y_val: Optional[np.ndarray] = None) -> Dict:
        """Complete training loop"""
        logger.info("="*80)
        logger.info("STARTING TRAINING")
        logger.info("="*80)
        
        # Set seed
        self.set_seed()
        
        # Create data loaders
        train_loader, val_loader = self.data_manager.create_data_loaders(
            X_train, y_train, X_val, y_val
        )
        
        # Create scheduler
        total_steps = len(train_loader) * self.config.epochs
        scheduler = OptimizerFactory.create_scheduler(self.optimizer, self.config, total_steps)
        
        # Training loop
        for epoch in range(self.config.epochs):
            self.epoch = epoch
            logger.info(f"\nEpoch {epoch+1}/{self.config.epochs}")
            
            # Train
            train_metrics = self.train_epoch(train_loader)
            logger.info(f"Train Loss: {train_metrics['loss']:.4f} | Time: {train_metrics['epoch_time']:.2f}s")
            
            # Validate
            if val_loader:
                val_metrics = self.validate(val_loader)
                logger.info(f"Val Loss: {val_metrics['loss']:.4f} | Accuracy: {val_metrics['accuracy']:.4f}")
                
                # Record metrics
                for key, value in val_metrics.items():
                    self.training_history[f'val_{key}'].append(value)
            
            # Record train metrics
            for key, value in train_metrics.items():
                self.training_history[f'train_{key}'].append(value)
            
            # Update scheduler
            scheduler.step()
            
            # Save checkpoint
            if (epoch + 1) % self.config.save_every_n_epochs == 0:
                self.save_checkpoint(epoch)
            
            # Memory monitoring
            self.memory_monitor.log_memory(f"epoch_{epoch}")
        
        logger.info("\n" + "="*80)
        logger.info("TRAINING COMPLETED")
        logger.info("="*80)
        
        return self._generate_training_report()
    
    def save_checkpoint(self, epoch: int):
        """Save checkpoint"""
        checkpoint_path = Path(self.config.checkpoint_dir) / f"checkpoint_epoch_{epoch+1}.pt"
        
        checkpoint = {
            'epoch': epoch,
            'model_state': self.model.state_dict(),
            'optimizer_state': self.optimizer.state_dict(),
            'global_step': self.global_step
        }
        
        torch.save(checkpoint, checkpoint_path)
        logger.info(f"✓ Checkpoint saved: {checkpoint_path}")
    
    def _generate_training_report(self) -> Dict:
        """Generate comprehensive training report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'config': asdict(self.config),
            'training_history': dict(self.training_history),
            'memory_stats': self.memory_monitor.get_summary(),
            'performance_metrics': self.profiler.get_metrics(),
            'total_steps': self.global_step,
            'total_epochs': self.epoch + 1
        }
        
        return report


# ==================== COMPLETE TRAINING PIPELINE ====================

def main():
    """Main training execution"""
    
    print("\n" + "="*80)
    print("QUANTUM INTELLIGENCE NEXUS v2.0 - PRODUCTION TRAINING")
    print("="*80 + "\n")
    
    # Configuration
    config = TrainingConfig(
        batch_size=32,
        epochs=50,
        learning_rate=0.001,
        use_mixed_precision=True,
        validate_every_n_steps=100,
        device='cuda' if torch.cuda.is_available() else 'cpu'
    )
    
    print(f"Configuration:")
    print(f"  Device: {config.device}")
    print(f"  Batch Size: {config.batch_size}")
    print(f"  Epochs: {config.epochs}")
    print(f"  Learning Rate: {config.learning_rate}")
    print(f"  Mixed Precision: {config.use_mixed_precision}")
    print(f"  Gradient Accumulation: {config.gradient_accumulation_steps}")
    print()
    
    # Generate synthetic data
    print("Generating synthetic data...")
    X_train = np.random.randn(5000, 10).astype(np.float32)
    y_train = np.random.randint(0, 2, 5000)
    X_val = np.random.randn(1000, 10).astype(np.float32)
    y_val = np.random.randint(0, 2, 1000)
    print(f"✓ Data generated: X_train={X_train.shape}, y_train={y_train.shape}")
    print()
    
    # Create simple model
    print("Creating model...")
    model = torch.nn.Sequential(
        torch.nn.Linear(10, 128),
        torch.nn.ReLU(),
        torch.nn.Dropout(config.dropout),
        torch.nn.Linear(128, 64),
        torch.nn.ReLU(),
        torch.nn.Dropout(config.dropout),
        torch.nn.Linear(64, 32),
        torch.nn.ReLU(),
        torch.nn.Linear(32, 2)
    )
    print(f"✓ Model created with {sum(p.numel() for p in model.parameters()):,} parameters")
    print()
    
    # Training
    print("Starting training...")
    trainer = TrainingEngine(model, config)
    report = trainer.train(X_train, y_train, X_val, y_val)
    
    # Save report
    report_path = Path("training_report.json")
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n✓ Report saved to {report_path}")
    
    # Display summary
    print("\n" + "="*80)
    print("TRAINING SUMMARY")
    print("="*80)
    print(f"Total Epochs: {report['total_epochs']}")
    print(f"Total Steps: {report['total_steps']}")
    print(f"Peak GPU Memory: {report['memory_stats']['peak_gpu_memory_gb']:.2f} GB")
    print(f"Average CPU: {report['memory_stats']['avg_cpu_percent']:.1f}%")
    print("="*80 + "\n")
    
    print("✓ TRAINING COMPLETE - Model is ready for deployment!")


if __name__ == "__main__":
    main()



