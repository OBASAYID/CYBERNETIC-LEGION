/**
 * CYRUS identity model — account (session) vs device (browser install).
 * Same account on phone + laptop shares userId; each browser keeps its own deviceId.
 */

/** localStorage keys — keep in sync across cyrus-ui and client/. */
export const CYRUS_DEVICE_ID_KEY = "cyrus_device_id";
export const CYRUS_DEVICE_ID_LEGACY_KEY = "cyrus-device-id";
export const CYRUS_SESSION_TOKEN_KEY = "cyrus_session_token";
export const CYRUS_COMM_USER_LEGACY_KEY = "cyrus_comm_user_id";

export type CyrusIdentity = {
  /** Stable per-browser install (UUID-like). */
  deviceId: string;
  /** Account id from auth session; null when anonymous. */
  accountUserId: string | null;
  /** Comms/signaling user id — account when logged in, else deviceId. */
  commsUserId: string;
};

export function buildCommsUserId(accountUserId: string | null | undefined, deviceId: string): string {
  const account = typeof accountUserId === "string" ? accountUserId.trim() : "";
  return account || deviceId;
}

/** Socket/presence map key — one entry per device even when account is shared. */
export function buildPresenceKey(commsUserId: string, deviceId: string): string {
  return `${commsUserId}::${deviceId}`;
}

export function parsePresenceKey(key: string): { commsUserId: string; deviceId: string } {
  const idx = key.lastIndexOf("::");
  if (idx <= 0) return { commsUserId: key, deviceId: key };
  return { commsUserId: key.slice(0, idx), deviceId: key.slice(idx + 2) };
}
