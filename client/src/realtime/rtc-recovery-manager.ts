/**
 * CYRUS RTC Recovery Manager — cooldown-gated ICE restart + relay escalation hints.
 */

import {
  CYRUS_BITRATE_FROZEN_KBPS,
  CYRUS_BITRATE_FROZEN_MS,
  CYRUS_ICE_CHECKING_STUCK_MS,
  CYRUS_ICE_RESTART_COOLDOWN_MS,
  CYRUS_ICE_RESTART_MAX_ATTEMPTS,
  CYRUS_ICE_RESTART_MAX_ATTEMPTS_ESCALATED,
  CYRUS_PACKET_LOSS_RESTART_PCT,
  CYRUS_RESTARTS_BEFORE_RELAY_ESCALATION,
} from "./ice-recovery-policy";

const RELAY_ESCALATION_KEY = "cyrus-auto-relay-escalation";

export type RecoveryTickResult =
  | { action: "none" }
  | { action: "ice_restart"; reason: string }
  | { action: "escalate_relay_preference"; reason: string }
  | { action: "force_relay_restart"; reason: string };

export class RtcRecoveryManager {
  private lastAutoRestartAt = 0;
  private checkingSince: number | null = null;
  private lastBitrateSample: { t: number; kbps: number } | null = null;
  private bitrateFrozenSince: number | null = null;
  private autoRestartCount = 0;
  private relayEscalated = false;

  reset(): void {
    this.lastAutoRestartAt = 0;
    this.checkingSince = null;
    this.lastBitrateSample = null;
    this.bitrateFrozenSince = null;
    this.autoRestartCount = 0;
    this.relayEscalated = false;
  }

  maxRestartAttempts(): number {
    return this.relayEscalated ? CYRUS_ICE_RESTART_MAX_ATTEMPTS_ESCALATED : CYRUS_ICE_RESTART_MAX_ATTEMPTS;
  }

  isRelayEscalated(): boolean {
    return this.relayEscalated;
  }

  onIceStateChange(state: RTCIceConnectionState, now: number): void {
    if (state === "checking") {
      if (this.checkingSince === null) this.checkingSince = now;
    } else {
      this.checkingSince = null;
    }
  }

  recordManualRestart(): void {
    this.autoRestartCount += 1;
  }

  tick(input: {
    now: number;
    iceState: RTCIceConnectionState;
    packetLossPct: number;
    bitrateKbps: number;
    isVideoCall: boolean;
    mediaWasLive: boolean;
    remoteStalled: boolean;
  }): RecoveryTickResult {
    const { now } = input;

    if (input.iceState === "checking" && this.checkingSince !== null) {
      const stuck = now - this.checkingSince >= CYRUS_ICE_CHECKING_STUCK_MS;
      if (stuck && now - this.lastAutoRestartAt >= CYRUS_ICE_RESTART_COOLDOWN_MS) {
        this.lastAutoRestartAt = now;
        this.autoRestartCount += 1;
        return { action: "ice_restart", reason: "ice_checking_stuck" };
      }
    }

    if (
      input.mediaWasLive &&
      input.isVideoCall &&
      input.iceState === "connected" &&
      input.packetLossPct >= CYRUS_PACKET_LOSS_RESTART_PCT &&
      now - this.lastAutoRestartAt >= CYRUS_ICE_RESTART_COOLDOWN_MS
    ) {
      this.lastAutoRestartAt = now;
      this.autoRestartCount += 1;
      return { action: "ice_restart", reason: "high_packet_loss" };
    }

    if (
      input.mediaWasLive &&
      input.isVideoCall &&
      input.iceState === "connected" &&
      input.remoteStalled &&
      now - this.lastAutoRestartAt >= CYRUS_ICE_RESTART_COOLDOWN_MS
    ) {
      this.lastAutoRestartAt = now;
      this.autoRestartCount += 1;
      return { action: "ice_restart", reason: "remote_video_stalled" };
    }

    if (input.mediaWasLive && input.isVideoCall && input.iceState === "connected") {
      const kbps = input.bitrateKbps;
      if (kbps <= CYRUS_BITRATE_FROZEN_KBPS) {
        if (this.bitrateFrozenSince === null) this.bitrateFrozenSince = now;
        else if (
          now - this.bitrateFrozenSince >= CYRUS_BITRATE_FROZEN_MS &&
          now - this.lastAutoRestartAt >= CYRUS_ICE_RESTART_COOLDOWN_MS
        ) {
          this.lastAutoRestartAt = now;
          this.autoRestartCount += 1;
          this.bitrateFrozenSince = null;
          return { action: "ice_restart", reason: "video_bitrate_frozen" };
        }
      } else {
        this.bitrateFrozenSince = null;
      }
      this.lastBitrateSample = { t: now, kbps };
    }

    if (
      !this.relayEscalated &&
      this.autoRestartCount >= CYRUS_RESTARTS_BEFORE_RELAY_ESCALATION
    ) {
      this.relayEscalated = true;
      if (typeof localStorage !== "undefined") {
        try {
          localStorage.setItem(RELAY_ESCALATION_KEY, String(now));
          localStorage.setItem("cyrus-force-relay", "true");
        } catch {
          /* ignore */
        }
      }
      return {
        action: "force_relay_restart",
        reason: "repeated_recovery_switch_to_relay",
      };
    }

    return { action: "none" };
  }
}
