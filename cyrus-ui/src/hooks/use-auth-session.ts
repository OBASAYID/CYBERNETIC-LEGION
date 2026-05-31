import { useCallback, useEffect, useRef, useState, startTransition } from "react";
import { clearAuthWarmSessionFlag, markAuthWarmSession } from "@/lib/auth-session";
import { systemFetch } from "@/lib/system-api";
import { checkAuthValidity, clearAuthSessionStorage, persistAuthSession, USER_ID_KEY } from "@/lib/auth-storage";
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
  console.log("[CYRUS] useAuthSession: waiting for backend ready...");
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
      if (r.ok) {
        console.log("[CYRUS] useAuthSession: backend ready.");
        return;
      }
      console.log("[CYRUS] useAuthSession: backend not ready yet, status:", r.status);
    } catch (err) {
      console.warn("[CYRUS] useAuthSession: backend ready check failed:", err);
    }
    await sleep(400);
  }
  console.warn("[CYRUS] useAuthSession: backend ready wait timed out.");
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
        console.log("[CYRUS] useAuthSession: localValid =", localValid);
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
            console.warn("[CYRUS] useAuthSession: verify window exceeded, falling back to degraded.");
            outcome = "degraded";
            break;
          }
          try {
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), fetchTimeoutMs);
            const res = await systemFetch("/api/auth/user", { signal: ctrl.signal });
            window.clearTimeout(timer);
            if (cancelled) return;

            console.log("[CYRUS] useAuthSession: /api/auth/user attempt", attempt + 1, "→ status", res.status);

            if (res.ok) {
              try {
                const who = (await res.json()) as { id?: string };
                if (who?.id) localStorage.setItem(USER_ID_KEY, String(who.id));
              } catch {
                /* ignore */
              }
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
          } catch (err) {
            console.warn("[CYRUS] useAuthSession: /api/auth/user attempt", attempt + 1, "threw:", err);
            await sleep(250 + attempt * 150);
          }
        }

        if (cancelled) return;
        console.log("[CYRUS] useAuthSession: outcome =", outcome);
        if (outcome === "ok") {
          markAuthWarmSession();
          startTransition(() => setIsAuthenticated(true));
        } else if (outcome === "unauthorized") {
          clearAuthWarmSessionFlag();
          clearAuthSessionStorage();
          startTransition(() => setIsAuthenticated(false));
        } else {
          // Degraded: trust local storage rather than blocking the user
          console.warn("[CYRUS] useAuthSession: degraded outcome — using localValid =", localValid);
          startTransition(() => setIsAuthenticated(localValid));
        }
      } catch (err) {
        console.error("[CYRUS] useAuthSession: verifySession threw unexpectedly:", err);
        // Fall back to local auth state so the UI doesn't stay blank
        const localValid = checkAuthValidity();
        startTransition(() => setIsAuthenticated(localValid));
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
