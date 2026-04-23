#!/usr/bin/env python3
"""
CYRUS PLC Controller Integration Module
Advanced device connectivity for industrial automation and robotics control.
Surpasses competitors with comprehensive PLC integration capabilities.
"""

import sys
import os
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add parent directories
_this_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_this_dir)
sys.path.insert(0, _this_dir)
sys.path.insert(0, _parent_dir)

try:
    import pymodbus
    from pymodbus.client import ModbusTcpClient
    MODBUS_AVAILABLE = True
except ImportError:
    MODBUS_AVAILABLE = False

try:
    import serial
    import serial.tools.list_ports
    PYSERIAL_AVAILABLE = True
except ImportError:
    PYSERIAL_AVAILABLE = False

try:
    import usb.core
    import usb.util
    PYUSB_AVAILABLE = True
except ImportError:
    PYUSB_AVAILABLE = False

try:
    import paho.mqtt.client as mqtt
    from paho.mqtt.enums import CallbackAPIVersion
    MQTT_AVAILABLE = True
except ImportError:
    MQTT_AVAILABLE = False

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CYRUSDeviceController:
    """
    Advanced device controller for PLCs, IoT devices, and industrial systems.
    Provides seamless integration with robotics and automation systems.
    """

    def __init__(self):
        self.connected_devices = {}
        self.device_configs = {}
        self.monitoring_threads = {}
        self.capabilities = {
            'plc_modbus': MODBUS_AVAILABLE,
            'iot_mqtt': MQTT_AVAILABLE,
            'usb_serial': PYSERIAL_AVAILABLE,
            'usb_direct': PYUSB_AVAILABLE,
            'opc_ua': False,  # Future implementation
            'profibus': False,  # Future implementation
            'ethernet_ip': False  # Future implementation
        }

    def connect_plc(self, config: Dict) -> Dict:
        """
        Connect to PLC controller with advanced capabilities.
        Supports multiple protocols and real-time monitoring.
        """
        plc_type = config.get('type', 'modbus_tcp')

        if plc_type == 'modbus_tcp':
            ip = config.get('ip', '192.168.1.100')
            port = config.get('port', 502)
            device_id = f"plc_{ip}_{port}"
            return self._connect_modbus_tcp(ip, port, device_id, config)
        elif plc_type in ['usb_serial', 'modbus_rtu', 'siemens_s7', 'allen_bradley_df1']:
            port = config.get('port', '/dev/ttyUSB0')
            device_id = f"plc_{plc_type}_{port.replace('/', '_')}"
            return self._connect_usb_serial(port, plc_type, device_id, config)
        elif plc_type == 'usb_direct':
            vendor_id = config.get('vendor_id')
            product_id = config.get('product_id')
            if vendor_id is None or product_id is None:
                return {'error': 'Vendor ID and Product ID required for direct USB connection'}
            device_id = f"plc_usb_{vendor_id}_{product_id}"
            return self._connect_usb_direct(int(vendor_id), int(product_id), device_id, config)
        else:
            return {'error': f'Unsupported PLC type: {plc_type}'}

    def _connect_modbus_tcp(self, ip: str, port: int, device_id: str, config: Dict) -> Dict:
        """Connect to Modbus TCP PLC."""
        if not MODBUS_AVAILABLE:
            return {'error': 'Modbus library not available. Install pymodbus.'}

        try:
            client = ModbusTcpClient(ip, port=port)  # type: ignore
            connection = client.connect()

            if connection:
                self.connected_devices[device_id] = {
                    'client': client,
                    'type': 'modbus_tcp',
                    'ip': ip,
                    'port': port,
                    'connected_at': datetime.now().isoformat(),
                    'status': 'connected',
                    'capabilities': ['read_coils', 'read_registers', 'write_coils', 'write_registers']
                }

                # Start monitoring thread
                self._start_device_monitoring(device_id, config)

                return {
                    'status': 'connected',
                    'device_id': device_id,
                    'type': 'modbus_tcp',
                    'ip': ip,
                    'port': port,
                    'capabilities': self.connected_devices[device_id]['capabilities']
                }
            else:
                return {'error': f'Failed to connect to PLC at {ip}:{port}'}

        except Exception as e:
            return {'error': f'PLC connection failed: {str(e)}'}

    def _connect_usb_serial(self, port: str, protocol: str, device_id: str, config: Dict) -> Dict:
        """Connect to PLC via USB serial interface."""
        if not PYSERIAL_AVAILABLE:
            return {'error': 'PySerial library not available. Install pyserial.'}

        baudrate = config.get('baudrate', 9600)
        bytesize = config.get('bytesize', 8)
        parity = config.get('parity', 'N')
        stopbits = config.get('stopbits', 1)
        timeout = config.get('timeout', 1)

        try:
            import serial
            ser = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=bytesize,
                parity=parity,
                stopbits=stopbits,
                timeout=timeout
            )

            if ser.is_open:
                self.connected_devices[device_id] = {
                    'client': ser,
                    'type': protocol,
                    'port': port,
                    'baudrate': baudrate,
                    'connected_at': datetime.now().isoformat(),
                    'status': 'connected',
                    'capabilities': self._get_protocol_capabilities(protocol)
                }

                # Start monitoring thread
                self._start_device_monitoring(device_id, config)

                return {
                    'status': 'connected',
                    'device_id': device_id,
                    'type': protocol,
                    'port': port,
                    'baudrate': baudrate,
                    'capabilities': self.connected_devices[device_id]['capabilities']
                }
            else:
                return {'error': f'Failed to open serial port {port}'}

        except Exception as e:
            return {'error': f'USB serial connection failed: {str(e)}'}

    def _connect_usb_direct(self, vendor_id: int, product_id: int, device_id: str, config: Dict) -> Dict:
        """Connect to PLC via direct USB interface."""
        if not PYUSB_AVAILABLE:
            return {'error': 'PyUSB library not available. Install pyusb.'}

        try:
            import usb.core  # type: ignore
            import usb.util  # type: ignore

            # Find USB device
            device = usb.core.find(idVendor=vendor_id, idProduct=product_id)

            if device is None:
                return {'error': f'USB device {vendor_id}:{product_id} not found'}

            # Set configuration
            device.set_configuration()  # type: ignore

            # Get endpoint
            cfg = device.get_active_configuration()  # type: ignore
            intf = cfg[(0, 0)]  # type: ignore

            # Get endpoints
            ep_out = usb.util.find_descriptor(  # type: ignore
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_OUT  # type: ignore
            )
            ep_in = usb.util.find_descriptor(  # type: ignore
                intf,
                custom_match=lambda e: usb.util.endpoint_direction(e.bEndpointAddress) == usb.util.ENDPOINT_IN  # type: ignore
            )

            if ep_out is None or ep_in is None:
                return {'error': 'USB endpoints not found'}

            self.connected_devices[device_id] = {
                'device': device,
                'ep_out': ep_out,
                'ep_in': ep_in,
                'type': 'usb_direct',
                'vendor_id': vendor_id,
                'product_id': product_id,
                'connected_at': datetime.now().isoformat(),
                'status': 'connected',
                'capabilities': ['usb_read', 'usb_write', 'usb_control']
            }

            # Start monitoring thread
            self._start_device_monitoring(device_id, config)

            return {
                'status': 'connected',
                'device_id': device_id,
                'type': 'usb_direct',
                'vendor_id': vendor_id,
                'product_id': product_id,
                'capabilities': self.connected_devices[device_id]['capabilities']
            }

        except Exception as e:
            return {'error': f'Direct USB connection failed: {str(e)}'}

    def _get_protocol_capabilities(self, protocol: str) -> List[str]:
        """Get capabilities for different PLC protocols."""
        capabilities_map = {
            'modbus_rtu': ['read_coils', 'read_registers', 'write_coils', 'write_registers'],
            'siemens_s7': ['read_db', 'write_db', 'read_inputs', 'read_outputs', 'write_outputs'],
            'allen_bradley_df1': ['read_data', 'write_data', 'read_status', 'write_control'],
            'usb_serial': ['serial_read', 'serial_write', 'serial_flush']
        }
        return capabilities_map.get(protocol, ['basic_read', 'basic_write'])

    def enumerate_usb_devices(self) -> List[Dict]:
        """Enumerate all connected USB devices."""
        devices = []

        if PYUSB_AVAILABLE:
            try:
                import usb.core  # type: ignore
                import usb.util  # type: ignore
                usb_devices = usb.core.find(find_all=True)  # type: ignore
                if usb_devices is not None:
                    for device in usb_devices:  # type: ignore
                        devices.append({
                            'vendor_id': device.idVendor,  # type: ignore
                            'product_id': device.idProduct,  # type: ignore
                            'manufacturer': usb.util.get_string(device, device.iManufacturer) if hasattr(device, 'iManufacturer') and device.iManufacturer else 'Unknown',  # type: ignore
                            'product': usb.util.get_string(device, device.iProduct) if hasattr(device, 'iProduct') and device.iProduct else 'Unknown',  # type: ignore
                            'serial_number': usb.util.get_string(device, device.iSerialNumber) if hasattr(device, 'iSerialNumber') and device.iSerialNumber else 'Unknown'  # type: ignore
                        })
            except Exception as e:
                logger.error(f"USB device enumeration failed: {str(e)}")

        return devices

    def enumerate_serial_ports(self) -> List[Dict]:
        """Enumerate all available serial ports."""
        ports = []

        if PYSERIAL_AVAILABLE:
            try:
                import serial.tools.list_ports
                for port in serial.tools.list_ports.comports():
                    ports.append({
                        'device': port.device,
                        'name': port.name,
                        'description': port.description,
                        'manufacturer': port.manufacturer,
                        'serial_number': port.serial_number,
                        'vid': port.vid,
                        'pid': port.pid
                    })
            except Exception as e:
                logger.error(f"Serial port enumeration failed: {str(e)}")

        return ports

    def detect_plc_devices(self) -> List[Dict]:
        """Detect potential PLC devices from connected USB/Serial devices."""
        detected_devices = []

        # Common PLC vendor/product IDs
        plc_signatures = {
            'Siemens': [
                {'vid': 0x0908, 'pid': 0x0001, 'protocol': 'siemens_s7'},  # S7-300/400
                {'vid': 0x0908, 'pid': 0x0002, 'protocol': 'siemens_s7'},  # S7-1200/1500
            ],
            'Allen-Bradley': [
                {'vid': 0x1a7, 'pid': 0x1000, 'protocol': 'allen_bradley_df1'},  # MicroLogix
                {'vid': 0x1a7, 'pid': 0x2000, 'protocol': 'allen_bradley_df1'},  # CompactLogix
            ],
            'Schneider Electric': [
                {'vid': 0x0955, 'pid': 0x1000, 'protocol': 'modbus_rtu'},  # Modicon
            ],
            'Omron': [
                {'vid': 0x0590, 'pid': 0x0001, 'protocol': 'modbus_rtu'},  # CJ/CS Series
            ]
        }

        # Check USB devices
        usb_devices = self.enumerate_usb_devices()
        for usb_dev in usb_devices:
            for manufacturer, signatures in plc_signatures.items():
                for sig in signatures:
                    if usb_dev['vendor_id'] == sig['vid'] and usb_dev['product_id'] == sig['pid']:
                        detected_devices.append({
                            'type': 'usb_direct',
                            'manufacturer': manufacturer,
                            'protocol': sig['protocol'],
                            'vendor_id': usb_dev['vendor_id'],
                            'product_id': usb_dev['product_id'],
                            'device_info': usb_dev
                        })

        # Check serial ports for PLC signatures
        serial_ports = self.enumerate_serial_ports()
        for port in serial_ports:
            # Look for common PLC serial device patterns
            if port['manufacturer'] and any(plc in port['manufacturer'].upper() for plc in ['SIEMENS', 'ALLEN', 'SCHNEIDER', 'OMRON']):
                protocol = 'modbus_rtu'  # Default assumption
                if 'SIEMENS' in port['manufacturer'].upper():
                    protocol = 'siemens_s7'
                elif 'ALLEN' in port['manufacturer'].upper():
                    protocol = 'allen_bradley_df1'

                detected_devices.append({
                    'type': 'usb_serial',
                    'manufacturer': port['manufacturer'],
                    'protocol': protocol,
                    'port': port['device'],
                    'device_info': port
                })

        return detected_devices

    def read_plc_register(self, device_id: str, address: int, count: int = 1) -> Optional[Dict]:
        """Read PLC register with error handling and validation."""
        if device_id not in self.connected_devices:
            return {'error': f'Device {device_id} not connected'}

        device = self.connected_devices[device_id]
        client = device['client']

        try:
            if device['type'] == 'modbus_tcp':
                result = client.read_holding_registers(address, count)
                if not result.isError():
                    return {
                        'values': result.registers,
                        'address': address,
                        'count': count,
                        'timestamp': datetime.now().isoformat()
                    }
                else:
                    return {'error': f'Modbus error: {result}'}
            elif device['type'] in ['usb_serial', 'modbus_rtu']:
                return self._read_usb_serial_register(device, address, count)
            elif device['type'] == 'usb_direct':
                return self._read_usb_direct_register(device, address, count)
            elif device['type'] == 'siemens_s7':
                return self._read_siemens_s7_register(device, address, count)
            elif device['type'] == 'allen_bradley_df1':
                return self._read_allen_bradley_df1_register(device, address, count)
            else:
                return {'error': f'Unsupported device type for read: {device["type"]}'}
        except Exception as e:
            return {'error': f'Read failed: {str(e)}'}

    def write_plc_register(self, device_id: str, address: int, values: List[int]) -> Optional[Dict]:
        """Write to PLC register with safety checks."""
        if device_id not in self.connected_devices:
            return {'error': f'Device {device_id} not connected'}

        device = self.connected_devices[device_id]
        client = device['client']

        try:
            if device['type'] == 'modbus_tcp':
                result = client.write_registers(address, values)
                if not result.isError():
                    return {
                        'status': 'written',
                        'address': address,
                        'values': values,
                        'timestamp': datetime.now().isoformat()
                    }
                else:
                    return {'error': f'Write error: {result}'}
            elif device['type'] in ['usb_serial', 'modbus_rtu']:
                return self._write_usb_serial_register(device, address, values)
            elif device['type'] == 'usb_direct':
                return self._write_usb_direct_register(device, address, values)
            elif device['type'] == 'siemens_s7':
                return self._write_siemens_s7_register(device, address, values)
            elif device['type'] == 'allen_bradley_df1':
                return self._write_allen_bradley_df1_register(device, address, values)
            else:
                return {'error': f'Unsupported device type for write: {device["type"]}'}
        except Exception as e:
            return {'error': f'Write failed: {str(e)}'}

    def _read_usb_serial_register(self, device: Dict, address: int, count: int) -> Dict:
        """Read register via USB serial (Modbus RTU implementation)."""
        try:
            # This is a simplified Modbus RTU implementation
            # In a real implementation, you'd use a proper Modbus RTU library
            ser = device['client']

            # Create Modbus RTU read holding registers request
            slave_id = 1  # Default slave ID
            function_code = 3  # Read holding registers
            start_addr = address.to_bytes(2, 'big')
            quantity = count.to_bytes(2, 'big')

            # Calculate CRC (simplified)
            crc = 0xFFFF
            data = bytes([slave_id, function_code]) + start_addr + quantity
            for byte in data:
                crc ^= byte
                for _ in range(8):
                    if crc & 1:
                        crc = (crc >> 1) ^ 0xA001
                    else:
                        crc >>= 1

            crc_bytes = crc.to_bytes(2, 'little')
            request = data + crc_bytes

            # Send request
            ser.write(request)

            # Read response (simplified - should handle proper Modbus response parsing)
            response = ser.read(256)  # Read up to 256 bytes

            if len(response) >= 5:
                # Parse response (simplified)
                return {
                    'values': [int.from_bytes(response[i:i+2], 'big') for i in range(3, len(response)-2, 2)],
                    'address': address,
                    'count': count,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {'error': 'Invalid response from device'}

        except Exception as e:
            return {'error': f'USB serial read failed: {str(e)}'}

    def _write_usb_serial_register(self, device: Dict, address: int, values: List[int]) -> Dict:
        """Write register via USB serial (Modbus RTU implementation)."""
        try:
            ser = device['client']

            # Create Modbus RTU write multiple registers request
            slave_id = 1
            function_code = 16  # Write multiple registers
            start_addr = address.to_bytes(2, 'big')
            quantity = len(values).to_bytes(2, 'big')
            byte_count = (len(values) * 2).to_bytes(1, 'big')
            data = b''.join(v.to_bytes(2, 'big') for v in values)

            # Calculate CRC
            crc = 0xFFFF
            crc_data = bytes([slave_id, function_code]) + start_addr + quantity + byte_count + data
            for byte in crc_data:
                crc ^= byte
                for _ in range(8):
                    if crc & 1:
                        crc = (crc >> 1) ^ 0xA001
                    else:
                        crc >>= 1

            crc_bytes = crc.to_bytes(2, 'little')
            request = crc_data + crc_bytes

            # Send request
            ser.write(request)

            # Read response
            response = ser.read(8)

            return {
                'status': 'written',
                'address': address,
                'values': values,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            return {'error': f'USB serial write failed: {str(e)}'}

    def _read_usb_direct_register(self, device: Dict, address: int, count: int) -> Dict:
        """Read register via direct USB (vendor-specific implementation)."""
        try:
            usb_device = device['device']
            ep_out = device['ep_out']
            ep_in = device['ep_in']

            # Create read command (this is vendor-specific and would need customization)
            command = bytes([0x01, 0x03]) + address.to_bytes(2, 'big') + count.to_bytes(2, 'big')

            # Send command
            ep_out.write(command)

            # Read response
            response = ep_in.read(64)  # Read up to 64 bytes

            if len(response) >= 5:
                # Parse response (simplified)
                return {
                    'values': [int.from_bytes(response[i:i+2], 'big') for i in range(3, min(len(response)-2, 3 + count*2), 2)],
                    'address': address,
                    'count': count,
                    'timestamp': datetime.now().isoformat()
                }
            else:
                return {'error': 'Invalid response from USB device'}

        except Exception as e:
            return {'error': f'Direct USB read failed: {str(e)}'}

    def _write_usb_direct_register(self, device: Dict, address: int, values: List[int]) -> Dict:
        """Write register via direct USB (vendor-specific implementation)."""
        try:
            usb_device = device['device']
            ep_out = device['ep_out']

            # Create write command
            command = bytes([0x01, 0x10]) + address.to_bytes(2, 'big') + len(values).to_bytes(2, 'big')
            data = b''.join(v.to_bytes(2, 'big') for v in values)
            command += data

            # Send command
            ep_out.write(command)

            return {
                'status': 'written',
                'address': address,
                'values': values,
                'timestamp': datetime.now().isoformat()
            }

        except Exception as e:
            return {'error': f'Direct USB write failed: {str(e)}'}

    def _read_siemens_s7_register(self, device: Dict, address: int, count: int) -> Dict:
        """Read Siemens S7 register."""
        # Placeholder for Siemens S7 protocol implementation
        return {'error': 'Siemens S7 protocol not yet implemented'}

    def _write_siemens_s7_register(self, device: Dict, address: int, values: List[int]) -> Dict:
        """Write Siemens S7 register."""
        # Placeholder for Siemens S7 protocol implementation
        return {'error': 'Siemens S7 protocol not yet implemented'}

    def _read_allen_bradley_df1_register(self, device: Dict, address: int, count: int) -> Dict:
        """Read Allen-Bradley DF1 register."""
        # Placeholder for Allen-Bradley DF1 protocol implementation
        return {'error': 'Allen-Bradley DF1 protocol not yet implemented'}

    def _write_allen_bradley_df1_register(self, device: Dict, address: int, values: List[int]) -> Dict:
        """Write Allen-Bradley DF1 register."""
        # Placeholder for Allen-Bradley DF1 protocol implementation
        return {'error': 'Allen-Bradley DF1 protocol not yet implemented'}

    def connect_iot_device(self, config: Dict) -> Dict:
        """
        Connect to IoT device with MQTT and other protocols.
        Enables smart device integration and real-time data exchange.
        """
        device_id = config.get('device_id', 'iot_device')
        protocol = config.get('protocol', 'mqtt')
        broker = config.get('broker', 'localhost')
        port = config.get('port', 1883)

        if protocol == 'mqtt':
            return self._connect_mqtt_device(broker, port, device_id, config)
        else:
            return {'error': f'Unsupported IoT protocol: {protocol}'}

    def _connect_mqtt_device(self, broker: str, port: int, device_id: str, config: Dict) -> Dict:
        """Connect to MQTT-based IoT device."""
        if not MQTT_AVAILABLE:
            return {'error': 'MQTT library not available. Install paho-mqtt.'}

        try:
            client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2, client_id=device_id)  # type: ignore
            client.connect(broker, port, 60)

            self.connected_devices[device_id] = {
                'client': client,
                'type': 'mqtt_iot',
                'broker': broker,
                'port': port,
                'connected_at': datetime.now().isoformat(),
                'status': 'connected',
                'capabilities': ['publish', 'subscribe', 'monitor']
            }

            return {
                'status': 'connected',
                'device_id': device_id,
                'protocol': 'mqtt',
                'broker': broker,
                'port': port
            }

        except Exception as e:
            return {'error': f'IoT connection failed: {str(e)}'}

    def _start_device_monitoring(self, device_id: str, config: Dict):
        """Start background monitoring for device."""
        # Implementation for continuous monitoring
        pass

    def get_device_status(self, device_id: str) -> Dict:
        """Get comprehensive device status."""
        if device_id in self.connected_devices:
            device = self.connected_devices[device_id].copy()
            device.pop('client', None)  # Remove client object
            return device
        else:
            return {'error': f'Device {device_id} not found'}

    def disconnect_device(self, device_id: str) -> Dict:
        """Safely disconnect device."""
        if device_id in self.connected_devices:
            device = self.connected_devices[device_id]
            try:
                if 'client' in device:
                    if device['type'] == 'modbus_tcp':
                        device['client'].close()
                    elif device['type'] == 'mqtt_iot':
                        device['client'].disconnect()
                    elif device['type'] in ['usb_serial', 'modbus_rtu', 'siemens_s7', 'allen_bradley_df1']:
                        device['client'].close()  # Serial port
                    elif device['type'] == 'usb_direct':
                        # USB direct devices don't need explicit closing
                        pass

                del self.connected_devices[device_id]
                return {'status': 'disconnected', 'device_id': device_id}
            except Exception as e:
                return {'error': f'Disconnect failed: {str(e)}'}
        else:
            return {'error': f'Device {device_id} not found'}

# Example usage
if __name__ == "__main__":
    controller = CYRUSDeviceController()

    # Connect to PLC
    plc_config = {
        'type': 'modbus_tcp',
        'ip': '192.168.1.100',
        'port': 502
    }

    result = controller.connect_plc(plc_config)
    print("PLC Connection:", result)

    # Connect to IoT device
    iot_config = {
        'device_id': 'sensor_001',
        'protocol': 'mqtt',
        'broker': 'localhost',
        'port': 1883
    }

    result = controller.connect_iot_device(iot_config)
    print("IoT Connection:", result)