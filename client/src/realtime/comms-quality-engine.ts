/**
 * CYRUS Communication Quality Engine — composite scores (0–100) and call labels.
 */

export type CommsCallQualityLabel = "Excellent" | "Good" | "Poor" | "Critical";

export interface CommsQualityScores {
  overall: number;
  transport: number;
  media: number;
  reconnectStability: number;
  label: CommsCallQualityLabel;
  factors: string[];
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function computeCommsQualityScores(input: {
  rttMs: number;
  jitterMs: number;
  packetLossPct: number;
  bitrateKbps: number;
  iceLive: boolean;
  relayActive: boolean;
  remoteStalled: boolean;
  remotePlaybackBlocked: boolean;
  reconnectCount: number;
  negotiationFailures: number;
  audioFlatlineSuspected?: boolean;
  videoBlackScreenSuspected?: boolean;
}): CommsQualityScores {
  const factors: string[] = [];

  let transport = 100;
  if (!input.iceLive) {
    transport = 15;
    factors.push("ICE not in connected/completed state");
  } else {
    if (input.rttMs > 350) {
      transport -= 25;
      factors.push("High RTT");
    } else if (input.rttMs > 180) {
      transport -= 12;
      factors.push("Elevated RTT");
    }
    if (input.jitterMs > 45) {
      transport -= 18;
      factors.push("High jitter");
    } else if (input.jitterMs > 25) {
      transport -= 8;
      factors.push("Elevated jitter");
    }
    if (input.packetLossPct > 8) {
      transport -= 30;
      factors.push("High packet loss");
    } else if (input.packetLossPct > 3) {
      transport -= 15;
      factors.push("Moderate packet loss");
    }
    if (input.relayActive) {
      transport -= 5;
      factors.push("Relay path (expected overhead)");
    }
  }
  transport = clamp(transport, 0, 100);

  let media = 100;
  if (input.remoteStalled) {
    media -= 40;
    factors.push("Remote video stall suspected");
  }
  if (input.remotePlaybackBlocked) {
    media -= 25;
    factors.push("Autoplay blocked");
  }
  if (input.bitrateKbps > 0 && input.bitrateKbps < 120 && input.iceLive) {
    media -= 15;
    factors.push("Low outbound video bitrate");
  }
  if (input.audioFlatlineSuspected) {
    media -= 35;
    factors.push("Inbound audio flatline suspected");
  }
  if (input.videoBlackScreenSuspected) {
    media -= 35;
    factors.push("Black / undecoded video suspected");
  }
  media = clamp(media, 0, 100);

  let reconnectStability = 100;
  reconnectStability -= input.reconnectCount * 12;
  reconnectStability -= input.negotiationFailures * 15;
  reconnectStability = clamp(reconnectStability, 0, 100);
  if (input.reconnectCount > 0) factors.push("ICE restarts used");
  if (input.negotiationFailures > 0) factors.push("Negotiation failures recorded");

  const overall = Math.round(
    transport * 0.45 + media * 0.35 + reconnectStability * 0.2
  );

  let label: CommsCallQualityLabel = "Excellent";
  if (overall < 40) label = "Critical";
  else if (overall < 60) label = "Poor";
  else if (overall < 80) label = "Good";

  return {
    overall: clamp(overall, 0, 100),
    transport: Math.round(transport),
    media: Math.round(media),
    reconnectStability: Math.round(reconnectStability),
    label,
    factors: factors.length ? factors : ["Within nominal thresholds"],
  };
}
