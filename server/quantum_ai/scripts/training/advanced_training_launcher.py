# advanced_training_launcher.py
"""
ADVANCED TRAINING LAUNCHER
Easy-to-use interface for training Quantum Intelligence Nexus
"""

import argparse
import torch
import numpy as np
from pathlib import Path
from production_training_system import TrainingConfig, TrainingEngine, logger

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(
        description="Train Quantum Intelligence Nexus v2.0",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic training
  python advanced_training_launcher.py --epochs 50 --batch-size 32

  # Training with custom data size
  python advanced_training_launcher.py --train-size 10000 --feature-dim 20

  # Training on CPU
  python advanced_training_launcher.py --device cpu

  # Training with gradient accumulation
  python advanced_training_launcher.py --batch-size 16 --gradient-accumulation 4
        """
    )
    
    # Training parameters
    parser.add_argument('--epochs', type=int, default=100,
                       help='Number of training epochs (default: 100)')
    parser.add_argument('--batch-size', type=int, default=32,
                       help='Batch size for training (default: 32)')
    parser.add_argument('--lr', type=float, default=0.001,
                       help='Learning rate (default: 0.001)')
    parser.add_argument('--weight-decay', type=float, default=1e-5,
                       help='Weight decay (default: 1e-5)')
    
    # Optimization
    parser.add_argument('--mixed-precision', action='store_true', default=True,
                       help='Use mixed precision training (default: True)')
    parser.add_argument('--no-mixed-precision', dest='mixed_precision', action='store_false',
                       help='Disable mixed precision training')
    parser.add_argument('--gradient-accumulation', type=int, default=1,
                       help='Gradient accumulation steps (default: 1)')
    parser.add_argument('--use-ema', action='store_true', default=True,
                       help='Use exponential moving average (default: True)')
    parser.add_argument('--no-ema', dest='use_ema', action='store_false',
                       help='Disable exponential moving average')
    parser.add_argument('--ema-decay', type=float, default=0.999,
                       help='EMA decay rate (default: 0.999)')
    
    # Learning rate schedule
    parser.add_argument('--scheduler', type=str, default='cosine',
                       choices=['cosine', 'linear', 'exponential'],
                       help='Learning rate scheduler type (default: cosine)')
    parser.add_argument('--warmup-epochs', type=int, default=5,
                       help='Warmup epochs for scheduler (default: 5)')
    
    # Regularization
    parser.add_argument('--dropout', type=float, default=0.1,
                       help='Dropout rate (default: 0.1)')
    parser.add_argument('--label-smoothing', type=float, default=0.1,
                       help='Label smoothing (default: 0.1)')
    
    # Data
    parser.add_argument('--train-size', type=int, default=5000,
                       help='Training data size (default: 5000)')
    parser.add_argument('--feature-dim', type=int, default=10,
                       help='Feature dimension (default: 10)')
    parser.add_argument('--num-classes', type=int, default=2,
                       help='Number of classes (default: 2)')
    parser.add_argument('--validation-split', type=float, default=0.2,
                       help='Validation split ratio (default: 0.2)')
    
    # Hardware
    parser.add_argument('--device', type=str, default=None,
                       choices=['cuda', 'cpu', 'mps'],
                       help='Device to use (default: auto-detect)')
    parser.add_argument('--num-workers', type=int, default=4,
                       help='Number of data loading workers (default: 4)')
    parser.add_argument('--pin-memory', action='store_true', default=True,
                       help='Pin memory for faster data transfer (default: True)')
    
    # Checkpointing
    parser.add_argument('--checkpoint-dir', type=str, default='checkpoints',
                       help='Checkpoint directory (default: checkpoints)')
    parser.add_argument('--save-interval', type=int, default=5,
                       help='Save checkpoint every N epochs (default: 5)')
    parser.add_argument('--keep-best', action='store_true', default=True,
                       help='Keep best model checkpoint (default: True)')
    
    # Reproducibility
    parser.add_argument('--seed', type=int, default=42,
                       help='Random seed (default: 42)')
    parser.add_argument('--deterministic', action='store_true', default=True,
                       help='Use deterministic operations (default: True)')
    
    # Output
    parser.add_argument('--report-path', type=str, default='training_report.json',
                       help='Path to save training report (default: training_report.json)')
    parser.add_argument('--verbose', action='store_true',
                       help='Verbose output')
    
    return parser.parse_args()


def auto_detect_device() -> str:
    """Auto-detect best available device"""
    if torch.cuda.is_available():
        return 'cuda'
    elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        return 'mps'
    else:
        return 'cpu'


def create_model(input_dim: int, num_classes: int, dropout: float = 0.1) -> torch.nn.Module:
    """Create neural network model"""
    return torch.nn.Sequential(
        torch.nn.Linear(input_dim, 256),
        torch.nn.ReLU(),
        torch.nn.Dropout(dropout),
        torch.nn.Linear(256, 128),
        torch.nn.ReLU(),
        torch.nn.Dropout(dropout),
        torch.nn.Linear(128, 64),
        torch.nn.ReLU(),
        torch.nn.Dropout(dropout),
        torch.nn.Linear(64, 32),
        torch.nn.ReLU(),
        torch.nn.Linear(32, num_classes)
    )


def generate_data(train_size: int, feature_dim: int, num_classes: int, 
                  validation_split: float = 0.2, seed: int = 42):
    """Generate synthetic training data"""
    np.random.seed(seed)
    
    X_train = np.random.randn(train_size, feature_dim).astype(np.float32)
    y_train = np.random.randint(0, num_classes, train_size)
    
    # Validation set
    val_size = int(validation_split * train_size)
    X_val = np.random.randn(val_size, feature_dim).astype(np.float32)
    y_val = np.random.randint(0, num_classes, val_size)
    
    return X_train, y_train, X_val, y_val


def main():
    """Main execution"""
    args = parse_arguments()
    
    print("\n" + "="*80)
    print("QUANTUM INTELLIGENCE NEXUS v2.0 - ADVANCED TRAINING LAUNCHER")
    print("="*80 + "\n")
    
    # Auto-detect device if not specified
    if args.device is None:
        args.device = auto_detect_device()
    
    # Display configuration
    print("Configuration:")
    print(f"  Device: {args.device}")
    print(f"  Epochs: {args.epochs}")
    print(f"  Batch Size: {args.batch_size}")
    print(f"  Learning Rate: {args.lr}")
    print(f"  Weight Decay: {args.weight_decay}")
    print(f"  Mixed Precision: {args.mixed_precision}")
    print(f"  Gradient Accumulation: {args.gradient_accumulation}")
    print(f"  EMA: {args.use_ema}")
    if args.use_ema:
        print(f"  EMA Decay: {args.ema_decay}")
    print(f"  Scheduler: {args.scheduler}")
    print(f"  Warmup Epochs: {args.warmup_epochs}")
    print(f"  Dropout: {args.dropout}")
    print(f"  Label Smoothing: {args.label_smoothing}")
    print(f"  Data: {args.train_size} samples, {args.feature_dim} features, {args.num_classes} classes")
    print(f"  Validation Split: {args.validation_split}")
    print(f"  Workers: {args.num_workers}")
    print(f"  Checkpoint Dir: {args.checkpoint_dir}")
    print(f"  Save Interval: {args.save_interval} epochs")
    print(f"  Seed: {args.seed}")
    print()
    
    # Create config
    config = TrainingConfig(
        batch_size=args.batch_size,
        epochs=args.epochs,
        learning_rate=args.lr,
        weight_decay=args.weight_decay,
        use_mixed_precision=args.mixed_precision,
        gradient_accumulation_steps=args.gradient_accumulation,
        use_ema=args.use_ema,
        ema_decay=args.ema_decay,
        device=args.device,
        num_workers=args.num_workers,
        pin_memory=args.pin_memory,
        scheduler_type=args.scheduler,
        warmup_epochs=args.warmup_epochs,
        dropout=args.dropout,
        label_smoothing=args.label_smoothing,
        validation_split=args.validation_split,
        checkpoint_dir=args.checkpoint_dir,
        save_every_n_epochs=args.save_interval,
        keep_best_model=args.keep_best,
        seed=args.seed,
        deterministic=args.deterministic
    )
    
    # Generate data
    print("Generating training data...")
    X_train, y_train, X_val, y_val = generate_data(
        args.train_size,
        args.feature_dim,
        args.num_classes,
        args.validation_split,
        args.seed
    )
    print(f"✓ Data generated:")
    print(f"    Train: {X_train.shape}, Labels: {y_train.shape}")
    print(f"    Val: {X_val.shape}, Labels: {y_val.shape}")
    print()
    
    # Create model
    print("Creating model...")
    model = create_model(args.feature_dim, args.num_classes, args.dropout)
    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    print(f"✓ Model created:")
    print(f"    Total Parameters: {total_params:,}")
    print(f"    Trainable Parameters: {trainable_params:,}")
    print()
    
    # Create trainer
    print("Initializing trainer...")
    trainer = TrainingEngine(model, config)
    print("✓ Trainer initialized")
    print()
    
    # Train
    print("Starting training...\n")
    print("="*80)
    report = trainer.train(X_train, y_train, X_val, y_val)
    print("="*80)
    
    # Save report
    import json
    report_path = Path(args.report_path)
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=2, default=str)
    
    print(f"\n✓ Training report saved to {report_path}")
    
    # Display summary
    print("\n" + "="*80)
    print("TRAINING SUMMARY")
    print("="*80)
    print(f"Total Epochs: {report['total_epochs']}")
    print(f"Total Steps: {report['total_steps']}")
    
    if 'val_accuracy' in report['training_history']:
        final_acc = report['training_history']['val_accuracy'][-1]
        print(f"Final Validation Accuracy: {final_acc:.4f}")
    
    if 'val_loss' in report['training_history']:
        final_loss = report['training_history']['val_loss'][-1]
        print(f"Final Validation Loss: {final_loss:.4f}")
    
    memory_stats = report['memory_stats']
    print(f"Peak GPU Memory: {memory_stats['peak_gpu_memory_gb']:.2f} GB")
    print(f"Average CPU Usage: {memory_stats['avg_cpu_percent']:.1f}%")
    
    if 'epoch_time' in report['performance_metrics']:
        avg_epoch_time = report['performance_metrics']['epoch_time']['mean']
        print(f"Average Epoch Time: {avg_epoch_time:.2f} seconds")
    
    print("="*80)
    print("\n✓ TRAINING COMPLETE!")
    print(f"✓ Checkpoints saved to: {args.checkpoint_dir}/")
    print(f"✓ Report saved to: {report_path}")


if __name__ == "__main__":
    main()



