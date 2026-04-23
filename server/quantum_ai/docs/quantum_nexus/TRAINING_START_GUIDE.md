# QUANTUM INTELLIGENCE NEXUS v2.0 - COMPLETE TRAINING START GUIDE

Complete guide to get started with training Quantum Intelligence Nexus models.

---

## SYSTEM OVERVIEW

The Quantum Intelligence Nexus v2.0 training system provides:

- **Production-Ready Training** - Complete pipeline with best practices
- **Advanced Optimizations** - Mixed precision, EMA, gradient accumulation
- **Comprehensive Monitoring** - Memory, performance, and metrics tracking
- **Flexible Configuration** - Command-line interface with multiple modes
- **Automatic Checkpointing** - Model saving and recovery
- **Detailed Reporting** - JSON reports with full training history

### Training Components

1. **Production Training System** (`production_training_system.py`)
   - Core training engine with all optimizations
   - Memory monitoring and performance profiling
   - Automatic checkpointing

2. **Advanced Training Launcher** (`advanced_training_launcher.py`)
   - Command-line interface for training
   - Comprehensive configuration options
   - Auto device detection

3. **Complete Training Script** (`run_complete_training.py`)
   - Pre-configured training modes
   - Pre-flight checks
   - Unified execution interface

4. **Quick Start Script** (`quick_start_training.sh`)
   - Interactive setup and training
   - Environment verification
   - Dependency installation

---

## QUICK START (Choose Your Path)

### Path 1: Interactive Quick Start (Easiest)

```bash
./quick_start_training.sh
```

This script will:
1. ✅ Check your environment
2. ✅ Install missing dependencies
3. ✅ Guide you through training mode selection
4. ✅ Run training automatically

### Path 2: One-Command Training

```bash
python run_complete_training.py --mode quick
```

Pre-configured modes:
- `--mode quick` - 10 epochs, fast test
- `--mode standard` - 50 epochs, balanced
- `--mode advanced` - Full optimizations
- `--mode full` - 200 epochs, production

### Path 3: Custom Training

```bash
python advanced_training_launcher.py \
    --epochs 50 \
    --batch-size 32 \
    --lr 0.001 \
    --mixed-precision \
    --use-ema
```

### Path 4: Direct System Usage

```bash
python production_training_system.py
```

---

## INSTALLATION & SETUP

### Step 1: Verify Python

```bash
python --version  # Should be 3.7+
# or
python3 --version
```

### Step 2: Install Dependencies

```bash
# Core dependencies
pip install torch numpy pandas psutil

# Optional but recommended
pip install tensorboard tqdm
```

### Step 3: Verify Installation

```bash
python -c "import torch; print(f'PyTorch {torch.__version__}')"
python -c "import torch; print(f'CUDA: {torch.cuda.is_available()}')"
python -c "import torch; print(f'MPS: {hasattr(torch.backends, \"mps\") and torch.backends.mps.is_available()}')"
```

### Step 4: Verify Training Files

```bash
ls -la production_training_system.py
ls -la advanced_training_launcher.py
ls -la run_complete_training.py
```

---

## TRAINING MODES

### Quick Mode (10 epochs)

**Best for**: Testing, quick validation, debugging

```bash
python run_complete_training.py --mode quick
```

**Configuration**:
- Epochs: 10
- Batch Size: 64
- Mixed Precision: Enabled
- EMA: Enabled

**Expected Time**: ~1-2 minutes

### Standard Mode (50 epochs)

**Best for**: Regular training, development, experimentation

```bash
python run_complete_training.py --mode standard --epochs 50
```

**Configuration**:
- Epochs: 50 (customizable)
- Batch Size: 32 (customizable)
- Mixed Precision: Enabled
- EMA: Enabled
- Scheduler: Cosine

**Expected Time**: ~5-10 minutes

### Advanced Mode (Full Optimizations)

**Best for**: Production training with all features

```bash
python run_complete_training.py --mode advanced --epochs 100
```

**Configuration**:
- All optimizations enabled
- Extended warmup (10 epochs)
- Gradient accumulation
- Best model checkpointing
- Deterministic training

**Expected Time**: ~20-30 minutes

### Full Mode (200 epochs)

**Best for**: Final production models, maximum performance

```bash
python run_complete_training.py --mode full
```

**Configuration**:
- Epochs: 200
- Batch Size: 128
- All optimizations
- Extended warmup (20 epochs)
- Frequent checkpointing

**Expected Time**: ~2-4 hours

---

## CONFIGURATION OPTIONS

### Basic Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--epochs` | 100 | Number of training epochs |
| `--batch-size` | 32 | Batch size for training |
| `--lr` | 0.001 | Learning rate |
| `--weight-decay` | 1e-5 | L2 regularization |

### Optimization Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--mixed-precision` | True | Use FP16/FP32 mixed precision |
| `--use-ema` | True | Exponential moving average |
| `--gradient-accumulation` | 1 | Gradient accumulation steps |
| `--scheduler` | cosine | LR scheduler type |

### Hardware Options

| Option | Default | Description |
|--------|---------|-------------|
| `--device` | auto | Device (cuda/cpu/mps) |
| `--num-workers` | 4 | Data loading workers |
| `--pin-memory` | True | Pin memory for speed |

### Checkpointing

| Option | Default | Description |
|--------|---------|-------------|
| `--checkpoint-dir` | checkpoints | Checkpoint directory |
| `--save-interval` | 5 | Save every N epochs |
| `--keep-best` | True | Keep best model |

---

## EXAMPLE WORKFLOWS

### Workflow 1: First-Time User

```bash
# 1. Run quick start script
./quick_start_training.sh

# 2. Select "Quick training" (option 1)

# 3. Wait for completion

# 4. View results
cat training_report.json | python -m json.tool
```

### Workflow 2: Development Training

```bash
# 1. Quick test run
python run_complete_training.py --mode quick

# 2. If successful, run standard training
python run_complete_training.py --mode standard --epochs 50

# 3. Monitor progress
tail -f logs/nexus_training_*.log

# 4. Check results
cat training_report.json | python -m json.tool
```

### Workflow 3: Production Training

```bash
# 1. Pre-flight check
python run_complete_training.py --mode quick --skip-checks

# 2. Full production training
python run_complete_training.py --mode full

# 3. Monitor GPU usage (in another terminal)
watch -n 1 nvidia-smi

# 4. After completion, evaluate best model
python -c "
import torch
checkpoint = torch.load('checkpoints/checkpoint_epoch_200.pt')
print(f'Best model from epoch {checkpoint[\"epoch\"]}')
"
```

### Workflow 4: Custom Experimentation

```bash
# 1. Test different learning rates
python advanced_training_launcher.py --epochs 20 --lr 0.001
python advanced_training_launcher.py --epochs 20 --lr 0.0001
python advanced_training_launcher.py --epochs 20 --lr 0.01

# 2. Compare results
cat training_report.json | grep -A 5 "val_accuracy"
```

---

## MONITORING TRAINING

### Real-Time Monitoring

**View Logs**:
```bash
tail -f logs/nexus_training_*.log
```

**GPU Usage** (NVIDIA):
```bash
watch -n 1 nvidia-smi
```

**System Resources**:
```bash
top
# or
htop
```

### After Training

**View Report**:
```bash
cat training_report.json | python -m json.tool
```

**Check Checkpoints**:
```bash
ls -lh checkpoints/
```

**View Training History**:
```python
import json
report = json.load(open('training_report.json'))
print(f"Final Accuracy: {report['training_history']['val_accuracy'][-1]}")
print(f"Final Loss: {report['training_history']['val_loss'][-1]}")
```

---

## TROUBLESHOOTING

### Issue: "Module not found"

**Solution**:
```bash
pip install torch numpy pandas psutil
```

### Issue: "CUDA out of memory"

**Solution 1**: Reduce batch size
```bash
python run_complete_training.py --mode standard --batch-size 16
```

**Solution 2**: Use gradient accumulation
```bash
python advanced_training_launcher.py \
    --batch-size 8 \
    --gradient-accumulation 4
```

**Solution 3**: Use CPU
```bash
python run_complete_training.py --mode standard --device cpu
```

### Issue: "Training is slow"

**Solution 1**: Enable mixed precision
```bash
python run_complete_training.py --mode standard --mixed-precision
```

**Solution 2**: Increase workers
```bash
python advanced_training_launcher.py --num-workers 8
```

**Solution 3**: Use GPU
```bash
python run_complete_training.py --mode standard --device cuda
```

### Issue: "Training unstable"

**Solution 1**: Lower learning rate
```bash
python advanced_training_launcher.py --lr 0.0001
```

**Solution 2**: Enable EMA
```bash
python advanced_training_launcher.py --use-ema --ema-decay 0.999
```

**Solution 3**: Increase warmup
```bash
python advanced_training_launcher.py --warmup-epochs 10
```

---

## OUTPUT FILES

### Training Report (`training_report.json`)

Contains:
- Complete training history
- Memory statistics
- Performance metrics
- Configuration used

### Checkpoints (`checkpoints/`)

Saved models:
- `checkpoint_epoch_N.pt` - Model at epoch N
- Contains: model state, optimizer state, epoch number

### Logs (`logs/`)

Training logs:
- `nexus_training_YYYYMMDD_HHMMSS.log`
- Detailed execution log
- All print statements and errors

---

## NEXT STEPS AFTER TRAINING

### 1. Load Trained Model

```python
import torch
from advanced_training_launcher import create_model

# Load checkpoint
checkpoint = torch.load('checkpoints/checkpoint_epoch_50.pt')

# Create model (same architecture)
model = create_model(input_dim=10, num_classes=2)

# Load weights
model.load_state_dict(checkpoint['model_state'])
model.eval()
```

### 2. Evaluate Model

```python
import torch
import numpy as np

# Test data
X_test = np.random.randn(100, 10).astype(np.float32)
X_test_tensor = torch.FloatTensor(X_test)

# Predictions
with torch.no_grad():
    logits = model(X_test_tensor)
    predictions = logits.argmax(dim=1)
```

### 3. Deploy Model

**TorchScript**:
```python
model.eval()
traced = torch.jit.trace(model, torch.randn(1, 10))
traced.save('model.pt')
```

**ONNX**:
```python
torch.onnx.export(
    model,
    torch.randn(1, 10),
    'model.onnx'
)
```

---

## BEST PRACTICES

### 1. Start Small
- Begin with quick mode to verify setup
- Gradually increase complexity

### 2. Monitor Resources
- Watch GPU/CPU usage during first run
- Adjust batch size based on available memory

### 3. Use Checkpoints
- Enable automatic checkpointing
- Save frequently for long training runs

### 4. Enable Optimizations
- Always use mixed precision (if GPU available)
- Enable EMA for better generalization
- Use learning rate scheduling

### 5. Track Experiments
- Save training reports
- Document configuration changes
- Compare results systematically

---

## COMMON COMMANDS REFERENCE

```bash
# Quick start
./quick_start_training.sh

# Quick test
python run_complete_training.py --mode quick

# Standard training
python run_complete_training.py --mode standard

# Custom training
python advanced_training_launcher.py --epochs 100 --batch-size 64

# View results
cat training_report.json | python -m json.tool

# Monitor logs
tail -f logs/nexus_training_*.log

# Check checkpoints
ls -lh checkpoints/

# GPU monitoring
watch -n 1 nvidia-smi
```

---

## ADDITIONAL RESOURCES

- **Training Guide**: `docs/TRAINING_GUIDE.md` - Complete training documentation
- **Production Training**: `docs/PRODUCTION_TRAINING_GUIDE.md` - Advanced features
- **Advanced Launcher**: `docs/ADVANCED_TRAINING_LAUNCHER_GUIDE.md` - CLI options
- **Module Documentation**: `docs/MODULES.md` - All available modules

---

## FAQ

**Q: Which mode should I use?**
A: Start with `quick` to verify setup, then use `standard` for development, `advanced` for production, and `full` for final models.

**Q: How long does training take?**
A: Quick: ~1-2 min, Standard: ~5-10 min, Advanced: ~20-30 min, Full: ~2-4 hours (depends on hardware).

**Q: Can I stop and resume training?**
A: Yes, checkpoints are saved automatically. Load the checkpoint and continue training.

**Q: What if I don't have a GPU?**
A: Use `--device cpu`. Training will be slower but works fine for smaller models.

**Q: How do I know if training is working?**
A: Check the logs (`tail -f logs/*.log`) and watch for decreasing loss values.

---

## SUPPORT

For issues or questions:
1. Check troubleshooting section above
2. Review training logs in `logs/`
3. Check training report in `training_report.json`
4. See additional documentation in `docs/`

---

*Last Updated: 2024*  
*Version: 2.0*



