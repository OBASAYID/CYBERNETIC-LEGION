import type { Express, Request } from "express";
import { z } from "zod";
import fetch from "node-fetch";
import { getBestFix, updateFix } from "./position.js";
import { PositionFix, RouteRequest, RouteSummary, RouteStep } from "./types.js";
import { startShare, stopShare, getSharedFix } from "./share.js";
import { ingestFix, getFusedPosition, getFixHistory, resetFusion } from "./fusion-engine.js";
import { getGNSSStatus, getSatellitesByConstellation, getSignalQuality } from "./satellite-tracker.js";
import {
  haversineDistance, vincentyDistance, bearing, destinationPoint, midpoint,
  convertCoordinates, toUTM, toMGRS, toDMS,
  addGeofence, removeGeofence, getGeofences, getGeofence, checkGeofences,
  areaOfPolygon, boundingBox
} from "./geospatial.js";
import {
  geocodeForward, geocodeReverse, getElevation, getElevationAlongPath,
  searchNearbyPlaces, searchPlacesByText, getPlaceDetails, geolocate
} from "./google-geospatial.js";
import {
  updateUserLocation, getUserLocation, getAllUserLocations,
  getLocationHistory, calculateEta, shareLocationWithUser,
  revokeLocationShare, getSharedWithMe, getTrackedUsersFromDb,
  setUserOffline
} from "./tracking.js";
import {
  triggerEmergencyAlert, resolveEmergency, getActiveAlerts,
  getAllAlerts, getActiveAlertCount
} from "./emergency.js";

const manualFixSchema = z.object({
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  accuracy: z.number().min(0.1),
  source: z.enum(["gps", "glonass", "galileo", "beidou", "network", "wifi", "cell", "manual"]).default("manual"),
  timestamp: z.number().optional(),
  altitude: z.number().optional(),
  altitudeAccuracy: z.number().optional(),
  speed: z.number().min(0).optional(),
  heading: z.number().min(0).max(360).optional(),
  hdop: z.number().optional(),
  vdop: z.number().optional(),
  pdop: z.number().optional(),
  satellitesUsed: z.number().optional(),
  constellation: z.enum(["GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "SBAS"]).optional(),
});

const coordOrString = z.union([
  z.object({ lat: z.number(), lon: z.number() }),
  z.string(),
]);

const routeSchema = z.object({
  origin: coordOrString,
  destination: coordOrString,
  waypoints: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
  mode: z.enum(["driving", "walking", "bicycling", "transit"]).optional(),
});

const shareStartSchema = z.object({
  recipientId: z.string().optional().default("public"),
  durationSeconds: z.number().min(30).max(86400).optional(),
  duration: z.number().min(30).max(86400).optional(),
  expiresIn: z.number().min(30).max(86400).optional(),
  mode: z.enum(["live", "snapshot"]).default("live"),
}).transform((data) => ({
  ...data,
  durationSeconds: data.durationSeconds || data.duration || data.expiresIn || 3600,
}));

const shareStopSchema = z.object({
  token: z.string(),
});

const geofenceSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional().default("Geofence"),
  center: z.object({ lat: z.number(), lon: z.number() }),
  radiusMeters: z.number().min(1).max(100000).optional(),
  radius: z.number().min(1).max(100000).optional(),
  type: z.enum(["circle", "polygon"]).default("circle"),
  vertices: z.array(z.object({ lat: z.number(), lon: z.number() })).optional(),
  active: z.boolean().default(true),
}).transform((data) => ({
  ...data,
  radiusMeters: data.radiusMeters || data.radius || 1000,
}));

function formatLocation(loc: { lat: number; lon: number } | string): string {
  if (typeof loc === "string") return loc;
  return `${loc.lat},${loc.lon}`;
}

async function fetchGoogleRoute(body: RouteRequest): Promise<RouteSummary> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY not set");
  }
  const params = new URLSearchParams();
  params.set("origin", formatLocation(body.origin));
  params.set("destination", formatLocation(body.destination));
  if (body.waypoints?.length) {
    params.set("waypoints", body.waypoints.map((w) => `${w.lat},${w.lon}`).join("|"));
  }
  params.set("mode", body.mode || "driving");
  params.set("key", apiKey);

  const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
  const resp = await fetch(url);
  const data: any = await resp.json();
  if (data.status === "UNKNOWN_ERROR") {
    await new Promise(r => setTimeout(r, 500));
    const retry = await fetch(url);
    const retryData: any = await retry.json();
    if (retryData.status !== "OK") throw new Error(`Directions API error: ${retryData.status}`);
    Object.assign(data, retryData);
  } else if (data.status !== "OK") {
    throw new Error(`Directions API error: ${data.status}`);
  }
  const leg = data.routes?.[0]?.legs?.[0];
  if (!leg) throw new Error("No route returned");

  const steps: RouteStep[] = (leg.steps || []).map((s: any) => ({
    instruction: s.html_instructions?.replace(/<[^>]*>/g, "") || "",
    distanceMeters: s.distance?.value || 0,
    durationSeconds: s.duration?.value || 0,
    startLocation: { lat: s.start_location?.lat, lon: s.start_location?.lng },
    endLocation: { lat: s.end_location?.lat, lon: s.end_location?.lng },
  }));

  return {
    distanceMeters: leg.distance?.value || 0,
    durationSeconds: leg.duration?.value || 0,
    polyline: data.routes?.[0]?.overview_polyline?.points,
    fetchedAt: Date.now(),
    confidence: 0.95,
    provider: "google",
    steps,
  };
}

function simulateRoute(body: RouteRequest): RouteSummary {
  const o = typeof body.origin === "string" ? { lat: 0, lon: 0 } : body.origin;
  const d = typeof body.destination === "string" ? { lat: 0, lon: 0 } : body.destination;
  const dist = haversineDistance(o.lat, o.lon, d.lat, d.lon);
  const durationSeconds = Math.round(dist / 13.9);
  return {
    distanceMeters: Math.round(dist),
    durationSeconds,
    fetchedAt: Date.now(),
    confidence: 0.2,
    provider: "simulated",
  };
}

export function registerNavRoutes(app: Express) {
  app.get("/api/nav/maps-config", (_req, res) => {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY || "";
    res.json({ apiKey });
  });

  app.get("/api/nav/position", (_req, res) => {
    const fix = getBestFix();
    if (fix) {
      return res.json({
        lat: fix.lat,
        lon: fix.lon,
        accuracy: fix.accuracy,
        source: fix.source || "gps",
        timestamp: fix.timestamp,
      });
    }
    const fused = getFusedPosition();
    if (fused) {
      return res.json({
        lat: fused.lat,
        lon: fused.lon,
        accuracy: fused.accuracy || 100,
        source: fused.source || "network",
        timestamp: fused.timestamp || Date.now(),
      });
    }
    res.json({
      lat: 0,
      lon: 0,
      accuracy: 0,
      source: "none",
      timestamp: Date.now(),
    });
  });

  app.post("/api/nav/position", (req, res) => {
    const parsed = manualFixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid position data", details: parsed.error.flatten() });
    }
    const fix: PositionFix = {
      ...parsed.data,
      timestamp: parsed.data.timestamp || Date.now(),
    };
    try {
      updateFix(fix);
      const fused = ingestFix(fix);
      const geofenceEvents = checkGeofences(fused.lat, fused.lon);
      res.json({
        lat: fused.lat,
        lon: fused.lon,
        accuracy: fused.accuracy || fix.accuracy,
        source: fix.source,
        timestamp: fix.timestamp,
        geofenceEvents,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/nav/fix", (_req, res) => {
    const fix = getBestFix();
    if (!fix) return res.status(200).json({ available: false, fix: null, message: "No fix available - awaiting GPS data" });
    res.json({ available: true, fix });
  });

  app.get("/api/nav/fused", (_req, res) => {
    const fused = getFusedPosition();
    if (!fused) return res.status(200).json({ available: false, position: null, message: "No fused position available - awaiting GPS fix" });
    res.json({ available: true, position: fused });
  });

  app.get("/api/nav/history", (req, res) => {
    const limit = parseInt(req.query.limit as string) || 50;
    res.json(getFixHistory(limit));
  });

  app.post("/api/nav/reset", (_req, res) => {
    resetFusion();
    res.json({ success: true, message: "Fusion engine reset" });
  });

  app.post("/api/nav/manual-fix", (req, res) => {
    const parsed = manualFixSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid fix", details: parsed.error.flatten() });
    }
    const fix: PositionFix = {
      ...parsed.data,
      timestamp: parsed.data.timestamp || Date.now(),
    };
    try {
      updateFix(fix);
      const fused = ingestFix(fix);
      const geofenceEvents = checkGeofences(fused.lat, fused.lon);
      res.json({ success: true, fused, geofenceEvents });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get("/api/nav/gnss/status", (_req, res) => {
    res.json(getGNSSStatus());
  });

  app.get("/api/nav/gnss/constellations", (_req, res) => {
    res.json(getSatellitesByConstellation());
  });

  app.get("/api/nav/gnss/signal-quality", (_req, res) => {
    res.json(getSignalQuality());
  });

  app.post("/api/nav/route", async (req, res) => {
    const parsed = routeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid route request", details: parsed.error.flatten() });
    }
    try {
      let summary: RouteSummary;
      try {
        summary = await fetchGoogleRoute(parsed.data);
      } catch (err) {
        console.error("Google Directions failed, using simulated route:", err);
        summary = simulateRoute(parsed.data);
      }
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Routing failed" });
    }
  });

  app.post("/api/nav/geolocate", async (req, res) => {
    try {
      const { wifiAccessPoints, cellTowers, radioType, carrier, considerIp } = req.body || {};
      const result = await geolocate({ wifiAccessPoints, cellTowers, radioType, carrier, considerIp });
      const fix: PositionFix = {
        lat: result.lat,
        lon: result.lon,
        accuracy: result.accuracy,
        source: result.source === "wifi" ? "wifi" : result.source === "cell" ? "cell" : "network",
        timestamp: Date.now(),
      };
      updateFix(fix);
      const fused = ingestFix(fix);
      const geofenceEvents = checkGeofences(fused.lat, fused.lon);
      res.json({ geolocation: result, fused, geofenceEvents });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geocode/forward", async (req, res) => {
    try {
      const { address } = req.body;
      if (!address) return res.status(400).json({ error: "address is required" });
      const results = await geocodeForward(address);
      res.json({ results, count: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geocode/reverse", async (req, res) => {
    try {
      const { lat, lon } = req.body;
      if (lat === undefined || lon === undefined) return res.status(400).json({ error: "lat and lon are required" });
      const results = await geocodeReverse(lat, lon);
      res.json({ results, count: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/elevation", async (req, res) => {
    try {
      const { locations } = req.body;
      if (!locations || !Array.isArray(locations) || locations.length === 0) {
        return res.status(400).json({ error: "locations array is required" });
      }
      try {
        const results = await getElevation(locations);
        res.json({ results, provider: "google" });
      } catch (apiErr: any) {
        if (apiErr.message?.includes("REQUEST_DENIED") || apiErr.message?.includes("not activated")) {
          const simulated = locations.map((loc: any) => ({
            lat: loc.lat,
            lon: loc.lon,
            elevation: Math.round(Math.random() * 500 + 10),
            resolution: 0,
            provider: "simulated",
          }));
          res.json({ results: simulated, provider: "simulated", note: "Elevation API not enabled in Google Cloud Console. Using simulated data." });
        } else {
          throw apiErr;
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/elevation/path", async (req, res) => {
    try {
      const { path, samples } = req.body;
      if (!path || !Array.isArray(path) || path.length < 2) {
        return res.status(400).json({ error: "path array with at least 2 points is required" });
      }
      const results = await getElevationAlongPath(path, samples || 100);
      res.json({ results, samples: results.length });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/places/nearby", async (req, res) => {
    try {
      const { lat, lon, radius, type, keyword } = req.body;
      if (lat === undefined || lon === undefined) {
        return res.status(400).json({ error: "lat and lon are required" });
      }
      try {
        const results = await searchNearbyPlaces(lat, lon, radius || 1000, type, keyword);
        const withDistance = results.map(p => ({
          ...p,
          distance: Math.round(haversineDistance(lat, lon, p.lat, p.lon)),
        }));
        withDistance.sort((a, b) => a.distance - b.distance);
        res.json({ results: withDistance, count: withDistance.length, provider: "google" });
      } catch (apiErr: any) {
        if (apiErr.message?.includes("REQUEST_DENIED") || apiErr.message?.includes("not enabled")) {
          res.json({ results: [], count: 0, provider: "simulated", note: "Places API not enabled in Google Cloud Console. Enable it to get real results." });
        } else {
          throw apiErr;
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/places/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) return res.status(400).json({ error: "query is required" });
      try {
        const results = await searchPlacesByText(query);
        res.json({ results, count: results.length, provider: "google" });
      } catch (apiErr: any) {
        if (apiErr.message?.includes("REQUEST_DENIED") || apiErr.message?.includes("not enabled")) {
          res.json({ results: [], count: 0, provider: "simulated", note: "Places API not enabled in Google Cloud Console. Enable it to get real results." });
        } else {
          throw apiErr;
        }
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/places/details/:placeId", async (req, res) => {
    try {
      const details = await getPlaceDetails(req.params.placeId);
      res.json(details);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geo/distance", (req, res) => {
    try {
      const { from, to, method } = req.body;
      if (!from || !to) return res.status(400).json({ error: "from and to coordinates required" });
      const dist = method === "vincenty"
        ? vincentyDistance(from.lat, from.lon, to.lat, to.lon)
        : haversineDistance(from.lat, from.lon, to.lat, to.lon);
      const bear = bearing(from.lat, from.lon, to.lat, to.lon);
      const mid = midpoint(from.lat, from.lon, to.lat, to.lon);
      res.json({
        distanceMeters: Math.round(dist * 100) / 100,
        distanceKm: Math.round(dist / 10) / 100,
        distanceMiles: Math.round(dist / 1609.344 * 100) / 100,
        distanceNauticalMiles: Math.round(dist / 1852 * 100) / 100,
        bearing: Math.round(bear * 100) / 100,
        midpoint: mid,
        method: method || "haversine",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geo/destination", (req, res) => {
    try {
      const { lat, lon, bearing: bear, distance } = req.body;
      if (lat === undefined || lon === undefined || bear === undefined || distance === undefined) {
        return res.status(400).json({ error: "lat, lon, bearing, and distance are required" });
      }
      const dest = destinationPoint(lat, lon, bear, distance);
      res.json(dest);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geo/convert", (req, res) => {
    try {
      const { lat, lon } = req.body;
      if (lat === undefined || lon === undefined) {
        return res.status(400).json({ error: "lat and lon are required" });
      }
      res.json(convertCoordinates(lat, lon));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geo/area", (req, res) => {
    try {
      const vertices = req.body.vertices || req.body.polygon || req.body.points;
      if (!vertices || !Array.isArray(vertices) || vertices.length < 3) {
        return res.status(400).json({ error: "At least 3 vertices required (use 'vertices', 'polygon', or 'points')" });
      }
      const areaSqM = areaOfPolygon(vertices);
      res.json({
        areaSqMeters: Math.round(areaSqM * 100) / 100,
        areaSqKm: Math.round(areaSqM / 1e6 * 10000) / 10000,
        areaHectares: Math.round(areaSqM / 10000 * 1000) / 1000,
        areaAcres: Math.round(areaSqM / 4046.86 * 1000) / 1000,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geo/bbox", (req, res) => {
    try {
      const { lat, lon, radius } = req.body;
      if (lat === undefined || lon === undefined || radius === undefined) {
        return res.status(400).json({ error: "lat, lon, and radius are required" });
      }
      res.json(boundingBox(lat, lon, radius));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/geofence", (req, res) => {
    const parsed = geofenceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid geofence", details: parsed.error.flatten() });
    }
    const fence = {
      ...parsed.data,
      id: parsed.data.id || `gf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    addGeofence(fence);
    res.json({ success: true, geofence: fence });
  });

  app.get("/api/nav/geofences", (_req, res) => {
    res.json(getGeofences());
  });

  app.get("/api/nav/geofence/:id", (req, res) => {
    const fence = getGeofence(req.params.id);
    if (!fence) return res.status(404).json({ error: "Geofence not found" });
    res.json(fence);
  });

  app.delete("/api/nav/geofence/:id", (req, res) => {
    const removed = removeGeofence(req.params.id);
    if (!removed) return res.status(404).json({ error: "Geofence not found" });
    res.json({ success: true });
  });

  app.post("/api/nav/geofence/check", (req, res) => {
    const { lat, lon } = req.body;
    if (lat === undefined || lon === undefined) {
      return res.status(400).json({ error: "lat and lon are required" });
    }
    const events = checkGeofences(lat, lon);
    res.json({ events, activeGeofences: getGeofences().filter(f => f.active).length });
  });

  app.post("/api/nav/share/start", (req, res) => {
    const parsed = shareStartSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid share payload", details: parsed.error.flatten() });
    }
    const token = startShare(parsed.data.recipientId, parsed.data.durationSeconds, parsed.data.mode);
    res.json({ token, expiresIn: parsed.data.durationSeconds });
  });

  app.post("/api/nav/share/stop", (req, res) => {
    const parsed = shareStopSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid stop payload", details: parsed.error.flatten() });
    }
    stopShare(parsed.data.token);
    res.json({ success: true });
  });

  app.get("/api/nav/share/stream", (req: Request, res) => {
    const token = req.query.token as string;
    if (!token) return res.status(400).json({ error: "token required" });
    const fix = getSharedFix(token);
    if (!fix) return res.status(404).json({ error: "share not found or expired" });
    res.json(fix);
  });

  app.get("/api/nav/capabilities", (_req, res) => {
    const hasGoogleKey = !!process.env.GOOGLE_MAPS_API_KEY;
    const hasGeolocationKey = !!process.env.GOOGLE_GEOLOCATION_API_KEY;
    res.json({
      status: "active",
      version: "2.1",
      capabilities: {
        positionFusion: true,
        satelliteTracking: true,
        constellations: ["GPS", "GLONASS", "Galileo", "BeiDou", "QZSS", "SBAS"],
        kalmanFilter: true,
        geolocation: {
          available: hasGeolocationKey,
          wifiPositioning: hasGeolocationKey,
          cellTowerPositioning: hasGeolocationKey,
          ipPositioning: hasGeolocationKey,
        },
        geospatial: {
          haversineDistance: true,
          vincentyDistance: true,
          bearing: true,
          destinationPoint: true,
          midpoint: true,
          areaCalculation: true,
          boundingBox: true,
        },
        coordinateSystems: ["WGS84", "UTM", "MGRS", "DMS", "Decimal"],
        geofencing: true,
        googleMaps: {
          available: hasGoogleKey,
          directions: hasGoogleKey,
          geocoding: !!process.env.GOOGLE_GEOCODING_API_KEY || hasGoogleKey,
          elevation: hasGoogleKey,
          places: hasGoogleKey,
        },
        locationSharing: true,
      },
      endpoints: 31,
    });
  });

  // ==================== LOCATION TRACKING SYSTEM v1.0 ====================

  app.post("/api/nav/track/update", async (req, res) => {
    try {
      const { userId, userName, lat, lon, accuracy, altitude, speed, heading, source } = req.body;
      if (!userId || lat === undefined || lon === undefined) {
        return res.status(400).json({ error: "userId, lat, and lon are required" });
      }
      const location = await updateUserLocation(
        userId, userName || userId, lat, lon,
        accuracy || 10, altitude, speed, heading, source || "manual"
      );
      res.json({ success: true, message: "Location updated", location });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/track/current", (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const location = getUserLocation(userId);
      if (!location) return res.status(404).json({ error: "User location not found" });
      res.json(location);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/track/all", (req, res) => {
    try {
      const locations = getAllUserLocations();
      const result: any = {};
      for (const [userId, loc] of locations) {
        result[userId] = loc;
      }
      res.json({ totalUsers: locations.size, locations: result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/track/history", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const hours = parseInt(req.query.hours as string) || 24;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      const history = await getLocationHistory(userId, hours);
      res.json({ userId, periodHours: hours, points: history.length, history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/track/eta", (req, res) => {
    try {
      const userId = req.query.userId as string;
      const destLat = parseFloat(req.query.destLat as string);
      const destLon = parseFloat(req.query.destLon as string);
      if (!userId || isNaN(destLat) || isNaN(destLon)) {
        return res.status(400).json({ error: "userId, destLat, and destLon are required" });
      }
      const eta = calculateEta(userId, destLat, destLon);
      if (!eta) return res.status(404).json({ error: "User location not found for ETA" });
      res.json(eta);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/track/offline", (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: "userId is required" });
      setUserOffline(userId);
      res.json({ success: true, message: `User ${userId} marked offline` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/admin/users", async (req, res) => {
    try {
      const users = await getTrackedUsersFromDb();
      res.json({ totalUsers: users.length, users });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== EMERGENCY SOS SYSTEM ====================

  app.post("/api/nav/emergency/alert", async (req, res) => {
    try {
      const { userId, userName, level, message, lat, lon, contactInfo } = req.body;
      if (!userId || !level || !message || lat === undefined || lon === undefined) {
        return res.status(400).json({ error: "userId, level, message, lat, and lon are required" });
      }
      const validLevels = ["low", "medium", "high", "critical"];
      if (!validLevels.includes(level)) {
        return res.status(400).json({ error: `level must be one of: ${validLevels.join(", ")}` });
      }
      const alert = await triggerEmergencyAlert(userId, userName || userId, level, message, lat, lon, contactInfo);
      res.json({
        alertId: alert.alertId,
        status: "active",
        level: alert.level,
        respondersDispatched: alert.respondersAssigned.length,
        message: "Emergency alert triggered successfully",
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/emergency/resolve", async (req, res) => {
    try {
      const { alertId, responderId } = req.body;
      if (!alertId || !responderId) {
        return res.status(400).json({ error: "alertId and responderId are required" });
      }
      const resolved = await resolveEmergency(alertId, responderId);
      if (!resolved) return res.status(404).json({ error: "Alert not found" });
      res.json({ success: true, message: "Emergency alert resolved" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/emergency/active", async (req, res) => {
    try {
      const alerts = await getActiveAlerts();
      res.json({ totalAlerts: alerts.length, alerts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/emergency/all", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const alerts = await getAllAlerts(limit);
      res.json({ totalAlerts: alerts.length, alerts });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/emergency/status", (req, res) => {
    res.json({
      activeAlerts: getActiveAlertCount(),
      systemStatus: "operational",
      module: "Emergency Response Engine v1.0",
    });
  });

  // ==================== ENHANCED LOCATION SHARING ====================

  app.post("/api/nav/sharing/start", async (req, res) => {
    try {
      const { userId, sharedWithEmail, permissionLevel, durationHours } = req.body;
      if (!userId || !sharedWithEmail) {
        return res.status(400).json({ error: "userId and sharedWithEmail are required" });
      }
      const result = await shareLocationWithUser(userId, sharedWithEmail, permissionLevel || "view_only", durationHours);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/nav/sharing/revoke", async (req, res) => {
    try {
      const { shareId } = req.body;
      if (!shareId) return res.status(400).json({ error: "shareId is required" });
      await revokeLocationShare(shareId);
      res.json({ success: true, message: "Location sharing revoked" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/nav/sharing/shared-with-me", async (req, res) => {
    try {
      const userEmail = req.query.userEmail as string;
      if (!userEmail) return res.status(400).json({ error: "userEmail is required" });
      const shared = await getSharedWithMe(userEmail);
      res.json({ totalShared: shared.length, sharedLocations: shared });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ==================== SYSTEM STATUS ====================

  app.get("/api/nav/tracking/status", (req, res) => {
    const locations = getAllUserLocations();
    res.json({
      module: "Advanced Location Tracking & Emergency Response System v1.0",
      status: "operational",
      activeTrackedUsers: locations.size,
      activeEmergencyAlerts: getActiveAlertCount(),
      capabilities: [
        "Real-time user location tracking",
        "Location history & analytics",
        "User-to-user location sharing",
        "Emergency SOS alerts",
        "Geofencing with entry/exit alerts",
        "ETA calculation",
        "Reverse geocoding enrichment",
        "Admin dashboard endpoints",
      ],
    });
  });
}
