/**
 * Browser identity — device id (per install) + account id (session, shared across devices).
 */
import {
  buildCommsUserId,
  CYRUS_COMM_USER_LEGACY_KEY,
  CYRUS_DEVICE_ID_KEY,
  CYRUS_DEVICE_ID_LEGACY_KEY,
  CYRUS_SESSION_TOKEN_KEY,
  type CyrusIdentity,
} from "@shared/cyrus-identity";
import { systemFetch } from "@shared/cyrus-api-client";

export { buildCommsUserId, type CyrusIdentity };

export function getCommsDeviceId(): string {
  if (typeof localStorage === "undefined") {
    return `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
  const primary = localStorage.getItem(CYRUS_DEVICE_ID_KEY);
  const legacy = localStorage.getItem(CYRUS_DEVICE_ID_LEGACY_KEY);
  const legacyComm = localStorage.getItem(CYRUS_COMM_USER_LEGACY_KEY);

  let deviceId = primary || legacy || legacyComm;
  if (!deviceId) {
    deviceId = `device_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  localStorage.setItem(CYRUS_DEVICE_ID_KEY, deviceId);
  localStorage.setItem(CYRUS_DEVICE_ID_LEGACY_KEY, deviceId);
  return deviceId;
}

let cachedAccountUserId: string | null | undefined;

/** Account user id from session token / `/api/auth/user` — same on every device for that login. */
export async function resolveAccountUserId(force = false): Promise<string | null> {
  if (!force && cachedAccountUserId !== undefined) return cachedAccountUserId;

  if (typeof window === "undefined") {
    cachedAccountUserId = null;
    return null;
  }

  const token = localStorage.getItem(CYRUS_SESSION_TOKEN_KEY);
  if (!token) {
    cachedAccountUserId = null;
    return null;
  }

  try {
    const res = await systemFetch("/api/auth/user");
    if (!res.ok) {
      cachedAccountUserId = null;
      return null;
    }
    const data = (await res.json()) as {
      id?: string;
      sub?: string;
      username?: string;
      user?: { id?: string };
      claims?: { sub?: string };
    };
    const id =
      data.id ||
      data.sub ||
      data.user?.id ||
      data.claims?.sub ||
      null;
    cachedAccountUserId = typeof id === "string" && id.trim() ? id.trim() : null;
    if (cachedAccountUserId) {
      localStorage.setItem(CYRUS_COMM_USER_LEGACY_KEY, cachedAccountUserId);
    }
    return cachedAccountUserId;
  } catch {
    cachedAccountUserId = null;
    return null;
  }
}

export function clearAccountUserIdCache(): void {
  cachedAccountUserId = undefined;
}

export async function resolveCyrusIdentity(forceAccount = false): Promise<CyrusIdentity> {
  const deviceId = getCommsDeviceId();
  const accountUserId = await resolveAccountUserId(forceAccount);
  const commsUserId = buildCommsUserId(accountUserId, deviceId);
  return { deviceId, accountUserId, commsUserId };
}
