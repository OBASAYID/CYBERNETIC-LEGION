import { useCallback, useEffect, useState } from "react";
import { Circle, Download, Play, RefreshCw } from "lucide-react";
import { commsAssetUrl, systemFetch } from "@shared/cyrus-api-client";
import type { CommsSessionRecording } from "@shared/comms/recording-types";

function formatDuration(sec: number | null | undefined): string {
  if (!sec || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function SessionRecordingsPanel() {
  const [recordings, setRecordings] = useState<CommsSessionRecording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await systemFetch("/api/comms/recordings?limit=30");
      if (!res.ok) throw new Error("Failed to load recordings");
      const data = (await res.json()) as { recordings: CommsSessionRecording[] };
      setRecordings(data.recordings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load recordings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-xl border border-rose-500/25 bg-black/25 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3
          className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-rose-300/90"
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          <Circle className="h-3.5 w-3.5 fill-rose-400 text-rose-400" />
          Session recordings
        </h3>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg p-1.5 text-white/50 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p className="mb-3 text-xs text-white/45">
        Recordings from calls and conferences are saved here after you stop recording in-call.
      </p>

      {error ? (
        <p className="text-xs text-red-400">{error}</p>
      ) : loading && recordings.length === 0 ? (
        <p className="text-xs text-white/40">Loading…</p>
      ) : recordings.length === 0 ? (
        <p className="text-xs text-white/40">No recordings yet. Use the record button during a call.</p>
      ) : (
        <ul className="space-y-2">
          {recordings.map((r) => {
            const mediaUrl = commsAssetUrl(r.recordingUrl);
            if (!mediaUrl) return null;
            const downloadUrl = `${mediaUrl}${mediaUrl.includes("?") ? "&" : "?"}download=1`;
            const participantLabel = Array.isArray(r.participants)
              ? (r.participants as { displayName?: string }[])
                  .map((p) => p.displayName)
                  .filter(Boolean)
                  .join(", ")
              : "";
            return (
              <li
                key={r.id}
                className="flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white/90">
                    {r.type === "group" ? "Group session" : "Call"} · {r.callType}
                  </p>
                  <p className="truncate text-xs text-white/45">
                    {participantLabel || r.callId.slice(0, 16)} · {formatWhen(r.startTime)} ·{" "}
                    {formatDuration(r.durationSeconds)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <a
                    href={mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-rose-600/20 px-2.5 py-1.5 text-xs text-rose-200 hover:bg-rose-600/30"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Play
                  </a>
                  <a
                    href={downloadUrl}
                    download
                    className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs text-white/80 hover:bg-white/15"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Save
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
