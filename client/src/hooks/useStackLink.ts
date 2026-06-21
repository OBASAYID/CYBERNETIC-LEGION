import { useEffect, useRef, useState } from "react";
import { probeStackLink, waitForStackLinkReady, type StackLinkResponse } from "@shared/cyrus-stack-link";
import { CYRUS_SESSION_TOKEN_KEY } from "@shared/cyrus-identity";

export type StackLinkState = {
  loading: boolean;
  link: StackLinkResponse | null;
  ready: boolean;
};

/**
 * Validates user ↔ server ↔ database chain after login and on session changes.
 */
export function useStackLink(enabled = true): StackLinkState {
  const [state, setState] = useState<StackLinkState>({
    loading: enabled,
    link: null,
    ready: false,
  });
  const runRef = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setState({ loading: false, link: null, ready: true });
      return;
    }

    const runId = ++runRef.current;
    setState((prev) => ({ ...prev, loading: true }));

    void (async () => {
      const link = await waitForStackLinkReady();
      if (runRef.current !== runId) return;
      const ready = Boolean(link?.chain.server.ok && link?.chain.database.ok);
      setState({ loading: false, link, ready });
      if (link && !link.ok) {
        console.warn("[StackLink] chain degraded:", link.chain);
      }
    })();

    const refresh = () => {
      void probeStackLink().then((link) => {
        if (runRef.current !== runId) return;
        setState({
          loading: false,
          link,
          ready: Boolean(link?.chain.server.ok && link?.chain.database.ok),
        });
      });
    };

    window.addEventListener("cyrus-auth-session-changed", refresh);
    const onStorage = (e: StorageEvent) => {
      if (e.key === CYRUS_SESSION_TOKEN_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("cyrus-auth-session-changed", refresh);
      window.removeEventListener("storage", onStorage);
    };
  }, [enabled]);

  return state;
}

export function StackLinkBootstrap({ enabled = true }: { enabled?: boolean }) {
  useStackLink(enabled);
  return null;
}
