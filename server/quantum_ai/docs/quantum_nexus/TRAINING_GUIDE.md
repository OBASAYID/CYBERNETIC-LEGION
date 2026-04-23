# QUANTUM INTELLIGENCE NEXUS v2.0 - TRAINING GUIDE

Complete guide for training models with the Quantum Intelligence Nexus production training system.

---

## Quick Start (3 Steps)

### Step 1: Install Dependencies
```bash
pip install torch numpy pandas psutil tensorboard
```

### Step 2: Run Default Training
```bash
python production_training_system.py
```

### Step 3: View Results
```bash
cat training_report.json
tail -f logs/*.log
```

---

## Quick Start Script

For the easiest experience, use the interactive quick start script:

```bash
./quick_start_training.sh
```

This script will:
- ✅ Check your Python environment
- ✅ Verify PyTorch installation
- ✅ Install missing dependencies
- ✅ Guide you through training mode selection
- ✅ Run training with optimal settings

---

## Advanced Training Options

### Custom Configuration
```bash
python advanced_training_launcher.py \
    --epochs 200 \
    --batch-size 64 \
    --lr 0.0001 \
    --mixed-precision \
    --use-ema \
    --device cuda
```

### Training Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `--epochs` | 100 | Number of training epochs |
| `--batch-size` | 32 | Batch size |
| `--lr` | 0.001 | Learning rate |
| `--weight-decay` | 1e-5 | L2 regularization |
| `--mixed-precision` | True | Use float16 for memory efficiency |
| `--gradient-accumulation` | 1 | Accumulation steps |
| `--use-ema` | True | Exponential moving average |
| `--ema-decay` | 0.999 | EMA decay rate |
| `--scheduler` | cosine | LR scheduler (cosine/linear/exponential) |
| `--warmup-epochs` | 5 | Warmup epochs |
| `--dropout` | 0.1 | Dropout rate |
| `--label-smoothing` | 0.1 | Label smoothing |
| `--device` | auto | Computing device (cuda/cpu/mps) |
| `--num-workers` | 4 | Data loading workers |
| `--checkpoint-dir` | checkpoints | Checkpoint directory |
| `--save-interval` | 5 | Save every N epochs |
| `--seed` | 42 | Random seed |

### Complete Parameter List

View all available options:
```bash
python advanced_training_launcher.py --help
```

---

## Monitoring Training

### Real-time Logs
```bash
# Follow training logs
tail -f logs/nexus_training_*.log

# View latest log
ls -t logs/*.log | head -1 | xargs tail -f
```

### Training Report
```bash
# After training completes
cat training_report.json | python -m json.tool

# Or use jq (if installed)
cat training_report.json | jq .
```

### GPU Memory Monitoring (In another terminal)
```bash
# NVIDIA GPUs
watch -n 1 nvidia-smi

# macOS (MPS)
# Use Activity Monitor or system_profiler
```

### CPU/System Monitoring
```bash
# Monitor CPU and memory
top

# Or use htop (if installed)
htop
```

---

## Best Practices

### 1. Mixed Precision Training
**Benefits**: Reduces memory by 50%, speeds up training by 2-3x

```bash
python advanced_training_launcher.py --mixed-precision
```

**When to use**: Always recommended for GPU training (automatic fallback to FP32 if needed)

### 2. Gradient Accumulation
**Benefits**: Simulate larger batches with limited VRAM

```bash
# Effective batch size = 16 * 4 = 64
python advanced_training_launcher.py \
    --batch-size 16 \
    --gradient-accumulation 4
```

**When to use**: When you want larger effective batch size but have memory constraints

### 3. EMA (Exponential Moving Average)
**Benefits**: Stabilizes training, often improves generalization

```bash
python advanced_training_launcher.py \
    --use-ema \
    --ema-decay 0.999
```

**When to use**: Recommended for all training runs

### 4. Checkpointing
**Benefits**: Automatic saving every N epochs for recovery

```bash
python advanced_training_launcher.py \
    --save-interval 10 \
    --keep-best
```

**When to use**: Always enabled by default

### 5. Memory Monitoring
**Benefits**: Tracks GPU/CPU usage throughout training

Automatically enabled - check `training_report.json` for memory stats

### 6. Learning Rate Scheduling
**Benefits**: Better convergence, improved final performance

```bash
python advanced_training_launcher.py \
    --scheduler cosine \
    --warmup-epochs 10
```

**When to use**: Recommended for longer training runs (50+ epochs)

---

## Troubleshooting

### Out of Memory (OOM)

**Solution 1: Reduce batch size**
```bash
python advanced_training_launcher.py --batch-size 16
```

**Solution 2: Enable gradient accumulation**
```bash
python advanced_training_launcher.py \
    --batch-size 8 \
    --gradient-accumulation 8
```

**Solution 3: Use mixed precision**
```bash
python advanced_training_launcher.py \
    --batch-size 16 \
    --mixed-precision
```

**Solution 4: Reduce model size**
Modify model architecture in `advanced_training_launcher.py`

### Slow Training

**Solution 1: Increase workers**
```bash
python advanced_training_launcher.py --num-workers 8
```

**Solution 2: Use mixed precision**
```bash
python advanced_training_launcher.py --mixed-precision
```

**Solution 3: Use GPU**
```bash
python advanced_training_launcher.py --device cuda
```

**Solution 4: Increase batch size (if memory allows)**
```bash
python advanced_training_launcher.py --batch-size 64
```

### GPU Not Detected

**Check CUDA availability:**
```bash
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}')"
```

**Check MPS availability (macOS):**
```bash
python -c "import torch; print(f'MPS available: {hasattr(torch.backends, \"mps\") and torch.backends.mps.is_available()}')"
```

**Fall back to CPU:**
```bash
python advanced_training_launcher.py --device cpu
```

### Training Instability

**Solution 1: Lower learning rate**
```bash
python advanced_training_launcher.py --lr 0.0001
```

**Solution 2: Enable EMA**
```bash
python advanced_training_launcher.py --use-ema --ema-decay 0.999
```

**Solution 3: Use gradient clipping**
```bash
# Gradient clipping is enabled by default (value: 1.0)
# Adjust in production_training_system.py if needed
```

**Solution 4: Increase warmup**
```bash
python advanced_training_launcher.py --warmup-epochs 10
```

### Checkpoint Loading Issues

**Verify checkpoint exists:**
```bash
ls -lh checkpoints/
```

**Check checkpoint format:**
```python
import torch
checkpoint = torch.load('checkpoints/checkpoint_epoch_10.pt')
print(checkpoint.keys())
```

---

## Performance Metrics

### Expected Training Time

| Model Size | Samples | Epochs | GPU Time | CPU Time |
|------------|---------|--------|----------|----------|
| Small | 10K | 50 | ~1 min | ~5 min |
| Medium | 100K | 50 | ~10 min | ~1 hour |
| Large | 1M | 50 | ~2 hours | ~10 hours |

*Times are approximate and depend on hardware*

### Memory Usage

| Configuration | GPU Memory | CPU Memory |
|---------------|------------|------------|
| Batch 32, FP32 | 4-8 GB | 2-4 GB |
| Batch 32, FP16 | 2-4 GB | 2-4 GB |
| Batch 64, FP32 | 8-16 GB | 3-5 GB |
| Batch 64, FP16 | 4-8 GB | 3-5 GB |

*Memory usage depends on model size and data*

### Throughput

| Device | Samples/sec | Notes |
|--------|-------------|-------|
| Modern GPU (RTX 3090) | 3000-5000 | With mixed precision |
| Older GPU (GTX 1080) | 1000-2000 | With mixed precision |
| CPU (8 cores) | 100-500 | Single-threaded |
| MPS (M1/M2) | 500-1500 | Apple Silicon |

---

## Output Files

After training completes:

```
├── training_report.json          # Comprehensive training report
├── checkpoints/
│   ├── checkpoint_epoch_5.pt     # Model checkpoints
│   ├── checkpoint_epoch_10.pt
│   ├── checkpoint_epoch_15.pt
│   └── ...
└── logs/
    └── nexus_training_YYYYMMDD_HHMMSS.log  # Detailed logs
```

### Training Report Structure

```json
{
  "timestamp": "2024-02-10T19:30:00",
  "config": {
    "batch_size": 32,
    "epochs": 50,
    "learning_rate": 0.001,
    ...
  },
  "training_history": {
    "train_loss": [0.5, 0.4, 0.3, ...],
    "val_loss": [0.6, 0.5, 0.4, ...],
    "val_accuracy": [0.7, 0.8, 0.9, ...]
  },
  "memory_stats": {
    "peak_gpu_memory_gb": 2.5,
    "avg_cpu_percent": 45.2
  },
  "performance_metrics": {
    "epoch_time": {...},
    "batch_time": {...}
  },
  "total_steps": 5000,
  "total_epochs": 50
}
```

---

## Next Steps

### 1. Load Trained Model

```python
import torch
from advanced_training_launcher import create_model

# Load checkpoint
checkpoint = torch.load('checkpoints/checkpoint_epoch_50.pt')

# Create model (same architecture as training)
model = create_model(input_dim=10, num_classes=2)

# Load weights
model.load_state_dict(checkpoint['model_state'])
model.eval()

print(f"Loaded model from epoch {checkpoint['epoch']}")
```

### 2. Evaluate Model

```python
import torch
import numpy as np

# Prepare test data
X_test = np.random.randn(100, 10).astype(np.float32)
X_test_tensor = torch.FloatTensor(X_test)

# Evaluate
model.eval()
with torch.no_grad():
    logits = model(X_test_tensor)
    predictions = logits.argmax(dim=1)
    
print(f"Predictions shape: {predictions.shape}")
```

### 3. Deploy Model

**Option A: TorchScript**
```python
# Save as TorchScript
model.eval()
traced_model = torch.jit.trace(model, torch.randn(1, 10))
traced_model.save('model.pt')

# Load and use
loaded_model = torch.jit.load('model.pt')
```

**Option B: ONNX**
```python
# Export to ONNX
torch.onnx.export(
    model,
    torch.randn(1, 10),
    'model.onnx',
    input_names=['input'],
    output_names=['output']
)
```

**Option C: Deploy with TorchServe**
```bash
# See TorchServe documentation for deployment
```

---

## FAQ

### Q: Why is training slow?
**A**: Check GPU usage with `nvidia-smi` or Activity Monitor. If GPU memory is full, reduce batch size. If GPU utilization is low, increase batch size or number of workers.

### Q: Can I resume training from checkpoint?
**A**: Yes! Checkpoint loading is supported. See the "Next Steps" section for code examples.

### Q: How do I use multiple GPUs?
**A**: Use `torch.nn.DataParallel` or `DistributedDataParallel`. For advanced multi-GPU training, see the production training system source code.

### Q: What's the best learning rate?
**A**: Start with 0.001 for Adam/AdamW optimizer. Adjust based on loss curves:
- Loss not decreasing: Lower learning rate (0.0001)
- Loss decreasing too slowly: Increase learning rate (0.01)
- Loss unstable: Lower learning rate and enable EMA

### Q: Should I use mixed precision?
**A**: Yes, if you have a GPU that supports it (most modern GPUs). It reduces memory usage and speeds up training with minimal accuracy loss.

### Q: What's the difference between EMA and regular training?
**A**: EMA maintains a smoothed version of model weights, which often leads to better generalization. The final model uses EMA weights, which are typically more stable.

### Q: How often should I save checkpoints?
**A**: Depends on training time:
- Short training (< 1 hour): Every 5-10 epochs
- Medium training (1-10 hours): Every 10-20 epochs
- Long training (> 10 hours): Every 20-50 epochs

### Q: Can I train on CPU?
**A**: Yes, use `--device cpu`. Training will be slower but works fine for smaller models and datasets.

### Q: How do I monitor training progress?
**A**: 
- Real-time: `tail -f logs/nexus_training_*.log`
- After training: `cat training_report.json | python -m json.tool`
- GPU usage: `watch -n 1 nvidia-smi` (NVIDIA) or Activity Monitor (macOS)

---

## Additional Resources

- **Production Training System**: `docs/PRODUCTION_TRAINING_GUIDE.md`
- **Advanced Training Launcher**: `docs/ADVANCED_TRAINING_LAUNCHER_GUIDE.md`
- **Comprehensive Training Framework**: `docs/COMPREHENSIVE_TRAINING_INTEGRATION_GUIDE.md`
- **Module Documentation**: `docs/MODULES.md`

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the training logs in `logs/`
3. Check the training report in `training_report.json`
4. See additional documentation in `docs/`

---

*Last Updated: 2024*  
*Version: 2.0*



