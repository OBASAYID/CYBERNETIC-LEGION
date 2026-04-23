import { db } from "../db.js";
import { healthDeviceConnections, healthVitals, healthActivity, healthSleep, healthBodyMetrics } from "../../shared/schema";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";

function toDbNumeric(value: number | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value.toString();
}

export type HealthProvider = "fitbit" | "oura" | "whoop" | "dexcom" | "withings" | "apple_health" | "google_fit" | "samsung_health";

const STATE_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const pendingStates = new Map<string, { userId: string; provider: string; expiresAt: number }>();

function generateSecureState(userId: string, provider: string): string {
  const nonce = crypto.randomBytes(16).toString("hex");
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const payload = `${nonce}:${userId}:${provider}:${expiresAt}`;
  const signature = crypto.createHmac("sha256", STATE_SECRET).update(payload).digest("hex");
  const state = Buffer.from(`${payload}:${signature}`).toString("base64url");
  pendingStates.set(nonce, { userId, provider, expiresAt });
  return state;
}

function validateState(state: string): { userId: string; provider: string } | null {
  try {
    const decoded = Buffer.from(state, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 5) return null;
    const [nonce, userId, provider, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) {
      pendingStates.delete(nonce);
      return null;
    }
    const payload = `${nonce}:${userId}:${provider}:${expiresAtStr}`;
    const expectedSignature = crypto.createHmac("sha256", STATE_SECRET).update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    const stored = pendingStates.get(nonce);
    if (!stored || stored.userId !== userId || stored.provider !== provider) {
      return null;
    }
    pendingStates.delete(nonce);
    return { userId, provider };
  } catch {
    return null;
  }
}

interface ProviderConfig {
  name: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
  clientIdEnv: string;
  clientSecretEnv: string;
  dataEndpoints: Record<string, string>;
}

const PROVIDER_CONFIGS: Record<HealthProvider, ProviderConfig> = {
  fitbit: {
    name: "Fitbit",
    authUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scopes: ["activity", "heartrate", "location", "nutrition", "profile", "settings", "sleep", "social", "weight", "oxygen_saturation", "respiratory_rate", "temperature"],
    clientIdEnv: "FITBIT_CLIENT_ID",
    clientSecretEnv: "FITBIT_CLIENT_SECRET",
    dataEndpoints: {
      heartRate: "/1/user/-/activities/heart/date/today/1d.json",
      sleep: "/1.2/user/-/sleep/date/today.json",
      activity: "/1/user/-/activities/date/today.json",
      weight: "/1/user/-/body/log/weight/date/today.json",
      spo2: "/1/user/-/spo2/date/today.json",
      hrv: "/1/user/-/hrv/date/today.json",
      temperature: "/1/user/-/temp/skin/date/today.json",
    },
  },
  oura: {
    name: "Oura Ring",
    authUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    scopes: ["daily", "heartrate", "personal", "session", "spo2", "tag", "workout", "sleep"],
    clientIdEnv: "OURA_CLIENT_ID",
    clientSecretEnv: "OURA_CLIENT_SECRET",
    dataEndpoints: {
      dailyActivity: "/v2/usercollection/daily_activity",
      dailySleep: "/v2/usercollection/daily_sleep",
      dailyReadiness: "/v2/usercollection/daily_readiness",
      heartRate: "/v2/usercollection/heartrate",
      sleep: "/v2/usercollection/sleep",
      personalInfo: "/v2/usercollection/personal_info",
    },
  },
  whoop: {
    name: "WHOOP",
    authUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    scopes: ["read:recovery", "read:cycles", "read:workout", "read:sleep", "read:profile", "read:body_measurement"],
    clientIdEnv: "WHOOP_CLIENT_ID",
    clientSecretEnv: "WHOOP_CLIENT_SECRET",
    dataEndpoints: {
      recovery: "/v1/recovery",
      sleep: "/v1/sleep",
      workout: "/v1/workout",
      cycle: "/v1/cycle",
      profile: "/v1/user/profile/basic",
    },
  },
  dexcom: {
    name: "Dexcom CGM",
    authUrl: "https://api.dexcom.com/v2/oauth2/login",
    tokenUrl: "https://api.dexcom.com/v2/oauth2/token",
    scopes: ["offline_access"],
    clientIdEnv: "DEXCOM_CLIENT_ID",
    clientSecretEnv: "DEXCOM_CLIENT_SECRET",
    dataEndpoints: {
      egvs: "/v3/users/self/egvs",
      events: "/v3/users/self/events",
      devices: "/v3/users/self/devices",
      dataRange: "/v3/users/self/dataRange",
    },
  },
  withings: {
    name: "Withings",
    authUrl: "https://account.withings.com/oauth2_user/authorize2",
    tokenUrl: "https://wbsapi.withings.net/v2/oauth2",
    scopes: ["user.info", "user.metrics", "user.activity", "user.sleepevents"],
    clientIdEnv: "WITHINGS_CLIENT_ID",
    clientSecretEnv: "WITHINGS_CLIENT_SECRET",
    dataEndpoints: {
      measure: "/measure",
      activity: "/v2/measure",
      sleep: "/v2/sleep",
      heart: "/v2/heart",
    },
  },
  apple_health: {
    name: "Apple Health",
    authUrl: "",
    tokenUrl: "",
    scopes: [],
    clientIdEnv: "",
    clientSecretEnv: "",
    dataEndpoints: {},
  },
  google_fit: {
    name: "Google Fit",
    authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: ["https://www.googleapis.com/auth/fitness.activity.read", "https://www.googleapis.com/auth/fitness.heart_rate.read", "https://www.googleapis.com/auth/fitness.sleep.read", "https://www.googleapis.com/auth/fitness.body.read"],
    clientIdEnv: "GOOGLE_FIT_CLIENT_ID",
    clientSecretEnv: "GOOGLE_FIT_CLIENT_SECRET",
    dataEndpoints: {
      dataSources: "/fitness/v1/users/me/dataSources",
      sessions: "/fitness/v1/users/me/sessions",
    },
  },
  samsung_health: {
    name: "Samsung Health (Galaxy Watch)",
    authUrl: "https://api.samsunghealth.com/oauth/authorize",
    tokenUrl: "https://api.samsunghealth.com/oauth/token",
    scopes: ["health.heart_rate.read", "health.sleep.read", "health.activity.read", "health.body.read", "health.oxygen_saturation.read", "health.stress.read", "health.blood_pressure.read"],
    clientIdEnv: "SAMSUNG_HEALTH_CLIENT_ID",
    clientSecretEnv: "SAMSUNG_HEALTH_CLIENT_SECRET",
    dataEndpoints: {
      heartRate: "/v1/users/me/heart-rate",
      sleep: "/v1/users/me/sleep",
      activity: "/v1/users/me/activity",
      steps: "/v1/users/me/steps",
      stress: "/v1/users/me/stress",
      bloodOxygen: "/v1/users/me/spo2",
      bloodPressure: "/v1/users/me/blood-pressure",
      bodyComposition: "/v1/users/me/body-composition",
    },
  },
};

export class HealthIntegrationsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}`
      : "http://localhost:5000";
  }

  getProviderConfig(provider: HealthProvider): ProviderConfig {
    return PROVIDER_CONFIGS[provider];
  }

  getAvailableProviders(): { provider: HealthProvider; name: string; configured: boolean }[] {
    return Object.entries(PROVIDER_CONFIGS).map(([provider, config]) => ({
      provider: provider as HealthProvider,
      name: config.name,
      configured: !!(process.env[config.clientIdEnv] && process.env[config.clientSecretEnv]),
    }));
  }

  getOAuthUrl(provider: HealthProvider, userId: string): string | null {
    const config = PROVIDER_CONFIGS[provider];
    const clientId = process.env[config.clientIdEnv];
    
    if (!clientId || !config.authUrl) {
      return null;
    }

    const redirectUri = `${this.baseUrl}/api/health/oauth/callback/${provider}`;
    const state = generateSecureState(userId, provider);
    
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: config.scopes.join(" "),
      state,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  async exchangeCodeForTokens(provider: HealthProvider, code: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
    const config = PROVIDER_CONFIGS[provider];
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    
    if (!clientId || !clientSecret) {
      console.error(`Missing credentials for ${provider}`);
      return null;
    }

    const redirectUri = `${this.baseUrl}/api/health/oauth/callback/${provider}`;

    try {
      let body: URLSearchParams | string;
      const headers: Record<string, string> = {};

      if (provider === "fitbit") {
        body = new URLSearchParams({
          client_id: clientId,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        });
        headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      } else {
        body = new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "authorization_code",
          redirect_uri: redirectUri,
          code,
        });
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }

      const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers,
        body: body.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Token exchange failed for ${provider}:`, errorText);
        return null;
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error(`Error exchanging code for ${provider}:`, error);
      return null;
    }
  }

  async refreshAccessToken(provider: HealthProvider, refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number } | null> {
    const config = PROVIDER_CONFIGS[provider];
    const clientId = process.env[config.clientIdEnv];
    const clientSecret = process.env[config.clientSecretEnv];
    
    if (!clientId || !clientSecret) {
      return null;
    }

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/x-www-form-urlencoded",
      };

      if (provider === "fitbit") {
        headers["Authorization"] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
      }

      const body = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        ...(provider !== "fitbit" ? { client_id: clientId, client_secret: clientSecret } : {}),
      });

      const response = await fetch(config.tokenUrl, {
        method: "POST",
        headers,
        body: body.toString(),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token || refreshToken,
        expiresIn: data.expires_in,
      };
    } catch (error) {
      console.error(`Error refreshing token for ${provider}:`, error);
      return null;
    }
  }

  async saveConnection(
    userId: string,
    provider: HealthProvider,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
  ): Promise<void> {
    const existing = await db.select()
      .from(healthDeviceConnections)
      .where(and(
        eq(healthDeviceConnections.userId, userId),
        eq(healthDeviceConnections.provider, provider)
      ))
      .limit(1);

    const tokenExpiry = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000)
      : undefined;

    if (existing.length > 0) {
      await db.update(healthDeviceConnections)
        .set({
          accessToken,
          refreshToken: refreshToken || existing[0].refreshToken,
          tokenExpiry,
          isActive: true,
          updatedAt: new Date(),
        })
        .where(eq(healthDeviceConnections.id, existing[0].id));
    } else {
      await db.insert(healthDeviceConnections).values({
        userId,
        provider,
        accessToken,
        refreshToken,
        tokenExpiry,
        scopes: PROVIDER_CONFIGS[provider].scopes,
        isActive: true,
      });
    }
  }

  async getConnection(userId: string, provider: HealthProvider) {
    const connections = await db.select()
      .from(healthDeviceConnections)
      .where(and(
        eq(healthDeviceConnections.userId, userId),
        eq(healthDeviceConnections.provider, provider),
        eq(healthDeviceConnections.isActive, true)
      ))
      .limit(1);

    return connections[0] || null;
  }

  async getActiveConnections(userId: string) {
    return db.select()
      .from(healthDeviceConnections)
      .where(and(
        eq(healthDeviceConnections.userId, userId),
        eq(healthDeviceConnections.isActive, true)
      ));
  }

  async disconnectProvider(userId: string, provider: HealthProvider): Promise<void> {
    await db.update(healthDeviceConnections)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(healthDeviceConnections.userId, userId),
        eq(healthDeviceConnections.provider, provider)
      ));
  }

  async fetchProviderData(userId: string, provider: HealthProvider): Promise<any> {
    const connection = await this.getConnection(userId, provider);
    if (!connection || !connection.accessToken) {
      throw new Error(`No active connection for ${provider}`);
    }

    if (connection.tokenExpiry && new Date(connection.tokenExpiry) < new Date()) {
      if (connection.refreshToken) {
        const newTokens = await this.refreshAccessToken(provider, connection.refreshToken);
        if (newTokens) {
          await this.saveConnection(userId, provider, newTokens.accessToken, newTokens.refreshToken, newTokens.expiresIn);
          connection.accessToken = newTokens.accessToken;
        } else {
          throw new Error(`Failed to refresh token for ${provider}`);
        }
      } else {
        throw new Error(`Token expired and no refresh token for ${provider}`);
      }
    }

    const config = PROVIDER_CONFIGS[provider];
    const data: Record<string, any> = {};

    for (const [key, endpoint] of Object.entries(config.dataEndpoints)) {
      try {
        const baseUrl = this.getProviderApiBase(provider);
        const response = await fetch(`${baseUrl}${endpoint}`, {
          headers: {
            Authorization: `Bearer ${connection.accessToken}`,
          },
        });

        if (response.ok) {
          data[key] = await response.json();
        }
      } catch (error) {
        console.error(`Error fetching ${key} from ${provider}:`, error);
      }
    }

    await db.update(healthDeviceConnections)
      .set({ lastSync: new Date() })
      .where(eq(healthDeviceConnections.id, connection.id));

    return data;
  }

  private getProviderApiBase(provider: HealthProvider): string {
    switch (provider) {
      case "fitbit": return "https://api.fitbit.com";
      case "oura": return "https://api.ouraring.com";
      case "whoop": return "https://api.prod.whoop.com/developer";
      case "dexcom": return "https://api.dexcom.com";
      case "withings": return "https://wbsapi.withings.net";
      case "google_fit": return "https://www.googleapis.com";
      case "samsung_health": return "https://api.samsunghealth.com";
      default: return "";
    }
  }

  async syncAllProviders(userId: string): Promise<{ provider: string; success: boolean; data?: any; error?: string }[]> {
    const connections = await this.getActiveConnections(userId);
    const results: { provider: string; success: boolean; data?: any; error?: string }[] = [];

    for (const connection of connections) {
      try {
        const data = await this.fetchProviderData(userId, connection.provider as HealthProvider);
        await this.storeHealthData(userId, connection.provider as HealthProvider, data);
        results.push({ provider: connection.provider, success: true, data });
      } catch (error) {
        results.push({ 
          provider: connection.provider, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  }

  async storeHealthData(userId: string, provider: HealthProvider, data: any): Promise<void> {
    const now = new Date();

    if (provider === "fitbit") {
      if (data.heartRate?.["activities-heart"]?.[0]) {
        const hrData = data.heartRate["activities-heart"][0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          heartRate: hrData.value?.restingHeartRate || null,
          recordedAt: now,
        });
      }

      if (data.activity?.summary) {
        const activity = data.activity.summary;
        await db.insert(healthActivity).values({
          userId,
          provider,
          steps: activity.steps,
          activeMinutes: (activity.fairlyActiveMinutes || 0) + (activity.veryActiveMinutes || 0),
          caloriesBurned: activity.caloriesOut,
          distance: toDbNumeric(Math.round((activity.distances?.find((d: any) => d.activity === "total")?.distance || 0) * 1000)),
          floors: activity.floors,
          recordedAt: now,
        });
      }

      if (data.sleep?.sleep?.[0]) {
        const sleep = data.sleep.sleep[0];
        await db.insert(healthSleep).values({
          userId,
          provider,
          totalSleepMinutes: sleep.minutesAsleep,
          deepSleepMinutes: sleep.levels?.summary?.deep?.minutes || null,
          remSleepMinutes: sleep.levels?.summary?.rem?.minutes || null,
          lightSleepMinutes: sleep.levels?.summary?.light?.minutes || null,
          awakeDuration: sleep.minutesAwake,
          sleepEfficiency: sleep.efficiency,
          recordedAt: now,
        });
      }
    }

    if (provider === "oura") {
      if (data.dailySleep?.data?.[0]) {
        const sleep = data.dailySleep.data[0];
        await db.insert(healthSleep).values({
          userId,
          provider,
          totalSleepMinutes: Math.round(sleep.total_sleep_duration / 60),
          deepSleepMinutes: Math.round((sleep.deep_sleep_duration || 0) / 60),
          remSleepMinutes: Math.round((sleep.rem_sleep_duration || 0) / 60),
          lightSleepMinutes: Math.round((sleep.light_sleep_duration || 0) / 60),
          sleepScore: sleep.score,
          sleepEfficiency: sleep.efficiency,
          recordedAt: now,
        });
      }

      if (data.dailyActivity?.data?.[0]) {
        const activity = data.dailyActivity.data[0];
        await db.insert(healthActivity).values({
          userId,
          provider,
          steps: activity.steps,
          activeMinutes: Math.round((activity.active_calories || 0) / 10),
          caloriesBurned: activity.total_calories,
          recordedAt: now,
        });
      }
    }

    if (provider === "whoop") {
      if (data.recovery?.records?.[0]) {
        const recovery = data.recovery.records[0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          heartRateVariability: Math.round(recovery.score?.hrv_rmssd_milli || 0),
          heartRate: recovery.score?.resting_heart_rate || null,
          stressLevel: recovery.score?.recovery_score ? 100 - recovery.score.recovery_score : null,
          recordedAt: now,
        });
      }

      if (data.sleep?.records?.[0]) {
        const sleep = data.sleep.records[0];
        await db.insert(healthSleep).values({
          userId,
          provider,
          totalSleepMinutes: Math.round((sleep.score?.total_in_bed_time_milli || 0) / 60000),
          sleepScore: sleep.score?.sleep_performance_percentage,
          sleepEfficiency: sleep.score?.sleep_efficiency_percentage,
          recordedAt: now,
        });
      }
    }

    if (provider === "dexcom") {
      if (data.egvs?.records?.[0]) {
        const glucose = data.egvs.records[0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          bloodGlucose: glucose.value,
          recordedAt: new Date(glucose.systemTime),
        });
      }
    }

    if (provider === "withings") {
      if (data.measure?.body?.measuregrps?.[0]) {
        const measures = data.measure.body.measuregrps[0].measures;
        const weightMeasure = measures.find((m: any) => m.type === 1);
        const fatMeasure = measures.find((m: any) => m.type === 6);

        if (weightMeasure || fatMeasure) {
          await db.insert(healthBodyMetrics).values({
            userId,
            provider,
            weight: toDbNumeric(weightMeasure ? Math.round(weightMeasure.value * Math.pow(10, weightMeasure.unit) * 10) : null),
            bodyFat: toDbNumeric(fatMeasure ? Math.round(fatMeasure.value * Math.pow(10, fatMeasure.unit) * 10) : null),
            recordedAt: now,
          });
        }
      }
    }

    if (provider === "samsung_health") {
      if (data.heartRate?.data?.[0]) {
        const hr = data.heartRate.data[0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          heartRate: hr.heart_rate || hr.bpm || null,
          heartRateVariability: hr.hrv || null,
          recordedAt: now,
        });
      }

      if (data.bloodOxygen?.data?.[0]) {
        const spo2 = data.bloodOxygen.data[0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          oxygenSaturation: spo2.spo2 || spo2.oxygen_saturation || null,
          recordedAt: now,
        });
      }

      if (data.stress?.data?.[0]) {
        const stress = data.stress.data[0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          stressLevel: stress.stress_level || stress.score || null,
          recordedAt: now,
        });
      }

      if (data.bloodPressure?.data?.[0]) {
        const bp = data.bloodPressure.data[0];
        await db.insert(healthVitals).values({
          userId,
          provider,
          bloodPressureSystolic: bp.systolic || null,
          bloodPressureDiastolic: bp.diastolic || null,
          recordedAt: now,
        });
      }

      if (data.activity?.data?.[0] || data.steps?.data?.[0]) {
        const activity = data.activity?.data?.[0] || {};
        const steps = data.steps?.data?.[0] || {};
        await db.insert(healthActivity).values({
          userId,
          provider,
          steps: steps.count || activity.steps || null,
          activeMinutes: activity.active_minutes || null,
          caloriesBurned: activity.calories || null,
          distance: toDbNumeric(activity.distance || null),
          recordedAt: now,
        });
      }

      if (data.sleep?.data?.[0]) {
        const sleep = data.sleep.data[0];
        await db.insert(healthSleep).values({
          userId,
          provider,
          totalSleepMinutes: sleep.total_sleep_minutes || Math.round((sleep.duration || 0) / 60000),
          deepSleepMinutes: sleep.deep_sleep_minutes || null,
          remSleepMinutes: sleep.rem_sleep_minutes || null,
          lightSleepMinutes: sleep.light_sleep_minutes || null,
          sleepScore: sleep.sleep_score || null,
          sleepEfficiency: sleep.efficiency || null,
          recordedAt: now,
        });
      }

      if (data.bodyComposition?.data?.[0]) {
        const body = data.bodyComposition.data[0];
        await db.insert(healthBodyMetrics).values({
          userId,
          provider,
          weight: toDbNumeric(body.weight ? Math.round(body.weight * 10) : null),
          bodyFat: toDbNumeric(body.body_fat_percentage ? Math.round(body.body_fat_percentage * 10) : null),
          muscleMass: toDbNumeric(body.muscle_mass ? Math.round(body.muscle_mass * 10) : null),
          recordedAt: now,
        });
      }
    }
  }

  async getLatestVitals(userId: string): Promise<any> {
    const vitals = await db.select()
      .from(healthVitals)
      .where(eq(healthVitals.userId, userId))
      .orderBy(desc(healthVitals.recordedAt))
      .limit(10);

    const activity = await db.select()
      .from(healthActivity)
      .where(eq(healthActivity.userId, userId))
      .orderBy(desc(healthActivity.recordedAt))
      .limit(1);

    const sleep = await db.select()
      .from(healthSleep)
      .where(eq(healthSleep.userId, userId))
      .orderBy(desc(healthSleep.recordedAt))
      .limit(1);

    const bodyMetrics = await db.select()
      .from(healthBodyMetrics)
      .where(eq(healthBodyMetrics.userId, userId))
      .orderBy(desc(healthBodyMetrics.recordedAt))
      .limit(1);

    return {
      vitals: vitals[0] || null,
      activity: activity[0] || null,
      sleep: sleep[0] || null,
      bodyMetrics: bodyMetrics[0] || null,
      history: {
        vitals,
      },
    };
  }
}

export const healthIntegrations = new HealthIntegrationsService();
export { validateState };
