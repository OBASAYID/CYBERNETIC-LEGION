export const ENTERPRISE_ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:stun.ekiga.net" },
  { urls: "stun:stun.ideasip.com" },
  { urls: "stun:stun.schlund.de" },
  { urls: "stun:stun.stunprotocol.org:3478" },
  { urls: "stun:stun.voiparound.com" },
  { urls: "stun:stun.voipbuster.com" },
  { urls: "stun:stun.voipstunt.com" },
  { urls: "stun:stun.services.mozilla.com" },
  { urls: "turn:openrelay.metered.ca:80", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443", username: "openrelayproject", credential: "openrelayproject" },
  { urls: "turn:openrelay.metered.ca:443?transport=tcp", username: "openrelayproject", credential: "openrelayproject" },
];

function parseViteIceServers(): RTCIceServer[] {
  try {
    const raw = import.meta.env.VITE_RTC_ICE_SERVERS_JSON;
    if (typeof raw !== "string" || !raw.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (s): s is RTCIceServer =>
        !!s &&
        typeof s === "object" &&
        "urls" in s &&
        (typeof (s as RTCIceServer).urls === "string" || Array.isArray((s as RTCIceServer).urls))
    );
  } catch {
    return [];
  }
}

export function getRuntimeIceServers(): RTCIceServer[] {
  const viteIce = parseViteIceServers();
  const appendDefaults = import.meta.env.VITE_RTC_APPEND_DEFAULT_ICE !== "false";

  let base: RTCIceServer[] = ENTERPRISE_ICE_SERVERS;
  if (typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem("cyrus-ice-servers");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter(
            (s): s is RTCIceServer =>
              !!s &&
              typeof s === "object" &&
              "urls" in s &&
              (typeof (s as RTCIceServer).urls === "string" || Array.isArray((s as RTCIceServer).urls))
          );
          if (valid.length > 0) base = valid;
        }
      }
    } catch {
      base = ENTERPRISE_ICE_SERVERS;
    }
  }

  if (viteIce.length === 0) return base;
  if (!appendDefaults) return viteIce;

  const seen = new Set<string>();
  const out: RTCIceServer[] = [];
  for (const s of [...viteIce, ...base]) {
    const key = `${JSON.stringify(s.urls)}|${s.username || ""}|${s.credential || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.length > 0 ? out : base;
}

/** Temporary test: `localStorage.setItem("cyrus-relay-only-test","1")` forces `iceTransportPolicy: "relay"`. */
export function isRelayOnlyTestMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("cyrus-relay-only-test") === "1";
  } catch {
    return false;
  }
}

function shouldPreferRelayTransport(): boolean {
  if (import.meta.env.VITE_RTC_PREFER_RELAY === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    const forced = window.localStorage.getItem("cyrus-force-relay");
    if (forced === "1" || forced === "true") return true;
  } catch {
    // Ignore storage errors; continue with runtime checks.
  }

  const connection = (navigator as any).connection;
  if (!connection) return false;
  const type = String(connection.type || "").toLowerCase();
  const effectiveType = String(connection.effectiveType || "").toLowerCase();
  return (
    type === "cellular" ||
    effectiveType === "2g" ||
    effectiveType === "3g" ||
    effectiveType === "slow-2g"
  );
}

export interface CallQualityMetrics {
  bitrate: number;
  packetsLost: number;
  packetLossRate: number;
  jitter: number;
  roundTripTime: number;
  frameRate: number;
  resolution: { width: number; height: number };
  audioLevel: number;
  qualityScore: "excellent" | "good" | "fair" | "poor";
  connectionState: RTCPeerConnectionState;
  iceConnectionState: RTCIceConnectionState;
}

export interface AdaptiveBitrateConfig {
  minVideoBitrate: number;
  maxVideoBitrate: number;
  minAudioBitrate: number;
  maxAudioBitrate: number;
  targetFrameRate: number;
}

export const QUALITY_PRESETS: Record<string, AdaptiveBitrateConfig> = {
  ultra: {
    minVideoBitrate: 2500000,
    maxVideoBitrate: 6000000,
    minAudioBitrate: 64000,
    maxAudioBitrate: 128000,
    targetFrameRate: 60,
  },
  high: {
    minVideoBitrate: 1500000,
    maxVideoBitrate: 4000000,
    minAudioBitrate: 48000,
    maxAudioBitrate: 96000,
    targetFrameRate: 30,
  },
  medium: {
    minVideoBitrate: 800000,
    maxVideoBitrate: 2000000,
    minAudioBitrate: 32000,
    maxAudioBitrate: 64000,
    targetFrameRate: 30,
  },
  low: {
    minVideoBitrate: 300000,
    maxVideoBitrate: 800000,
    minAudioBitrate: 24000,
    maxAudioBitrate: 48000,
    targetFrameRate: 15,
  },
  audioOnly: {
    minVideoBitrate: 0,
    maxVideoBitrate: 0,
    minAudioBitrate: 32000,
    maxAudioBitrate: 128000,
    targetFrameRate: 0,
  },
};

export const MEDIA_CONSTRAINTS = {
  video: {
    hd: {
      width: { ideal: 1280, max: 1920 },
      height: { ideal: 720, max: 1080 },
      frameRate: { ideal: 30, max: 60 },
      facingMode: "user",
    },
    sd: {
      width: { ideal: 640, max: 1280 },
      height: { ideal: 480, max: 720 },
      frameRate: { ideal: 24, max: 30 },
      facingMode: "user",
    },
    mobile: {
      width: { ideal: 480, max: 640 },
      height: { ideal: 360, max: 480 },
      frameRate: { ideal: 15, max: 24 },
      facingMode: "user",
    },
  },
  audio: {
    // Keep constraints broadly compatible; strict `exact` values can fail
    // on Safari/mobile stacks and prevent media from starting at all.
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    channelCount: { ideal: 1, max: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
    latency: { ideal: 0.01, max: 0.05 },
  },
};

/** Dedupe ICE server entries for stable RTCPeerConnection config. */
export function mergeIceServerLists(a: RTCIceServer[], b: RTCIceServer[]): RTCIceServer[] {
  const seen = new Set<string>();
  const out: RTCIceServer[] = [];
  for (const s of [...a, ...b]) {
    if (!s || typeof s !== "object" || !("urls" in s)) continue;
    const key = `${JSON.stringify(s.urls)}|${(s as RTCIceServer).username || ""}|${(s as RTCIceServer).credential || ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out.length > 0 ? out : getRuntimeIceServers();
}

/** Delta-based outbound bitrate tracker (fixes cumulative bytesSent misread). */
const outboundBitrateTracker = new WeakMap<
  RTCPeerConnection,
  { t: number; bytesSent: number; audioBytesSent: number }
>();

function measureOutboundBitrateKbps(
  pc: RTCPeerConnection,
  report: RTCStatsReport,
): { videoKbps: number; audioKbps: number } {
  let videoBytes = 0;
  let audioBytes = 0;
  report.forEach((r) => {
    if (r.type !== "outbound-rtp") return;
    const kind = (r as { kind?: string }).kind;
    const sent = (r as { bytesSent?: number }).bytesSent;
    if (typeof sent !== "number") return;
    if (kind === "video") videoBytes = sent;
    if (kind === "audio") audioBytes = sent;
  });

  const now = Date.now();
  const prev = outboundBitrateTracker.get(pc);
  outboundBitrateTracker.set(pc, { t: now, bytesSent: videoBytes, audioBytesSent: audioBytes });

  if (!prev || now <= prev.t) return { videoKbps: 0, audioKbps: 0 };
  const dtSec = (now - prev.t) / 1000;
  if (dtSec <= 0) return { videoKbps: 0, audioKbps: 0 };

  return {
    videoKbps: Math.max(0, ((videoBytes - prev.bytesSent) * 8) / 1000 / dtSec),
    audioKbps: Math.max(0, ((audioBytes - prev.audioBytesSent) * 8) / 1000 / dtSec),
  };
}

export function resetOutboundBitrateTracker(pc: RTCPeerConnection): void {
  outboundBitrateTracker.delete(pc);
}

/** WebAudio post-processing doubles AEC — studio mode / explicit opt-in only. */
export function isAudioProcessingEnabled(): boolean {
  if (import.meta.env.VITE_RTC_AUDIO_PROCESSING === "true") return true;
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem("cyrus-media-filters") === "studio") return true;
    return window.localStorage.getItem("cyrus-audio-processing") === "1";
  } catch {
    return false;
  }
}

export function hasTurnRelayInIceServers(servers: RTCIceServer[]): boolean {
  return servers.some((s) => {
    const urls = Array.isArray(s.urls) ? s.urls : [s.urls];
    return urls.some((u) => String(u).startsWith("turn:") || String(u).startsWith("turns:"));
  });
}

export function getIceTransportPolicy(options?: {
  iceServers?: RTCIceServer[];
  forceRelay?: boolean;
}): RTCIceTransportPolicy {
  if (options?.forceRelay) return "relay";
  if (import.meta.env.VITE_RTC_ICE_TRANSPORT_POLICY === "relay") return "relay";
  if (isRelayOnlyTestMode()) return "relay";
  if (shouldPreferRelayTransport()) return "relay";

  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("cyrus-force-relay") === "true") {
      return "relay";
    }
    if (typeof localStorage !== "undefined" && localStorage.getItem("cyrus-auto-relay-escalation")) {
      return "relay";
    }
  } catch {
    /* ignore */
  }

  const servers = options?.iceServers ?? getRuntimeIceServers();
  if (hasTurnRelayInIceServers(servers) && isLikelyCrossNetworkPath()) {
    return "relay";
  }

  return "all";
}

/** Cross-carrier / mobile backhaul — direct P2P UDP often fails or stutters. */
export function isLikelyCrossNetworkPath(): boolean {
  if (shouldPreferRelayTransport()) return true;
  const connection = (navigator as Navigator & { connection?: { type?: string; effectiveType?: string } })
    .connection;
  if (!connection) return false;
  const type = String(connection.type || "").toLowerCase();
  const effective = String(connection.effectiveType || "").toLowerCase();
  return (
    type === "cellular" ||
    effective === "2g" ||
    effective === "3g" ||
    effective === "slow-2g"
  );
}

export const SDP_NEGOTIATION_OPTIONS = {
  offer: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: false,
  } as RTCOfferOptions,
  answer: {
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: false,
  } as RTCAnswerOptions,
  iceRestart: {
    iceRestart: true,
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
    voiceActivityDetection: false,
  } as RTCOfferOptions,
};

/** Build final RTCConfiguration; prefer server-provided TURN merged with client defaults. */
export function buildRtcConfiguration(
  iceServers: RTCIceServer[],
  options?: { forceRelay?: boolean },
): RTCConfiguration {
  return {
    iceServers,
    iceTransportPolicy: getIceTransportPolicy({ iceServers, forceRelay: options?.forceRelay }),
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 24,
  };
}

export function createPeerConnectionConfig(): RTCConfiguration {
  return buildRtcConfiguration(getRuntimeIceServers());
}

export function getOptimalVideoConstraints(): MediaTrackConstraints {
  const connection = (navigator as any).connection;
  
  if (connection) {
    const effectiveType = connection.effectiveType;
    if (effectiveType === "4g" || effectiveType === "wifi") {
      return MEDIA_CONSTRAINTS.video.hd;
    } else if (effectiveType === "3g") {
      return MEDIA_CONSTRAINTS.video.sd;
    } else {
      return MEDIA_CONSTRAINTS.video.mobile;
    }
  }
  
  if (window.innerWidth < 768) {
    return MEDIA_CONSTRAINTS.video.mobile;
  }
  
  return MEDIA_CONSTRAINTS.video.hd;
}

export function getAudioConstraints(): MediaTrackConstraints {
  const base: MediaTrackConstraints = {
    ...MEDIA_CONSTRAINTS.audio,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  if (typeof navigator !== "undefined" && navigator.mediaDevices?.getSupportedConstraints) {
    const caps = navigator.mediaDevices.getSupportedConstraints();
    if ("voiceIsolation" in caps && caps.voiceIsolation) {
      (base as MediaTrackConstraints & { voiceIsolation?: boolean }).voiceIsolation = true;
    }
  }
  return base;
}

/** Operator / UX toggles for constrained networks (localStorage `cyrus-comms-network-mode`). */
export type CyrusCommsNetworkMode =
  | "normal"
  | "low_bandwidth"
  | "audio_priority"
  | "emergency"
  | "degraded";

export function getCyrusCommsNetworkMode(): CyrusCommsNetworkMode {
  if (typeof window === "undefined") return "normal";
  try {
    const v = localStorage.getItem("cyrus-comms-network-mode");
    if (
      v === "low_bandwidth" ||
      v === "audio_priority" ||
      v === "emergency" ||
      v === "degraded"
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "normal";
}

export function getVideoConstraintsForCommsCall(
  callType: "audio" | "video",
  networkMode: CyrusCommsNetworkMode
): boolean | MediaTrackConstraints {
  if (callType !== "video") return false;
  // Always capture local camera for video calls; bandwidth modes only reduce quality.
  if (networkMode === "audio_priority" || networkMode === "emergency") {
    return MEDIA_CONSTRAINTS.video.mobile;
  }
  if (networkMode === "low_bandwidth" || networkMode === "degraded") {
    return {
      ...MEDIA_CONSTRAINTS.video.mobile,
      frameRate: { ideal: 12, max: 20 },
    };
  }
  // Start at SD (360p/15fps) so the initial frames flow reliably through TURN
  // relay on any network. The ABR controller can raise quality once the path
  // is proven stable.
  return {
    width: { ideal: 640, max: 1280 },
    height: { ideal: 360, max: 720 },
    frameRate: { ideal: 15, max: 30 },
    facingMode: "user",
  };
}

/** Prefer Opus (audio) and VP8/H264 (video) when the browser supports setCodecPreferences. */
export function applyPreferredCodecsToPeerConnection(pc: RTCPeerConnection): void {
  if (typeof RTCRtpSender === "undefined" || !RTCRtpSender.getCapabilities) return;
  try {
    const audioCaps = RTCRtpSender.getCapabilities("audio");
    const videoCaps = RTCRtpSender.getCapabilities("video");
    const recvVideoCaps =
      typeof RTCRtpReceiver !== "undefined" && RTCRtpReceiver.getCapabilities
        ? RTCRtpReceiver.getCapabilities("video")
        : null;
    const recvAudioCaps =
      typeof RTCRtpReceiver !== "undefined" && RTCRtpReceiver.getCapabilities
        ? RTCRtpReceiver.getCapabilities("audio")
        : null;
    for (const t of pc.getTransceivers()) {
      if (typeof t.setCodecPreferences !== "function") continue;
      const kind = t.sender?.track?.kind ?? t.receiver?.track?.kind;
      if (kind === "audio") {
        const caps = audioCaps?.codecs?.length ? audioCaps : recvAudioCaps;
        if (!caps?.codecs?.length) continue;
        const opus = caps.codecs.filter((c) => /opus/i.test(c.mimeType));
        const others = caps.codecs.filter((c) => !/opus/i.test(c.mimeType));
        if (opus.length) t.setCodecPreferences([...opus, ...others]);
      } else if (kind === "video") {
        const caps = videoCaps?.codecs?.length ? videoCaps : recvVideoCaps;
        if (!caps?.codecs?.length) continue;
        const pref = caps.codecs.filter(
          (c) => /vp8/i.test(c.mimeType) || /h264/i.test(c.mimeType)
        );
        const rest = caps.codecs.filter(
          (c) => !/vp8/i.test(c.mimeType) && !/h264/i.test(c.mimeType)
        );
        if (pref.length) t.setCodecPreferences([...pref, ...rest]);
      }
    }
  } catch {
    /* not supported or rejected */
  }
}

/** Sender-side tuning: prioritize voice clarity and smooth video under loss. */
export async function applyCommsSenderTuning(
  peerConnection: RTCPeerConnection,
  callType: "audio" | "video",
): Promise<void> {
  for (const sender of peerConnection.getSenders()) {
    const track = sender.track;
    if (!track) continue;

    try {
      if (track.kind === "audio") {
        track.contentHint = "speech";
      } else if (track.kind === "video") {
        track.contentHint = "motion";
      }
    } catch {
      /* unsupported */
    }

    const params = sender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }

    if (track.kind === "audio") {
      params.encodings[0].maxBitrate = 128_000;
      params.encodings[0].priority = "high";
      params.encodings[0].networkPriority = "high";
    } else if (track.kind === "video" && callType === "video") {
      params.degradationPreference = "maintain-framerate";
      // Start at 400 kbps (360p/15fps cap) so first frames flow through any relay.
      // The ABR controller raises this once the path is proven stable.
      params.encodings[0].maxBitrate = params.encodings[0].maxBitrate ?? 400_000;
      params.encodings[0].maxFramerate = params.encodings[0].maxFramerate ?? 30;
      params.encodings[0].priority = "medium";
      params.encodings[0].networkPriority = "medium";
    }

    await sender.setParameters(params);
  }
}

/** Drop video temporarily to preserve audio on very poor paths. */
export async function prioritizeAudioOverVideo(peerConnection: RTCPeerConnection): Promise<void> {
  for (const sender of peerConnection.getSenders()) {
    if (sender.track?.kind !== "video") continue;
    const params = sender.getParameters();
    if (!params.encodings?.length) params.encodings = [{}];
    params.encodings[0].maxBitrate = 120_000;
    params.encodings[0].maxFramerate = 8;
    params.encodings[0].scaleResolutionDownBy = 4;
    await sender.setParameters(params);
  }
}

/** Bandwidth ceiling hint for future SFU / publisher caps (kbps). */
export function getCyrusPublisherBitrateCapKbps(networkMode: CyrusCommsNetworkMode): number {
  if (networkMode === "emergency" || networkMode === "audio_priority") return 0;
  if (networkMode === "low_bandwidth" || networkMode === "degraded") return 900;
  return 4000;
}

export async function getCallQualityMetrics(
  peerConnection: RTCPeerConnection
): Promise<CallQualityMetrics> {
  const stats = await peerConnection.getStats();
  const { videoKbps, audioKbps } = measureOutboundBitrateKbps(peerConnection, stats);

  let metrics: CallQualityMetrics = {
    bitrate: videoKbps,
    packetsLost: 0,
    packetLossRate: 0,
    jitter: 0,
    roundTripTime: 0,
    frameRate: 0,
    resolution: { width: 0, height: 0 },
    audioLevel: 0,
    qualityScore: "good",
    connectionState: peerConnection.connectionState,
    iceConnectionState: peerConnection.iceConnectionState,
  };

  let totalPacketsReceived = 0;
  let totalPacketsLost = 0;
  let inboundAudioJitter = 0;
  let inboundAudioLevel = 0;

  stats.forEach((report) => {
    if (report.type === "outbound-rtp" && report.kind === "video") {
      metrics.frameRate = report.framesPerSecond || 0;
      if (report.frameWidth && report.frameHeight) {
        metrics.resolution = {
          width: report.frameWidth,
          height: report.frameHeight,
        };
      }
    }

    if (report.type === "inbound-rtp") {
      const lost = report.packetsLost || 0;
      const received = report.packetsReceived || 0;
      totalPacketsLost += lost;
      totalPacketsReceived += received + lost;
      if (report.kind === "audio") {
        inboundAudioJitter = Math.max(inboundAudioJitter, report.jitter || 0);
      }
    }

    if (report.type === "candidate-pair" && report.state === "succeeded" && report.nominated) {
      metrics.roundTripTime = report.currentRoundTripTime || metrics.roundTripTime;
    }

    if (report.type === "track" && report.kind === "audio") {
      inboundAudioLevel = Math.max(inboundAudioLevel, report.audioLevel || 0);
    }
  });

  metrics.jitter = inboundAudioJitter;
  metrics.audioLevel = inboundAudioLevel;
  metrics.packetsLost = totalPacketsLost;
  if (totalPacketsReceived > 0) {
    metrics.packetLossRate = (totalPacketsLost / totalPacketsReceived) * 100;
  }

  const rttMs = metrics.roundTripTime * 1000;
  const loss = metrics.packetLossRate;

  if (loss < 0.8 && rttMs < 120 && videoKbps > 400) {
    metrics.qualityScore = "excellent";
  } else if (loss < 2.5 && rttMs < 220 && (videoKbps > 180 || audioKbps > 24)) {
    metrics.qualityScore = "good";
  } else if (loss < 6 && rttMs < 450) {
    metrics.qualityScore = "fair";
  } else {
    metrics.qualityScore = "poor";
  }

  return metrics;
}

export async function applyBandwidthConstraints(
  peerConnection: RTCPeerConnection,
  preset: keyof typeof QUALITY_PRESETS,
  networkMode?: CyrusCommsNetworkMode
): Promise<void> {
  const config = QUALITY_PRESETS[preset];
  const capKbps =
    networkMode !== undefined ? getCyrusPublisherBitrateCapKbps(networkMode) : null;
  const capBps = capKbps !== null && capKbps > 0 ? capKbps * 1000 : null;

  const senders = peerConnection.getSenders();

  for (const sender of senders) {
    if (sender.track?.kind === "video") {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      let maxVideo = config.maxVideoBitrate;
      if (capBps !== null) {
        maxVideo = Math.min(maxVideo, capBps);
      }
      params.encodings[0].maxBitrate = maxVideo;
      params.encodings[0].maxFramerate = config.targetFrameRate;
      await sender.setParameters(params);
    } else if (sender.track?.kind === "audio") {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = config.maxAudioBitrate;
      await sender.setParameters(params);
    }
  }
}

export class AdaptiveBitrateController {
  private peerConnection: RTCPeerConnection;
  private currentPreset: keyof typeof QUALITY_PRESETS = "high";
  private monitoringInterval: NodeJS.Timeout | null = null;
  private onQualityChange?: (preset: string, metrics: CallQualityMetrics) => void;

  constructor(
    peerConnection: RTCPeerConnection,
    onQualityChange?: (preset: string, metrics: CallQualityMetrics) => void
  ) {
    this.peerConnection = peerConnection;
    this.onQualityChange = onQualityChange;
  }

  start(): void {
    this.monitoringInterval = setInterval(async () => {
      await this.adjustQuality();
    }, 1500);
  }

  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  private async adjustQuality(): Promise<void> {
    const metrics = await getCallQualityMetrics(this.peerConnection);
    let newPreset = this.currentPreset;

    if (metrics.qualityScore === "excellent" && this.currentPreset !== "ultra") {
      const presetOrder = ["low", "medium", "high", "ultra"];
      const currentIndex = presetOrder.indexOf(this.currentPreset);
      if (currentIndex < presetOrder.length - 1) {
        newPreset = presetOrder[currentIndex + 1] as keyof typeof QUALITY_PRESETS;
      }
    } else if (metrics.qualityScore === "poor") {
      if (metrics.packetLossRate > 8 || metrics.roundTripTime > 0.35) {
        await prioritizeAudioOverVideo(this.peerConnection);
      }
      if (this.currentPreset !== "low") {
        const presetOrder = ["low", "medium", "high", "ultra"];
        const currentIndex = presetOrder.indexOf(this.currentPreset);
        if (currentIndex > 0) {
          newPreset = presetOrder[currentIndex - 1] as keyof typeof QUALITY_PRESETS;
        }
      }
    } else if (metrics.qualityScore === "fair" && this.currentPreset !== "low") {
      const presetOrder = ["low", "medium", "high", "ultra"];
      const currentIndex = presetOrder.indexOf(this.currentPreset);
      if (currentIndex > 0 && metrics.packetLossRate > 4) {
        newPreset = presetOrder[currentIndex - 1] as keyof typeof QUALITY_PRESETS;
      }
    }

    if (newPreset !== this.currentPreset) {
      this.currentPreset = newPreset;
      await applyBandwidthConstraints(this.peerConnection, newPreset, getCyrusCommsNetworkMode());
      this.onQualityChange?.(newPreset, metrics);
    }
  }

  getCurrentPreset(): string {
    return this.currentPreset;
  }
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private noiseGate: GainNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private destinationNode: MediaStreamAudioDestinationNode | null = null;
  private originalStream: MediaStream | null = null;

  async processStream(stream: MediaStream): Promise<MediaStream> {
    this.originalStream = stream;
    
    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      return stream;
    }

    try {
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      
      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = 1.0;
      
      this.noiseGate = this.audioContext.createGain();
      this.noiseGate.gain.value = 1.0;
      
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      const compressor = this.audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;
      
      const highpassFilter = this.audioContext.createBiquadFilter();
      highpassFilter.type = "highpass";
      highpassFilter.frequency.value = 80;
      
      const lowpassFilter = this.audioContext.createBiquadFilter();
      lowpassFilter.type = "lowpass";
      lowpassFilter.frequency.value = 8000;
      
      this.destinationNode = this.audioContext.createMediaStreamDestination();
      
      this.sourceNode
        .connect(highpassFilter)
        .connect(lowpassFilter)
        .connect(this.noiseGate)
        .connect(compressor)
        .connect(this.gainNode)
        .connect(this.analyser)
        .connect(this.destinationNode);
      
      const processedStream = new MediaStream();
      
      this.destinationNode.stream.getAudioTracks().forEach((track) => {
        processedStream.addTrack(track);
      });
      
      stream.getVideoTracks().forEach((track) => {
        processedStream.addTrack(track);
      });
      
      this.startNoiseGating();
      
      return processedStream;
    } catch (error) {
      console.warn("Audio processing not supported, using original stream:", error);
      return stream;
    }
  }

  private startNoiseGating(): void {
    if (!this.analyser || !this.noiseGate) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    const noiseThreshold = 30;

    const checkNoise = () => {
      if (!this.analyser || !this.noiseGate) return;

      this.analyser.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;

      if (average < noiseThreshold) {
        this.noiseGate.gain.setTargetAtTime(0.1, this.audioContext!.currentTime, 0.1);
      } else {
        this.noiseGate.gain.setTargetAtTime(1.0, this.audioContext!.currentTime, 0.05);
      }

      requestAnimationFrame(checkNoise);
    };

    checkNoise();
  }

  getAudioLevel(): number {
    if (!this.analyser) return 0;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);
    return dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
  }

  setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(2, volume));
    }
  }

  mute(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = 0;
    }
  }

  unmute(): void {
    if (this.gainNode) {
      this.gainNode.gain.value = 1;
    }
  }

  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.gainNode = null;
    this.noiseGate = null;
    this.sourceNode = null;
    this.destinationNode = null;
  }
}

export function detectNetworkType(): "wifi" | "cellular" | "ethernet" | "unknown" {
  const connection = (navigator as any).connection;
  
  if (!connection) return "unknown";
  
  const type = connection.type || connection.effectiveType;
  
  if (type === "wifi") return "wifi";
  if (["cellular", "2g", "3g", "4g", "5g"].includes(type)) return "cellular";
  if (type === "ethernet") return "ethernet";
  
  return "unknown";
}

export function estimateBandwidth(): Promise<number> {
  return new Promise((resolve) => {
    const connection = (navigator as any).connection;
    
    if (connection && connection.downlink) {
      resolve(connection.downlink * 1000000);
    } else {
      resolve(5000000);
    }
  });
}
