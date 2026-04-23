from __future__ import annotations

import os
import threading
import time
from dataclasses import dataclass
from typing import Any, Dict

try:
    from pymavlink import mavutil  # type: ignore
except Exception:  # pragma: no cover - optional dependency
    mavutil = None


@dataclass
class DroneState:
    connected: bool = False
    armed: bool = False
    mode: str = "standby"
    latitude: float | None = None
    longitude: float | None = None
    altitude: float = 0.0
    battery_percent: float | None = None
    last_update: float = 0.0


class DroneController:
    """PX4/MAVLink drone control facade with simulation fallback.

    This controller is production-safe for mixed environments:
    - Uses MAVLink when pymavlink is available and simulation mode is disabled.
    - Falls back to deterministic simulation for local development and CI.
    """

    def __init__(
        self,
        connection_string: str = "udp:127.0.0.1:14550",
        heartbeat_timeout: float = 12.0,
        command_timeout: float = 10.0,
    ) -> None:
        self.connection_string = connection_string
        self.heartbeat_timeout = heartbeat_timeout
        self.command_timeout = command_timeout
        self.simulation_mode = os.getenv("CYRUS_EMBODIMENT_SIMULATE", "false").strip().lower() == "true"
        self._lock = threading.RLock()
        self._master = None
        self._state = DroneState()

        if not self.simulation_mode and mavutil is not None:
            try:
                self._connect()
            except Exception:
                self.simulation_mode = True
                self._state.connected = True
                self._state.mode = "simulation"
                self._state.last_update = time.time()
        else:
            self.simulation_mode = True
            self._state.connected = True
            self._state.mode = "simulation"
            self._state.last_update = time.time()

    def _connect(self) -> None:
        with self._lock:
            self._master = mavutil.mavlink_connection(self.connection_string)
            heartbeat = self._master.wait_heartbeat(timeout=self.heartbeat_timeout)
            if heartbeat is None:
                raise TimeoutError("Timed out waiting for MAVLink heartbeat")
            self._state.connected = True
            self._state.mode = "idle"
            self._state.last_update = time.time()

    @property
    def connected(self) -> bool:
        return self._state.connected

    @property
    def state(self) -> Dict[str, Any]:
        with self._lock:
            return {
                "connected": self._state.connected,
                "armed": self._state.armed,
                "mode": self._state.mode,
                "lat": self._state.latitude,
                "lon": self._state.longitude,
                "alt": self._state.altitude,
                "battery_percent": self._state.battery_percent,
                "simulation_mode": self.simulation_mode,
                "last_update": self._state.last_update,
            }

    def arm(self) -> Dict[str, Any]:
        with self._lock:
            self._assert_connected()
            if self.simulation_mode:
                self._state.armed = True
                self._state.mode = "armed"
                self._state.last_update = time.time()
                return {"status": "ok", "armed": True, "simulation": True}

            self._master.arducopter_arm()
            self._master.motors_armed_wait()
            self._state.armed = True
            self._state.mode = "armed"
            self._state.last_update = time.time()
            return {"status": "ok", "armed": True, "simulation": False}

    def disarm(self) -> Dict[str, Any]:
        with self._lock:
            self._assert_connected()
            if self.simulation_mode:
                self._state.armed = False
                self._state.mode = "idle"
                self._state.last_update = time.time()
                return {"status": "ok", "armed": False, "simulation": True}

            self._master.arducopter_disarm()
            self._master.motors_disarmed_wait()
            self._state.armed = False
            self._state.mode = "idle"
            self._state.last_update = time.time()
            return {"status": "ok", "armed": False, "simulation": False}

    def takeoff(self, altitude: float = 10.0) -> Dict[str, Any]:
        with self._lock:
            self._assert_connected()
            if altitude <= 0:
                raise ValueError("altitude must be positive")

            if not self._state.armed:
                self.arm()

            if self.simulation_mode:
                self._state.mode = "taking_off"
                self._state.altitude = float(altitude)
                self._state.last_update = time.time()
                return {"status": "ok", "action": "takeoff", "altitude": altitude, "simulation": True}

            self._master.mav.command_long_send(
                self._master.target_system,
                self._master.target_component,
                mavutil.mavlink.MAV_CMD_NAV_TAKEOFF,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                float(altitude),
            )
            self._state.mode = "taking_off"
            self._state.altitude = float(altitude)
            self._state.last_update = time.time()
            return {"status": "ok", "action": "takeoff", "altitude": altitude, "simulation": False}

    def goto(self, lat: float, lon: float, alt: float) -> Dict[str, Any]:
        with self._lock:
            self._assert_connected()
            if not (-90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0):
                raise ValueError("invalid coordinates")
            if alt < 0:
                raise ValueError("alt must be non-negative")

            if self.simulation_mode:
                self._state.mode = "navigating"
                self._state.latitude = float(lat)
                self._state.longitude = float(lon)
                self._state.altitude = float(alt)
                self._state.last_update = time.time()
                return {
                    "status": "ok",
                    "action": "goto",
                    "lat": lat,
                    "lon": lon,
                    "alt": alt,
                    "simulation": True,
                }

            self._master.mav.set_position_target_global_int_send(
                0,
                self._master.target_system,
                self._master.target_component,
                mavutil.mavlink.MAV_FRAME_GLOBAL_RELATIVE_ALT_INT,
                int(0b110111111000),
                int(lat * 1e7),
                int(lon * 1e7),
                float(alt),
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
            )
            self._state.mode = "navigating"
            self._state.latitude = float(lat)
            self._state.longitude = float(lon)
            self._state.altitude = float(alt)
            self._state.last_update = time.time()
            return {
                "status": "ok",
                "action": "goto",
                "lat": lat,
                "lon": lon,
                "alt": alt,
                "simulation": False,
            }

    def land(self) -> Dict[str, Any]:
        with self._lock:
            self._assert_connected()
            if self.simulation_mode:
                self._state.mode = "landing"
                self._state.altitude = 0.0
                self._state.armed = False
                self._state.last_update = time.time()
                return {"status": "ok", "action": "land", "simulation": True}

            self._master.mav.command_long_send(
                self._master.target_system,
                self._master.target_component,
                mavutil.mavlink.MAV_CMD_NAV_LAND,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
                0,
            )
            self._state.mode = "landing"
            self._state.last_update = time.time()
            return {"status": "ok", "action": "land", "simulation": False}

    def poll_telemetry(self, timeout: float = 0.2) -> Dict[str, Any]:
        with self._lock:
            if self.simulation_mode or self._master is None:
                self._state.last_update = time.time()
                return self.state

            message = self._master.recv_match(
                type=["GLOBAL_POSITION_INT", "BATTERY_STATUS"],
                blocking=False,
                timeout=timeout,
            )
            if message is not None:
                msg_type = message.get_type()
                if msg_type == "GLOBAL_POSITION_INT":
                    self._state.latitude = float(message.lat) / 1e7
                    self._state.longitude = float(message.lon) / 1e7
                    self._state.altitude = float(message.relative_alt) / 1000.0
                elif msg_type == "BATTERY_STATUS" and getattr(message, "battery_remaining", None) is not None:
                    self._state.battery_percent = float(message.battery_remaining)
                self._state.last_update = time.time()
            return self.state

    def _assert_connected(self) -> None:
        if not self._state.connected:
            raise RuntimeError("drone is not connected")
