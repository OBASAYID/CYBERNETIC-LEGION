#!/usr/bin/env python3
"""
CYRUS PLC Programming Demonstration

This script demonstrates CYRUS's advanced PLC programming and control capabilities,
showcasing the ability to generate programs in multiple IEC 61131-3 languages and
interface with PLC controllers for industrial automation.
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from server.quantum_ai.quantum_ai_core import QuantumAICore

def demonstrate_plc_programming():
    """Demonstrate PLC program generation capabilities."""
    print("🤖 CYRUS PLC Programming Demonstration")
    print("=" * 50)

    core = QuantumAICore()

    # Demonstrate different PLC programming languages
    program_types = [
        ('ladder', 'Motor control with start/stop and emergency stop'),
        ('structured_text', 'PID temperature control system'),
        ('function_block', 'Conveyor belt sequencing logic'),
        ('instruction_list', 'Basic I/O mapping and control'),
        ('sequential', 'Batch process control with steps')
    ]

    for prog_type, description in program_types:
        print(f"\n📝 Generating {prog_type.upper()} program: {description}")
        print("-" * 40)

        result = core.generate_plc_program(prog_type, description)

        if result.get('status') == 'generated':
            print(f"✅ Generated {result.get('language')} program")
            print("📄 Program Preview:")
            program_lines = result.get('program', '').split('\n')[:10]  # First 10 lines
            for line in program_lines:
                print(f"   {line}")
            if len(result.get('program', '').split('\n')) > 10:
                print("   ... (program continues)")

            # Save program to file
            filename = f"generated_plc_{prog_type}.plc"
            with open(filename, 'w') as f:
                f.write(result.get('program', ''))
            print(f"💾 Program saved to: {filename}")
        else:
            print(f"❌ Failed to generate program: {result.get('error', 'Unknown error')}")

def demonstrate_plc_connectivity():
    """Demonstrate PLC connectivity capabilities."""
    print("\n🔌 PLC Connectivity Demonstration")
    print("=" * 40)

    core = QuantumAICore()

    # Test connection to a PLC (will show connection preparation)
    plc_config = {
        'ip': '192.168.1.100',
        'port': 502,
        'timeout': 5
    }

    print("Attempting to connect to PLC at 192.168.1.100:502...")
    result = core.connect_to_device('plc', plc_config)

    if result.get('status') == 'ready_to_connect':
        print("✅ PLC connection prepared successfully")
        print(f"📡 IP: {result.get('ip')}")
        print(f"🔌 Port: {result.get('port')}")
        print(f"⚙️ Protocol: {result.get('protocol')}")
        print(f"🛠️ Capabilities: {', '.join(result.get('capabilities', []))}")
        print(f"💻 Connection Command: {result.get('connection_command')}")
    else:
        print(f"❌ Connection failed: {result.get('error', 'Unknown error')}")

def demonstrate_plc_data_operations():
    """Demonstrate PLC data read/write operations."""
    print("\n📊 PLC Data Operations Demonstration")
    print("=" * 40)

    core = QuantumAICore()

    print("Note: Data operations require a connected PLC device.")
    print("This demonstration shows the interface capabilities.")

    # Simulate read operation (will fail gracefully)
    print("\nReading from PLC register 40001...")
    result = core.read_plc_data('demo_plc', 40001, 5)
    if result.get('error'):
        print(f"Expected result (no device connected): {result.get('error')}")
    else:
        print(f"Read values: {result.get('values', [])}")

    # Simulate write operation (will fail gracefully)
    print("\nWriting to PLC register 40001...")
    result = core.write_plc_data('demo_plc', 40001, [123, 456, 789])
    if result.get('error'):
        print(f"Expected result (no device connected): {result.get('error')}")
    else:
        print("Write operation successful")

def show_plc_capabilities_summary():
    """Show summary of PLC capabilities."""
    print("\n🎯 CYRUS PLC Capabilities Summary")
    print("=" * 40)

    capabilities = [
        "✅ PLC Program Generation in IEC 61131-3 Languages:",
        "   • Ladder Logic (LD)",
        "   • Structured Text (ST)",
        "   • Function Block Diagram (FBD)",
        "   • Instruction List (IL)",
        "   • Sequential Function Chart (SFC)",
        "",
        "✅ PLC Connectivity & Control:",
        "   • Modbus TCP/IP protocol support",
        "   • Real-time data reading/writing",
        "   • Device status monitoring",
        "   • Connection management",
        "",
        "✅ Industrial Automation Features:",
        "   • Motor control systems",
        "   • Process control logic",
        "   • Safety interlock systems",
        "   • Sequential operation control",
        "   • PID control algorithms",
        "",
        "✅ Integration with Robotics:",
        "   • PLC-robot communication",
        "   • Coordinated motion control",
        "   • Sensor integration",
        "   • Safety system coordination"
    ]

    for capability in capabilities:
        print(capability)

def main():
    """Main demonstration function."""
    try:
        demonstrate_plc_programming()
        demonstrate_plc_connectivity()
        demonstrate_plc_data_operations()
        show_plc_capabilities_summary()

        print("\n🎉 CYRUS PLC Integration Demonstration Complete!")
        print("\nTo use PLC features interactively:")
        print("1. Run: python main.py")
        print("2. Use commands like:")
        print("   • plc connect 192.168.1.100 502")
        print("   • plc program ladder motor control")
        print("   • plc read plc_192.168.1.100_502 40001 5")

    except Exception as e:
        print(f"❌ Demonstration failed: {e}")
        return 1

    return 0

if __name__ == "__main__":
    sys.exit(main())