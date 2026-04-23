#!/usr/bin/env python3
"""
CYRUS Desktop Application
A GUI interface for the CYRUS AI System
"""

import tkinter as tk
from tkinter import scrolledtext, messagebox, filedialog
import threading
import sys
import os
import logging
import argparse

# Add server directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server'))

class CYRUSDesktopApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CYRUS AI System - Desktop Edition")
        self.root.geometry("800x600")

        # Initialize core system
        self.core = None

        # Create GUI elements first
        self.create_widgets()

        # Setup logging to GUI
        self.setup_logging()

        # Now initialize core
        self.initialize_core()

    def initialize_core(self):
        """Initialize the CYRUS core system."""
        try:
            # Setup environment like main.py
            if not self.setup_environment():
                messagebox.showerror("Error", "Failed to setup environment")
                sys.exit(1)

            # Import and initialize quantum AI core
            from quantum_ai.quantum_ai_core import QuantumAICore

            # Create core instance
            self.core = QuantumAICore(
                response_format='scientific',
                include_equations=True,
                equation_format='latex',
                writing_style='professional'
            )

            self.log_message("✅ CYRUS AI System initialized successfully!")
            return True

        except Exception as e:
            self.log_message(f"❌ Failed to initialize core: {e}")
            messagebox.showerror("Initialization Error", f"Failed to initialize CYRUS core: {e}")
            return False

    def setup_environment(self):
        """Setup environment directories and check dependencies."""
        try:
            # Create necessary directories
            directories = [
                'logs', 'data', 'models', 'cache', 'generated_images',
                'generated_robotics_content', 'training_results', 'deployment_results'
            ]

            for dir_name in directories:
                os.makedirs(dir_name, exist_ok=True)

            # Check if we're in a virtual environment
            if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
                self.log_message("⚠️  Warning: Not running in a virtual environment")

            return True

        except Exception as e:
            self.log_message(f"❌ Environment setup failed: {e}")
            return False

    def create_widgets(self):
        """Create the GUI widgets."""
        # Main frame
        main_frame = tk.Frame(self.root)
        main_frame.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)

        # Output text area
        self.output_text = scrolledtext.ScrolledText(main_frame, wrap=tk.WORD, height=20)
        self.output_text.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        self.output_text.config(state=tk.DISABLED)

        # Input frame
        input_frame = tk.Frame(main_frame)
        input_frame.pack(fill=tk.X)

        # Input field
        self.input_entry = tk.Entry(input_frame, font=("Arial", 12))
        self.input_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.input_entry.bind("<Return>", self.send_message)

        # Send button
        self.send_button = tk.Button(input_frame, text="Send", command=self.send_message, width=10)
        self.send_button.pack(side=tk.RIGHT, padx=(5, 0))

        # Command buttons frame
        cmd_frame = tk.Frame(main_frame)
        cmd_frame.pack(fill=tk.X, pady=(10, 0))

        # Common command buttons
        commands = [
            ("PLC Detect", "plc detect"),
            ("Search", "search "),
            ("Help", "help"),
            ("Clear", "clear")
        ]

        for cmd_text, cmd_prefix in commands:
            btn = tk.Button(cmd_frame, text=cmd_text,
                          command=lambda p=cmd_prefix: self.set_command_prefix(p))
            btn.pack(side=tk.LEFT, padx=(0, 5))

        # Status bar
        self.status_label = tk.Label(main_frame, text="Ready", anchor=tk.W)
        self.status_label.pack(fill=tk.X, pady=(5, 0))

    def setup_logging(self):
        """Setup logging to redirect to GUI."""
        class GUITextHandler(logging.Handler):
            def __init__(self, text_widget):
                super().__init__()
                self.text_widget = text_widget

            def emit(self, record):
                msg = self.format(record)
                self.text_widget.after(0, self._append_message, f"[LOG] {msg}\n")

            def _append_message(self, msg):
                self.text_widget.config(state=tk.NORMAL)
                self.text_widget.insert(tk.END, msg)
                self.text_widget.see(tk.END)
                self.text_widget.config(state=tk.DISABLED)

        # Remove existing handlers
        for handler in logging.root.handlers[:]:
            logging.root.removeHandler(handler)

        # Add our GUI handler
        gui_handler = GUITextHandler(self.output_text)
        gui_handler.setFormatter(logging.Formatter('%(levelname)s: %(message)s'))
        logging.root.addHandler(gui_handler)
        logging.root.setLevel(logging.INFO)

    def log_message(self, message):
        """Log a message to the output area."""
        self.output_text.after(0, self._append_message, message + "\n")

    def _append_message(self, message):
        """Append message to output text (called from main thread)."""
        self.output_text.config(state=tk.NORMAL)
        self.output_text.insert(tk.END, message)
        self.output_text.see(tk.END)
        self.output_text.config(state=tk.DISABLED)

    def set_command_prefix(self, prefix):
        """Set a command prefix in the input field."""
        if prefix == "clear":
            self.clear_output()
        else:
            self.input_entry.delete(0, tk.END)
            self.input_entry.insert(0, prefix)
            self.input_entry.focus()

    def clear_output(self):
        """Clear the output text area."""
        self.output_text.config(state=tk.NORMAL)
        self.output_text.delete(1.0, tk.END)
        self.output_text.config(state=tk.DISABLED)

    def send_message(self, event=None):
        """Send a message to CYRUS."""
        if not self.core:
            messagebox.showerror("Error", "CYRUS core not initialized")
            return

        user_input = self.input_entry.get().strip()
        if not user_input:
            return

        # Clear input
        self.input_entry.delete(0, tk.END)

        # Display user input
        self.log_message(f"You: {user_input}")

        # Update status
        self.status_label.config(text="Processing...")

        # Process in background thread
        threading.Thread(target=self.process_message, args=(user_input,), daemon=True).start()

    def process_message(self, user_input):
        """Process the user message in a background thread."""
        try:
            # Handle special commands
            if user_input.lower() in ['help', 'h', '?']:
                self.show_help()
            elif user_input.lower().startswith('search '):
                query = user_input[7:].strip()
                result = self.core.web_search(query)
                response = f"Search Results: {len(result.get('results', []))} found\n"
                for i, res in enumerate(result.get('results', [])[:5], 1):
                    response += f"{i}. {res.get('title', 'No title')}\n"
                self.log_message(f"CYRUS: {response}")
            elif user_input.lower().startswith('plc '):
                self.handle_plc_command(user_input[4:])
            else:
                # Default: companion assistance
                result = self.core.companion_assist(user_input)
                response = result.get('response', 'I apologize, I encountered an issue processing your request.')
                self.log_message(f"CYRUS: {response}")

        except Exception as e:
            self.log_message(f"Error: {e}")
        finally:
            self.status_label.config(text="Ready")

    def handle_plc_command(self, plc_args):
        """Handle PLC-related commands."""
        parts = plc_args.split()
        if not parts:
            self.log_message("Usage: plc <command> [args]")
            return

        command = parts[0].lower()

        if command == 'detect':
            controller = self.core.device_controller
            if controller:
                devices = controller.detect_plc_devices()
                if devices:
                    response = "Detected PLC devices:\n"
                    for i, device in enumerate(devices, 1):
                        response += f"  {i}. {device.get('manufacturer', 'Unknown')} - {device.get('protocol', 'Unknown')}\n"
                        response += f"     Type: {device.get('type')}\n"
                        if 'port' in device:
                            response += f"     Port: {device['port']}\n"
                        if 'vendor_id' in device:
                            response += f"     VID:PID: {device['vendor_id']:04x}:{device['product_id']:04x}\n"
                else:
                    response = "No PLC devices detected"
            else:
                response = "Device controller not available"
        elif command == 'connect':
            # Simplified connect - would need more UI for full functionality
            response = "PLC connect command - use CLI for full functionality"
        else:
            response = f"Unknown PLC command: {command}"

        self.log_message(f"CYRUS: {response}")

    def show_help(self):
        """Show help information."""
        help_text = """
Available Commands:
  help          - Show this help message
  search <query> - Perform web search
  plc detect    - Detect available PLC devices
  plc connect   - Connect to PLC (use CLI for full options)
  clear         - Clear output

Or simply type any message for AI assistance!
        """
        self.log_message(help_text)

def main():
    """Main entry point for desktop app."""
    # Setup basic logging
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

    # Create root window
    root = tk.Tk()

    # Create app
    app = CYRUSDesktopApp(root)

    # Start main loop
    root.mainloop()

if __name__ == "__main__":
    main()