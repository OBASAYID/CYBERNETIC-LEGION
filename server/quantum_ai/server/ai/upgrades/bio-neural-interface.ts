import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface EEGChannel {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  impedance: number;
  signalQuality: number;
}

interface BrainWaveData {
  timestamp: number;
  channels: Record<string, number[]>;
  sampleRate: number;
}

interface FrequencyBand {
  name: 'delta' | 'theta' | 'alpha' | 'beta' | 'gamma';
  minFreq: number;
  maxFreq: number;
  power: number;
  dominance: number;
}

interface CognitiveState {
  focus: number;
  relaxation: number;
  stress: number;
  engagement: number;
  drowsiness: number;
  mentalWorkload: number;
  emotionalValence: number;
  timestamp: Date;
}

interface NeuralPattern {
  id: string;
  name: string;
  type: 'motor_imagery' | 'ssvep' | 'p300' | 'emotion' | 'attention' | 'meditation' | 'custom';
  signature: number[];
  accuracy: number;
  trainingExamples: number;
}

interface BCICommand {
  id: string;
  name: string;
  pattern: NeuralPattern;
  action: string;
  parameters: Record<string, any>;
  confidence: number;
  activationThreshold: number;
}

interface NeurofeedbackSession {
  id: string;
  target: 'focus' | 'relaxation' | 'alpha_enhancement' | 'stress_reduction' | 'peak_performance';
  duration: number;
  startTime: Date;
  metrics: { timestamp: number; score: number }[];
  currentScore: number;
  improvement: number;
}

export class BioNeuralInterface {
  private channels: Map<string, EEGChannel> = new Map();
  private patterns: Map<string, NeuralPattern> = new Map();
  private commands: Map<string, BCICommand> = new Map();
  private brainwaveHistory: BrainWaveData[] = [];
  private cognitiveStates: CognitiveState[] = [];
  private activeSessions: Map<string, NeurofeedbackSession> = new Map();
  private isConnected = false;
  private sampleRate = 256;

  constructor() {
    console.log("[Bio-Neural Interface] Initializing brain-computer interface simulation");
    this.initializeChannels();
    this.initializeDefaultPatterns();
    this.startSimulation();
  }

  private initializeChannels(): void {
    const electrodePositions = [
      { name: 'Fp1', position: { x: -0.03, y: 0.08, z: 0.02 } },
      { name: 'Fp2', position: { x: 0.03, y: 0.08, z: 0.02 } },
      { name: 'F3', position: { x: -0.05, y: 0.05, z: 0.04 } },
      { name: 'F4', position: { x: 0.05, y: 0.05, z: 0.04 } },
      { name: 'C3', position: { x: -0.06, y: 0, z: 0.06 } },
      { name: 'C4', position: { x: 0.06, y: 0, z: 0.06 } },
      { name: 'P3', position: { x: -0.05, y: -0.05, z: 0.04 } },
      { name: 'P4', position: { x: 0.05, y: -0.05, z: 0.04 } },
      { name: 'O1', position: { x: -0.03, y: -0.08, z: 0.02 } },
      { name: 'O2', position: { x: 0.03, y: -0.08, z: 0.02 } },
      { name: 'Fz', position: { x: 0, y: 0.06, z: 0.05 } },
      { name: 'Cz', position: { x: 0, y: 0, z: 0.08 } },
      { name: 'Pz', position: { x: 0, y: -0.06, z: 0.05 } },
      { name: 'T3', position: { x: -0.08, y: 0, z: 0.02 } },
      { name: 'T4', position: { x: 0.08, y: 0, z: 0.02 } },
      { name: 'T5', position: { x: -0.07, y: -0.04, z: 0.02 } },
      { name: 'T6', position: { x: 0.07, y: -0.04, z: 0.02 } }
    ];

    for (const electrode of electrodePositions) {
      const channel: EEGChannel = {
        id: `ch_${electrode.name}`,
        name: electrode.name,
        position: electrode.position,
        impedance: 5 + Math.random() * 5,
        signalQuality: 0.8 + Math.random() * 0.2
      };
      this.channels.set(channel.id, channel);
    }
  }

  private initializeDefaultPatterns(): void {
    const defaultPatterns: Omit<NeuralPattern, 'id'>[] = [
      {
        name: 'Left Hand Motor Imagery',
        type: 'motor_imagery',
        signature: [0.8, 0.2, 0.1, 0.3, 0.9, 0.2, 0.1, 0.2],
        accuracy: 0.85,
        trainingExamples: 500
      },
      {
        name: 'Right Hand Motor Imagery',
        type: 'motor_imagery',
        signature: [0.2, 0.8, 0.3, 0.1, 0.2, 0.9, 0.2, 0.1],
        accuracy: 0.87,
        trainingExamples: 500
      },
      {
        name: 'Focus State',
        type: 'attention',
        signature: [0.3, 0.3, 0.7, 0.7, 0.4, 0.4, 0.2, 0.2],
        accuracy: 0.92,
        trainingExamples: 1000
      },
      {
        name: 'Relaxation State',
        type: 'meditation',
        signature: [0.2, 0.2, 0.3, 0.3, 0.8, 0.8, 0.6, 0.6],
        accuracy: 0.89,
        trainingExamples: 800
      },
      {
        name: 'P300 Target Detection',
        type: 'p300',
        signature: [0.1, 0.1, 0.2, 0.2, 0.3, 0.3, 0.9, 0.9],
        accuracy: 0.91,
        trainingExamples: 1200
      }
    ];

    for (const pattern of defaultPatterns) {
      this.registerPattern(pattern);
    }
  }

  private startSimulation(): void {
    setInterval(() => {
      if (this.isConnected) {
        this.generateSimulatedBrainwave();
        this.updateCognitiveState();
      }
    }, 100);
  }

  connect(deviceType: 'openbci' | 'emotiv' | 'muse' | 'neurosky' | 'simulation' = 'simulation'): {
    success: boolean;
    device: string;
    channels: number;
    sampleRate: number;
  } {
    this.isConnected = true;

    return {
      success: true,
      device: deviceType,
      channels: this.channels.size,
      sampleRate: this.sampleRate
    };
  }

  disconnect(): void {
    this.isConnected = false;
  }

  private generateSimulatedBrainwave(): void {
    const timestamp = Date.now();
    const channels: Record<string, number[]> = {};

    for (const [id, channel] of this.channels) {
      const samples: number[] = [];
      for (let i = 0; i < 25; i++) {
        const delta = Math.sin(2 * Math.PI * 2 * (timestamp + i) / 1000) * 20;
        const theta = Math.sin(2 * Math.PI * 6 * (timestamp + i) / 1000) * 10;
        const alpha = Math.sin(2 * Math.PI * 10 * (timestamp + i) / 1000) * 15;
        const beta = Math.sin(2 * Math.PI * 20 * (timestamp + i) / 1000) * 5;
        const gamma = Math.sin(2 * Math.PI * 40 * (timestamp + i) / 1000) * 2;
        const noise = (Math.random() - 0.5) * 5;

        samples.push(delta + theta + alpha + beta + gamma + noise);
      }
      channels[id] = samples;
    }

    const data: BrainWaveData = {
      timestamp,
      channels,
      sampleRate: this.sampleRate
    };

    this.brainwaveHistory.push(data);
    if (this.brainwaveHistory.length > 100) {
      this.brainwaveHistory.shift();
    }
  }

  private updateCognitiveState(): void {
    const state: CognitiveState = {
      focus: 0.4 + Math.random() * 0.4,
      relaxation: 0.3 + Math.random() * 0.5,
      stress: 0.1 + Math.random() * 0.3,
      engagement: 0.5 + Math.random() * 0.3,
      drowsiness: 0.1 + Math.random() * 0.2,
      mentalWorkload: 0.3 + Math.random() * 0.4,
      emotionalValence: 0.5 + (Math.random() - 0.5) * 0.4,
      timestamp: new Date()
    };

    this.cognitiveStates.push(state);
    if (this.cognitiveStates.length > 1000) {
      this.cognitiveStates.shift();
    }
  }

  analyzeFrequencyBands(): FrequencyBand[] {
    const bands: FrequencyBand[] = [
      { name: 'delta', minFreq: 0.5, maxFreq: 4, power: 20 + Math.random() * 10, dominance: 0 },
      { name: 'theta', minFreq: 4, maxFreq: 8, power: 15 + Math.random() * 10, dominance: 0 },
      { name: 'alpha', minFreq: 8, maxFreq: 13, power: 25 + Math.random() * 15, dominance: 0 },
      { name: 'beta', minFreq: 13, maxFreq: 30, power: 10 + Math.random() * 10, dominance: 0 },
      { name: 'gamma', minFreq: 30, maxFreq: 100, power: 5 + Math.random() * 5, dominance: 0 }
    ];

    const totalPower = bands.reduce((sum, b) => sum + b.power, 0);
    for (const band of bands) {
      band.dominance = band.power / totalPower;
    }

    return bands;
  }

  getCurrentCognitiveState(): CognitiveState | null {
    return this.cognitiveStates.length > 0
      ? this.cognitiveStates[this.cognitiveStates.length - 1]
      : null;
  }

  registerPattern(config: Omit<NeuralPattern, 'id'>): NeuralPattern {
    const pattern: NeuralPattern = {
      ...config,
      id: `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    this.patterns.set(pattern.id, pattern);
    return pattern;
  }

  createCommand(config: {
    name: string;
    patternId: string;
    action: string;
    parameters?: Record<string, any>;
    threshold?: number;
  }): BCICommand {
    const pattern = this.patterns.get(config.patternId);
    if (!pattern) throw new Error(`Pattern ${config.patternId} not found`);

    const command: BCICommand = {
      id: `cmd_${Date.now()}`,
      name: config.name,
      pattern,
      action: config.action,
      parameters: config.parameters || {},
      confidence: 0,
      activationThreshold: config.threshold || 0.7
    };

    this.commands.set(command.id, command);
    return command;
  }

  detectCommands(): { command: BCICommand; confidence: number }[] {
    const detectedCommands: { command: BCICommand; confidence: number }[] = [];

    for (const command of this.commands.values()) {
      const confidence = 0.5 + Math.random() * 0.5;
      if (confidence >= command.activationThreshold) {
        command.confidence = confidence;
        detectedCommands.push({ command, confidence });
      }
    }

    return detectedCommands;
  }

  startNeurofeedbackSession(target: NeurofeedbackSession['target'], durationMinutes: number): NeurofeedbackSession {
    const session: NeurofeedbackSession = {
      id: `nf_${Date.now()}`,
      target,
      duration: durationMinutes * 60 * 1000,
      startTime: new Date(),
      metrics: [],
      currentScore: 0.5,
      improvement: 0
    };

    this.activeSessions.set(session.id, session);

    const updateInterval = setInterval(() => {
      const elapsed = Date.now() - session.startTime.getTime();
      if (elapsed >= session.duration) {
        clearInterval(updateInterval);
        return;
      }

      const improvement = Math.min(0.3, elapsed / session.duration * 0.3);
      session.currentScore = 0.5 + improvement + (Math.random() - 0.5) * 0.1;
      session.improvement = improvement;
      session.metrics.push({
        timestamp: elapsed,
        score: session.currentScore
      });
    }, 1000);

    return session;
  }

  async interpretNeuralActivity(query?: string): Promise<{
    interpretation: string;
    cognitiveState: CognitiveState | null;
    frequencyBands: FrequencyBand[];
    recommendations: string[];
  }> {
    const state = this.getCurrentCognitiveState();
    const bands = this.analyzeFrequencyBands();

    const recommendations: string[] = [];
    if (state) {
      if (state.focus < 0.5) recommendations.push("Consider taking a short break or practicing focused breathing");
      if (state.stress > 0.6) recommendations.push("High stress detected - try relaxation techniques");
      if (state.drowsiness > 0.5) recommendations.push("Drowsiness detected - consider physical movement or fresh air");
      if (state.engagement < 0.4) recommendations.push("Low engagement - try changing tasks or environment");
    }

    const alphaDominant = bands.find(b => b.name === 'alpha')?.dominance || 0;
    if (alphaDominant > 0.3) recommendations.push("Strong alpha waves - good relaxed focus state");

    const openai = getOpenAI();
    if (!openai) {
      return {
        interpretation: `Neural analysis: ${state ? `Focus: ${(state.focus * 100).toFixed(0)}%` : 'Awaiting connection'} [AI unavailable]`,
        cognitiveState: state,
        frequencyBands: bands,
        recommendations
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are CYRUS's Bio-Neural Interface module. Interpret brain activity patterns and provide insights.
Current cognitive state: ${state ? JSON.stringify(state) : 'Not available'}
Frequency bands: ${JSON.stringify(bands)}`
          },
          {
            role: "user",
            content: query || "Analyze current neural activity patterns"
          }
        ],
        max_tokens: 500
      });

      return {
        interpretation: response.choices[0].message.content || "Neural analysis complete.",
        cognitiveState: state,
        frequencyBands: bands,
        recommendations
      };
    } catch (error) {
      return {
        interpretation: `Neural activity analysis: ${state ? `Focus: ${(state.focus * 100).toFixed(0)}%, Relaxation: ${(state.relaxation * 100).toFixed(0)}%, Engagement: ${(state.engagement * 100).toFixed(0)}%` : 'Awaiting connection'}. Dominant frequency band: ${bands.reduce((max, b) => b.dominance > max.dominance ? b : max, bands[0]).name}.`,
        cognitiveState: state,
        frequencyBands: bands,
        recommendations
      };
    }
  }

  getChannels(): EEGChannel[] {
    return Array.from(this.channels.values());
  }

  getPatterns(): NeuralPattern[] {
    return Array.from(this.patterns.values());
  }

  getCommands(): BCICommand[] {
    return Array.from(this.commands.values());
  }

  getStatus(): {
    connected: boolean;
    channelCount: number;
    patternCount: number;
    commandCount: number;
    activeSessionCount: number;
    sampleRate: number;
    dataPoints: number;
  } {
    return {
      connected: this.isConnected,
      channelCount: this.channels.size,
      patternCount: this.patterns.size,
      commandCount: this.commands.size,
      activeSessionCount: this.activeSessions.size,
      sampleRate: this.sampleRate,
      dataPoints: this.brainwaveHistory.length
    };
  }
}

export const bioNeuralInterface = new BioNeuralInterface();
