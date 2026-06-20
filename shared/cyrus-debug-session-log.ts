/** Debug-mode NDJSON logger for session d63cdc (calls / WebRTC). */

const DEBUG_SESSION_ID = "d63cdc";
const DEBUG_INGEST =
  "http://127.0.0.1:7411/ingest/a296d185-7f5c-425a-b48d-20a911a63119";
const DEBUG_LOG_PATH =
  "/Users/cronet/Downloads/cyrus-part2-assets-fullzip/.cursor/debug-d63cdc.log";

export type CyrusDebugLogPayload = {
  location: string;
  message: string;
  hypothesisId: string;
  runId?: string;
  data?: Record<string, unknown>;
};

async function appendDebugLineAsync(line: string): Promise<void> {
  if (typeof window !== "undefined") return;
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    fs.mkdirSync(path.dirname(DEBUG_LOG_PATH), { recursive: true });
    fs.appendFileSync(DEBUG_LOG_PATH, `${line}\n`);
  } catch {
    /* ignore when log path unavailable (e.g. production container) */
  }
}

export function cyrusDebugLog(payload: CyrusDebugLogPayload): void {
  const line = JSON.stringify({
    sessionId: DEBUG_SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  });

  void appendDebugLineAsync(line);

  if (typeof window !== "undefined") {
    // #region agent log
    fetch(DEBUG_INGEST, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": DEBUG_SESSION_ID,
      },
      body: line,
    }).catch(() => {});
    fetch("/api/debug/session-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: line,
      credentials: "same-origin",
    }).catch(() => {});
    // #endregion
  }
}

/** Express handler — accepts client + server debug payloads. */
export async function handleDebugSessionLogPost(
  body: unknown,
  res: { status: (n: number) => { json: (o: object) => void } },
): Promise<void> {
  if (!body || typeof body !== "object") {
    res.status(400).json({ ok: false });
    return;
  }
  await appendDebugLineAsync(JSON.stringify(body));
  res.status(200).json({ ok: true });
}

/** Awaitable server-side log (signaling relay, scripts). */
export async function cyrusDebugLogAwait(payload: CyrusDebugLogPayload): Promise<void> {
  const line = JSON.stringify({
    sessionId: DEBUG_SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  });
  await appendDebugLineAsync(line);
}
