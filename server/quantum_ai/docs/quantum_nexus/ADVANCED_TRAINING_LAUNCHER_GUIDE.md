# Advanced Training Launcher Guide

## Overview

The **Advanced Training Launcher** provides an easy-to-use command-line interface for training Quantum Intelligence Nexus models with the production training system.

## Quick Start

### Basic Training

```bash
# Train with default settings
python advanced_training_launcher.py

# Train with custom epochs and batch size
python advanced_training_launcher.py --epochs 50 --batch-size 64
```

### Quick Examples

```bash
# Fast training (fewer epochs)
python advanced_training_launcher.py --epochs 10 --batch-size 64

# Large dataset training
python advanced_training_launcher.py --train-size 10000 --feature-dim 20

# CPU training
python advanced_training_launcher.py --device cpu

# Training with gradient accumulation
python advanced_training_launcher.py --batch-size 16 --gradient-accumulation 4

# Custom learning rate
python advanced_training_launcher.py --lr 0.0001 --epochs 100
```

## Command Line Arguments

### Training Parameters

| Argument | Default | Description |
|----------|---------|-------------|
| `--epochs` | 100 | Number of training epochs |
| `--batch-size` | 32 | Batch size for training |
| `--lr` | 0.001 | Learning rate |
| `--weight-decay` | 1e-5 | Weight decay (L2 regularization) |

### Optimization

| Argument | Default | Description |
|----------|---------|-------------|
| `--mixed-precision` | True | Use mixed precision training (FP16/FP32) |
| `--no-mixed-precision` | - | Disable mixed precision |
| `--gradient-accumulation` | 1 | Gradient accumulation steps |
| `--use-ema` | True | Use exponential moving average |
| `--no-ema` | - | Disable EMA |
| `--ema-decay` | 0.999 | EMA decay rate |

### Learning Rate Schedule

| Argument | Default | Description |
|----------|---------|-------------|
| `--scheduler` | cosine | Scheduler type (cosine/linear/exponential) |
| `--warmup-epochs` | 5 | Warmup epochs for scheduler |

### Regularization

| Argument | Default | Description |
|----------|---------|-------------|
| `--dropout` | 0.1 | Dropout rate |
| `--label-smoothing` | 0.1 | Label smoothing factor |

### Data Configuration

| Argument | Default | Description |
|----------|---------|-------------|
| `--train-size` | 5000 | Training data size |
| `--feature-dim` | 10 | Feature dimension |
| `--num-classes` | 2 | Number of classes |
| `--validation-split` | 0.2 | Validation split ratio |

### Hardware

| Argument | Default | Description |
|----------|---------|-------------|
| `--device` | auto | Device (cuda/cpu/mps) |
| `--num-workers` | 4 | Number of data loading workers |
| `--pin-memory` | True | Pin memory for faster transfer |

### Checkpointing

| Argument | Default | Description |
|----------|---------|-------------|
| `--checkpoint-dir` | checkpoints | Checkpoint directory |
| `--save-interval` | 5 | Save checkpoint every N epochs |
| `--keep-best` | True | Keep best model checkpoint |

### Reproducibility

| Argument | Default | Description |
|----------|---------|-------------|
| `--seed` | 42 | Random seed |
| `--deterministic` | True | Use deterministic operations |

### Output

| Argument | Default | Description |
|----------|---------|-------------|
| `--report-path` | training_report.json | Path to save training report |
| `--verbose` | False | Verbose output |

## Usage Examples

### Example 1: Quick Training Run

```bash
python advanced_training_launcher.py \
    --epochs 20 \
    --batch-size 64 \
    --train-size 10000
```

### Example 2: Large Model Training

```bash
python advanced_training_launcher.py \
    --epochs 100 \
    --batch-size 16 \
    --gradient-accumulation 4 \
    --feature-dim 50 \
    --num-classes 10 \
    --dropout 0.2
```

### Example 3: CPU Training

```bash
python advanced_training_launcher.py \
    --device cpu \
    --epochs 50 \
    --batch-size 32 \
    --num-workers 2
```

### Example 4: Custom Learning Rate Schedule

```bash
python advanced_training_launcher.py \
    --scheduler linear \
    --warmup-epochs 10 \
    --lr 0.001
```

### Example 5: Production Training

```bash
python advanced_training_launcher.py \
    --epochs 200 \
    --batch-size 32 \
    --mixed-precision \
    --use-ema \
    --ema-decay 0.9999 \
    --scheduler cosine \
    --warmup-epochs 10 \
    --save-interval 10 \
    --keep-best \
    --seed 42 \
    --deterministic
```

## Output Files

### Training Report

The launcher generates a comprehensive training report:

```json
{
  "timestamp": "2024-02-10T19:30:00",
  "config": {...},
  "training_history": {
    "train_loss": [...],
    "val_loss": [...],
    "val_accuracy": [...]
  },
  "memory_stats": {...},
  "performance_metrics": {...},
  "total_steps": 5000,
  "total_epochs": 50
}
```

### Checkpoints

Models are saved to the checkpoint directory:

```
checkpoints/
  ├── checkpoint_epoch_5.pt
  ├── checkpoint_epoch_10.pt
  └── ...
```

## Integration with Production Training System

The launcher uses the `production_training_system` module:

```python
from production_training_system import TrainingConfig, TrainingEngine

# Launcher creates config from arguments
config = TrainingConfig(...)

# Creates and runs trainer
trainer = TrainingEngine(model, config)
report = trainer.train(X_train, y_train, X_val, y_val)
```

## Best Practices

### 1. Start with Defaults

```bash
# Start with defaults, then tune
python advanced_training_launcher.py
```

### 2. Use Mixed Precision

```bash
# Enable mixed precision for faster training
python advanced_training_launcher.py --mixed-precision
```

### 3. Use Gradient Accumulation for Large Models

```bash
# Effective batch size = 16 * 4 = 64
python advanced_training_launcher.py \
    --batch-size 16 \
    --gradient-accumulation 4
```

### 4. Enable EMA for Stability

```bash
# Use EMA for more stable training
python advanced_training_launcher.py --use-ema --ema-decay 0.999
```

### 5. Use Learning Rate Scheduling

```bash
# Cosine annealing with warmup
python advanced_training_launcher.py \
    --scheduler cosine \
    --warmup-epochs 5
```

### 6. Set Reproducibility

```bash
# Reproducible training
python advanced_training_launcher.py \
    --seed 42 \
    --deterministic
```

## Troubleshooting

### Out of Memory

```bash
# Reduce batch size and use gradient accumulation
python advanced_training_launcher.py \
    --batch-size 8 \
    --gradient-accumulation 8
```

### Slow Training

```bash
# Enable mixed precision and increase workers
python advanced_training_launcher.py \
    --mixed-precision \
    --num-workers 8
```

### Unstable Training

```bash
# Lower learning rate, enable EMA, use gradient clipping
python advanced_training_launcher.py \
    --lr 0.0001 \
    --use-ema \
    --ema-decay 0.999
```

## Advanced Usage

### Custom Model Architecture

Modify the `create_model` function in `advanced_training_launcher.py`:

```python
def create_model(input_dim: int, num_classes: int, dropout: float = 0.1):
    return torch.nn.Sequential(
        # Your custom architecture
        ...
    )
```

### Custom Data Loading

Modify the `generate_data` function or load from files:

```python
def generate_data(...):
    # Load from CSV, NPZ, etc.
    X_train = np.load('data/X_train.npy')
    y_train = np.load('data/y_train.npy')
    ...
```

## Summary

The Advanced Training Launcher provides:

✅ **Easy Command-Line Interface** - Simple arguments for all options  
✅ **Production-Ready Defaults** - Best practices out of the box  
✅ **Flexible Configuration** - Customize all training parameters  
✅ **Comprehensive Reports** - Detailed training analysis  
✅ **Automatic Checkpointing** - Models saved automatically  
✅ **Device Auto-Detection** - Automatically uses best available device  

**Status**: Production-ready training launcher with comprehensive CLI interface.

---

*Last Updated: 2024*  
*Version: 2.0*



