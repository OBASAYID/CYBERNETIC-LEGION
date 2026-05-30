import type { CallDiagnosticsSnapshot } from "./webrtc-diagnostics-types";

/** Downloadable session forensics (Phase 5). */
export function buildRtcForensicsExport(
  snapshot: CallDiagnosticsSnapshot,
  callStatus: string | undefined
): Record<string, unknown> {
  return {
    schema: "cyrus-rtc-forensics/v1",
    capturedAt: new Date().toISOString(),
    callStatus,
    peerConnection: {
      connectionState: snapshot.connectionState,
      iceConnectionState: snapshot.iceConnectionState,
      iceGatheringState: snapshot.iceGatheringState,
      signalingState: snapshot.signalingState,
    },
    transport: snapshot.transport,
    ice: {
      localCandidateTypes: snapshot.localCandidateTypes,
      remoteCandidateTypes: snapshot.remoteCandidateTypes,
      relayCandidateSeen: snapshot.relayCandidateSeen,
      relayActive: snapshot.relayActive,
      relayOnlyTestMode: snapshot.relayOnlyTestMode,
      relayEscalationActive: snapshot.relayEscalationActive,
      relayUsagePercent: snapshot.transport.relayUsagePercent,
      turnWarning: snapshot.turnWarning,
    },
    media: {
      bitrateKbps: snapshot.bitrateKbps,
      bitrateHistory: snapshot.bitrateHistory,
      packetLossPercent: snapshot.packetLossRate,
      lossHistory: snapshot.lossHistory,
      rttMs: snapshot.rttMs,
      jitterMs: snapshot.jitterMs,
      activeCodecs: snapshot.activeCodecs,
      remoteTracks: snapshot.remoteTracks,
      remotePlaybackBlocked: snapshot.remotePlaybackBlocked,
      remoteStalled: snapshot.remoteStalled,
      audioFlatlineSuspected: snapshot.audioFlatlineSuspected,
      videoBlackScreenSuspected: snapshot.videoBlackScreenSuspected,
      audioContextSuspended: snapshot.audioContextSuspended,
    },
    quality: snapshot.qualityScores,
    recovery: {
      actions: snapshot.recoveryActions,
      reliability: snapshot.reliabilityReport,
    },
    failureHints: snapshot.failureHints,
    timeline: snapshot.rtcTimeline,
    structuredLogTail: snapshot.structuredLogTail,
    networkMode: snapshot.networkMode,
  };
}
