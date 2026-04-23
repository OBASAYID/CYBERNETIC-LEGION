#!/usr/bin/env python3
"""
Pylance Import Test Script
This script tests all imports used in device_controller.py to verify Pylance configuration.
"""

def test_imports():
    """Test all problematic imports that Pylance was complaining about."""

    print("Testing Pylance import resolution...")

    # Test standard library imports
    try:
        import sys, os, time, logging
        from typing import Dict, List, Any, Optional
        from datetime import datetime
        print("✅ Standard library imports: OK")
    except ImportError as e:
        print(f"❌ Standard library imports failed: {e}")

    # Test pymodbus
    try:
        import pymodbus
        from pymodbus.client import ModbusTcpClient
        print("✅ pymodbus imports: OK")
    except ImportError as e:
        print(f"❌ pymodbus imports failed: {e}")

    # Test pyserial
    try:
        import serial
        import serial.tools.list_ports
        print("✅ pyserial imports: OK")
    except ImportError as e:
        print(f"❌ pyserial imports failed: {e}")

    # Test pyusb
    try:
        import usb.core
        import usb.util
        print("✅ pyusb imports: OK")
    except ImportError as e:
        print(f"❌ pyusb imports failed: {e}")

    # Test paho-mqtt
    try:
        import paho.mqtt.client as mqtt
        from paho.mqtt.enums import CallbackAPIVersion
        print("✅ paho-mqtt imports: OK")
    except ImportError as e:
        print(f"❌ paho-mqtt imports failed: {e}")

    # Test device controller
    try:
        from server.quantum_ai.device_controller import CYRUSDeviceController
        controller = CYRUSDeviceController()
        print("✅ CYRUSDeviceController: OK")
        print(f"   Capabilities: {controller.capabilities}")
    except ImportError as e:
        print(f"❌ CYRUSDeviceController import failed: {e}")

    print("\nImport testing completed!")

if __name__ == "__main__":
    test_imports()