/**
 * Fast Media Quality Adaptation - Zoom/WhatsApp-grade real-time adjustment
 * 
 * Features:
 * - Ultra-fast quality detection (500ms intervals)
 * - Predictive quality degradation
 * - Aggressive bitrate adaptation
 * - Automatic resolution/framerate adjustment
 * - Audio prioritization under stress
 * - Smooth quality recovery
 */

export interface MediaQualityMetrics {
  bitrate: number;
  packetsLost: number;
  packetLossRate: number;
  jitter: number;
  rtt: number;
  frameRate: number;
  resolution: { width: number; height: number };
  timestamp: number;
}

export interface QualityLevel {
  name: "ultra" | "high" | "medium" | "low" | "minimal";
  videoBitrate: number;
  audioBitrate: number;
  frameRate: number;
  resolution: { width: number; height: number };
}

export const QUALITY_LEVELS: Record<string, QualityLevel> = {
  ultra: {
    name: "ultra",
    videoBitrate: 2500000,
    audioBitrate: 128000,
    frameRate: 30,
    resolution: { width: 1280, height: 720 },
  },
  high: {
    name: "high",
    videoBitrate: 1500000,
    audioBitrate: 96000,
    frameRate: 30,
    resolution: { width: 1280, height: 720 },
  },
  medium: {
    name: "medium",
    videoBitrate: 800000,
    audioBitrate: 64000,
    frameRate: 24,
    resolution: { width: 640, height: 480 },
  },
  low: {
    name: "low",
    videoBitrate: 400000,
    audioBitrate: 48000,
    frameRate: 15,
    resolution: { width: 480, height: 360 },
  },
  minimal: {
    name: "minimal",
    videoBitrate: 200000,
    audioBitrate: 32000,
    frameRate: 10,
    resolution: { width: 320, height: 240 },
  },
};

interface QualityHistory {
  metrics: MediaQualityMetrics;
  level: QualityLevel;
  timestamp: number;
}

export class FastMediaQualityAdapter {
  private currentLevel: QualityLevel = QUALITY_LEVELS.high;
  private history: QualityHistory[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private consecutivePoorSamples = 0;
  private consecutiveGoodSamples = 0;
  private lastAdjustment = 0;
  private isAudioPriority = false;
  private disposed = false;

  // Thresholds for quality decisions
  private readonly CRITICAL_LOSS_RATE = 10; // 10% packet loss
  private readonly POOR_LOSS_RATE = 5; // 5% packet loss
  private readonly FAIR_LOSS_RATE = 2; // 2% packet loss
  private readonly CRITICAL_RTT = 400; // 400ms RTT
  private readonly POOR_RTT = 250; // 250ms RTT
  private readonly FAIR_RTT = 150; // 150ms RTT
  private readonly CRITICAL_JITTER = 80; // 80ms jitter
  private readonly POOR_JITTER = 50; // 50ms jitter

  // Adaptation parameters
  private readonly MIN_ADJUSTMENT_INTERVAL_MS = 2000; // Wait 2s between adjustments
  private readonly CONSECUTIVE_THRESHOLD = 3; // 3 consecutive bad samples to downgrade
  private readonly RECOVERY_THRESHOLD = 5; // 5 consecutive good samples to upgrade
  private readonly MONITORING_INTERVAL_MS = 500; // Check every 500ms

  constructor(
    private peerConnection: RTCPeerConnection,
    private onQualityChange?: (level: QualityLevel, metrics: MediaQualityMetrics) => void,
    private debug = false,
  ) {}

  /**
   * Start monitoring and adapting quality
   */
  start(): void {
    if (this.monitoringInterval) return;

    this.log("Starting fast quality adaptation");

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkAndAdapt();
      } catch (error) {
        this.log("Error in quality adaptation:", error);
      }
    }, this.MONITORING_INTERVAL_MS);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.log("Stopped quality adaptation");
    }
  }

  /**
   * Check current quality and adapt if needed
   */
  private async checkAndAdapt(): Promise<void> {
    if (this.disposed || !this.peerConnection) return;

    const metrics = await this.getCurrentMetrics();
    const qualityScore = this.calculateQualityScore(metrics);

    // Add to history
    this.history.push({
      metrics,
      level: this.currentLevel,
      timestamp: Date.now(),
    });

    // Keep only last 20 samples (10 seconds at 500ms intervals)
    if (this.history.length > 20) {
      this.history.shift();
    }

    // Determine if we should adjust
    if (qualityScore === "critical" || qualityScore === "poor") {
      this.consecutivePoorSamples++;
      this.consecutiveGoodSamples = 0;

      if (this.consecutivePoorSamples >= this.CONSECUTIVE_THRESHOLD) {
        await this.degradeQuality(qualityScore, metrics);
      }
    } else if (qualityScore === "excellent" || qualityScore === "good") {
      this.consecutiveGoodSamples++;
      this.consecutivePoorSamples = 0;

      if (this.consecutiveGoodSamples >= this.RECOVERY_THRESHOLD) {
        await this.improveQuality(metrics);
      }
    } else {
      // Fair quality - maintain current level
      this.consecutivePoorSamples = Math.max(0, this.consecutivePoorSamples - 1);
      this.consecutiveGoodSamples = Math.max(0, this.consecutiveGoodSamples - 1);
    }
  }

  /**
   * Get current connection metrics
   */
  private async getCurrentMetrics(): Promise<MediaQualityMetrics> {
    const stats = await this.peerConnection.getStats();

    let bitrate = 0;
    let packetsLost = 0;
    let packetsReceived = 0;
    let jitter = 0;
    let rtt = 0;
    let frameRate = 0;
    let width = 0;
    let height = 0;

    stats.forEach((report) => {
      if (report.type === "outbound-rtp") {
        bitrate += ((report.bytesSent || 0) * 8) / 1000;
        frameRate = Math.max(frameRate, report.framesPerSecond || 0);
        width = Math.max(width, report.frameWidth || 0);
        height = Math.max(height, report.frameHeight || 0);
      }

      if (report.type === "inbound-rtp") {
        packetsLost += report.packetsLost || 0;
        packetsReceived += report.packetsReceived || 0;
        jitter = Math.max(jitter, (report.jitter || 0) * 1000);
      }

      if (report.type === "candidate-pair" && report.state === "succeeded") {
        rtt = Math.max(rtt, (report.currentRoundTripTime || 0) * 1000);
      }
    });

    const packetLossRate =
      packetsReceived > 0 ? (packetsLost / (packetsReceived + packetsLost)) * 100 : 0;

    return {
      bitrate,
      packetsLost,
      packetLossRate,
      jitter,
      rtt,
      frameRate,
      resolution: { width, height },
      timestamp: Date.now(),
    };
  }

  /**
   * Calculate quality score from metrics
   */
  private calculateQualityScore(
    metrics: MediaQualityMetrics,
  ): "excellent" | "good" | "fair" | "poor" | "critical" {
    const { packetLossRate, rtt, jitter } = metrics;

    // Critical conditions (immediate action)
    if (
      packetLossRate >= this.CRITICAL_LOSS_RATE ||
      rtt >= this.CRITICAL_RTT ||
      jitter >= this.CRITICAL_JITTER
    ) {
      return "critical";
    }

    // Poor conditions (action needed)
    if (
      packetLossRate >= this.POOR_LOSS_RATE ||
      rtt >= this.POOR_RTT ||
      jitter >= this.POOR_JITTER
    ) {
      return "poor";
    }

    // Fair conditions (monitor)
    if (packetLossRate >= this.FAIR_LOSS_RATE || rtt >= this.FAIR_RTT) {
      return "fair";
    }

    // Good conditions (stable)
    if (packetLossRate < 1 && rtt < 100) {
      return "excellent";
    }

    return "good";
  }

  /**
   * Degrade quality in response to poor conditions
   */
  private async degradeQuality(
    severity: "critical" | "poor",
    metrics: MediaQualityMetrics,
  ): Promise<void> {
    const now = Date.now();
    if (now - this.lastAdjustment < this.MIN_ADJUSTMENT_INTERVAL_MS) {
      return; // Too soon since last adjustment
    }

    const levels = Object.values(QUALITY_LEVELS);
    const currentIndex = levels.findIndex((l) => l.name === this.currentLevel.name);

    if (severity === "critical") {
      // Aggressive downgrade - skip levels if needed
      const targetIndex = Math.min(currentIndex + 2, levels.length - 1);
      await this.applyQualityLevel(levels[targetIndex], metrics);

      // Enable audio priority mode for critical situations
      if (!this.isAudioPriority) {
        this.log("Enabling audio priority mode");
        this.isAudioPriority = true;
        await this.prioritizeAudio();
      }
    } else {
      // Gradual downgrade
      const targetIndex = Math.min(currentIndex + 1, levels.length - 1);
      if (targetIndex !== currentIndex) {
        await this.applyQualityLevel(levels[targetIndex], metrics);
      }
    }

    this.consecutivePoorSamples = 0;
    this.lastAdjustment = now;
  }

  /**
   * Improve quality when conditions are good
   */
  private async improveQuality(metrics: MediaQualityMetrics): Promise<void> {
    const now = Date.now();
    if (now - this.lastAdjustment < this.MIN_ADJUSTMENT_INTERVAL_MS * 2) {
      return; // Be more conservative with upgrades
    }

    const levels = Object.values(QUALITY_LEVELS);
    const currentIndex = levels.findIndex((l) => l.name === this.currentLevel.name);

    if (currentIndex > 0) {
      // Disable audio priority mode if enabled
      if (this.isAudioPriority) {
        this.log("Disabling audio priority mode");
        this.isAudioPriority = false;
      }

      // Gradual upgrade
      await this.applyQualityLevel(levels[currentIndex - 1], metrics);
      this.consecutiveGoodSamples = 0;
      this.lastAdjustment = now;
    }
  }

  /**
   * Apply a specific quality level
   */
  private async applyQualityLevel(
    level: QualityLevel,
    metrics: MediaQualityMetrics,
  ): Promise<void> {
    if (this.disposed) return;

    this.log(`Adjusting quality: ${this.currentLevel.name} → ${level.name}`, metrics);

    const senders = this.peerConnection.getSenders();

    for (const sender of senders) {
      const track = sender.track;
      if (!track) continue;

      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }

        if (track.kind === "video") {
          params.encodings[0].maxBitrate = level.videoBitrate;
          params.encodings[0].maxFramerate = level.frameRate;

          // Apply resolution scaling
          const scale = this.calculateScale(level.resolution);
          if (scale > 1) {
            params.encodings[0].scaleResolutionDownBy = scale;
          } else {
            delete params.encodings[0].scaleResolutionDownBy;
          }
        } else if (track.kind === "audio") {
          params.encodings[0].maxBitrate = level.audioBitrate;
          params.encodings[0].priority = this.isAudioPriority ? "high" : "medium";
        }

        await sender.setParameters(params);
      } catch (error) {
        this.log(`Error applying quality to ${track.kind}:`, error);
      }
    }

    this.currentLevel = level;
    this.onQualityChange?.(level, metrics);
  }

  /**
   * Prioritize audio by reducing video bitrate drastically
   */
  private async prioritizeAudio(): Promise<void> {
    const senders = this.peerConnection.getSenders();

    for (const sender of senders) {
      const track = sender.track;
      if (track?.kind !== "video") continue;

      try {
        const params = sender.getParameters();
        if (!params.encodings || params.encodings.length === 0) {
          params.encodings = [{}];
        }

        // Reduce video to minimum
        params.encodings[0].maxBitrate = 100000; // 100 kbps
        params.encodings[0].maxFramerate = 5; // 5 fps
        params.encodings[0].scaleResolutionDownBy = 4;
        params.encodings[0].priority = "low";

        await sender.setParameters(params);
      } catch (error) {
        this.log("Error prioritizing audio:", error);
      }
    }
  }

  /**
   * Calculate resolution scale factor
   */
  private calculateScale(targetResolution: { width: number; height: number }): number {
    // Get current video track resolution
    const videoTrack = this.peerConnection
      .getSenders()
      .find((s) => s.track?.kind === "video")?.track as MediaStreamTrack | undefined;

    if (!videoTrack) return 1;

    const settings = videoTrack.getSettings();
    const currentWidth = settings.width || 1280;
    const currentHeight = settings.height || 720;

    // Calculate scale to reach target resolution
    const scaleX = currentWidth / targetResolution.width;
    const scaleY = currentHeight / targetResolution.height;

    return Math.max(1, Math.min(scaleX, scaleY));
  }

  /**
   * Get current quality level
   */
  getCurrentLevel(): QualityLevel {
    return this.currentLevel;
  }

  /**
   * Get quality history
   */
  getHistory(): QualityHistory[] {
    return [...this.history];
  }

  /**
   * Force a specific quality level (manual override)
   */
  async forceQualityLevel(levelName: keyof typeof QUALITY_LEVELS): Promise<void> {
    const level = QUALITY_LEVELS[levelName];
    if (!level) {
      throw new Error(`Invalid quality level: ${levelName}`);
    }

    const metrics = await this.getCurrentMetrics();
    await this.applyQualityLevel(level, metrics);
    
    // Reset counters
    this.consecutivePoorSamples = 0;
    this.consecutiveGoodSamples = 0;
    this.lastAdjustment = Date.now();
  }

  /**
   * Dispose the adapter
   */
  dispose(): void {
    if (this.disposed) return;

    this.log("Disposing quality adapter");
    this.disposed = true;
    this.stop();
    this.history = [];
  }

  /**
   * Log with optional debug flag
   */
  private log(message: string, ...args: any[]): void {
    if (this.debug) {
      console.log(`[FastMediaQualityAdapter] ${message}`, ...args);
    }
  }
}
