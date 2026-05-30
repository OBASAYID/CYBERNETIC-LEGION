/**
 * Full WebRTC diagnostics session: structured logs, stats, TURN hints, reliability counters.
 */

import type { CallQualityMetrics } from "../lib/webrtc-config";
import { getCyrusCommsNetworkMode, isRelayOnlyTestMode } from "../lib/webrtc-config";
import type {
  CallDiagnosticsSnapshot,
  CommunicationReliabilityReport,
  DiagnosticsLogCategory,
  DiagnosticsLogEntry,
  RtcTimelineEntry,
  TransportDiagnosticsSnapshot,
} from "./webrtc-diagnostics-types";
import { createDefaultTransportDiagnostics } from "./webrtc-diagnostics-types";
import { computeCommsQualityScores } from "./comms-quality-engine";
import { classifyRtcFailures } from "./rtc-failure-classifier";
import { isIcePathLive } from "@shared/calls/call-session-types";
import { toIceCandidateInit } from "./webrtc-ice-utils";

const MAX_LOG_ENTRIES = 200;
const STALL_VIDEO_FRAMES_THRESHOLD = 8;

function now(): number {
  return Date.now();
}

function typFromCandidateLine(line: string | undefined | null): string | null {
  if (!line) return null;
  const m = /\btyp\s+(\w+)/i.exec(line);
  return m ? m[1].toLowerCase() : null;
}

function debugEnabled(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("cyrus-call-debug") === "1";
  } catch {
    return false;
  }
}

export class WebRtcDiagnosticsSession {
  private readonly pc: RTCPeerConnection;
  private readonly roomId: string;
  private disposed = false;

  private logEntries: DiagnosticsLogEntry[] = [];
  private localTypes = new Set<string>();
  private remoteTypes = new Set<string>();
  private relayCandidateSeen = false;

  private negotiationInProgress = false;

  private lastVideoFramesDecoded: { trackId: string; n: number; t: number } | null = null;
  private remoteStalled = false;

  private remotePlaybackBlocked = false;
  private audioContextSuspended: boolean | null = null;

  private prevOutbound: { t: number; bytesSent: number; kind: string } | null = null;

  private failureLog: Array<{ ts: number; kind: string; message: string }> = [];
  private stallFailureReported = false;
  private lastAudioEnergy: { value: number; t: number } | null = null;
  private lastAudioLevelSample: { value: number; t: number } | null = null;
  private audioFlatlineSuspected = false;
  private audioFlatlineFailureReported = false;
  private videoBlackSince: number | null = null;
  private videoBlackScreenSuspected = false;
  private videoBlackReported = false;
  private relayPollCount = 0;
  private relayActivePollCount = 0;
  private lastSelectedPairKey: string | null = null;
  private pairSwitchCount = 0;
  private bitrateHistory: number[] = [];
  private lossHistory: number[] = [];
  private recoveryActions: string[] = [];
  private readonly maxHistory = 24;
  private counts = {
    negotiationFailures: 0,
    turnFailures: 0,
    trackFailures: 0,
    reconnectFailures: 0,
    renderingFailures: 0,
  };

  private remoteTrackRefs = new Map<string, MediaStreamTrack>();
  private unsubscribeTrack: Array<() => void> = [];

  private boundIceGathering?: () => void;
  private boundConn?: () => void;
  private boundIce?: () => void;
  private boundSig?: () => void;

  constructor(peerConnection: RTCPeerConnection, roomId: string) {
    this.pc = peerConnection;
    this.roomId = roomId;
  }

  attach(): void {
    const pc = this.pc;

    this.boundIceGathering = () => {
      this.log("ice", "iceGatheringState", { state: pc.iceGatheringState, roomId: this.roomId });
    };
    this.boundConn = () => {
      this.log("transport", "connectionState", { state: pc.connectionState, roomId: this.roomId });
    };
    this.boundIce = () => {
      this.log("ice", "iceConnectionState", { state: pc.iceConnectionState, roomId: this.roomId });
    };
    this.boundSig = () => {
      this.log("signaling", "signalingState", { state: pc.signalingState, roomId: this.roomId });
    };

    pc.addEventListener("icegatheringstatechange", this.boundIceGathering);
    pc.addEventListener("connectionstatechange", this.boundConn);
    pc.addEventListener("iceconnectionstatechange", this.boundIce);
    pc.addEventListener("signalingstatechange", this.boundSig);

    this.log("lifecycle", "peerConnection_attached", { roomId: this.roomId });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const u of this.unsubscribeTrack) {
      try {
        u();
      } catch {
        /* ignore */
      }
    }
    this.unsubscribeTrack = [];
    this.remoteTrackRefs.clear();

    const pc = this.pc;
    if (this.boundIceGathering) pc.removeEventListener("icegatheringstatechange", this.boundIceGathering);
    if (this.boundConn) pc.removeEventListener("connectionstatechange", this.boundConn);
    if (this.boundIce) pc.removeEventListener("iceconnectionstatechange", this.boundIce);
    if (this.boundSig) pc.removeEventListener("signalingstatechange", this.boundSig);

    this.log("lifecycle", "peerConnection_dispose", { roomId: this.roomId });
  }

  logNegotiationNeeded(): void {
    this.log("signaling", "negotiationneeded", { roomId: this.roomId });
  }

  setNegotiationLocked(locked: boolean, reason?: string): void {
    this.negotiationInProgress = locked;
    this.log("signaling", locked ? "negotiation_lock_on" : "negotiation_lock_off", {
      roomId: this.roomId,
      reason: reason ?? "",
    });
  }

  logSdpFlow(
    phase: "createOffer" | "createAnswer" | "setLocalOffer" | "setLocalAnswer" | "setRemoteOffer" | "setRemoteAnswer",
    ok: boolean,
    detail?: Record<string, unknown>
  ): void {
    this.log("signaling", phase, { ok, roomId: this.roomId, ...detail });
    if (!ok) {
      this.recordFailure("negotiation", `SDP step failed: ${phase}`);
    }
  }

  logIceCandidate(direction: "local" | "remote", raw: unknown): void {
    const init = direction === "remote" ? toIceCandidateInit(raw) : null;
    const line =
      direction === "local" && raw && typeof raw === "object" && "candidate" in raw
        ? String((raw as { candidate?: string }).candidate ?? "")
        : init?.candidate ?? "";
    const typ = typFromCandidateLine(line);
    if (typ) {
      if (direction === "local") this.localTypes.add(typ);
      else this.remoteTypes.add(typ);
      if (typ === "relay") this.relayCandidateSeen = true;
    }
    this.log("ice", `ice_candidate_${direction}`, {
      roomId: this.roomId,
      typ,
      endOfCandidates: !line,
    });
  }

  logAddTrack(track: MediaStreamTrack): void {
    this.log("track", "addTrack", {
      roomId: this.roomId,
      kind: track.kind,
      id: track.id,
      enabled: track.enabled,
    });
  }

  logOnTrack(ev: RTCTrackEvent): void {
    const t = ev.track;
    this.log("track", "ontrack", {
      roomId: this.roomId,
      kind: t.kind,
      id: t.id,
      readyState: t.readyState,
      streams: ev.streams.length,
    });
    this.watchRemoteTrack(t);
  }

  logLocalTrackControl(
    op: "enable" | "disable",
    kind: string,
    trackId: string
  ): void {
    this.log("track", `local_track_${op}`, { roomId: this.roomId, kind, trackId });
  }

  logReconnectAttempt(attempt: number, max: number): void {
    this.log("reconnect", "ice_restart_attempt", { roomId: this.roomId, attempt, max });
  }

  logReconnectExhausted(): void {
    this.recordFailure("reconnect", "ICE restart attempts exhausted");
  }

  logZombieCleanup(prevState: string): void {
    this.log("lifecycle", "zombie_peer_cleanup", { roomId: this.roomId, prevState });
  }

  recordRecoveryAction(action: string, detail?: Record<string, unknown>): void {
    const label = detail ? `${action} ${JSON.stringify(detail)}` : action;
    this.recoveryActions.push(`${now()}:${label}`);
    if (this.recoveryActions.length > 48) this.recoveryActions.shift();
    this.log("recovery", action, { roomId: this.roomId, ...detail });
  }

  reportRemotePlayback(autoplayBlocked: boolean): void {
    this.remotePlaybackBlocked = autoplayBlocked;
    this.log("render", autoplayBlocked ? "autoplay_blocked" : "autoplay_ok", {
      roomId: this.roomId,
    });
    if (autoplayBlocked) {
      this.recordFailure("render", "Remote media autoplay blocked by browser policy");
    }
  }

  async probeAudioContext(): Promise<void> {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) {
        this.audioContextSuspended = null;
        return;
      }
      const ctx = new Ctx();
      const suspended = ctx.state === "suspended";
      this.audioContextSuspended = suspended;
      this.log("render", "audio_context_state", { state: ctx.state, roomId: this.roomId });
      if (suspended) {
        this.recordFailure("render", "AudioContext suspended — may need user gesture for audio");
      }
      await ctx.close();
    } catch (e) {
      this.audioContextSuspended = null;
      this.log("render", "audio_context_probe_error", { error: String(e) });
    }
  }

  recordNegotiationFailure(message: string): void {
    this.recordFailure("negotiation", message);
  }

  recordTurnFailure(message: string): void {
    this.recordFailure("turn", message);
  }

  recordTrackFailure(message: string): void {
    this.recordFailure("track", message);
  }

  private recordFailure(
    kind: "negotiation" | "turn" | "track" | "reconnect" | "render",
    message: string
  ): void {
    const key: keyof typeof this.counts =
      kind === "render"
        ? "renderingFailures"
        : (`${kind}Failures` as keyof typeof this.counts);
    if (key in this.counts) {
      this.counts[key] += 1;
    }
    this.failureLog.push({ ts: now(), kind, message });
    if (this.failureLog.length > 50) this.failureLog.shift();
    this.log("transport", "failure_recorded", { kind, message, roomId: this.roomId });
  }

  private watchRemoteTrack(track: MediaStreamTrack): void {
    const id = track.id;
    if (this.remoteTrackRefs.has(id)) return;
    this.remoteTrackRefs.set(id, track);

    const onMute = () => {
      this.log("track", "remote_track_mute", { id, kind: track.kind, roomId: this.roomId });
    };
    const onUnmute = () => {
      this.log("track", "remote_track_unmute", { id, kind: track.kind, roomId: this.roomId });
    };
    const onEnded = () => {
      this.log("track", "remote_track_ended", { id, kind: track.kind, roomId: this.roomId });
      this.recordFailure("track", `Remote ${track.kind} track ended`);
    };
    track.addEventListener("mute", onMute);
    track.addEventListener("unmute", onUnmute);
    track.addEventListener("ended", onEnded);

    this.unsubscribeTrack.push(() => {
      track.removeEventListener("mute", onMute);
      track.removeEventListener("unmute", onUnmute);
      track.removeEventListener("ended", onEnded);
      this.remoteTrackRefs.delete(id);
    });
  }

  private log(category: DiagnosticsLogCategory, event: string, detail?: Record<string, unknown>): void {
    const entry: DiagnosticsLogEntry = { ts: now(), category, event, detail };
    this.logEntries.push(entry);
    if (this.logEntries.length > MAX_LOG_ENTRIES) this.logEntries.shift();
    if (debugEnabled()) {
      console.log(`[CYRUS-WebRTC][${category}] ${event}`, detail ?? "");
    }
  }

  private buildReliabilityReport(): CommunicationReliabilityReport {
    const notes: string[] = [];
    if (this.counts.negotiationFailures > 0) notes.push(`${this.counts.negotiationFailures} negotiation failure(s)`);
    if (this.counts.turnFailures > 0) notes.push(`${this.counts.turnFailures} TURN / ICE path failure(s)`);
    if (this.counts.trackFailures > 0) notes.push(`${this.counts.trackFailures} track failure(s)`);
    if (this.counts.reconnectFailures > 0) notes.push(`${this.counts.reconnectFailures} reconnect exhaustion(s)`);
    if (this.counts.renderingFailures > 0) notes.push(`${this.counts.renderingFailures} rendering / playback issue(s)`);
    if (notes.length === 0) notes.push("No failures recorded this session.");

    return {
      generatedAt: now(),
      negotiationFailures: this.counts.negotiationFailures,
      turnFailures: this.counts.turnFailures,
      trackFailures: this.counts.trackFailures,
      reconnectFailures: this.counts.reconnectFailures,
      renderingFailures: this.counts.renderingFailures,
      notes,
      recentFailures: [...this.failureLog].slice(-12),
    };
  }

  private turnWarningFromState(): string | null {
    if (this.pc.iceGatheringState !== "complete") return null;
    const types = new Set([...this.localTypes, ...this.remoteTypes]);
    const hasRelay = types.has("relay") || this.relayCandidateSeen;
    if (hasRelay) return null;
    if (types.size === 0) return null;
    const onlyDirect = [...types].every((t) => t === "host" || t === "srflx" || t === "prflx");
    if (onlyDirect) {
      return "Only host/srflx/prflx candidates seen — no TURN relay. Symmetric NAT or strict firewalls may fail; try relay-only test or configure TURN.";
    }
    return null;
  }

  private pushHistory(bitrate: number, loss: number): void {
    this.bitrateHistory.push(bitrate);
    if (this.bitrateHistory.length > this.maxHistory) this.bitrateHistory.shift();
    this.lossHistory.push(loss);
    if (this.lossHistory.length > this.maxHistory) this.lossHistory.shift();
  }

  private async ingestStatsReports(): Promise<{
    bitrateKbps: number;
    relayActive: boolean;
    remoteTypesFromStats: Set<string>;
    localTypesFromStats: Set<string>;
    jitterMs: number;
    rttMs: number;
    packetLossRate: number;
    transport: TransportDiagnosticsSnapshot;
    activeCodecs: { audio?: string; video?: string };
  }> {
    const stats = await this.pc.getStats();
    const codecsById = new Map<string, string>();
    stats.forEach((rep) => {
      if (rep.type === "codec") {
        const id = (rep as unknown as { id?: string }).id;
        const mt = (rep as unknown as { mimeType?: string }).mimeType;
        if (typeof id === "string" && typeof mt === "string") codecsById.set(id, mt);
      }
    });
    let bitrateKbps = 0;
    let relayActive = false;
    const remoteTypesFromStats = new Set<string>();
    const localTypesFromStats = new Set<string>();
    let jitterMs = 0;
    let rttMs = 0;
    let packetLossRate = 0;
    let packetsLost = 0;
    let packetsReceived = 0;

    const localById = new Map<string, RTCStatsReport>();
    const remoteById = new Map<string, RTCStatsReport>();
    const activeCodecs: { audio?: string; video?: string } = {};

    stats.forEach((r) => {
      if (r.type === "local-candidate") {
        const id = (r as unknown as { id?: string }).id;
        const t = (r as unknown as { candidateType?: string }).candidateType;
        if (t) localTypesFromStats.add(t);
        if (id) localById.set(id, r);
      }
      if (r.type === "remote-candidate") {
        const id = (r as unknown as { id?: string }).id;
        const t = (r as unknown as { candidateType?: string }).candidateType;
        if (t) remoteTypesFromStats.add(t);
        if (id) remoteById.set(id, r);
      }
    });

    let bestPair: RTCStatsReport | null = null;
    let bestPri = -1;
    stats.forEach((r) => {
      if (r.type !== "candidate-pair") return;
      const st = (r as unknown as { state?: string }).state;
      if (st !== "succeeded") {
        if (st === "failed") {
          this.log("ice", "candidate_pair_failed", {
            roomId: this.roomId,
            id: (r as unknown as { id?: string }).id,
          });
        }
        return;
      }
      const nominated = !!(r as unknown as { nominated?: boolean }).nominated;
      const pri =
        (typeof (r as unknown as { priority?: number }).priority === "number"
          ? (r as unknown as { priority?: number }).priority!
          : 0) + (nominated ? 1e18 : 0);
      if (pri > bestPri) {
        bestPri = pri;
        bestPair = r;
      }
    });

    let selectedLocalType: string | null = null;
    let selectedRemoteType: string | null = null;
    let selectedProtocol: TransportDiagnosticsSnapshot["selectedProtocol"] = "unknown";
    let selectedPairId: string | null = null;
    let pairKey: string | null = null;

    if (bestPair) {
      selectedPairId = (bestPair as unknown as { id?: string }).id ?? null;
      const localId = (bestPair as unknown as { localCandidateId?: string }).localCandidateId;
      const remoteId = (bestPair as unknown as { remoteCandidateId?: string }).remoteCandidateId;
      pairKey = `${localId ?? ""}|${remoteId ?? ""}`;
      if (pairKey !== this.lastSelectedPairKey && this.lastSelectedPairKey !== null) {
        this.pairSwitchCount += 1;
        this.log("ice", "candidate_pair_switch", {
          roomId: this.roomId,
          from: this.lastSelectedPairKey,
          to: pairKey,
        });
      }
      this.lastSelectedPairKey = pairKey;

      const crt = (bestPair as unknown as { currentRoundTripTime?: number }).currentRoundTripTime;
      if (typeof crt === "number" && crt > 0) rttMs = Math.round(crt * 1000);

      if (localId) {
        const lc = localById.get(localId) as
          | { candidateType?: string; protocol?: string; tcpType?: string }
          | undefined;
        selectedLocalType = lc?.candidateType ?? null;
        if (lc?.candidateType === "relay") relayActive = true;
        const p = lc?.protocol?.toLowerCase();
        if (p === "udp" || p === "tcp") selectedProtocol = p;
        if (lc?.tcpType === "active" || lc?.tcpType === "passive") {
          selectedProtocol = "tcp";
        }
      }
      if (remoteId) {
        const rc = remoteById.get(remoteId) as { candidateType?: string } | undefined;
        selectedRemoteType = rc?.candidateType ?? null;
        if (rc?.candidateType === "relay") relayActive = true;
      }
    }

    this.relayPollCount += 1;
    if (relayActive) this.relayActivePollCount += 1;
    const relayUsagePercent =
      this.relayPollCount > 0
        ? Math.round((this.relayActivePollCount / this.relayPollCount) * 100)
        : 0;

    let transportMode: TransportDiagnosticsSnapshot["transportMode"] = "unknown";
    if (selectedLocalType && selectedRemoteType) {
      const relayPath =
        selectedLocalType === "relay" ||
        selectedRemoteType === "relay" ||
        relayActive;
      transportMode = relayPath ? "relay" : "p2p";
    }

    const pathSummary =
      selectedLocalType && selectedRemoteType
        ? `${selectedProtocol} · ${selectedLocalType}→${selectedRemoteType}`
        : "path not selected yet";

    const iceLive = isIcePathLive(this.pc.iceConnectionState);
    stats.forEach((r) => {
      if (r.type === "inbound-rtp") {
        const j = (r as unknown as { jitter?: number }).jitter;
        if (typeof j === "number") jitterMs = Math.max(jitterMs, j * 1000);
        packetsLost += (r as unknown as { packetsLost?: number }).packetsLost ?? 0;
        packetsReceived += (r as unknown as { packetsReceived?: number }).packetsReceived ?? 0;
        const kind = (r as unknown as { kind?: string }).kind;
        const codecId = (r as unknown as { codecId?: string }).codecId;
        const mime = codecId ? codecsById.get(codecId) : undefined;
        if (kind === "audio" && mime) activeCodecs.audio = mime;
        if (kind === "video" && mime) activeCodecs.video = mime;
        const t = now();

        if (kind === "audio" && iceLive) {
          const pr = (r as unknown as { packetsReceived?: number }).packetsReceived ?? 0;
          const tae = (r as unknown as { totalAudioEnergy?: number }).totalAudioEnergy;
          const audioLevel = (r as unknown as { audioLevel?: number }).audioLevel;
          if (pr > 80) {
            if (typeof tae === "number") {
              if (this.lastAudioEnergy) {
                const dt = t - this.lastAudioEnergy.t;
                const dv = tae - this.lastAudioEnergy.value;
                if (dt >= 6000 && dv < 1e-8) {
                  this.audioFlatlineSuspected = true;
                  if (!this.audioFlatlineFailureReported) {
                    this.audioFlatlineFailureReported = true;
                    this.log("render", "audio_energy_flatline_suspected", { pr, tae, roomId: this.roomId });
                    this.recordFailure("render", "Inbound audio energy flatlined while packets arrive");
                  }
                } else if (dv >= 1e-8) {
                  this.audioFlatlineSuspected = false;
                  this.audioFlatlineFailureReported = false;
                }
              }
              this.lastAudioEnergy = { value: tae, t };
            } else if (typeof audioLevel === "number" && pr > 120) {
              if (this.lastAudioLevelSample) {
                const dt = t - this.lastAudioLevelSample.t;
                if (dt >= 6000 && audioLevel < 0.0001) {
                  this.audioFlatlineSuspected = true;
                  if (!this.audioFlatlineFailureReported) {
                    this.audioFlatlineFailureReported = true;
                    this.log("render", "audio_level_flatline_suspected", { pr, audioLevel, roomId: this.roomId });
                    this.recordFailure("render", "Inbound audio level near zero while packets arrive");
                  }
                } else if (audioLevel > 0.01) {
                  this.audioFlatlineSuspected = false;
                  this.audioFlatlineFailureReported = false;
                }
              }
              this.lastAudioLevelSample = { value: audioLevel, t };
            }
          }
        }

        if (kind === "video") {
          const framesDecoded = (r as unknown as { framesDecoded?: number }).framesDecoded;
          const framesReceived = (r as unknown as { framesReceived?: number }).framesReceived;
          const trackId = (r as unknown as { trackIdentifier?: string }).trackIdentifier ?? "";

          if (
            iceLive &&
            typeof framesDecoded === "number" &&
            typeof framesReceived === "number" &&
            framesDecoded === 0 &&
            framesReceived > 60
          ) {
            if (this.videoBlackSince === null) this.videoBlackSince = t;
            else if (t - this.videoBlackSince >= 6000) {
              this.videoBlackScreenSuspected = true;
              if (!this.videoBlackReported) {
                this.videoBlackReported = true;
                this.log("render", "video_black_screen_suspected", {
                  framesReceived,
                  framesDecoded,
                  roomId: this.roomId,
                });
                this.recordFailure("render", "Video frames received but none decoded (black screen suspect)");
              }
            }
          } else {
            this.videoBlackSince = null;
            this.videoBlackScreenSuspected = false;
            this.videoBlackReported = false;
          }

          if (typeof framesDecoded === "number" && trackId) {
            if (
              this.lastVideoFramesDecoded &&
              this.lastVideoFramesDecoded.trackId === trackId &&
              t - this.lastVideoFramesDecoded.t > 4000
            ) {
              const delta = framesDecoded - this.lastVideoFramesDecoded.n;
              if (delta < STALL_VIDEO_FRAMES_THRESHOLD && this.pc.iceConnectionState === "connected") {
                this.remoteStalled = true;
                this.log("render", "remote_video_stall_suspected", { delta, trackId, roomId: this.roomId });
                if (!this.stallFailureReported) {
                  this.stallFailureReported = true;
                  this.recordFailure("render", "Remote video may be stalled (low framesDecoded delta)");
                }
              } else {
                this.remoteStalled = false;
              }
            }
            this.lastVideoFramesDecoded = { trackId, n: framesDecoded, t };
          }
        }
      }
      if (r.type === "outbound-rtp") {
        const bytesSent = (r as unknown as { bytesSent?: number }).bytesSent;
        const kind = (r as unknown as { kind?: string }).kind ?? "unknown";
        if (typeof bytesSent === "number" && kind === "video") {
          const t = now();
          if (this.prevOutbound && this.prevOutbound.kind === "video") {
            const dt = (t - this.prevOutbound.t) / 1000;
            const dBytes = bytesSent - this.prevOutbound.bytesSent;
            if (dt > 0.5 && dBytes >= 0) {
              bitrateKbps = (dBytes * 8) / 1000 / dt;
            }
          }
          this.prevOutbound = { t, bytesSent, kind };
        }
      }
    });

    if (packetsReceived > 0) {
      packetLossRate = (packetsLost / packetsReceived) * 100;
    }

    for (const t of localTypesFromStats) {
      this.localTypes.add(t);
      if (t === "relay") this.relayCandidateSeen = true;
    }
    for (const t of remoteTypesFromStats) {
      this.remoteTypes.add(t);
      if (t === "relay") this.relayCandidateSeen = true;
    }

    const transport: TransportDiagnosticsSnapshot = {
      pathSummary,
      relayUsagePercent,
      selectedPairId,
      selectedLocalType,
      selectedRemoteType,
      selectedProtocol,
      transportMode,
      pairSwitchCount: this.pairSwitchCount,
    };

    this.pushHistory(bitrateKbps, packetLossRate);

    return {
      bitrateKbps,
      relayActive,
      remoteTypesFromStats,
      localTypesFromStats,
      jitterMs,
      rttMs,
      packetLossRate,
      transport,
      activeCodecs,
    };
  }

  async composeSnapshot(metrics: CallQualityMetrics, abrPreset?: string): Promise<CallDiagnosticsSnapshot> {
    const s = await this.ingestStatsReports().catch(() => ({
      bitrateKbps: 0,
      relayActive: false,
      remoteTypesFromStats: new Set<string>(),
      localTypesFromStats: new Set<string>(),
      jitterMs: 0,
      rttMs: 0,
      packetLossRate: 0,
      transport: createDefaultTransportDiagnostics(),
      activeCodecs: {} as { audio?: string; video?: string },
    }));

    const mergedLocal = [...this.localTypes].sort();
    const mergedRemote = [...this.remoteTypes].sort();
    const turnWarning = this.turnWarningFromState();

    const remoteTracks = [...this.remoteTrackRefs.values()].map((t) => ({
      id: t.id,
      kind: t.kind,
      readyState: t.readyState,
      muted: t.muted,
    }));

    const rtt = s.rttMs || Math.round((metrics.roundTripTime || 0) * 1000);
    const jitter = s.jitterMs || (metrics.jitter ? metrics.jitter * 1000 : 0);
    const loss = s.packetLossRate || metrics.packetLossRate;
    const bitrate = s.bitrateKbps > 0 ? s.bitrateKbps : metrics.bitrate / 1000;

    const reliabilityReport = this.buildReliabilityReport();
    const reconnectCount = this.logEntries.filter((e) => e.event === "ice_restart_attempt").length;

    const qualityScores = computeCommsQualityScores({
      rttMs: rtt,
      jitterMs: jitter,
      packetLossPct: loss,
      bitrateKbps: bitrate,
      iceLive: isIcePathLive(this.pc.iceConnectionState),
      relayActive: s.relayActive,
      remoteStalled: this.remoteStalled,
      remotePlaybackBlocked: this.remotePlaybackBlocked,
      reconnectCount,
      negotiationFailures: reliabilityReport.negotiationFailures,
      audioFlatlineSuspected: this.audioFlatlineSuspected,
      videoBlackScreenSuspected: this.videoBlackScreenSuspected,
    });

    let relayEscalationActive = false;
    try {
      relayEscalationActive =
        typeof localStorage !== "undefined" && !!localStorage.getItem("cyrus-auto-relay-escalation");
    } catch {
      relayEscalationActive = false;
    }

    const rtcTimeline: RtcTimelineEntry[] = this.logEntries.slice(-40).map((e) => ({
      ts: e.ts,
      category: e.category,
      event: e.event,
      detail: e.detail ? JSON.stringify(e.detail) : undefined,
    }));

    const base: CallDiagnosticsSnapshot = {
      iceConnectionState: this.pc.iceConnectionState,
      connectionState: this.pc.connectionState,
      signalingState: this.pc.signalingState,
      iceGatheringState: this.pc.iceGatheringState,
      qualityScore: metrics.qualityScore,
      rttMs: rtt,
      packetLossRate: loss,
      jitterMs: Math.round(jitter * 100) / 100,
      bitrateKbps: Math.round(bitrate * 10) / 10,
      abrPreset,
      localCandidateTypes: mergedLocal,
      remoteCandidateTypes: mergedRemote,
      relayCandidateSeen: this.relayCandidateSeen,
      relayActive: s.relayActive,
      relayOnlyTestMode: isRelayOnlyTestMode(),
      turnWarning,
      remoteTracks,
      remotePlaybackBlocked: this.remotePlaybackBlocked,
      remoteStalled: this.remoteStalled,
      audioFlatlineSuspected: this.audioFlatlineSuspected,
      videoBlackScreenSuspected: this.videoBlackScreenSuspected,
      audioContextSuspended: this.audioContextSuspended,
      negotiationInProgress: this.negotiationInProgress,
      reliabilityReport,
      structuredLogTail: [...this.logEntries].slice(-24),
      transport: s.transport,
      recoveryActions: [...this.recoveryActions].slice(-24),
      rtcTimeline,
      bitrateHistory: [...this.bitrateHistory],
      lossHistory: [...this.lossHistory],
      qualityScores,
      failureHints: [],
      activeCodecs: s.activeCodecs,
      networkMode: getCyrusCommsNetworkMode(),
      relayEscalationActive,
    };

    return {
      ...base,
      failureHints: classifyRtcFailures(base),
    };
  }
}
