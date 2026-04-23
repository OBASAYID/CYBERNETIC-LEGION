/**
 * Fleet / navigation UI types consumed by cyrus-ui (separate from Drizzle table exports).
 */

export type DroneStatus = "online" | "offline" | "mission" | "returning" | "maintenance" | "emergency";
export type PilotMode = "manual" | "autonomous" | "ai-assist";
export type AlertSeverity = "critical" | "warning" | "info";
export type MissionStatus = "planning" | "active" | "completed" | "aborted";
export type SubsystemStatus = "nominal" | "degraded" | "critical" | "offline";

export interface Drone {
  id: string;
  name: string;
  model: string;
  status: DroneStatus;
  pilotMode: PilotMode;
  batteryLevel: number;
  signalStrength: number;
  gpsLock: boolean;
  lastSeen: string;
  currentMissionId: string | null;
}

export interface Telemetry {
  droneId: string;
  timestamp: string;
  altitude: number;
  speed: number;
  heading: number;
  latitude: number;
  longitude: number;
  batteryLevel: number;
  batteryVoltage: number;
  signalStrength: number;
  gpsAccuracy: number;
  temperature: number;
  windSpeed: number;
  subsystems: {
    propulsion: SubsystemStatus;
    navigation: SubsystemStatus;
    sensors: SubsystemStatus;
    communication: SubsystemStatus;
    payload: SubsystemStatus;
  };
}

export interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  action: "hover" | "photo" | "video" | "waypoint" | "land";
  duration?: number;
}

export interface Mission {
  id: string;
  name: string;
  droneId: string;
  status: MissionStatus;
  waypoints: Waypoint[];
  startTime: string | null;
  endTime: string | null;
  estimatedDuration: number;
  distance: number;
  createdAt: string;
}

export interface Alert {
  id: string;
  droneId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface FlightLog {
  id: string;
  droneId: string;
  missionId: string | null;
  event: string;
  details: string;
  timestamp: string;
  severity: "debug" | "info" | "warning" | "error";
}
