import { db } from "../db.js";
import { emergencyAlerts } from "../../shared/schema";
import { eq, desc } from "drizzle-orm";
import { getAllUserLocations } from "./tracking.js";
import { haversineDistance } from "./geospatial.js";

type EmergencyLevel = "low" | "medium" | "high" | "critical";

interface EmergencyAlertData {
  alertId: string;
  userId: string;
  userName: string;
  level: EmergencyLevel;
  message: string;
  lat: number;
  lon: number;
  status: string;
  respondersAssigned: string[];
  contactInfo: any;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

const activeAlertsCache = new Map<string, EmergencyAlertData>();

export async function triggerEmergencyAlert(
  userId: string,
  userName: string,
  level: EmergencyLevel,
  message: string,
  lat: number,
  lon: number,
  contactInfo?: any
): Promise<EmergencyAlertData> {
  const responders = findNearestResponders(lat, lon, 5);

  const [record] = await db.insert(emergencyAlerts).values({
    userId,
    userName,
    level,
    message,
    latitude: String(lat),
    longitude: String(lon),
    status: "active",
    respondersAssigned: responders,
    contactInfo: contactInfo || null,
  }).returning();

  const alert: EmergencyAlertData = {
    alertId: record.id,
    userId,
    userName,
    level,
    message,
    lat,
    lon,
    status: "active",
    respondersAssigned: responders,
    contactInfo: contactInfo || null,
    createdAt: record.createdAt.toISOString(),
  };

  activeAlertsCache.set(alert.alertId, alert);

  console.log(`[EMERGENCY] ALERT TRIGGERED: ${userName} (${level}) at ${lat.toFixed(4)}, ${lon.toFixed(4)} - "${message}"`);
  console.log(`[EMERGENCY] ${responders.length} responders dispatched`);

  return alert;
}

function findNearestResponders(lat: number, lon: number, count: number): string[] {
  const allUsers = getAllUserLocations();
  const distances: Array<{ userId: string; distance: number }> = [];

  for (const [userId, userLoc] of allUsers) {
    const dist = haversineDistance(lat, lon, userLoc.lat, userLoc.lon);
    distances.push({ userId, distance: dist });
  }

  distances.sort((a, b) => a.distance - b.distance);
  return distances.slice(0, count).map(d => d.userId);
}

export async function resolveEmergency(alertId: string, responderId: string): Promise<boolean> {
  const alert = activeAlertsCache.get(alertId);
  if (!alert) {
    const records = await db.select().from(emergencyAlerts).where(eq(emergencyAlerts.id, alertId)).limit(1);
    if (records.length === 0) return false;
  }

  await db.update(emergencyAlerts).set({
    status: "resolved",
    resolvedBy: responderId,
    resolvedAt: new Date(),
  }).where(eq(emergencyAlerts.id, alertId));

  if (alert) {
    alert.status = "resolved";
    alert.resolvedBy = responderId;
    alert.resolvedAt = new Date().toISOString();
    activeAlertsCache.delete(alertId);
  }

  console.log(`[EMERGENCY] Alert ${alertId} resolved by ${responderId}`);
  return true;
}

export async function getActiveAlerts(): Promise<EmergencyAlertData[]> {
  const records = await db.select().from(emergencyAlerts)
    .where(eq(emergencyAlerts.status, "active"))
    .orderBy(desc(emergencyAlerts.createdAt));

  return records.map(r => ({
    alertId: r.id,
    userId: r.userId,
    userName: r.userName || "Unknown",
    level: r.level as EmergencyLevel,
    message: r.message,
    lat: parseFloat(r.latitude),
    lon: parseFloat(r.longitude),
    status: r.status || "active",
    respondersAssigned: (r.respondersAssigned as string[]) || [],
    contactInfo: r.contactInfo,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString(),
    resolvedBy: r.resolvedBy || undefined,
  }));
}

export async function getAllAlerts(limit: number = 50): Promise<EmergencyAlertData[]> {
  const records = await db.select().from(emergencyAlerts)
    .orderBy(desc(emergencyAlerts.createdAt))
    .limit(limit);

  return records.map(r => ({
    alertId: r.id,
    userId: r.userId,
    userName: r.userName || "Unknown",
    level: r.level as EmergencyLevel,
    message: r.message,
    lat: parseFloat(r.latitude),
    lon: parseFloat(r.longitude),
    status: r.status || "active",
    respondersAssigned: (r.respondersAssigned as string[]) || [],
    contactInfo: r.contactInfo,
    createdAt: r.createdAt.toISOString(),
    resolvedAt: r.resolvedAt?.toISOString(),
    resolvedBy: r.resolvedBy || undefined,
  }));
}

export function getActiveAlertCount(): number {
  return activeAlertsCache.size;
}

console.log("[Emergency Response] Engine initialized - SOS alert system active");
