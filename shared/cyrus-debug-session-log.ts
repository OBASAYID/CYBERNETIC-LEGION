/** Browser-safe debug logger — POSTs to same-origin ingest (no Node imports). */

export type CyrusDebugLogPayload = {
  location: string;
  message: string;
  hypothesisId: string;
  runId?: string;
  data?: Record<string, unknown>;
};

const DEBUG_SESSION_ID = "d63cdc";

export function cyrusDebugLog(payload: CyrusDebugLogPayload): void {
  if (typeof window === "undefined") return;

  const line = JSON.stringify({
    sessionId: DEBUG_SESSION_ID,
    timestamp: Date.now(),
    ...payload,
  });

  // #region agent log
  fetch("/api/debug/session-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: line,
    credentials: "same-origin",
  }).catch(() => {});
  // #endregion
}
