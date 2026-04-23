export type FixSource = "gps" | "glonass" | "galileo" | "beidou" | "network" | "wifi" | "cell" | "manual" | "fused";
export type Constellation = "GPS" | "GLONASS" | "Galileo" | "BeiDou" | "QZSS" | "SBAS";

export interface SatelliteInfo {
  prn: number;
  constellation: Constellation;
  elevation: number;
  azimuth: number;
  snr: number;
  used: boolean;
}

export interface GNSSStatus {
  satellitesVisible: number;
  satellitesUsed: number;
  satellites: SatelliteInfo[];
  constellations: Constellation[];
  hdop: number;
  vdop: number;
  pdop: number;
  fixType: "none" | "2D" | "3D" | "DGPS" | "RTK-float" | "RTK-fixed";
  lastUpdate: number;
}

export interface PositionFix {
  lat: number;
  lon: number;
  accuracy: number;
  source: FixSource;
  timestamp: number;
  altitude?: number;
  altitudeAccuracy?: number;
  speed?: number;
  heading?: number;
  hdop?: number;
  vdop?: number;
  pdop?: number;
  satellitesUsed?: number;
  constellation?: Constellation;
}

export interface ScoredFix extends PositionFix {
  confidence: number;
  ageMs: number;
}

export interface FusedPosition extends ScoredFix {
  sources: FixSource[];
  fusionMethod: "kalman" | "weighted" | "single";
  horizontalAccuracy: number;
  verticalAccuracy: number;
  speedAccuracy?: number;
  headingAccuracy?: number;
  gnssStatus?: GNSSStatus;
}

export interface RouteRequest {
  origin: { lat: number; lon: number } | string;
  destination: { lat: number; lon: number } | string;
  waypoints?: Array<{ lat: number; lon: number }>;
  mode?: "driving" | "walking" | "bicycling" | "transit";
}

export interface RouteSummary {
  distanceMeters: number;
  durationSeconds: number;
  polyline?: string;
  fetchedAt: number;
  confidence: number;
  provider: "google" | "simulated";
  steps?: RouteStep[];
}

export interface RouteStep {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  startLocation: { lat: number; lon: number };
  endLocation: { lat: number; lon: number };
}

export interface GeocodingResult {
  formattedAddress: string;
  lat: number;
  lon: number;
  placeId: string;
  types: string[];
  components: Record<string, string>;
}

export interface ElevationResult {
  lat: number;
  lon: number;
  elevation: number;
  resolution: number;
}

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lon: number;
  types: string[];
  rating?: number;
  userRatingsTotal?: number;
  openNow?: boolean;
  distance?: number;
}

export interface Geofence {
  id: string;
  name: string;
  center: { lat: number; lon: number };
  radiusMeters: number;
  type: "circle" | "polygon";
  vertices?: Array<{ lat: number; lon: number }>;
  active: boolean;
  createdAt: number;
}

export interface GeofenceEvent {
  geofenceId: string;
  type: "enter" | "exit" | "dwell";
  timestamp: number;
  position: { lat: number; lon: number };
}

export interface CoordinateFormat {
  wgs84: { lat: number; lon: number };
  dms: { lat: string; lon: string };
  utm: { zone: number; letter: string; easting: number; northing: number };
  mgrs: string;
  decimal: string;
}
