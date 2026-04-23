import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { clearAuthWarmSessionFlag, markAuthWarmSession } from "@/lib/auth-session";
import { systemFetch } from "@/lib/system-api";
import { checkAuthValidity, clearAuthSessionStorage, persistAuthSession } from "@/lib/auth-storage";
import { getApiFetchTimeoutMs } from "@/lib/api-timing";
import type { GateProfile } from "@/components/password-gate";

const MAX_VERIFY_WINDOW_MS = 30_000;
const AUTH_USER_MAX_ATTEMPTS = 6;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForBackendReady(cancelled: () => boolean): Promise<void> {
  const fetchTimeoutMs = getApiFetchTimeoutMs();
  const deadline = Date.now() + 45_000;
  while (!cancelled() && Date.now() < deadline) {
    try {
      const ctrl = new AbortController();
      const timer = window.setTimeout(() => ctrl.abort(), fetchTimeoutMs);
      let r = await systemFetch("/api/ready", { cache: "no-store", signal: ctrl.signal });
      window.clearTimeout(timer);

      if (r.status === 404) {
        const ctrl2 = new AbortController();
        const timer2 = window.setTimeout(() => ctrl2.abort(), fetchTimeoutMs);
        r = await systemFetch("/health/ready", { cache: "no-store", signal: ctrl2.signal });
        window.clearTimeout(timer2);
      }
      if (r.ok) return;
    } catch {
      /* ignore */
    }
    await sleep(400);
  }
}

/**
 * Keeps localStorage session flags aligned with the Express session cookie on cold load.
 * Does not gate the UI — App renders the dashboard as soon as `isAuthenticated` is true.
 */
export function useAuthSession() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => checkAuthValidity());
  const checkStartedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    checkStartedAtRef.current = Date.now();

    async function verifySession() {
      try {
        const localValid = checkAuthValidity();
        if (!localValid) {
          startTransition(() => setIsAuthenticated(false));
          return;
        }

        await waitForBackendReady(() => cancelled);
        if (cancelled) return;

        type RemoteAuth = "ok" | "unauthorized" | "degraded";
        let outcome: RemoteAuth = "degraded";

        const fetchTimeoutMs = getApiFetchTimeoutMs();
        for (let attempt = 0; attempt < AUTH_USER_MAX_ATTEMPTS && !cancelled; attempt++) {
          if (Date.now() - checkStartedAtRef.current > MAX_VERIFY_WINDOW_MS) {
            outcome = "degraded";
            break;
          }
          try {
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), fetchTimeoutMs);
            const res = await systemFetch("/api/auth/user", { signal: ctrl.signal });
            window.clearTimeout(timer);
            if (cancelled) return;

            if (res.ok) {
              outcome = "ok";
              break;
            }
            if (res.status === 401 || res.status === 403) {
              await sleep(350 + attempt * 200);
              if (attempt >= AUTH_USER_MAX_ATTEMPTS - 1) {
                outcome = "unauthorized";
              }
              continue;
            }
            if (res.status === 503 || res.status >= 500) {
              await sleep(250 + attempt * 150);
              continue;
            }
            outcome = "degraded";
            break;
          } catch {
            await sleep(250 + attempt * 150);
          }
        }

        if (cancelled) return;
        if (outcome === "ok") {
          markAuthWarmSession();
          startTransition(() => setIsAuthenticated(true));
        } else if (outcome === "unauthorized") {
          clearAuthWarmSessionFlag();
          clearAuthSessionStorage();
          startTransition(() => setIsAuthenticated(false));
        } else {
          startTransition(() => setIsAuthenticated(localValid));
        }
      } catch {
        /* ignore */
      }
    }

    void verifySession();
    return () => {
      cancelled = true;
    };
  }, []);

  const onAuthenticated = useCallback((sessionToken: string, profile: GateProfile) => {
    try {
      persistAuthSession(sessionToken, profile);
      markAuthWarmSession();
      startTransition(() => setIsAuthenticated(true));
    } catch {
      console.warn("Could not persist auth to storage");
      markAuthWarmSession();
      startTransition(() => setIsAuthenticated(true));
    }
  }, []);

  return {
    isAuthenticated,
    onAuthenticated,
  };
}
