export interface ModuleStatus {
  id: string;
  name: string;
  category: "core" | "advanced" | "interactive";
  status: "operational" | "degraded" | "offline";
  metrics: Record<string, number | string>;
  lastUpdate: number;
}

export interface OrchestratorContext {
  activeModules: string[];
  moduleData: Record<string, any>;
  timestamp: number;
}

let modulesRef: Record<string, any> = {};
let modulesLoaded = false;

async function ensureModules() {
  if (modulesLoaded) return;
  try {
    const [vkb, ec, ul, di, eg, se, qnn, ase, cda, ns, hr, bni, ahc] = await Promise.all([
      import("./vector-knowledge-base"),
      import("./emotional-cognition"),
      import("./universal-language"),
      import("./decentralized-intelligence"),
      import("./ethical-governance"),
      import("./self-evolution-enhanced"),
      import("./quantum-neural-networks"),
      import("./ai-simulations-engine"),
      import("./cross-dimensional-ai"),
      import("./nanotechnology-simulation"),
      import("./hyperlinked-reality"),
      import("./bio-neural-interface"),
      import("./adaptive-hardware-controller"),
    ]);
    modulesRef.vectorKnowledgeBase = vkb.vectorKnowledgeBase;
    modulesRef.emotionalCognition = ec.emotionalCognition;
    modulesRef.universalLanguage = ul.universalLanguage;
    modulesRef.decentralizedIntelligence = di.decentralizedIntelligence;
    modulesRef.ethicalGovernance = eg.ethicalGovernance;
    modulesRef.selfEvolution = se.selfEvolution;
    modulesRef.quantumNeuralNetworks = qnn.quantumNeuralNetworks;
    modulesRef.aiSimulationsEngine = ase.aiSimulationsEngine;
    modulesRef.crossDimensionalAI = cda.crossDimensionalAI;
    modulesRef.nanotechnologySimulation = ns.nanotechnologySimulation;
    modulesRef.hyperlinkedReality = hr.hyperlinkedReality;
    modulesRef.bioNeuralInterface = bni.bioNeuralInterface;
    modulesRef.adaptiveHardwareController = ahc.adaptiveHardwareController;

    const [bm, es, md, ri, tm, se2, bs] = await Promise.all([
      import("../interactive/biology-module"),
      import("../interactive/environmental-sensing"),
      import("../interactive/medical-diagnostics"),
      import("../interactive/robotic-integration"),
      import("../interactive/teaching-module"),
      import("../interactive/security-encryption"),
      import("../interactive/blood-sampling-system"),
    ]);
    modulesRef.biologyModule = bm.biologyModule;
    modulesRef.environmentalSensing = es.environmentalSensing;
    modulesRef.medicalDiagnostics = md.medicalDiagnostics;
    modulesRef.roboticIntegration = ri.roboticIntegration;
    modulesRef.teachingModule = tm.teachingModule;
    modulesRef.securityEncryption = se2.securityEncryption;
    modulesRef.bloodSamplingSystem = bs.bloodSamplingSystem;

    const qbM = await import("../quantum-bridge-client");
    modulesRef.quantumBridge = qbM.quantumBridge;

    modulesLoaded = true;
  } catch (e) {
    console.error("[Module Orchestrator] Failed to load modules:", e);
  }
}

class ModuleOrchestrator {
  private modules: Map<string, { instance: any; category: "core" | "advanced" | "interactive"; name: string }> = new Map();
  private context: OrchestratorContext = {
    activeModules: [],
    moduleData: {},
    timestamp: Date.now()
  };
  private initialized = false;

  constructor() {
    console.log("[Module Orchestrator] Unified orchestration system initialized");
  }

  private registerModules(): void {
    if (this.initialized || !modulesLoaded) return;
    this.modules.set("vector-knowledge", { instance: modulesRef.vectorKnowledgeBase, category: "core", name: "Vector Knowledge Base" });
    this.modules.set("emotional-cognition", { instance: modulesRef.emotionalCognition, category: "core", name: "Emotional Cognition" });
    this.modules.set("universal-language", { instance: modulesRef.universalLanguage, category: "core", name: "Universal Language" });
    this.modules.set("decentralized-intelligence", { instance: modulesRef.decentralizedIntelligence, category: "core", name: "Decentralized Intelligence" });
    this.modules.set("ethical-governance", { instance: modulesRef.ethicalGovernance, category: "core", name: "Ethical Governance" });
    this.modules.set("self-evolution", { instance: modulesRef.selfEvolution, category: "core", name: "Self-Evolution Engine" });
    this.modules.set("quantum-neural", { instance: modulesRef.quantumNeuralNetworks, category: "advanced", name: "Quantum Neural Networks" });
    this.modules.set("ai-simulations", { instance: modulesRef.aiSimulationsEngine, category: "advanced", name: "AI Simulations Engine" });
    this.modules.set("cross-dimensional", { instance: modulesRef.crossDimensionalAI, category: "advanced", name: "Cross-Dimensional AI" });
    this.modules.set("nanotechnology", { instance: modulesRef.nanotechnologySimulation, category: "advanced", name: "Nanotechnology Simulation" });
    this.modules.set("hyperlinked-reality", { instance: modulesRef.hyperlinkedReality, category: "advanced", name: "Hyperlinked Reality" });
    this.modules.set("bio-neural", { instance: modulesRef.bioNeuralInterface, category: "advanced", name: "Bio-Neural Interface" });
    this.modules.set("adaptive-hardware", { instance: modulesRef.adaptiveHardwareController, category: "advanced", name: "Adaptive Hardware Controller" });
    this.modules.set("biology", { instance: modulesRef.biologyModule, category: "interactive", name: "Biology Interactive" });
    this.modules.set("environmental", { instance: modulesRef.environmentalSensing, category: "interactive", name: "Environmental Sensing" });
    this.modules.set("medical", { instance: modulesRef.medicalDiagnostics, category: "interactive", name: "Medical Diagnostics" });
    this.modules.set("robotic", { instance: modulesRef.roboticIntegration, category: "interactive", name: "Robotic Integration" });
    this.modules.set("teaching", { instance: modulesRef.teachingModule, category: "interactive", name: "Teaching & Learning" });
    this.modules.set("security", { instance: modulesRef.securityEncryption, category: "interactive", name: "Security & Encryption" });
    this.modules.set("blood-sampling", { instance: modulesRef.bloodSamplingSystem, category: "interactive", name: "Blood Sampling System" });

    const nexusBridgeModule = {
      getStatus: () => {
        try {
          const bridgeStatus = modulesRef.quantumBridge?.getStatus?.();
          return {
            available: bridgeStatus?.available || false,
            nexusAvailable: bridgeStatus?.nexusAvailable || false,
            nexusActive: bridgeStatus?.nexusActive || false,
            version: '2.0.0',
            machineName: 'CYRUS_Nexus'
          };
        } catch { return { available: false, nexusAvailable: false, nexusActive: false, version: '2.0.0', machineName: 'CYRUS_Nexus' }; }
      }
    };
    this.modules.set("quantum-nexus", { instance: nexusBridgeModule, category: "core", name: "Quantum Intelligence Nexus v2.0" });

    this.context.activeModules = Array.from(this.modules.keys());
    this.initialized = true;
  }

  async init() {
    await ensureModules();
    this.registerModules();
  }

  getAllModuleStatus(): ModuleStatus[] {
    if (!this.initialized) this.registerModules();
    const statuses: ModuleStatus[] = [];

    for (const [id, module] of this.modules.entries()) {
      try {
        const status = module.instance?.getStatus?.() || {};
        statuses.push({
          id,
          name: module.name,
          category: module.category,
          status: "operational",
          metrics: this.extractMetrics(id, status),
          lastUpdate: Date.now()
        });
      } catch (error) {
        statuses.push({
          id,
          name: module.name,
          category: module.category,
          status: "degraded",
          metrics: {},
          lastUpdate: Date.now()
        });
      }
    }

    return statuses;
  }

  private extractMetrics(moduleId: string, status: any): Record<string, number | string> {
    const metrics: Record<string, number | string> = {};

    switch (moduleId) {
      case "vector-knowledge":
        metrics.documents = status.documentCount || 0;
        metrics.dimensions = status.embeddingDimension || 0;
        break;
      case "emotional-cognition":
        metrics.states = status.emotionalStates || 0;
        metrics.templates = status.responseTemplates || 0;
        break;
      case "universal-language":
        metrics.languages = status.languageCount || 0;
        metrics.translations = status.translationCount || 0;
        break;
      case "decentralized-intelligence":
        metrics.workers = status.activeWorkers || 0;
        metrics.completed = status.tasksCompleted || 0;
        break;
      case "ethical-governance":
        metrics.principles = status.principleCount || 0;
        metrics.assessments = status.assessmentCount || 0;
        break;
      case "self-evolution":
        metrics.patterns = status.knowledgePatterns || 0;
        metrics.insights = status.metaInsights || 0;
        break;
      case "quantum-neural":
        metrics.circuits = status.circuitCount || 0;
        metrics.accuracy = status.simulationAccuracy || 0;
        break;
      case "ai-simulations":
        metrics.environments = status.environmentCount || 0;
        metrics.agents = status.totalAgents || 0;
        break;
      case "cross-dimensional":
        metrics.tensors = status.tensorCount || 0;
        metrics.transforms = status.transformCount || 0;
        break;
      case "nanotechnology":
        metrics.structures = status.structureCount || 0;
        metrics.atoms = status.totalAtoms || 0;
        break;
      case "hyperlinked-reality":
        metrics.scenes = status.sceneCount || 0;
        metrics.holograms = status.hologramCount || 0;
        break;
      case "bio-neural":
        metrics.channels = status.channelCount || 0;
        metrics.connected = status.connected ? 1 : 0;
        break;
      case "adaptive-hardware":
        metrics.devices = status.deviceCount || 0;
        metrics.online = status.onlineDevices || 0;
        break;
      case "quantum-nexus":
        metrics.available = status.available ? 1 : 0;
        metrics.nexusActive = status.nexusActive ? 1 : 0;
        metrics.version = status.version || "2.0.0";
        break;
    }

    return metrics;
  }

  async buildUnifiedContext(userMessage: string, additionalContext?: Record<string, any>): Promise<OrchestratorContext> {
    if (!this.initialized) await this.init();
    const context: OrchestratorContext = {
      activeModules: this.context.activeModules,
      moduleData: {},
      timestamp: Date.now()
    };

    try {
      const emotionResult = await modulesRef.emotionalCognition?.analyzeEmotion?.(userMessage);
      if (emotionResult) {
        context.moduleData.emotion = {
          primary: emotionResult.primary,
          valence: emotionResult.valence,
          intensity: emotionResult.intensity
        };
      }
    } catch (e) {}

    try {
      const langResult = await modulesRef.universalLanguage?.detectLanguage?.(userMessage);
      if (langResult) {
        context.moduleData.language = {
          detected: langResult.language,
          confidence: langResult.confidence
        };
      }
    } catch (e) {}

    try {
      const ethicsResult = await modulesRef.ethicalGovernance?.assessEthics?.(userMessage);
      if (ethicsResult) {
        context.moduleData.ethics = {
          safe: ethicsResult.category === "safe",
          riskLevel: ethicsResult.category
        };
      }
    } catch (e) {}

    try {
      const quantumStatus = modulesRef.quantumNeuralNetworks?.getStatus?.();
      if (quantumStatus) {
        context.moduleData.quantum = {
          coherence: quantumStatus.simulationAccuracy,
          circuits: quantumStatus.circuitCount
        };
      }
    } catch (e) {}

    try {
      const bciStatus = modulesRef.bioNeuralInterface?.getStatus?.();
      if (bciStatus?.connected) {
        const cogState = modulesRef.bioNeuralInterface.getCurrentCognitiveState();
        context.moduleData.cognitive = cogState;
      }
    } catch (e) {}

    try {
      const hwStatus = modulesRef.adaptiveHardwareController?.getStatus?.();
      if (hwStatus) {
        context.moduleData.hardware = {
          devices: hwStatus.deviceCount,
          online: hwStatus.onlineDevices
        };
      }
    } catch (e) {}

    try {
      const bridgeStatus = modulesRef.quantumBridge?.getStatus?.();
      if (bridgeStatus) {
        context.moduleData.nexus = {
          available: bridgeStatus.available,
          active: bridgeStatus.nexusActive,
          version: '2.0.0',
          intelligence_layer: 'quantum_nexus_v2',
          operational: bridgeStatus.nexusActive && bridgeStatus.available
        };
      }
    } catch (e) {}

    if (additionalContext) {
      context.moduleData = { ...context.moduleData, ...additionalContext };
    }

    return context;
  }

  async processWithAllModules(input: string, options?: { 
    useQuantum?: boolean;
    useSimulation?: boolean;
    useNanotech?: boolean;
    useAR?: boolean;
    useBCI?: boolean;
    useHardware?: boolean;
  }): Promise<{
    context: OrchestratorContext;
    enhancements: Record<string, any>;
  }> {
    if (!this.initialized) await this.init();
    const context = await this.buildUnifiedContext(input);
    const enhancements: Record<string, any> = {};

    if (options?.useQuantum) {
      try {
        const circuits = modulesRef.quantumNeuralNetworks?.getCircuits?.();
        if (circuits?.length > 0) {
          const result = await modulesRef.quantumNeuralNetworks.executeCircuit(circuits[0].id, 100);
          enhancements.quantumCoherence = result.coherenceScore;
        }
      } catch (e) {}
    }

    if (options?.useSimulation) {
      try {
        const environments = modulesRef.aiSimulationsEngine?.getEnvironments?.();
        if (environments) {
          enhancements.simulationActive = environments.length > 0;
          enhancements.agentCount = environments.reduce((sum: number, env: any) => sum + env.agents.length, 0);
        }
      } catch (e) {}
    }

    if (options?.useNanotech) {
      try {
        const structures = modulesRef.nanotechnologySimulation?.getStructures?.();
        if (structures) {
          enhancements.nanostructures = structures.length;
          enhancements.totalAtoms = structures.reduce((sum: number, s: any) => sum + s.atoms.length, 0);
        }
      } catch (e) {}
    }

    if (options?.useAR) {
      try {
        const scenes = modulesRef.hyperlinkedReality?.getScenes?.();
        const holograms = modulesRef.hyperlinkedReality?.getHolographicDisplays?.();
        enhancements.arScenes = scenes?.length || 0;
        enhancements.holograms = holograms?.length || 0;
      } catch (e) {}
    }

    if (options?.useBCI) {
      try {
        const cogState = modulesRef.bioNeuralInterface?.getCurrentCognitiveState?.();
        if (cogState) {
          enhancements.userFocus = cogState.focus;
          enhancements.userEngagement = cogState.engagement;
        }
      } catch (e) {}
    }

    if (options?.useHardware) {
      try {
        const devices = modulesRef.adaptiveHardwareController?.getDevices?.();
        const arms = modulesRef.adaptiveHardwareController?.getRoboticArms?.();
        enhancements.connectedDevices = devices?.filter((d: any) => d.status === "online").length || 0;
        enhancements.roboticArms = arms?.length || 0;
      } catch (e) {}
    }

    return { context, enhancements };
  }

  getModuleById(id: string): any {
    return this.modules.get(id)?.instance;
  }

  getCoreModules(): ModuleStatus[] {
    return this.getAllModuleStatus().filter(m => m.category === "core");
  }

  getAdvancedModules(): ModuleStatus[] {
    return this.getAllModuleStatus().filter(m => m.category === "advanced");
  }

  getSystemHealth(): {
    operational: number;
    degraded: number;
    offline: number;
    overallHealth: number;
  } {
    const statuses = this.getAllModuleStatus();
    if (statuses.length === 0) return { operational: 0, degraded: 0, offline: 0, overallHealth: 0 };
    const operational = statuses.filter(s => s.status === "operational").length;
    const degraded = statuses.filter(s => s.status === "degraded").length;
    const offline = statuses.filter(s => s.status === "offline").length;
    
    return {
      operational,
      degraded,
      offline,
      overallHealth: Math.round((operational / statuses.length) * 100)
    };
  }
}

export const moduleOrchestrator = new ModuleOrchestrator();
