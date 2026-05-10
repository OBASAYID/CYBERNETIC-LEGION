/**
 * CYRUS WebRTC diagnostics — shared types for Presence, overlays, and tooling.
 */

import type { CommsQualityScores } from "./comms-quality-engine";

export type DiagnosticsLogCategory =
  | "signaling"
  | "ice"
  | "track"
  | "transport"
  | "lifecycle"
  | "render"
  | "reconnect"
  | "recovery";

export interface DiagnosticsLogEntry {
  ts: number;
  category: DiagnosticsLogCategory;
  event: string;
  detail?: Record<string, unknown>;
}

export interface CommunicationReliabilityReport {
  generatedAt: number;
  negotiationFailures: number;
  turnFailures: number;
  trackFailures: number;
  reconnectFailures: number;
  renderingFailures: number;
  notes: string[];
  recentFailures: Array<{ ts: number; kind: string; message: string }>;
}

export interface TransportDiagnosticsSnapshot {
  pathSummary: string;
  /** Rolling estimate: % of recent polls where relay was active on selected pair. */
  relayUsagePercent: number;
  selectedPairId: string | null;
  selectedLocalType: string | null;
  selectedRemoteType: string | null;
  selectedProtocol: "udp" | "tcp" | "tls" | "unknown";
  transportMode: "p2p" | "relay" | "unknown";
  pairSwitchCount: number;
}

export interface RtcTimelineEntry {
  ts: number;
  category: string;
  event: string;
  detail?: string;
}

export function createEmptyReliabilityReport(): CommunicationReliabilityReport {
  return {
    generatedAt: Date.now(),
    negotiationFailures: 0,
    turnFailures: 0,
    trackFailures: 0,
    reconnectFailures: 0,
    renderingFailures: 0,
    notes: ["No failure events recorded yet."],
    recentFailures: [],
  };
}

export function createDefaultTransportDiagnostics(): TransportDiagnosticsSnapshot {
  return {
    pathSummary: "—",
    relayUsagePercent: 0,
    selectedPairId: null,
    selectedLocalType: null,
    selectedRemoteType: null,
    selectedProtocol: "unknown",
    transportMode: "unknown",
    pairSwitchCount: 0,
  };
}

/** Merged snapshot for UI + ops (poll ~1.5–2s). */
export interface CallDiagnosticsSnapshot {
  iceConnectionState: RTCIceConnectionState;
  connectionState: RTCPeerConnectionState;
  signalingState: RTCSignalingState;
  iceGatheringState: RTCIceGatheringState;
  qualityScore: string;
  rttMs: number;
  packetLossRate: number;
  jitterMs: number;
  bitrateKbps: number;
  abrPreset?: string;
  localCandidateTypes: string[];
  remoteCandidateTypes: string[];
  relayCandidateSeen: boolean;
  relayActive: boolean;
  relayOnlyTestMode: boolean;
  turnWarning: string | null;
  remoteTracks: Array<{ id: string; kind: string; readyState: string; muted: boolean }>;
  remotePlaybackBlocked: boolean;
  remoteStalled: boolean;
  /** Inbound audio energy / level not increasing while packets arrive (heuristic). */
  audioFlatlineSuspected: boolean;
  /** Video frames received but none decoded for a prolonged period. */
  videoBlackScreenSuspected: boolean;
  audioContextSuspended: boolean | null;
  negotiationInProgress: boolean;
  reliabilityReport: CommunicationReliabilityReport;
  structuredLogTail: DiagnosticsLogEntry[];
  transport: TransportDiagnosticsSnapshot;
  recoveryActions: string[];
  rtcTimeline: RtcTimelineEntry[];
  bitrateHistory: number[];
  lossHistory: number[];
  qualityScores: CommsQualityScores;
  failureHints: string[];
  activeCodecs: { audio?: string; video?: string };
  networkMode: string;
  relayEscalationActive: boolean;
}

export type { CommsQualityScores };
