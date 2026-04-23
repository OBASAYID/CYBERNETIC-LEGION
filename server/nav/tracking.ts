import { db } from "../db.js";
import { locationRecords, trackedUsers, locationShares } from "../../shared/schema";
import { eq, desc, gte, and } from "drizzle-orm";
import { geocodeReverse } from "./google-geospatial.js";
import { haversineDistance, bearing } from "./geospatial.js";

function toDbNumeric(value: number | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value.toString();
}

interface TrackedUserLocation {
  userId: string;
  userName: string;
  lat: number;
  lon: number;
  accuracy: number;
  altitude?: number;
  speed?: number;
  heading?: number;
  address?: string;
  locationName?: string;
  status: string;
  lastUpdated: number;
}

const activeUsers = new Map<string, TrackedUserLocation>();

export async function updateUserLocation(
  userId: string,
  userName: string,
  lat: number,
  lon: number,
  accuracy: number = 10,
  altitude?: number,
  speed?: number,
  heading?: number,
  source: string = "manual"
): Promise<TrackedUserLocation> {
  let address: string | undefined;
  try {
    const results = await geocodeReverse(lat, lon);
    if (results.length > 0) {
      address = results[0].formattedAddress;
    }
  } catch (e) {
    // Reverse geocoding failed - continue without address
  }

  const location: TrackedUserLocation = {
    userId,
    userName,
    lat,
    lon,
    accuracy,
    altitude,
    speed,
    heading,
    address,
    status: "active",
    lastUpdated: Date.now(),
  };

  activeUsers.set(userId, location);

  try {
    await db.insert(locationRecords).values({
      userId,
      latitude: toDbNumeric(lat)!,
      longitude: toDbNumeric(lon)!,
      accuracy: toDbNumeric(accuracy),
      altitude: toDbNumeric(altitude),
      speed: toDbNumeric(speed),
      heading: toDbNumeric(heading),
      address,
      source,
      status: "active",
    });

    const existing = await db.select().from(trackedUsers).where(eq(trackedUsers.userId, userId)).limit(1);
    if (existing.length > 0) {
      await db.update(trackedUsers).set({
        userName,
        lastLat: toDbNumeric(lat),
        lastLon: toDbNumeric(lon),
        lastAccuracy: toDbNumeric(accuracy),
        lastSpeed: toDbNumeric(speed ?? null),
        lastHeading: toDbNumeric(heading ?? null),
        lastAddress: address || null,
        status: "active",
        lastUpdated: new Date(),
      }).where(eq(trackedUsers.userId, userId));
    } else {
      await db.insert(trackedUsers).values({
        userId,
        userName,
        lastLat: toDbNumeric(lat),
        lastLon: toDbNumeric(lon),
        lastAccuracy: toDbNumeric(accuracy),
        lastSpeed: toDbNumeric(speed),
        lastHeading: toDbNumeric(heading),
        lastAddress: address,
        status: "active",
      });
    }
  } catch (e) {
    console.error("[Tracking] Database error:", e);
  }

  console.log(`[Tracking] Updated location for ${userName} at (${lat.toFixed(4)}, ${lon.toFixed(4)})`);
  return location;
}

export function getUserLocation(userId: string, requestingUserId?: string): TrackedUserLocation | null {
  const location = activeUsers.get(userId);
  if (!location) return null;
  return location;
}

export function getAllUserLocations(): Map<string, TrackedUserLocation> {
  return new Map(activeUsers);
}

export async function getLocationHistory(userId: string, hours: number = 24) {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000);
  const records = await db.select().from(locationRecords)
    .where(and(eq(locationRecords.userId, userId), gte(locationRecords.createdAt, cutoff)))
    .orderBy(desc(locationRecords.createdAt))
    .limit(1000);

  return records.map(r => ({
    lat: parseFloat(r.latitude),
    lon: parseFloat(r.longitude),
    accuracy: parseFloat(r.accuracy || "10"),
    altitude: r.altitude ? parseFloat(r.altitude) : null,
    speed: r.speed ? parseFloat(r.speed) : null,
    heading: r.heading ? parseFloat(r.heading) : null,
    address: r.address,
    source: r.source,
    status: r.status,
    timestamp: r.createdAt.toISOString(),
  }));
}

export function calculateEta(userId: string, destLat: number, destLon: number) {
  const location = activeUsers.get(userId);
  if (!location) return null;

  const distanceKm = haversineDistance(location.lat, location.lon, destLat, destLon) / 1000;
  const speedKmh = location.speed && location.speed > 0 ? location.speed : 60;
  const etaMinutes = (distanceKm / speedKmh) * 60;
  const bearingDeg = bearing(location.lat, location.lon, destLat, destLon);

  return {
    distanceKm: Math.round(distanceKm * 100) / 100,
    speedKmh,
    etaMinutes: Math.round(etaMinutes),
    bearingDegrees: Math.round(bearingDeg * 10) / 10,
    fromAddress: location.address || null,
  };
}

export async function shareLocationWithUser(
  userId: string,
  sharedWithEmail: string,
  permissionLevel: string = "view_only",
  durationHours?: number
) {
  const expiresAt = durationHours ? new Date(Date.now() + durationHours * 3600 * 1000) : undefined;

  const [share] = await db.insert(locationShares).values({
    userId,
    sharedWithEmail,
    permissionLevel,
    isActive: true,
    expiresAt,
  }).returning();

  return {
    shareId: share.id,
    status: "active",
    sharedWith: sharedWithEmail,
    permissionLevel,
    expiresAt: expiresAt?.toISOString() || null,
  };
}

export async function revokeLocationShare(shareId: string) {
  await db.update(locationShares).set({ isActive: false }).where(eq(locationShares.id, shareId));
  return true;
}

export async function getSharedWithMe(userEmail: string) {
  const shares = await db.select().from(locationShares)
    .where(and(eq(locationShares.sharedWithEmail, userEmail), eq(locationShares.isActive, true)));

  const results: any[] = [];
  for (const share of shares) {
    if (share.expiresAt && new Date(share.expiresAt) < new Date()) {
      await db.update(locationShares).set({ isActive: false }).where(eq(locationShares.id, share.id));
      continue;
    }
    const location = activeUsers.get(share.userId);
    results.push({
      shareId: share.id,
      userId: share.userId,
      location: location ? {
        lat: location.lat,
        lon: location.lon,
        accuracy: location.accuracy,
        speed: location.speed,
        heading: location.heading,
        address: location.address,
        status: location.status,
        lastUpdated: location.lastUpdated,
      } : null,
      permissionLevel: share.permissionLevel,
      expiresAt: share.expiresAt?.toISOString() || null,
    });
  }

  return results;
}

export async function getTrackedUsersFromDb() {
  const users = await db.select().from(trackedUsers).orderBy(desc(trackedUsers.lastUpdated));
  return users.map(u => ({
    userId: u.userId,
    userName: u.userName,
    role: u.role,
    lat: u.lastLat ? parseFloat(u.lastLat) : null,
    lon: u.lastLon ? parseFloat(u.lastLon) : null,
    accuracy: u.lastAccuracy ? parseFloat(u.lastAccuracy) : null,
    speed: u.lastSpeed ? parseFloat(u.lastSpeed) : null,
    heading: u.lastHeading ? parseFloat(u.lastHeading) : null,
    address: u.lastAddress,
    status: u.status,
    lastUpdated: u.lastUpdated.toISOString(),
  }));
}

export function setUserOffline(userId: string) {
  const location = activeUsers.get(userId);
  if (location) {
    location.status = "offline";
    location.lastUpdated = Date.now();
  }
}

console.log("[Location Tracking] Engine initialized - Real-time user tracking active");
