#!/usr/bin/env python3
"""
CYRUS Humanoid Intelligence - Interactive Runner
=================================================
Command-line interface for interacting with CYRUS.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from cyrus_core import CYRUS, Mode
from cyrus_core.core import CYRUSConfig


def print_banner():
    """Print the CYRUS startup banner."""
    banner = """
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║   ██████╗██╗   ██╗██████╗ ██╗   ██╗███████╗                          ║
║  ██╔════╝╚██╗ ██╔╝██╔══██╗██║   ██║██╔════╝                          ║
║  ██║      ╚████╔╝ ██████╔╝██║   ██║███████╗                          ║
║  ██║       ╚██╔╝  ██╔══██╗██║   ██║╚════██║                          ║
║  ╚██████╗   ██║   ██║  ██║╚██████╔╝███████║                          ║
║   ╚═════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚══════╝                          ║
║                                                                       ║
║   HUMANOID INTELLIGENCE CORE v3.0 (OMEGA-TIER)                       ║
║   Cybernetic Yielding Robust Unified System                          ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝
"""
    print(banner)


def print_help():
    """Print help information."""
    help_text = """
CYRUS COMMAND REFERENCE
========================

Mode Commands:
  mode casual        - Switch to casual conversation mode
  mode professional  - Switch to professional mode
  mode presentation  - Switch to presentation mode
  mode qa            - Switch to Q&A mode
  mode <mode> lock   - Lock to a specific mode

System Commands:
  /status            - Display system status
  /memory            - Show memory context
  /clear             - Clear conversation history
  /history           - Show recent conversation
  /help              - Show this help

General:
  exit / quit        - Shutdown CYRUS
  help               - Show this help

CYRUS is a humanoid-grade AI system designed for natural human interaction.
Speak naturally - CYRUS will understand and respond accordingly.
"""
    print(help_text)


def run_interactive():
    """Run CYRUS in interactive mode."""
    print_banner()
    
    config = CYRUSConfig(
        enable_timing_simulation=True,
        enable_auto_mode_switching=True,
        verbose_output=False,
        default_mode=Mode.CASUAL,
    )
    
    cyrus = CYRUS(config)
    
    print(f"System initialized in {cyrus.mode.value.upper()} mode.")
    print("Type 'help' for commands or speak naturally to begin.")
    print("-" * 60)
    print()
    
    while True:
        try:
            user_input = input("You: ").strip()
            
            if not user_input:
                continue
            
            if user_input.lower() in {"exit", "quit", "shutdown"}:
                print("\nCYRUS: Understood. Shutting down. Stay strategic.\n")
                break
            
            if user_input.lower() == "help":
                print_help()
                continue
            
            result = cyrus.process_input(user_input)
            
            print(f"\nCYRUS: {result.response}\n")
            
            if result.mode_changed:
                print(f"[Mode changed to {result.mode_used.value.upper()}]")
                print()
            
        except KeyboardInterrupt:
            print("\n\nCYRUS: Session interrupted. Shutting down gracefully.\n")
            break
        except EOFError:
            print("\n\nCYRUS: End of input. Signing off.\n")
            break
        except Exception as e:
            print(f"\nCYRUS: I encountered an issue: {e}")
            print("Let me continue. Please try again.\n")
    
    status = cyrus.get_status()
    print(f"Session Summary: {status['interaction_count']} interactions over {status['session_duration_seconds']:.0f} seconds.")


def run_single(message: str) -> str:
    """Run CYRUS with a single message and return response."""
    config = CYRUSConfig(
        enable_timing_simulation=False,
        enable_auto_mode_switching=True,
        verbose_output=False,
    )
    
    cyrus = CYRUS(config)
    result = cyrus.process_input(message)
    return result.response


def main():
    """Main entry point."""
    if len(sys.argv) > 1:
        message = " ".join(sys.argv[1:])
        response = run_single(message)
        print(response)
    else:
        run_interactive()


if __name__ == "__main__":
    main()
