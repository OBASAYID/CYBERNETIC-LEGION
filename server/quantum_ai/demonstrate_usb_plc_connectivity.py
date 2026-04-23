#!/usr/bin/env python3
"""
CYRUS USB PLC Detection Demonstration

This script demonstrates the new USB PLC connectivity capabilities added to CYRUS,
including device enumeration, detection, and connection setup.
"""

import sys
import os
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from server.quantum_ai.device_controller import CYRUSDeviceController

def demonstrate_usb_detection():
    """Demonstrate USB device detection capabilities."""
    print("🔌 CYRUS USB PLC Detection Demonstration")
    print("=" * 50)

    controller = CYRUSDeviceController()

    # Check capabilities
    print("📋 System Capabilities:")
    print(f"   USB Serial Support: {controller.capabilities.get('usb_serial', False)}")
    print(f"   USB Direct Support: {controller.capabilities.get('usb_direct', False)}")
    print(f"   Modbus TCP Support: {controller.capabilities.get('plc_modbus', False)}")
    print()

    # Enumerate USB devices
    print("🔍 Enumerating Connected USB Devices...")
    usb_devices = controller.enumerate_usb_devices()
    print(f"   Found {len(usb_devices)} USB devices:")

    if usb_devices:
        for i, dev in enumerate(usb_devices, 1):
            vid = dev.get('vendor_id', 0)
            pid = dev.get('product_id', 0)
            manufacturer = dev.get('manufacturer', 'Unknown')
            product = dev.get('product', 'Unknown')
            print(f"   {i}. {vid:04x}:{pid:04x} - {manufacturer} {product}")
    else:
        print("   No USB devices found")
    print()

    # Enumerate serial ports
    print("🔌 Enumerating Available Serial Ports...")
    serial_ports = controller.enumerate_serial_ports()
    print(f"   Found {len(serial_ports)} serial ports:")

    if serial_ports:
        for i, port in enumerate(serial_ports, 1):
            device = port.get('device', 'Unknown')
            description = port.get('description', 'Unknown')
            manufacturer = port.get('manufacturer', 'Unknown')
            print(f"   {i}. {device} - {description} ({manufacturer})")
    else:
        print("   No serial ports found")
    print()

    # Detect potential PLC devices
    print("🤖 Detecting Potential PLC Devices...")
    detected_plc_devices = controller.detect_plc_devices()
    print(f"   Found {len(detected_plc_devices)} potential PLC devices:")

    if detected_plc_devices:
        for i, plc_dev in enumerate(detected_plc_devices, 1):
            plc_type = plc_dev.get('type', 'Unknown')
            manufacturer = plc_dev.get('manufacturer', 'Unknown')
            protocol = plc_dev.get('protocol', 'Unknown')
            print(f"   {i}. {manufacturer} - {protocol} ({plc_type})")

            if 'port' in plc_dev:
                print(f"      Port: {plc_dev['port']}")
            if 'vendor_id' in plc_dev:
                print(f"      VID:PID: {plc_dev['vendor_id']:04x}:{plc_dev['product_id']:04x}")
    else:
        print("   No PLC devices automatically detected")
    print()

def demonstrate_usb_connection():
    """Demonstrate USB PLC connection setup."""
    print("🔗 USB PLC Connection Demonstration")
    print("=" * 40)

    controller = CYRUSDeviceController()

    # Example connections (these will fail gracefully if devices don't exist)
    print("📡 Attempting example USB connections...")

    # USB Serial connection example
    print("\n1. Testing USB Serial Connection (Modbus RTU):")
    result = controller.connect_plc({
        'type': 'usb_serial',
        'port': '/dev/ttyUSB0',  # Common Linux USB serial port
        'baudrate': 9600,
        'protocol': 'modbus_rtu'
    })
    print(f"   Result: {result.get('status', 'failed')} - {result.get('error', 'Success')}")

    # Direct USB connection example
    print("\n2. Testing Direct USB Connection:")
    result = controller.connect_plc({
        'type': 'usb_direct',
        'vendor_id': 0x0908,  # Example Siemens VID
        'product_id': 0x0001   # Example Siemens PID
    })
    print(f"   Result: {result.get('status', 'failed')} - {result.get('error', 'Success')}")

    # Siemens S7 example
    print("\n3. Testing Siemens S7 Connection:")
    result = controller.connect_plc({
        'type': 'siemens_s7',
        'port': '/dev/ttyUSB0'
    })
    print(f"   Result: {result.get('status', 'failed')} - {result.get('error', 'Success')}")

    print("\n✅ USB PLC connectivity framework is ready!")
    print("   Connect real PLC devices to test actual communication.")

if __name__ == "__main__":
    demonstrate_usb_detection()
    demonstrate_usb_connection()