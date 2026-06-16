/**
 * CYRUS comms scale targets — env-driven limits for international deployments.
 * 500k registered users ≠ 500k in one room; tune per tier via env.
 */

function readInt(name: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[name]);
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(raw)));
}

export type CyrusScaleLimits = {
  maxConcurrentUsers: number;
  maxParticipantsPerRoom: number;
  maxSfuWorkers: number;
  maxSignalingReplicas: number;
  sfuRtcMinPort: number;
  sfuRtcMaxPort: number;
};

export function getCyrusScaleLimits(): CyrusScaleLimits {
  return {
    maxConcurrentUsers: readInt("CYRUS_MAX_CONCURRENT_USERS", 500_000, 1_000, 2_000_000),
    maxParticipantsPerRoom: readInt("CYRUS_SFU_MAX_PARTICIPANTS", 64, 2, 500),
    maxSfuWorkers: readInt("CYRUS_SFU_WORKER_COUNT", 2, 1, 32),
    maxSignalingReplicas: readInt("CYRUS_MAX_SIGNALING_REPLICAS", 100, 1, 500),
    sfuRtcMinPort: readInt("CYRUS_SFU_RTC_MIN_PORT", 40_000, 10_000, 60_000),
    sfuRtcMaxPort: readInt("CYRUS_SFU_RTC_MAX_PORT", 40_100, 10_100, 65_535),
  };
}

export function getSfuParticipantLimit(): number {
  return getCyrusScaleLimits().maxParticipantsPerRoom;
}
