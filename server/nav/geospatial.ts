import { CoordinateFormat, ElevationResult, GeocodingResult, Geofence, GeofenceEvent, PlaceResult } from "./types.js";

const EARTH_RADIUS_M = 6371008.8;
const EARTH_RADIUS_KM = 6371.0088;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_M * c;
}

export function vincentyDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const a = 6378137.0;
  const f = 1 / 298.257223563;
  const b = a * (1 - f);

  const U1 = Math.atan((1 - f) * Math.tan(lat1 * DEG_TO_RAD));
  const U2 = Math.atan((1 - f) * Math.tan(lat2 * DEG_TO_RAD));
  const sinU1 = Math.sin(U1), cosU1 = Math.cos(U1);
  const sinU2 = Math.sin(U2), cosU2 = Math.cos(U2);

  let lambda = (lon2 - lon1) * DEG_TO_RAD;
  let lambdaP = 2 * Math.PI;
  let iterLimit = 100;
  let sinSigma = 0, cosSigma = 0, sigma = 0;
  let sinAlpha = 0, cos2Alpha = 0, cos2SigmaM = 0;

  while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0) {
    const sinLambda = Math.sin(lambda), cosLambda = Math.cos(lambda);
    sinSigma = Math.sqrt(
      (cosU2 * sinLambda) ** 2 +
      (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) ** 2
    );
    if (sinSigma === 0) return 0;
    cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda;
    sigma = Math.atan2(sinSigma, cosSigma);
    sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma;
    cos2Alpha = 1 - sinAlpha ** 2;
    cos2SigmaM = cos2Alpha !== 0 ? cosSigma - 2 * sinU1 * sinU2 / cos2Alpha : 0;
    const C = f / 16 * cos2Alpha * (4 + f * (4 - 3 * cos2Alpha));
    lambdaP = lambda;
    lambda = (lon2 - lon1) * DEG_TO_RAD + (1 - C) * f * sinAlpha *
      (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM ** 2)));
  }

  const uSq = cos2Alpha * (a ** 2 - b ** 2) / (b ** 2);
  const A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq)));
  const B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq)));
  const deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 *
    (cosSigma * (-1 + 2 * cos2SigmaM ** 2) -
      B / 6 * cos2SigmaM * (-3 + 4 * sinSigma ** 2) * (-3 + 4 * cos2SigmaM ** 2)));

  return b * A * (sigma - deltaSigma);
}

export function bearing(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const y = Math.sin(dLon) * Math.cos(lat2 * DEG_TO_RAD);
  const x = Math.cos(lat1 * DEG_TO_RAD) * Math.sin(lat2 * DEG_TO_RAD) -
    Math.sin(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLon);
  return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
}

export function destinationPoint(
  lat: number, lon: number,
  bearingDeg: number, distanceM: number
): { lat: number; lon: number } {
  const d = distanceM / EARTH_RADIUS_M;
  const brng = bearingDeg * DEG_TO_RAD;
  const lat1 = lat * DEG_TO_RAD;
  const lon1 = lon * DEG_TO_RAD;

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(brng)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );

  return { lat: lat2 * RAD_TO_DEG, lon: ((lon2 * RAD_TO_DEG) + 540) % 360 - 180 };
}

export function midpoint(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): { lat: number; lon: number } {
  const dLon = (lon2 - lon1) * DEG_TO_RAD;
  const Bx = Math.cos(lat2 * DEG_TO_RAD) * Math.cos(dLon);
  const By = Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLon);
  const lat3 = Math.atan2(
    Math.sin(lat1 * DEG_TO_RAD) + Math.sin(lat2 * DEG_TO_RAD),
    Math.sqrt((Math.cos(lat1 * DEG_TO_RAD) + Bx) ** 2 + By ** 2)
  );
  const lon3 = (lon1 * DEG_TO_RAD) + Math.atan2(By, Math.cos(lat1 * DEG_TO_RAD) + Bx);
  return { lat: lat3 * RAD_TO_DEG, lon: ((lon3 * RAD_TO_DEG) + 540) % 360 - 180 };
}

export function toDecimalDegrees(deg: number, min: number, sec: number, dir: string): number {
  const dd = deg + min / 60 + sec / 3600;
  return (dir === "S" || dir === "W") ? -dd : dd;
}

export function toDMS(decimal: number, isLat: boolean): string {
  const dir = isLat ? (decimal >= 0 ? "N" : "S") : (decimal >= 0 ? "E" : "W");
  const abs = Math.abs(decimal);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = ((minFloat - min) * 60).toFixed(4);
  return `${deg}°${min}'${sec}"${dir}`;
}

export function toUTM(lat: number, lon: number): { zone: number; letter: string; easting: number; northing: number } {
  const k0 = 0.9996;
  const a = 6378137.0;
  const e = 0.081819191;
  const e2 = e * e;
  const ep2 = e2 / (1 - e2);

  let zoneNumber = Math.floor((lon + 180) / 6) + 1;
  if (lat >= 56 && lat < 64 && lon >= 3 && lon < 12) zoneNumber = 32;
  if (lat >= 72 && lat < 84) {
    if (lon >= 0 && lon < 9) zoneNumber = 31;
    else if (lon >= 9 && lon < 21) zoneNumber = 33;
    else if (lon >= 21 && lon < 33) zoneNumber = 35;
    else if (lon >= 33 && lon < 42) zoneNumber = 37;
  }

  const letters = "CDEFGHJKLMNPQRSTUVWX";
  const letterIndex = Math.floor((lat + 80) / 8);
  const letter = letters[Math.min(letterIndex, letters.length - 1)] || "Z";

  const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const latRad = lat * DEG_TO_RAD;
  const lonRad = lon * DEG_TO_RAD;
  const lonOriginRad = lonOrigin * DEG_TO_RAD;

  const N = a / Math.sqrt(1 - e2 * Math.sin(latRad) ** 2);
  const T = Math.tan(latRad) ** 2;
  const C = ep2 * Math.cos(latRad) ** 2;
  const A = Math.cos(latRad) * (lonRad - lonOriginRad);

  const M = a * (
    (1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 * e2 * e2 / 256) * latRad -
    (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 * e2 * e2 / 1024) * Math.sin(2 * latRad) +
    (15 * e2 * e2 / 256 + 45 * e2 * e2 * e2 / 1024) * Math.sin(4 * latRad) -
    (35 * e2 * e2 * e2 / 3072) * Math.sin(6 * latRad)
  );

  let easting = k0 * N * (A + (1 - T + C) * A ** 3 / 6 +
    (5 - 18 * T + T ** 2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000;

  let northing = k0 * (M + N * Math.tan(latRad) * (
    A ** 2 / 2 + (5 - T + 9 * C + 4 * C ** 2) * A ** 4 / 24 +
    (61 - 58 * T + T ** 2 + 600 * C - 330 * ep2) * A ** 6 / 720
  ));

  if (lat < 0) northing += 10000000;

  return { zone: zoneNumber, letter, easting: Math.round(easting * 100) / 100, northing: Math.round(northing * 100) / 100 };
}

export function toMGRS(lat: number, lon: number): string {
  const utm = toUTM(lat, lon);
  const setNumber = ((utm.zone - 1) % 6);
  const colLetters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const rowLetters = "ABCDEFGHJKLMNPQRSTUV";

  const col100k = Math.floor(utm.easting / 100000);
  const row100k = Math.floor(utm.northing / 100000) % 20;

  const colOffset = setNumber * 8;
  const colLetter = colLetters[(colOffset + col100k - 1) % colLetters.length];
  const rowOffset = (setNumber % 2 === 0) ? 0 : 5;
  const rowLetter = rowLetters[(rowOffset + row100k) % rowLetters.length];

  const easting5 = Math.round(utm.easting % 100000).toString().padStart(5, "0");
  const northing5 = Math.round(utm.northing % 100000).toString().padStart(5, "0");

  return `${utm.zone}${utm.letter}${colLetter}${rowLetter}${easting5}${northing5}`;
}

export function convertCoordinates(lat: number, lon: number): CoordinateFormat {
  const utm = toUTM(lat, lon);
  return {
    wgs84: { lat, lon },
    dms: { lat: toDMS(lat, true), lon: toDMS(lon, false) },
    utm,
    mgrs: toMGRS(lat, lon),
    decimal: `${lat.toFixed(8)}, ${lon.toFixed(8)}`,
  };
}

const geofences = new Map<string, Geofence>();
const geofenceStates = new Map<string, boolean>();

export function addGeofence(fence: Geofence): void {
  geofences.set(fence.id, fence);
  geofenceStates.set(fence.id, false);
}

export function removeGeofence(id: string): boolean {
  geofenceStates.delete(id);
  return geofences.delete(id);
}

export function getGeofences(): Geofence[] {
  return Array.from(geofences.values());
}

export function getGeofence(id: string): Geofence | undefined {
  return geofences.get(id);
}

function pointInPolygon(lat: number, lon: number, vertices: Array<{ lat: number; lon: number }>): boolean {
  let inside = false;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
    const xi = vertices[i].lat, yi = vertices[i].lon;
    const xj = vertices[j].lat, yj = vertices[j].lon;
    const intersect = ((yi > lon) !== (yj > lon)) &&
      (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function checkGeofences(lat: number, lon: number): GeofenceEvent[] {
  const events: GeofenceEvent[] = [];
  for (const [id, fence] of geofences) {
    if (!fence.active) continue;
    let inside = false;
    if (fence.type === "circle") {
      const dist = haversineDistance(lat, lon, fence.center.lat, fence.center.lon);
      inside = dist <= fence.radiusMeters;
    } else if (fence.type === "polygon" && fence.vertices) {
      inside = pointInPolygon(lat, lon, fence.vertices);
    }

    const wasInside = geofenceStates.get(id) || false;
    if (inside && !wasInside) {
      events.push({ geofenceId: id, type: "enter", timestamp: Date.now(), position: { lat, lon } });
    } else if (!inside && wasInside) {
      events.push({ geofenceId: id, type: "exit", timestamp: Date.now(), position: { lat, lon } });
    } else if (inside && wasInside) {
      events.push({ geofenceId: id, type: "dwell", timestamp: Date.now(), position: { lat, lon } });
    }
    geofenceStates.set(id, inside);
  }
  return events;
}

export function areaOfPolygon(vertices: Array<{ lat: number; lon: number }>): number {
  if (vertices.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    const lat1 = vertices[i].lat * DEG_TO_RAD;
    const lat2 = vertices[j].lat * DEG_TO_RAD;
    const dLon = (vertices[j].lon - vertices[i].lon) * DEG_TO_RAD;
    area += dLon * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  return Math.abs(area * EARTH_RADIUS_M * EARTH_RADIUS_M / 2);
}

export function boundingBox(
  lat: number, lon: number, radiusM: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const dLat = (radiusM / EARTH_RADIUS_M) * RAD_TO_DEG;
  const dLon = (radiusM / (EARTH_RADIUS_M * Math.cos(lat * DEG_TO_RAD))) * RAD_TO_DEG;
  return {
    minLat: lat - dLat,
    maxLat: lat + dLat,
    minLon: lon - dLon,
    maxLon: lon + dLon,
  };
}
