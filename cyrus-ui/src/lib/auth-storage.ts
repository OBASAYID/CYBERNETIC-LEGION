import type { GateProfile } from "@/components/password-gate";

export const AUTH_KEY = "cyrus_auth_session";
export const AUTH_TIMESTAMP_KEY = "cyrus_auth_timestamp";
export const SESSION_TOKEN_KEY = "cyrus_session_token";
export const USER_ID_KEY = "cyrus-user-id";
export const GATE_DRAFT_KEY = "cyrus_gate_draft_v1";
export const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function getAuthenticatedUserId(): string {
  try {
    const id = localStorage.getItem(USER_ID_KEY);
    if (id?.trim()) return id.trim();
  } catch {
    /* ignore */
  }
  return "local-operator";
}

export function getSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function markBiometricVerified(): void {
  try {
    localStorage.setItem("cyrus_biometric_verified", "true");
  } catch {
    /* ignore */
  }
}

export function getStoredUserRole(): "admin" | "user" | null {
  try {
    const r = localStorage.getItem("cyrus-user-role");
    if (r === "admin" || r === "user") return r;
    return null;
  } catch {
    return null;
  }
}

export function clearAuthSessionStorage(): void {
  try {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(AUTH_TIMESTAMP_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem("cyrus-user-role");
    localStorage.removeItem("cyrus-display-name");
    // Critical comms/session isolation cleanup: remove persisted identity/cursors
    // so account switching cannot inherit previous transport/message state.
    localStorage.removeItem("cyrus_comm_user_id");
    localStorage.removeItem("cyrus_device_id");
    localStorage.removeItem("cyrus-device-id");
    localStorage.removeItem("cyrus_comms_event_seq_v1");
    localStorage.removeItem("cyrus_comms_client_seq_v1");
    localStorage.removeItem("cyrus-force-relay");
  } catch {
    /* ignore */
  }
}

export const CYRUS_AUTH_SESSION_CHANGED = "cyrus-auth-session-changed";

export function persistAuthSession(sessionToken: string, profile: GateProfile): void {
  localStorage.setItem(AUTH_KEY, "valid");
  localStorage.setItem(AUTH_TIMESTAMP_KEY, Date.now().toString());
  if (sessionToken) localStorage.setItem(SESSION_TOKEN_KEY, sessionToken);
  if (profile.userId?.trim()) localStorage.setItem(USER_ID_KEY, profile.userId.trim());
  localStorage.setItem("cyrus-display-name", profile.displayName);
  localStorage.setItem("cyrus-user-role", profile.role);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CYRUS_AUTH_SESSION_CHANGED));
  }
}

export function checkAuthValidity(): boolean {
  try {
    const auth = localStorage.getItem(AUTH_KEY);
    const timestamp = localStorage.getItem(AUTH_TIMESTAMP_KEY);
    if (auth !== "valid" || !timestamp) return false;

    const authTime = parseInt(timestamp, 10);
    if (Date.now() - authTime > SESSION_DURATION_MS) {
      clearAuthSessionStorage();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function readGateDraft(fallbackUsername: string): { username: string; password: string } {
  try {
    const raw = sessionStorage.getItem(GATE_DRAFT_KEY);
    if (!raw) {
      return { username: fallbackUsername, password: "" };
    }
    const parsed = JSON.parse(raw) as { u?: unknown; p?: unknown };
    return {
      username: typeof parsed.u === "string" ? parsed.u : fallbackUsername,
      password: typeof parsed.p === "string" ? parsed.p : "",
    };
  } catch {
    return { username: fallbackUsername, password: "" };
  }
}

export function writeGateDraft(username: string, password: string): void {
  try {
    sessionStorage.setItem(GATE_DRAFT_KEY, JSON.stringify({ u: username, p: password }));
  } catch {
    /* ignore */
  }
}

export function clearGateDraft(): void {
  try {
    sessionStorage.removeItem(GATE_DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

