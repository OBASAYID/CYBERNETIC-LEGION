#!/usr/bin/env python3
"""
CYRUS AI System - Main Entry Point

This is the primary entry point for the CYRUS AI system, providing
access to all quantum AI capabilities and super-intelligent processing.
"""

import sys
import os
import argparse
import logging
from pathlib import Path
from typing import Optional

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('cyrus.log', mode='a')
    ]
)
logger = logging.getLogger(__name__)

def setup_environment():
    """Setup the runtime environment."""
    try:
        # Ensure required directories exist
        required_dirs = ['logs', 'data', 'models', 'cache']
        for dir_name in required_dirs:
            Path(dir_name).mkdir(exist_ok=True)

        # Check for virtual environment
        if not hasattr(sys, 'real_prefix') and not (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix):
            logger.warning("Not running in a virtual environment. Consider using one for better isolation.")

        logger.info("Environment setup completed successfully")
        return True

    except Exception as e:
        logger.error(f"Environment setup failed: {e}")
        return False

def initialize_core_systems():
    """Initialize core AI systems."""
    try:
        # Import and initialize quantum AI core
        from server.quantum_ai.quantum_ai_core import QuantumAICore

        # Create core instance
        core = QuantumAICore(
            response_format='scientific',
            include_equations=True,
            equation_format='latex',
            writing_style='professional'
        )

        logger.info("Quantum AI Core initialized successfully")
        return core

    except ImportError as e:
        logger.error(f"Failed to import required modules: {e}")
        logger.error("Please ensure all dependencies are installed: pip install -r requirements.txt")
        return None
    except Exception as e:
        logger.error(f"Core system initialization failed: {e}")
        return None

def run_interactive_mode(core):
    """Run interactive mode for direct user interaction."""
    print("\n🤖 CYRUS AI System - Interactive Mode")
    print("=" * 50)
    print("Type 'help' for commands, 'quit' to exit")
    print()

    while True:
        try:
            user_input = input("CYRUS> ").strip()

            if not user_input:
                continue

            if user_input.lower() in ['quit', 'exit', 'q']:
                print("Goodbye! 👋")
                break

            if user_input.lower() in ['help', 'h', '?']:
                show_help()
                continue

            if user_input.lower().startswith('search '):
                query = user_input[7:].strip()
                result = core.web_search(query)
                print(f"Search Results: {len(result.get('results', []))} found")
                for i, res in enumerate(result.get('results', [])[:3], 1):
                    print(f"{i}. {res.get('title', 'No title')}")
                continue

            if user_input.lower().startswith('plc '):
                # Parse PLC command
                parts = user_input[4:].split()
                if len(parts) >= 1:
                    plc_command = parts[0].lower()
                    if plc_command == 'connect':
                        if len(parts) >= 2:
                            connection_type = parts[1].lower()
                            if connection_type in ['tcp', 'modbus_tcp']:
                                # TCP connection: plc connect tcp <ip> [port]
                                if len(parts) >= 3:
                                    ip = parts[2]
                                    port = int(parts[3]) if len(parts) > 3 else 502
                                    result = core.connect_to_device('plc', {'type': 'modbus_tcp', 'ip': ip, 'port': port})
                                    print(f"PLC TCP Connection: {result.get('status', 'unknown')}")
                                else:
                                    print("Usage: plc connect tcp <ip> [port]")
                            elif connection_type in ['serial', 'usb_serial', 'modbus_rtu']:
                                # Serial/USB connection: plc connect serial <port> [baudrate]
                                if len(parts) >= 3:
                                    port = parts[2]
                                    baudrate = int(parts[3]) if len(parts) > 3 else 9600
                                    protocol = 'modbus_rtu' if connection_type == 'modbus_rtu' else 'usb_serial'
                                    result = core.connect_to_device('plc', {
                                        'type': protocol,
                                        'port': port,
                                        'baudrate': baudrate
                                    })
                                    print(f"PLC Serial Connection: {result.get('status', 'unknown')}")
                                else:
                                    print("Usage: plc connect serial <port> [baudrate]")
                            elif connection_type == 'usb':
                                # Direct USB connection: plc connect usb <vendor_id> <product_id>
                                if len(parts) >= 4:
                                    vendor_id = int(parts[2], 16) if parts[2].startswith('0x') else int(parts[2])
                                    product_id = int(parts[3], 16) if parts[3].startswith('0x') else int(parts[3])
                                    result = core.connect_to_device('plc', {
                                        'type': 'usb_direct',
                                        'vendor_id': vendor_id,
                                        'product_id': product_id
                                    })
                                    print(f"PLC USB Direct Connection: {result.get('status', 'unknown')}")
                                else:
                                    print("Usage: plc connect usb <vendor_id> <product_id>")
                            elif connection_type in ['siemens', 's7']:
                                # Siemens S7: plc connect siemens <port>
                                if len(parts) >= 3:
                                    port = parts[2]
                                    result = core.connect_to_device('plc', {
                                        'type': 'siemens_s7',
                                        'port': port
                                    })
                                    print(f"PLC Siemens S7 Connection: {result.get('status', 'unknown')}")
                                else:
                                    print("Usage: plc connect siemens <port>")
                            elif connection_type in ['allen_bradley', 'ab', 'df1']:
                                # Allen-Bradley DF1: plc connect allen_bradley <port>
                                if len(parts) >= 3:
                                    port = parts[2]
                                    result = core.connect_to_device('plc', {
                                        'type': 'allen_bradley_df1',
                                        'port': port
                                    })
                                    print(f"PLC Allen-Bradley DF1 Connection: {result.get('status', 'unknown')}")
                                else:
                                    print("Usage: plc connect allen_bradley <port>")
                            else:
                                # Legacy format: assume IP connection
                                ip = parts[1]
                                port = int(parts[2]) if len(parts) > 2 else 502
                                result = core.connect_to_device('plc', {'type': 'modbus_tcp', 'ip': ip, 'port': port})
                                print(f"PLC Connection: {result.get('status', 'unknown')}")
                        else:
                            print("Usage: plc connect <type> <parameters>")
                            print("Types: tcp, serial, usb, siemens, allen_bradley")
                    elif plc_command == 'detect':
                        # Detect available PLC devices
                        controller = core.device_controller
                        if controller:
                            devices = controller.detect_plc_devices()
                            if devices:
                                print("Detected PLC devices:")
                                for i, device in enumerate(devices, 1):
                                    print(f"  {i}. {device.get('manufacturer', 'Unknown')} - {device.get('protocol', 'Unknown')}")
                                    print(f"     Type: {device.get('type')}")
                                    if 'port' in device:
                                        print(f"     Port: {device['port']}")
                                    if 'vendor_id' in device:
                                        print(f"     VID:PID: {device['vendor_id']:04x}:{device['product_id']:04x}")
                            else:
                                print("No PLC devices detected")
                        else:
                            print("Device controller not available")
                    elif plc_command == 'program':
                        if len(parts) >= 2:
                            program_type = parts[1]
                            result = core.generate_plc_program(program_type, ' '.join(parts[2:]) if len(parts) > 2 else '')
                            print(f"PLC Program Generation: {result.get('status', 'unknown')}")
                            if 'program' in result:
                                print("Generated Program:")
                                print(result['program'])
                        else:
                            print("Usage: plc program <type> [description]")
                    elif plc_command == 'read':
                        if len(parts) >= 3:
                            device_id = parts[1]
                            address = int(parts[2])
                            count = int(parts[3]) if len(parts) > 3 else 1
                            result = core.read_plc_data(device_id, address, count)
                            print(f"PLC Read: {result}")
                        else:
                            print("Usage: plc read <device_id> <address> [count]")
                    elif plc_command == 'write':
                        if len(parts) >= 4:
                            device_id = parts[1]
                            address = int(parts[2])
                            values = [int(x) for x in parts[3:]]
                            result = core.write_plc_data(device_id, address, values)
                            print(f"PLC Write: {result}")
                        else:
                            print("Usage: plc write <device_id> <address> <value1> [value2] ...")
                    else:
                        print("Available PLC commands: connect, program, read, write")
                else:
                    print("Usage: plc <command> [args]")
                continue

            # Default: companion assistance
            result = core.companion_assist(user_input)
            print(f"CYRUS: {result.get('response', 'I apologize, I encountered an issue processing your request.')}")

        except KeyboardInterrupt:
            print("\nGoodbye! 👋")
            break
        except Exception as e:
            logger.error(f"Interactive mode error: {e}")
            print("I encountered an error. Please try again.")

def show_help():
    """Show available commands."""
    print("\nAvailable Commands:")
    print("  help          - Show this help message")
    print("  search <query> - Perform web search")
    print("  device <type> <config> - Connect to device")
    print("  plc connect tcp <ip> [port] - Connect to PLC via TCP/IP")
    print("  plc connect serial <port> [baud] - Connect to PLC via USB serial")
    print("  plc connect usb <vid> <pid> - Connect to PLC via direct USB")
    print("  plc connect siemens <port> - Connect to Siemens S7 PLC")
    print("  plc connect allen_bradley <port> - Connect to Allen-Bradley PLC")
    print("  plc detect - Detect available PLC devices")
    print("  plc program <type> [desc] - Generate PLC program")
    print("  plc read <id> <addr> [cnt] - Read PLC data")
    print("  plc write <id> <addr> <val> - Write PLC data")
    print("  quit          - Exit interactive mode")
    print()
    print("Or simply type any message for AI assistance!")

def run_batch_mode(core, input_file: str, output_file: Optional[str] = None):
    """Run batch processing mode."""
    try:
        with open(input_file, 'r') as f:
            inputs = [line.strip() for line in f if line.strip()]

        results = []
        for i, user_input in enumerate(inputs, 1):
            print(f"Processing {i}/{len(inputs)}: {user_input[:50]}...")
            result = core.companion_assist(user_input)
            results.append({
                'input': user_input,
                'response': result.get('response', ''),
                'intent': result.get('intent_detected', ''),
                'emotion': result.get('emotion_detected', '')
            })

        # Save results
        output_path = output_file or f"batch_results_{int(__import__('time').time())}.json"
        with open(output_path, 'w') as f:
            __import__('json').dump(results, f, indent=2)

        print(f"Batch processing completed. Results saved to {output_path}")

    except FileNotFoundError:
        logger.error(f"Input file not found: {input_file}")
    except Exception as e:
        logger.error(f"Batch processing failed: {e}")

def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="CYRUS AI System")
    parser.add_argument('--mode', choices=['interactive', 'batch'],
                       default='interactive', help='Operation mode')
    parser.add_argument('--input', help='Input file for batch mode')
    parser.add_argument('--output', help='Output file for batch mode')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')

    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    print("🚀 Starting CYRUS AI System...")
    print("=" * 50)

    # Setup environment
    if not setup_environment():
        sys.exit(1)

    # Initialize core systems
    core = initialize_core_systems()
    if not core:
        logger.error("Failed to initialize core systems. Exiting.")
        sys.exit(1)

    print("✅ CYRUS AI System ready!")
    print(f"Mode: {args.mode}")
    print()

    try:
        if args.mode == 'interactive':
            run_interactive_mode(core)
        elif args.mode == 'batch':
            if not args.input:
                logger.error("Input file required for batch mode")
                sys.exit(1)
            run_batch_mode(core, args.input, args.output)

    except Exception as e:
        logger.error(f"System error: {e}")
        sys.exit(1)

    print("\n👋 CYRUS AI System shutdown complete.")

if __name__ == "__main__":
    main()
