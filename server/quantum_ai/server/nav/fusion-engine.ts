import { FusedPosition, PositionFix, ScoredFix } from "./types";
import { updateGNSSStatus, getGNSSStatus } from "./satellite-tracker";

interface KalmanState {
  lat: number;
  lon: number;
  altitude: number;
  speed: number;
  heading: number;
  varLat: number;
  varLon: number;
  varAlt: number;
  lastUpdate: number;
}

let kalmanState: KalmanState | null = null;
const fixHistory: PositionFix[] = [];
const MAX_HISTORY = 100;

function accuracyToVariance(accuracy: number): number {
  return (accuracy * accuracy) / 4;
}

function sourceWeight(source: PositionFix["source"]): number {
  const weights: Record<string, number> = {
    "fused": 1.0,
    "gps": 0.9,
    "galileo": 0.9,
    "glonass": 0.85,
    "beidou": 0.85,
    "wifi": 0.6,
    "network": 0.4,
    "cell": 0.3,
    "manual": 0.7,
  };
  return weights[source] || 0.5;
}

function initKalman(fix: PositionFix): void {
  kalmanState = {
    lat: fix.lat,
    lon: fix.lon,
    altitude: fix.altitude || 0,
    speed: fix.speed || 0,
    heading: fix.heading || 0,
    varLat: accuracyToVariance(fix.accuracy),
    varLon: accuracyToVariance(fix.accuracy),
    varAlt: accuracyToVariance(fix.altitudeAccuracy || 50),
    lastUpdate: fix.timestamp,
  };
}

function kalmanPredict(dtSeconds: number): void {
  if (!kalmanState) return;

  const processNoise = 0.5 * dtSeconds;
  kalmanState.varLat += processNoise * processNoise;
  kalmanState.varLon += processNoise * processNoise;
  kalmanState.varAlt += processNoise * 0.1;

  if (kalmanState.speed > 0.5) {
    const headingRad = (kalmanState.heading || 0) * Math.PI / 180;
    const dLat = (kalmanState.speed * dtSeconds * Math.cos(headingRad)) / 111320;
    const dLon = (kalmanState.speed * dtSeconds * Math.sin(headingRad)) /
      (111320 * Math.cos(kalmanState.lat * Math.PI / 180));
    kalmanState.lat += dLat;
    kalmanState.lon += dLon;
  }
}

function kalmanUpdate(fix: PositionFix): void {
  if (!kalmanState) {
    initKalman(fix);
    return;
  }

  const dt = (fix.timestamp - kalmanState.lastUpdate) / 1000;
  if (dt > 0) kalmanPredict(dt);

  const weight = sourceWeight(fix.source);
  const measVar = accuracyToVariance(fix.accuracy) / weight;

  const kLat = kalmanState.varLat / (kalmanState.varLat + measVar);
  const kLon = kalmanState.varLon / (kalmanState.varLon + measVar);

  kalmanState.lat += kLat * (fix.lat - kalmanState.lat);
  kalmanState.lon += kLon * (fix.lon - kalmanState.lon);
  kalmanState.varLat *= (1 - kLat);
  kalmanState.varLon *= (1 - kLon);

  if (fix.altitude !== undefined) {
    const altVar = accuracyToVariance(fix.altitudeAccuracy || 30);
    const kAlt = kalmanState.varAlt / (kalmanState.varAlt + altVar);
    kalmanState.altitude += kAlt * (fix.altitude - kalmanState.altitude);
    kalmanState.varAlt *= (1 - kAlt);
  }

  if (fix.speed !== undefined) kalmanState.speed = fix.speed;
  if (fix.heading !== undefined) kalmanState.heading = fix.heading;

  kalmanState.lastUpdate = fix.timestamp;
}

export function ingestFix(fix: PositionFix): FusedPosition {
  fixHistory.push(fix);
  if (fixHistory.length > MAX_HISTORY) fixHistory.shift();

  kalmanUpdate(fix);
  updateGNSSStatus(fix.lat, fix.lon);
  const gnss = getGNSSStatus();

  const state = kalmanState!;
  const horizontalAccuracy = Math.sqrt(state.varLat + state.varLon) * 2;
  const verticalAccuracy = Math.sqrt(state.varAlt) * 2;

  const recentSources = new Set(
    fixHistory.slice(-10).map(f => f.source)
  );

  const ageMs = Date.now() - state.lastUpdate;
  const agePenalty = Math.min(ageMs / (5 * 60 * 1000), 1);
  const accPenalty = Math.min(horizontalAccuracy / 200, 1);
  const confidence = Math.max(0, (1 - 0.7 * agePenalty) * (1 - 0.5 * accPenalty));

  return {
    lat: state.lat,
    lon: state.lon,
    accuracy: horizontalAccuracy,
    source: "fused",
    timestamp: state.lastUpdate,
    altitude: state.altitude,
    altitudeAccuracy: verticalAccuracy,
    speed: state.speed,
    heading: state.heading,
    hdop: gnss.hdop,
    vdop: gnss.vdop,
    pdop: gnss.pdop,
    satellitesUsed: gnss.satellitesUsed,
    confidence,
    ageMs,
    sources: [...recentSources],
    fusionMethod: recentSources.size > 1 ? "kalman" : "single",
    horizontalAccuracy,
    verticalAccuracy,
    gnssStatus: gnss,
  };
}

export function getFusedPosition(): FusedPosition | null {
  if (!kalmanState) return null;
  const gnss = getGNSSStatus();
  const state = kalmanState;
  const horizontalAccuracy = Math.sqrt(state.varLat + state.varLon) * 2;
  const verticalAccuracy = Math.sqrt(state.varAlt) * 2;
  const ageMs = Date.now() - state.lastUpdate;
  const agePenalty = Math.min(ageMs / (5 * 60 * 1000), 1);
  const accPenalty = Math.min(horizontalAccuracy / 200, 1);
  const confidence = Math.max(0, (1 - 0.7 * agePenalty) * (1 - 0.5 * accPenalty));

  const recentSources = new Set(fixHistory.slice(-10).map(f => f.source));

  return {
    lat: state.lat,
    lon: state.lon,
    accuracy: horizontalAccuracy,
    source: "fused",
    timestamp: state.lastUpdate,
    altitude: state.altitude,
    altitudeAccuracy: verticalAccuracy,
    speed: state.speed,
    heading: state.heading,
    hdop: gnss.hdop,
    vdop: gnss.vdop,
    pdop: gnss.pdop,
    satellitesUsed: gnss.satellitesUsed,
    confidence,
    ageMs,
    sources: [...recentSources],
    fusionMethod: recentSources.size > 1 ? "kalman" : "single",
    horizontalAccuracy,
    verticalAccuracy,
    gnssStatus: gnss,
  };
}

export function getFixHistory(limit: number = 50): PositionFix[] {
  return fixHistory.slice(-limit);
}

export function resetFusion(): void {
  kalmanState = null;
  fixHistory.length = 0;
}
