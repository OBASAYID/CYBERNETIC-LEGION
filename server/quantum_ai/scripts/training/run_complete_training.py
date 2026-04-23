# run_complete_training.py
"""
COMPLETE TRAINING EXECUTION SCRIPT
Runs the entire Quantum Intelligence Nexus training pipeline
"""

import sys
import os
import subprocess
import argparse
from pathlib import Path
from datetime import datetime

def print_banner(text):
    """Print formatted banner"""
    width = 80
    print("\n" + "="*width)
    print(text.center(width))
    print("="*width + "\n")

def check_dependencies():
    """Check if required files exist"""
    required_files = [
        'production_training_system.py',
        'advanced_training_launcher.py'
    ]
    
    missing = []
    for file in required_files:
        if not Path(file).exists():
            missing.append(file)
    
    if missing:
        print("❌ Missing required files:")
        for file in missing:
            print(f"   - {file}")
        return False
    
    return True

def check_python_packages():
    """Check if required Python packages are installed"""
    required_packages = ['torch', 'numpy', 'pandas', 'psutil']
    missing = []
    
    for package in required_packages:
        try:
            __import__(package)
        except ImportError:
            missing.append(package)
    
    if missing:
        print("⚠️  Missing Python packages:")
        for package in missing:
            print(f"   - {package}")
        print("\nInstall with: pip install " + " ".join(missing))
        return False
    
    return True

def main():
    parser = argparse.ArgumentParser(
        description="Run complete Quantum Intelligence Nexus training pipeline",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Quick test run
  python run_complete_training.py --mode quick

  # Standard training
  python run_complete_training.py --mode standard --epochs 50

  # Advanced training with custom settings
  python run_complete_training.py --mode advanced --epochs 100 --batch-size 64

  # Full production training
  python run_complete_training.py --mode full
        """
    )
    
    parser.add_argument('--mode', choices=['quick', 'standard', 'advanced', 'full'],
                       default='standard', help='Training mode (default: standard)')
    parser.add_argument('--epochs', type=int, default=50, help='Number of epochs (default: 50)')
    parser.add_argument('--batch-size', type=int, default=32, help='Batch size (default: 32)')
    parser.add_argument('--lr', type=float, default=0.001, help='Learning rate (default: 0.001)')
    parser.add_argument('--device', type=str, choices=['cuda', 'cpu', 'mps'],
                       default=None, help='Device to use (default: auto-detect)')
    parser.add_argument('--skip-checks', action='store_true',
                       help='Skip dependency checks')
    parser.add_argument('--verbose', action='store_true',
                       help='Verbose output')
    
    args = parser.parse_args()
    
    print_banner("QUANTUM INTELLIGENCE NEXUS v2.0 - COMPLETE TRAINING")
    
    # Pre-flight checks
    if not args.skip_checks:
        print("Running pre-flight checks...")
        
        if not check_dependencies():
            print("\n❌ Dependency check failed!")
            sys.exit(1)
        
        if not check_python_packages():
            print("\n⚠️  Some packages are missing. Training may fail.")
            response = input("Continue anyway? (y/n): ")
            if response.lower() != 'y':
                sys.exit(1)
        
        print("✓ All checks passed\n")
    
    # Mode configurations
    modes = {
        'quick': {
            'epochs': 10,
            'batch_size': 64,
            'lr': 0.001,
            'description': 'Quick test run (10 epochs)',
            'flags': ['--mixed-precision', '--use-ema']
        },
        'standard': {
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'lr': args.lr,
            'description': f'Standard training ({args.epochs} epochs)',
            'flags': ['--mixed-precision', '--use-ema', '--scheduler', 'cosine']
        },
        'advanced': {
            'epochs': args.epochs,
            'batch_size': args.batch_size,
            'lr': args.lr,
            'description': f'Advanced training with all optimizations ({args.epochs} epochs)',
            'flags': [
                '--mixed-precision',
                '--use-ema',
                '--ema-decay', '0.999',
                '--scheduler', 'cosine',
                '--warmup-epochs', '10',
                '--gradient-accumulation', '1',
                '--keep-best'
            ]
        },
        'full': {
            'epochs': 200,
            'batch_size': 128,
            'lr': 0.0001,
            'description': 'Full production training (200 epochs)',
            'flags': [
                '--mixed-precision',
                '--use-ema',
                '--ema-decay', '0.9999',
                '--scheduler', 'cosine',
                '--warmup-epochs', '20',
                '--gradient-accumulation', '2',
                '--keep-best',
                '--save-interval', '10',
                '--deterministic'
            ]
        }
    }
    
    mode_config = modes[args.mode]
    
    # Override with command-line arguments if provided
    if args.epochs != 50 or args.mode == 'standard':
        mode_config['epochs'] = args.epochs
    if args.batch_size != 32 or args.mode == 'standard':
        mode_config['batch_size'] = args.batch_size
    if args.lr != 0.001 or args.mode == 'standard':
        mode_config['lr'] = args.lr
    
    print("Training Configuration:")
    print(f"  Mode: {args.mode.upper()}")
    print(f"  Description: {mode_config['description']}")
    print(f"  Epochs: {mode_config['epochs']}")
    print(f"  Batch Size: {mode_config['batch_size']}")
    print(f"  Learning Rate: {mode_config['lr']}")
    if args.device:
        print(f"  Device: {args.device}")
    print()
    
    # Build command
    cmd = [
        sys.executable, 'advanced_training_launcher.py',
        '--epochs', str(mode_config['epochs']),
        '--batch-size', str(mode_config['batch_size']),
        '--lr', str(mode_config['lr']),
    ]
    
    # Add mode-specific flags
    cmd.extend(mode_config['flags'])
    
    # Add device if specified
    if args.device:
        cmd.extend(['--device', args.device])
    
    # Add verbose if requested
    if args.verbose:
        cmd.append('--verbose')
    
    print("Executing training command:")
    print("  " + " ".join(cmd))
    print()
    print("="*80)
    print()
    
    # Record start time
    start_time = datetime.now()
    
    # Run training
    try:
        result = subprocess.run(cmd, check=False)
        
        # Record end time
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print()
        print("="*80)
        
        if result.returncode == 0:
            print_banner("TRAINING COMPLETED SUCCESSFULLY!")
            
            print(f"Training Duration: {duration/60:.2f} minutes ({duration:.2f} seconds)")
            print()
            print("Output Files:")
            
            # Check for output files
            if Path("training_report.json").exists():
                print("  ✓ training_report.json")
            
            log_files = list(Path("logs").glob("nexus_training_*.log"))
            if log_files:
                print(f"  ✓ logs/nexus_training_*.log ({len(log_files)} file(s))")
            
            checkpoint_files = list(Path("checkpoints").glob("checkpoint_epoch_*.pt"))
            if checkpoint_files:
                print(f"  ✓ checkpoints/checkpoint_epoch_*.pt ({len(checkpoint_files)} file(s))")
            
            print()
            print("Next Steps:")
            print("  1. View training report: cat training_report.json | python -m json.tool")
            print("  2. Check logs: tail -f logs/nexus_training_*.log")
            print("  3. Load checkpoint: See docs/TRAINING_GUIDE.md")
            
        else:
            print_banner("TRAINING FAILED!")
            print(f"Exit code: {result.returncode}")
            print()
            print("Troubleshooting:")
            print("  1. Check logs in logs/ directory")
            print("  2. Verify dependencies: pip install torch numpy pandas psutil")
            print("  3. Check GPU availability: python -c 'import torch; print(torch.cuda.is_available())'")
            print("  4. Try CPU mode: python run_complete_training.py --mode quick --device cpu")
            
            sys.exit(1)
            
    except KeyboardInterrupt:
        print()
        print("\n⚠️  Training interrupted by user")
        print("Partial results may be available in checkpoints/ directory")
        sys.exit(130)
    except Exception as e:
        print()
        print(f"\n❌ Error during training: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()



