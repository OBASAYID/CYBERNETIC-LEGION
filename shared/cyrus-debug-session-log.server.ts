/** Server-side debug NDJSON append (Node only). */

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
  try {
    const fs = await import("node:fs");
    const path = await import("node:path");
    fs.mkdirSync(path.dirname(DEBUG_LOG_PATH), { recursive: true });
    fs.appendFileSync(DEBUG_LOG_PATH, `${line}\n`);
  } catch {
    /* ignore when log path unavailable (e.g. production container) */
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
    sessionId: "d63cdc",
    timestamp: Date.now(),
    ...payload,
  });
  await appendDebugLineAsync(line);
}
