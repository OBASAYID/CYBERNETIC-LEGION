import { useCallback, useMemo, useState } from "react";
import type { CallDiagnosticsSnapshot } from "../../contexts/PresenceContext";
import { buildRtcForensicsExport } from "../../realtime/rtc-forensics-export";

/**
 * Developer / NOC overlay. Enable with `localStorage.setItem("cyrus-call-debug","1")`.
 * Relay-only test: `cyrus-relay-only-test=1` · Network modes: `cyrus-comms-network-mode` =
 * normal | low_bandwidth | audio_priority | emergency | degraded
 */
export function CommsCallDiagnosticsOverlay({
  diagnostics,
  callStatus,
  onRecoverCallMedia,
}: {
  diagnostics: CallDiagnosticsSnapshot | null;
  callStatus: string | undefined;
  /** Retries AudioContext / video.play() and reattaches remote MediaStream (debug overlay). */
  onRecoverCallMedia?: () => void | Promise<void>;
}) {
  const [showTimeline, setShowTimeline] = useState(true);
  const enabled =
    typeof localStorage !== "undefined" && localStorage.getItem("cyrus-call-debug") === "1";

  const forensicsJson = useMemo(
    () => (diagnostics ? JSON.stringify(buildRtcForensicsExport(diagnostics, callStatus), null, 2) : ""),
    [diagnostics, callStatus]
  );

  const copyForensics = useCallback(() => {
    if (!forensicsJson) return;
    void navigator.clipboard.writeText(forensicsJson);
  }, [forensicsJson]);

  const downloadForensics = useCallback(() => {
    if (!forensicsJson || !diagnostics) return;
    const blob = new Blob([forensicsJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cyrus-rtc-forensics-${diagnostics.connectionState}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [forensicsJson, diagnostics]);

  if (!enabled) return null;
  if (!diagnostics && !callStatus) return null;

  const r = diagnostics?.reliabilityReport;
  const q = diagnostics?.qualityScores;
  const tr = diagnostics?.transport;

  return (
    <div
      className="pointer-events-auto fixed bottom-3 left-3 z-[100] max-h-[min(560px,72vh)] max-w-md overflow-hidden rounded-lg border border-cyan-500/40 bg-slate-950/95 shadow-lg backdrop-blur-md"
      aria-label="WebRTC diagnostics"
    >
      <div className="border-b border-cyan-500/25 px-3 py-2">
        <div className="text-[9px] font-semibold uppercase tracking-wider text-cyan-400/90">
          CYRUS WebRTC — production diagnostics
        </div>
        <p className="mt-0.5 text-[9px] text-white/40">
          <code className="text-cyan-200/80">cyrus-call-debug=1</code>
          {" · "}
          <code className="text-amber-200/80">cyrus-relay-only-test=1</code>
        </p>
        {callStatus && <div className="mt-1 font-mono text-[10px] text-white/80">session: {callStatus}</div>}
        {diagnostics && (
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyForensics()}
              className="rounded border border-white/15 bg-white/5 px-2 py-1 text-[10px] text-cyan-100 hover:bg-white/10"
            >
              Copy forensics JSON
            </button>
            <button
              type="button"
              onClick={() => void downloadForensics()}
              className="rounded border border-emerald-500/30 bg-emerald-950/40 px-2 py-1 text-[10px] text-emerald-100 hover:bg-emerald-900/50"
            >
              Download forensics
            </button>
            <button
              type="button"
              onClick={() => setShowTimeline((s) => !s)}
              className="rounded border border-white/10 px-2 py-1 text-[10px] text-white/70 hover:bg-white/10"
            >
              {showTimeline ? "Hide" : "Show"} timeline
            </button>
            {onRecoverCallMedia && (
              <button
                type="button"
                onClick={() => void onRecoverCallMedia()}
                className="rounded border border-violet-500/40 bg-violet-950/50 px-2 py-1 text-[10px] text-violet-100 hover:bg-violet-900/50"
              >
                Recover media playback
              </button>
            )}
          </div>
        )}
      </div>
      <div className="max-h-[min(480px,60vh)] overflow-y-auto px-3 py-2 font-mono text-[10px] text-cyan-100/90">
        {diagnostics && (
          <>
            {q && (
              <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
                <div className="text-[9px] font-semibold uppercase text-white/50">Quality engine</div>
                <div className="text-emerald-200/95">
                  {q.label} · overall {q.overall}/100 (transport {q.transport} · media {q.media} · reconnect{" "}
                  {q.reconnectStability})
                </div>
                <ul className="list-inside list-disc text-[9px] text-white/55">
                  {q.factors.slice(0, 6).map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </section>
            )}
            <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
              <div className="text-[9px] font-semibold uppercase text-white/50">Peer connection</div>
              <div>connectionState: {diagnostics.connectionState}</div>
              <div>iceConnectionState: {diagnostics.iceConnectionState}</div>
              <div>iceGatheringState: {diagnostics.iceGatheringState}</div>
              <div>signalingState: {diagnostics.signalingState}</div>
              <div>negotiation lock: {diagnostics.negotiationInProgress ? "busy" : "idle"}</div>
              <div>network mode: {diagnostics.networkMode}</div>
              <div>relay auto-escalation: {diagnostics.relayEscalationActive ? "on" : "off"}</div>
            </section>
            {tr && (
              <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
                <div className="text-[9px] font-semibold uppercase text-white/50">Active transport</div>
                <div className="text-white/85">{tr.pathSummary}</div>
                <div>pair id: {tr.selectedPairId ?? "—"}</div>
                <div>
                  selected: {tr.selectedLocalType ?? "—"} → {tr.selectedRemoteType ?? "—"} ({tr.selectedProtocol})
                </div>
                <div>mode: {tr.transportMode}</div>
                <div>relay usage (session): {tr.relayUsagePercent}%</div>
                <div>pair switches: {tr.pairSwitchCount}</div>
              </section>
            )}
            <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
              <div className="text-[9px] font-semibold uppercase text-white/50">TURN / ICE</div>
              <div>local types: {diagnostics.localCandidateTypes.join(", ") || "—"}</div>
              <div>remote types: {diagnostics.remoteCandidateTypes.join(", ") || "—"}</div>
              <div>relay candidate seen: {diagnostics.relayCandidateSeen ? "yes" : "no"}</div>
              <div>relay active (selected pair): {diagnostics.relayActive ? "yes" : "no"}</div>
              <div>relay-only test: {diagnostics.relayOnlyTestMode ? "ON" : "off"}</div>
              {diagnostics.turnWarning && (
                <div className="rounded bg-amber-500/15 px-1.5 py-1 text-amber-200/95">{diagnostics.turnWarning}</div>
              )}
            </section>
            <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
              <div className="text-[9px] font-semibold uppercase text-white/50">Codecs (inbound)</div>
              <div>audio: {diagnostics.activeCodecs.audio ?? "—"}</div>
              <div>video: {diagnostics.activeCodecs.video ?? "—"}</div>
            </section>
            <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
              <div className="text-[9px] font-semibold uppercase text-white/50">Transport stats</div>
              <div>bitrate (video est.): {diagnostics.bitrateKbps.toFixed(1)} kbps</div>
              <div>packet loss: {diagnostics.packetLossRate.toFixed(2)}%</div>
              <div>RTT: {diagnostics.rttMs} ms</div>
              <div>jitter: {diagnostics.jitterMs} ms</div>
              <div>legacy quality: {diagnostics.qualityScore}</div>
              {diagnostics.abrPreset && <div>ABR: {diagnostics.abrPreset}</div>}
            </section>
            <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
              <div className="text-[9px] font-semibold uppercase text-white/50">Remote media</div>
              {diagnostics.remoteTracks.length === 0 ? (
                <div className="text-white/45">no remote tracks yet</div>
              ) : (
                diagnostics.remoteTracks.map((t) => (
                  <div key={t.id} className="text-white/75">
                    {t.kind} {t.id.slice(0, 8)}… state={t.readyState} muted={String(t.muted)}
                  </div>
                ))
              )}
              <div>autoplay blocked: {diagnostics.remotePlaybackBlocked ? "yes" : "no"}</div>
              <div>remote stall suspected: {diagnostics.remoteStalled ? "yes" : "no"}</div>
              <div>audio flatline (heuristic): {diagnostics.audioFlatlineSuspected ? "yes" : "no"}</div>
              <div>video black screen (heuristic): {diagnostics.videoBlackScreenSuspected ? "yes" : "no"}</div>
              <div>
                AudioContext suspended:{" "}
                {diagnostics.audioContextSuspended === null
                  ? "n/a"
                  : diagnostics.audioContextSuspended
                    ? "yes"
                    : "no"}
              </div>
            </section>
            {diagnostics.failureHints.length > 0 && (
              <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
                <div className="text-[9px] font-semibold uppercase text-amber-400/80">Failure hints</div>
                <ul className="list-inside list-disc text-[9px] text-amber-100/85">
                  {diagnostics.failureHints.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              </section>
            )}
            {diagnostics.recoveryActions.length > 0 && (
              <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
                <div className="text-[9px] font-semibold uppercase text-emerald-400/80">Recovery actions</div>
                <ul className="max-h-24 space-y-0.5 overflow-y-auto text-[9px] text-emerald-100/80">
                  {diagnostics.recoveryActions.slice(-8).map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </section>
            )}
            {r && (
              <section className="mb-3 space-y-0.5 border-b border-white/10 pb-2">
                <div className="text-[9px] font-semibold uppercase text-white/50">Reliability report</div>
                <div>negotiation: {r.negotiationFailures}</div>
                <div>TURN/ICE: {r.turnFailures}</div>
                <div>tracks: {r.trackFailures}</div>
                <div>reconnect: {r.reconnectFailures}</div>
                <div>rendering: {r.renderingFailures}</div>
                <ul className="mt-1 list-inside list-disc text-white/55">
                  {r.notes.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
                {r.recentFailures.length > 0 && (
                  <div className="mt-1 text-[9px] text-red-300/90">
                    {r.recentFailures.slice(-4).map((f) => (
                      <div key={f.ts}>
                        [{f.kind}] {f.message}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
            {showTimeline && (
              <section className="mb-3 border-b border-white/10 pb-2">
                <div className="text-[9px] font-semibold uppercase text-white/50">Session timeline</div>
                <ul className="mt-1 max-h-36 space-y-0.5 overflow-y-auto text-[9px] text-white/55">
                  {diagnostics.rtcTimeline.slice(-24).map((e, i) => (
                    <li key={`${e.ts}-${i}`}>
                      <span className="text-violet-400/90">[{e.category}]</span> {e.event}
                      {e.detail ? ` · ${e.detail}` : ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <section>
              <div className="text-[9px] font-semibold uppercase text-white/50">Structured log (tail)</div>
              <ul className="mt-1 max-h-32 space-y-0.5 overflow-y-auto text-[9px] text-white/55">
                {diagnostics.structuredLogTail.map((e, i) => (
                  <li key={`${e.ts}-${i}`}>
                    <span className="text-cyan-600/90">[{e.category}]</span> {e.event}
                    {e.detail ? ` ${JSON.stringify(e.detail)}` : ""}
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
