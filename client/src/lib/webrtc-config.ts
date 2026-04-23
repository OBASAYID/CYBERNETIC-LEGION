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
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl: { ideal: true },
    channelCount: { ideal: 1 },
    sampleRate: { ideal: 48000 },
    sampleSize: { ideal: 16 },
  },
};

export function createPeerConnectionConfig(): RTCConfiguration {
  return {
    iceServers: ENTERPRISE_ICE_SERVERS,
    iceTransportPolicy: "all",
    bundlePolicy: "max-bundle",
    rtcpMuxPolicy: "require",
    iceCandidatePoolSize: 10,
  };
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
  return MEDIA_CONSTRAINTS.audio;
}

export async function getCallQualityMetrics(
  peerConnection: RTCPeerConnection
): Promise<CallQualityMetrics> {
  const stats = await peerConnection.getStats();
  
  let metrics: CallQualityMetrics = {
    bitrate: 0,
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

  let totalPacketsSent = 0;
  let totalPacketsLost = 0;

  stats.forEach((report) => {
    if (report.type === "outbound-rtp" && report.kind === "video") {
      metrics.bitrate = report.bytesSent ? (report.bytesSent * 8) / 1000 : 0;
      metrics.frameRate = report.framesPerSecond || 0;
      if (report.frameWidth && report.frameHeight) {
        metrics.resolution = {
          width: report.frameWidth,
          height: report.frameHeight,
        };
      }
    }

    if (report.type === "inbound-rtp") {
      metrics.jitter = report.jitter || 0;
      totalPacketsLost += report.packetsLost || 0;
      totalPacketsSent += report.packetsReceived || 0;
    }

    if (report.type === "candidate-pair" && report.state === "succeeded") {
      metrics.roundTripTime = report.currentRoundTripTime || 0;
    }

    if (report.type === "track" && report.kind === "audio") {
      metrics.audioLevel = report.audioLevel || 0;
    }
  });

  metrics.packetsLost = totalPacketsLost;
  if (totalPacketsSent > 0) {
    metrics.packetLossRate = (totalPacketsLost / totalPacketsSent) * 100;
  }

  if (metrics.packetLossRate < 1 && metrics.roundTripTime < 0.1) {
    metrics.qualityScore = "excellent";
  } else if (metrics.packetLossRate < 3 && metrics.roundTripTime < 0.2) {
    metrics.qualityScore = "good";
  } else if (metrics.packetLossRate < 5 && metrics.roundTripTime < 0.4) {
    metrics.qualityScore = "fair";
  } else {
    metrics.qualityScore = "poor";
  }

  return metrics;
}

export async function applyBandwidthConstraints(
  peerConnection: RTCPeerConnection,
  preset: keyof typeof QUALITY_PRESETS
): Promise<void> {
  const config = QUALITY_PRESETS[preset];
  
  const senders = peerConnection.getSenders();
  
  for (const sender of senders) {
    if (sender.track?.kind === "video") {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = config.maxVideoBitrate;
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
    }, 3000);
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
    } else if (metrics.qualityScore === "poor" && this.currentPreset !== "low") {
      const presetOrder = ["low", "medium", "high", "ultra"];
      const currentIndex = presetOrder.indexOf(this.currentPreset);
      if (currentIndex > 0) {
        newPreset = presetOrder[currentIndex - 1] as keyof typeof QUALITY_PRESETS;
      }
    }

    if (newPreset !== this.currentPreset) {
      this.currentPreset = newPreset;
      await applyBandwidthConstraints(this.peerConnection, newPreset);
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

export class ConnectionManager {
  private peerConnection: RTCPeerConnection;
  private ws: WebSocket;
  private roomId: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private onStateChange?: (state: string) => void;
  private onReconnecting?: () => void;
  private onReconnected?: () => void;
  private onFailed?: () => void;

  constructor(
    peerConnection: RTCPeerConnection,
    ws: WebSocket,
    roomId: string,
    callbacks?: {
      onStateChange?: (state: string) => void;
      onReconnecting?: () => void;
      onReconnected?: () => void;
      onFailed?: () => void;
    }
  ) {
    this.peerConnection = peerConnection;
    this.ws = ws;
    this.roomId = roomId;
    this.onStateChange = callbacks?.onStateChange;
    this.onReconnecting = callbacks?.onReconnecting;
    this.onReconnected = callbacks?.onReconnected;
    this.onFailed = callbacks?.onFailed;

    this.setupConnectionMonitoring();
  }

  private setupConnectionMonitoring(): void {
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.onStateChange?.(state);

      if (state === "disconnected" || state === "failed") {
        this.attemptReconnect();
      } else if (state === "connected") {
        this.reconnectAttempts = 0;
      }
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      const state = this.peerConnection.iceConnectionState;
      
      if (state === "disconnected") {
        setTimeout(() => {
          if (this.peerConnection.iceConnectionState === "disconnected") {
            this.attemptReconnect();
          }
        }, 5000);
      }
    };

    this.ws.onclose = () => {
      if (this.peerConnection.connectionState !== "closed") {
        this.attemptReconnect();
      }
    };
  }

  private async attemptReconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.onFailed?.();
      return;
    }

    this.reconnectAttempts++;
    this.onReconnecting?.();

    await new Promise((resolve) =>
      setTimeout(resolve, this.reconnectDelay * this.reconnectAttempts)
    );

    try {
      if (this.peerConnection.iceConnectionState === "failed") {
        await this.peerConnection.restartIce();
      }

      const offer = await this.peerConnection.createOffer({ iceRestart: true });
      await this.peerConnection.setLocalDescription(offer);

      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(
          JSON.stringify({
            type: "offer",
            roomId: this.roomId,
            payload: offer,
          })
        );
      }

      this.onReconnected?.();
    } catch (error) {
      console.error("Reconnection failed:", error);
      this.attemptReconnect();
    }
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
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
