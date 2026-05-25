import { useEffect } from "react";
import { usePresence } from "../contexts/PresenceContext";
import { clearAccountUserIdCache } from "../lib/cyrus-identity";
import { CYRUS_SESSION_TOKEN_KEY } from "@shared/cyrus-identity";
import { systemFetch } from "@shared/cyrus-api-client";

/** Dispatched when login completes in the same tab (`persistAuthSession`). */
export const CYRUS_AUTH_SESSION_CHANGED = "cyrus-auth-session-changed";

function readDisplayName(): string {
  if (typeof localStorage === "undefined") return "CYRUS User";
  return localStorage.getItem("cyrus-display-name")?.trim() || "CYRUS User";
}

/**
 * Connect `/cyrus-io` presence after auth, retry while the server boots, and
 * re-register when the session token appears (post-login).
 */
export function usePresenceBootstrap(enabled = true): void {
  const { connectPresence } = usePresence();

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const connect = () => connectPresence(readDisplayName());

    const waitForReady = async () => {
      for (let attempt = 0; attempt < 12; attempt++) {
        try {
          const res = await systemFetch("/api/ready", { cache: "no-store" });
          if (res.ok) break;
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, 500 + attempt * 400));
      }
      connect();
    };

    void waitForReady();

    const retryMs = [1500, 4000, 10000, 20000];
    const timers = retryMs.map((ms) => window.setTimeout(connect, ms));

    const onAuthChanged = () => {
      clearAccountUserIdCache();
      connectPresence(readDisplayName());
    };

    window.addEventListener(CYRUS_AUTH_SESSION_CHANGED, onAuthChanged);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CYRUS_SESSION_TOKEN_KEY) onAuthChanged();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      window.removeEventListener(CYRUS_AUTH_SESSION_CHANGED, onAuthChanged);
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled, connectPresence]);
}

export function CommsPresenceBootstrap({ enabled = true }: { enabled?: boolean }) {
  usePresenceBootstrap(enabled);
  return null;
}
