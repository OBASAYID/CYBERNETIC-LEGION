import {
  systemFetch,
  resolveCyrusWebSocketUrl,
  appendCommSignalingTokenToSearchParams,
} from "@/lib/system-api";

export type CyrusConnectivityProbe = {
  httpOk: boolean;
  httpStatus?: number;
  /** Parsed `GET /api/stack/ports` body when HTTP succeeds */
  stack?: { fused?: { livePort?: number; liveOrigin?: string } };
  wsOk: boolean;
  wsError?: string;
  elapsedMs: number;
};

/**
 * Operator-facing check: REST stack discovery + lightweight `/ws?probe=1` handshake
 * (does not register a presence user on the server).
 */
export async function probeCyrusConnectivity(): Promise<CyrusConnectivityProbe> {
  const started = Date.now();
  let httpOk = false;
  let httpStatus: number | undefined;
  let stack: CyrusConnectivityProbe["stack"];

  try {
    const res = await systemFetch("/api/stack/ports");
    httpStatus = res.status;
    httpOk = res.ok;
    if (res.ok) {
      stack = (await res.json()) as CyrusConnectivityProbe["stack"];
    }
  } catch {
    httpOk = false;
  }

  let wsOk = false;
  let wsError: string | undefined;

  try {
    const q = new URLSearchParams({
      probe: "1",
      userId: `_probe_${Date.now()}`,
      name: "connectivity",
      deviceId: `probe_${Date.now()}`,
    });
    appendCommSignalingTokenToSearchParams(q);
    const wsUrl = resolveCyrusWebSocketUrl(`/ws?${q.toString()}`);

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const sock = new WebSocket(wsUrl);
      let timer: ReturnType<typeof setTimeout> | undefined;

      const finish = (err?: Error) => {
        if (settled) return;
        settled = true;
        if (timer !== undefined) clearTimeout(timer);
        if (err) reject(err);
        else resolve();
      };

      timer = setTimeout(() => {
        wsError = "WebSocket timeout (5s)";
        try {
          sock.close();
        } catch {
          /* ignore */
        }
        finish(new Error("timeout"));
      }, 5000);

      sock.onmessage = (ev) => {
        if (settled) return;
        try {
          const msg = JSON.parse(ev.data as string) as { type?: string };
          if (msg.type === "probe-ack") {
            try {
              sock.close();
            } catch {
              /* ignore */
            }
            finish();
          }
        } catch {
          /* ignore */
        }
      };

      sock.onerror = () => {
        wsError = "WebSocket error (check proxy / TLS / path /ws)";
        finish(new Error("ws-error"));
      };

      sock.onclose = (ev) => {
        if (settled) return;
        wsError = `closed code ${ev.code}${ev.reason ? `: ${ev.reason}` : ""}`;
        finish(new Error("ws-close"));
      };
    });
    wsOk = true;
  } catch {
    if (!wsError) wsError = "WebSocket probe failed";
  }

  return {
    httpOk,
    httpStatus,
    stack,
    wsOk,
    wsError,
    elapsedMs: Date.now() - started,
  };
}
