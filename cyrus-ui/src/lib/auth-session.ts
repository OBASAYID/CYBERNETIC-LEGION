/** Dev-only: after `/api/auth/user` succeeds, HMR remounts skip the blocking auth splash. */
const AUTH_WARM_SESSION_KEY = "cyrus_auth_warm";

export function clearAuthWarmSessionFlag(): void {
  try {
    sessionStorage.removeItem(AUTH_WARM_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function markAuthWarmSession(): void {
  if (!import.meta.env.DEV) {
    return;
  }
  try {
    sessionStorage.setItem(AUTH_WARM_SESSION_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasAuthWarmSession(): boolean {
  if (!import.meta.env.DEV) {
    return false;
  }
  try {
    return sessionStorage.getItem(AUTH_WARM_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}
