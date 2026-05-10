/**
 * Heuristic failure classification for CYRUS RTC forensics (browser-limited signals).
 */

import type { CallDiagnosticsSnapshot } from "./webrtc-diagnostics-types";

export function classifyRtcFailures(snapshot: CallDiagnosticsSnapshot): string[] {
  const out = new Set<string>();

  if (snapshot.turnWarning && snapshot.turnWarning.includes("no TURN")) {
    out.add("TURN / relay may be required (NAT restriction)");
  }
  if (snapshot.reliabilityReport.turnFailures > 0) {
    out.add("TURN or ICE transport failure");
  }
  if (snapshot.reliabilityReport.negotiationFailures > 0) {
    out.add("Signaling / SDP negotiation issue");
  }
  if (snapshot.remotePlaybackBlocked) {
    out.add("Autoplay / user-gesture restriction");
  }
  if (snapshot.remoteStalled) {
    out.add("Media rendering / decoder stall");
  }
  if (snapshot.audioFlatlineSuspected) {
    out.add("Inbound audio energy or level flatline");
  }
  if (snapshot.videoBlackScreenSuspected) {
    out.add("Video decode / black frame path");
  }
  if (snapshot.reliabilityReport.trackFailures > 0) {
    out.add("Remote track or device failure");
  }
  if (snapshot.packetLossRate > 10 && snapshot.iceConnectionState === "connected") {
    out.add("Network degradation (loss)");
  }
  if (snapshot.rttMs > 400) {
    out.add("High latency path");
  }
  if (snapshot.negotiationInProgress && snapshot.signalingState === "have-local-offer") {
    out.add("Possible negotiation race (glare) — verify single offer flight");
  }
  if (snapshot.audioContextSuspended === true) {
    out.add("AudioContext suspended — browser audio pipeline");
  }

  return [...out];
}
