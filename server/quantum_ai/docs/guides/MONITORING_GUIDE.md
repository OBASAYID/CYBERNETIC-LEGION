# Training Monitoring Guide

## Multi-Terminal Monitoring Setup

For real-time training monitoring, use these commands in separate terminals:

### Terminal 1: Watch Training Logs
```bash
# Watch most recent log file
tail -f logs/nexus_training_*.log

# Or watch all log files
tail -f logs/nexus_training_*.log | grep -E "(Epoch|Loss|Accuracy)"

# Or use the monitoring script
./monitor_training.sh 1
```

### Terminal 2: Monitor GPU/MPS (macOS)
```bash
# macOS doesn't have nvidia-smi, use MPS monitoring instead
./monitor_training.sh 2

# Or manually check MPS status
python3 -c "import torch; print('MPS Available:', torch.backends.mps.is_available())"

# Monitor system GPU activity (Activity Monitor)
open -a "Activity Monitor"
```

### Terminal 3: Check System Resources
```bash
# Use top (htop requires installation)
./monitor_training.sh 3

# Or use top directly
top -o cpu -n 20

# Or install htop via Homebrew
# brew install htop
# htop
```

## Quick Monitoring Commands

### Check Training Progress
```bash
# View latest checkpoint info
ls -lth checkpoints/ | head -5

# Check training report
cat training_report.json | python3 -m json.tool | grep -E "(epoch|loss|accuracy)" | tail -10
```

### Monitor System Resources
```bash
# CPU and Memory
top -l 1 | grep -E "(CPU usage|PhysMem)"

# Disk usage
df -h .

# Process monitoring
ps aux | grep python | grep -v grep
```

### MPS GPU Monitoring (macOS)
```bash
# Check MPS availability
python3 -c "import torch; print('MPS Available:', torch.backends.mps.is_available())"
```

## Using the Monitoring Script

The `monitor_training.sh` script provides easy access to all monitoring tools:

```bash
# Terminal 1: Logs
./monitor_training.sh 1

# Terminal 2: GPU/MPS
./monitor_training.sh 2

# Terminal 3: System Resources
./monitor_training.sh 3
```

## Alternative: Single Terminal Monitoring

If you prefer a single terminal with multiple panes, use `tmux`:

```bash
# Install tmux (if not installed)
brew install tmux

# Start tmux session
tmux new -s training

# Split panes:
# Ctrl+b then " to split horizontally
# Ctrl+b then % to split vertically

# In each pane, run:
# Pane 1: tail -f logs/nexus_training_*.log
# Pane 2: watch -n 1 'python3 -c "import torch; print(torch.backends.mps.is_available())"'
# Pane 3: top -o cpu
```

## macOS-Specific Notes

- **No nvidia-smi**: macOS uses MPS (Metal Performance Shaders), not CUDA
- **htop**: Not installed by default, use `top` or install via Homebrew
- **GPU Monitoring**: Use Activity Monitor or the MPS status check
- **Memory**: Use `vm_stat` or Activity Monitor for detailed memory info

## Real-Time Metrics

During training, you can also check:

```bash
# Training progress
tail -20 logs/nexus_training_*.log | grep "Epoch"

# Latest checkpoint
ls -lth checkpoints/ | head -1

# System load
uptime
```



