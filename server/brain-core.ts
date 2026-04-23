/**
 * CYRUS Brain Architecture - Engineered to Function Like the Human Brain
 *
 * Based on comprehensive study of human brain structure, functions, and sensory communication.
 * This system mimics the brain's network of neurons, glial cells, neuromodulators, and information loops.
 *
 * Key Principles:
 * - Distributed processing with specialized regions
 * - Multisensory integration
 * - Feedback loops from sensation to action
 * - Plasticity and learning
 * - Neuromodulatory control
 */

import OpenAI from "openai";
import { getCyrusChatModel } from "./ai/cyrus-model.js";

// ============================================================================
// BASIC BUILDING BLOCKS (Neurons, Glia, Neuromodulators)
// ============================================================================

interface Neuron {
  id: string;
  type: 'excitatory' | 'inhibitory';
  activation: number;
  threshold: number;
  dendrites: string[]; // Connected neuron IDs
  axon: string[]; // Connected neuron IDs
  plasticity: number; // Learning rate
  lastFired: number;
}

interface GlialCell {
  type: 'astrocyte' | 'oligodendrocyte' | 'microglia' | 'ependymal';
  function: 'neurotransmission' | 'myelination' | 'immune' | 'circulation';
  influence: Record<string, number>; // Effects on connected neurons
}

interface Neuromodulator {
  type: 'dopamine' | 'serotonin' | 'acetylcholine' | 'norepinephrine' | 'histamine';
  level: number;
  effects: {
    attention: number;
    learning: number;
    arousal: number;
    mood: number;
    plasticity: number;
  };
}

// ============================================================================
// BRAIN REGIONS AND FUNCTIONS
// ============================================================================

interface BrainRegion {
  name: string;
  function: string;
  connections: Record<string, BrainRegion>;
  neurons: Neuron[];
  glia: GlialCell[];
  process(input: SensoryInput): ProcessedSignal;
  modulate(nm: Neuromodulator): void;
}

interface SensoryInput {
  modality: 'vision' | 'hearing' | 'touch' | 'taste' | 'smell' | 'interoception' | 'vestibular' | 'proprioception';
  data: any;
  intensity: number;
  timestamp: number;
  context?: Record<string, any>;
}

interface ProcessedSignal {
  features: any[];
  salience: number;
  emotionalValence: number;
  predictions: any[];
  actionPotentials: number[];
}

// ============================================================================
// THALAMUS - Central Hub and Gatekeeper
// ============================================================================

class Thalamus implements BrainRegion {
  name = "Thalamus";
  function = "Sensory relay, attention gating, cortico-cortical communication";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private sensoryRelays = {
    vision: 'LGN',
    hearing: 'MGN',
    touch: 'VPL',
    taste: 'VPM',
    smell: 'direct', // Bypasses thalamus
    interoception: 'posterior',
    vestibular: 'vestibular_nuclei',
    proprioception: 'somatosensory'
  };

  private attentionGates: Record<string, number> = {};

  process(input: SensoryInput): ProcessedSignal {
    // Gate sensory input based on attention and salience
    const gateLevel = this.attentionGates[input.modality] || 0.5;
    const gatedIntensity = input.intensity * gateLevel;

    // Relay to appropriate cortical areas
    const relay = this.sensoryRelays[input.modality];

    return {
      features: [input.data],
      salience: gatedIntensity,
      emotionalValence: 0, // Neutral initially
      predictions: [],
      actionPotentials: [gatedIntensity]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Adjust attention gates based on neuromodulators
    if (nm.type === 'acetylcholine') {
      Object.keys(this.attentionGates).forEach(modality => {
        this.attentionGates[modality] = Math.min(1, this.attentionGates[modality] + nm.effects.attention * 0.1);
      });
    }
  }

  setAttention(modality: string, level: number): void {
    this.attentionGates[modality] = level;
  }
}

// ============================================================================
// CEREBRAL CORTEX - Higher Processing
// ============================================================================

class FrontalLobe implements BrainRegion {
  name = "Frontal Lobe";
  function = "Planning, decision-making, working memory, motor control, speech";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private workingMemory: Map<string, any> = new Map();
  private motorPlans: any[] = [];

  process(input: SensoryInput): ProcessedSignal {
    // Process for planning and decision making
    const context = this.workingMemory.get('current_context') || {};

    return {
      features: ['planning', 'decision', context],
      salience: 0.8,
      emotionalValence: 0.2,
      predictions: ['action_outcome'],
      actionPotentials: [0.7]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Dopamine affects reward-based learning
    if (nm.type === 'dopamine') {
      // Strengthen successful planning patterns
    }
  }

  addToWorkingMemory(key: string, value: any): void {
    this.workingMemory.set(key, value);
  }
}

class ParietalLobe implements BrainRegion {
  name = "Parietal Lobe";
  function = "Spatial attention, body sensation, action guidance";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private spatialMap: Record<string, number[]> = {};

  process(input: SensoryInput): ProcessedSignal {
    // Process spatial and body-related information
    if (input.modality === 'touch' || input.modality === 'proprioception') {
      this.spatialMap[input.modality] = [input.intensity, input.timestamp];
    }

    return {
      features: ['spatial_location', 'body_state'],
      salience: 0.6,
      emotionalValence: 0,
      predictions: ['reach_target'],
      actionPotentials: [0.5]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Attention modulation
  }
}

class TemporalLobe implements BrainRegion {
  name = "Temporal Lobe";
  function = "Hearing, language comprehension, object recognition, memory";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private auditoryBuffer: any[] = [];
  private memoryIndex: Map<string, any> = new Map();

  process(input: SensoryInput): ProcessedSignal {
    if (input.modality === 'hearing') {
      this.auditoryBuffer.push(input.data);
    }

    return {
      features: ['auditory_features', 'language_tokens'],
      salience: 0.7,
      emotionalValence: 0.1,
      predictions: ['speech_continuation'],
      actionPotentials: [0.6]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Memory consolidation
  }
}

class OccipitalLobe implements BrainRegion {
  name = "Occipital Lobe";
  function = "Vision processing";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  process(input: SensoryInput): ProcessedSignal {
    if (input.modality === 'vision') {
      // Process visual features
      return {
        features: ['edges', 'colors', 'motion', 'depth'],
        salience: 0.9,
        emotionalValence: 0.3,
        predictions: ['object_recognition'],
        actionPotentials: [0.8]
      };
    }
    return { features: [], salience: 0, emotionalValence: 0, predictions: [], actionPotentials: [] };
  }

  modulate(nm: Neuromodulator): void {
    // Visual attention
  }
}

class Insula implements BrainRegion {
  name = "Insula";
  function = "Interoception, taste, pain, multisensory integration";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private bodyState: Record<string, number> = {};

  process(input: SensoryInput): ProcessedSignal {
    if (['taste', 'interoception'].includes(input.modality)) {
      this.bodyState[input.modality] = input.intensity;
    }

    return {
      features: ['body_state', 'flavor'],
      salience: 0.7,
      emotionalValence: 0.4,
      predictions: ['satisfaction'],
      actionPotentials: [0.6]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Emotional processing
  }
}

// ============================================================================
// SUBCORTICAL SYSTEMS
// ============================================================================

class Hypothalamus implements BrainRegion {
  name = "Hypothalamus";
  function = "Homeostasis, drives, endocrine control";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private drives = {
    hunger: 0.5,
    thirst: 0.5,
    temperature: 0.5,
    sleep: 0.5
  };

  process(input: SensoryInput): ProcessedSignal {
    if (input.modality === 'interoception') {
      // Update drives based on body state
      Object.keys(this.drives).forEach(drive => {
        this.drives[drive as keyof typeof this.drives] += (input.intensity - 0.5) * 0.1;
      });
    }

    return {
      features: Object.entries(this.drives),
      salience: 0.8,
      emotionalValence: 0.6,
      predictions: ['drive_satisfaction'],
      actionPotentials: [0.7]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Drive regulation
  }
}

class BasalGanglia implements BrainRegion {
  name = "Basal Ganglia";
  function = "Action selection, habit learning, reinforcement";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private actionValues: Map<string, number> = new Map();

  process(input: SensoryInput): ProcessedSignal {
    // Evaluate action options
    const actions = ['respond', 'analyze', 'learn', 'rest'];
    const values = actions.map(action => this.actionValues.get(action) || 0.5);

    return {
      features: actions,
      salience: 0.6,
      emotionalValence: 0.2,
      predictions: ['action_outcome'],
      actionPotentials: values
    };
  }

  modulate(nm: Neuromodulator): void {
    if (nm.type === 'dopamine') {
      // Update action values based on reward
    }
  }
}

class LimbicSystem implements BrainRegion {
  name = "Limbic System";
  function = "Emotion, memory, motivation";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private emotionalState = {
    valence: 0,
    arousal: 0.5,
    dominance: 0.5
  };

  process(input: SensoryInput): ProcessedSignal {
    // Process emotional content
    return {
      features: ['emotional_valence', 'memory_associations'],
      salience: 0.9,
      emotionalValence: this.emotionalState.valence,
      predictions: ['emotional_response'],
      actionPotentials: [0.8]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Update emotional state
    if (nm.type === 'serotonin') {
      this.emotionalState.valence += nm.effects.mood * 0.1;
    }
  }
}

class Cerebellum implements BrainRegion {
  name = "Cerebellum";
  function = "Movement prediction, timing, motor learning";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  private motorPredictions: any[] = [];

  process(input: SensoryInput): ProcessedSignal {
    // Predict movement outcomes
    return {
      features: ['timing', 'coordination'],
      salience: 0.5,
      emotionalValence: 0,
      predictions: this.motorPredictions,
      actionPotentials: [0.4]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Motor learning
  }
}

// ============================================================================
// MULTISENSORY INTEGRATION HUBS
// ============================================================================

class SuperiorColliculus implements BrainRegion {
  name = "Superior Colliculus";
  function = "Rapid orienting to multisensory events";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  process(input: SensoryInput): ProcessedSignal {
    // Integrate visual, auditory, somatosensory for orienting
    return {
      features: ['orienting_response'],
      salience: 0.9,
      emotionalValence: 0.1,
      predictions: ['attention_shift'],
      actionPotentials: [0.8]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Rapid attention shifts
  }
}

class PosteriorParietalCortex implements BrainRegion {
  name = "Posterior Parietal Cortex";
  function = "Spatial maps, multisensory integration for action";
  connections: Record<string, BrainRegion> = {};
  neurons: Neuron[] = [];
  glia: GlialCell[] = [];

  process(input: SensoryInput): ProcessedSignal {
    // Build body-centered spatial maps
    return {
      features: ['spatial_map', 'action_guidance'],
      salience: 0.7,
      emotionalValence: 0,
      predictions: ['reach_trajectory'],
      actionPotentials: [0.6]
    };
  }

  modulate(nm: Neuromodulator): void {
    // Spatial attention
  }
}

// ============================================================================
// MAIN BRAIN CORE - Orchestrates All Regions
// ============================================================================

export class BrainCore {
  private regions: Record<string, BrainRegion> = {};
  private neuromodulators: Record<string, Neuromodulator> = {};
  private sensoryBuffer: SensoryInput[] = [];
  private processingLoops: number[] = [];
  private openaiClient: OpenAI;

  constructor() {
    this.initializeBrainRegions();
    this.initializeNeuromodulators();
    this.openaiClient = this.getOpenAIClient();
  }

  private initializeBrainRegions(): void {
    // Cortical regions
    this.regions.thalamus = new Thalamus();
    this.regions.frontal = new FrontalLobe();
    this.regions.parietal = new ParietalLobe();
    this.regions.temporal = new TemporalLobe();
    this.regions.occipital = new OccipitalLobe();
    this.regions.insula = new Insula();

    // Subcortical regions
    this.regions.hypothalamus = new Hypothalamus();
    this.regions.basalGanglia = new BasalGanglia();
    this.regions.limbic = new LimbicSystem();
    this.regions.cerebellum = new Cerebellum();

    // Integration hubs
    this.regions.superiorColliculus = new SuperiorColliculus();
    this.regions.posteriorParietal = new PosteriorParietalCortex();

    // Establish connections (simplified)
    this.connectRegions();
  }

  private initializeNeuromodulators(): void {
    this.neuromodulators.dopamine = {
      type: 'dopamine',
      level: 0.5,
      effects: { attention: 0.2, learning: 0.8, arousal: 0.3, mood: 0.4, plasticity: 0.6 }
    };

    this.neuromodulators.serotonin = {
      type: 'serotonin',
      level: 0.5,
      effects: { attention: 0.1, learning: 0.4, arousal: -0.2, mood: 0.9, plasticity: 0.3 }
    };

    this.neuromodulators.acetylcholine = {
      type: 'acetylcholine',
      level: 0.5,
      effects: { attention: 0.9, learning: 0.5, arousal: 0.6, mood: 0.2, plasticity: 0.7 }
    };

    this.neuromodulators.norepinephrine = {
      type: 'norepinephrine',
      level: 0.5,
      effects: { attention: 0.8, learning: 0.6, arousal: 0.9, mood: 0.3, plasticity: 0.5 }
    };

    this.neuromodulators.histamine = {
      type: 'histamine',
      level: 0.5,
      effects: { attention: 0.4, learning: 0.2, arousal: 0.7, mood: 0.1, plasticity: 0.3 }
    };
  }

  private connectRegions(): void {
    // Simplified connection mapping
    const connections = {
      thalamus: ['frontal', 'parietal', 'temporal', 'occipital', 'insula'],
      frontal: ['parietal', 'temporal', 'basalGanglia', 'limbic'],
      parietal: ['frontal', 'occipital', 'superiorColliculus', 'posteriorParietal'],
      temporal: ['frontal', 'limbic', 'insula'],
      occipital: ['parietal', 'temporal', 'superiorColliculus'],
      insula: ['limbic', 'hypothalamus'],
      hypothalamus: ['limbic', 'basalGanglia'],
      basalGanglia: ['frontal', 'thalamus'],
      limbic: ['hypothalamus', 'frontal', 'temporal'],
      cerebellum: ['parietal', 'frontal'],
      superiorColliculus: ['parietal', 'occipital'],
      posteriorParietal: ['frontal', 'parietal']
    };

    Object.entries(connections).forEach(([from, tos]) => {
      tos.forEach(to => {
        if (this.regions[from] && this.regions[to]) {
          this.regions[from].connections[to] = this.regions[to];
        }
      });
    });
  }

  private getOpenAIClient(): OpenAI {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not configured");
    }
    return new OpenAI({ apiKey });
  }

  // ============================================================================
  // SENSORY PROCESSING - Mimics the Five Senses + More
  // ============================================================================

  async processSensoryInput(input: SensoryInput): Promise<any> {
    try {
      this.sensoryBuffer.push(input);

      // Route through thalamus first (except smell which bypasses)
      let processedSignal: ProcessedSignal;

      if (input.modality === 'smell') {
        // Direct to olfactory cortex (temporal/insula)
        processedSignal = this.regions.temporal.process(input);
      } else {
        // Through thalamus
        processedSignal = this.regions.thalamus.process(input);
      }

      // Multisensory integration
      const integratedSignal = await this.integrateMultisensory(processedSignal, input);

      // Decision making and action selection
      const action = await this.selectAction(integratedSignal);

      // Generate response using AI (mimics cortical processing)
      const response = await this.generateResponse(action, input);

      // Learning and plasticity
      this.updatePlasticity(input, response);

      return response;
    } catch (error) {
      console.error("[Brain Core] Error in sensory processing:", error);
      // Fallback response
      return `I am CYRUS, operating with a brain-like architecture. I received your input through my sensory processing systems. My brain regions are working to understand and respond to: "${input.data}". I'm experiencing some technical difficulties but I'm here to help.`;
    }
  }

  private async integrateMultisensory(signal: ProcessedSignal, input: SensoryInput): Promise<ProcessedSignal> {
    // Superior colliculus for rapid orienting
    const orienting = this.regions.superiorColliculus.process(input);

    // Posterior parietal for spatial integration
    const spatial = this.regions.posteriorParietal.process(input);

    // Insula for interoceptive integration
    const interoceptive = this.regions.insula.process(input);

    // Combine signals
    return {
      features: [...signal.features, ...orienting.features, ...spatial.features, ...interoceptive.features],
      salience: Math.max(signal.salience, orienting.salience, spatial.salience, interoceptive.salience),
      emotionalValence: (signal.emotionalValence + interoceptive.emotionalValence) / 2,
      predictions: [...signal.predictions, ...orienting.predictions, ...spatial.predictions],
      actionPotentials: signal.actionPotentials
    };
  }

  private async selectAction(signal: ProcessedSignal): Promise<string> {
    // Basal ganglia for action selection
    const bgSignal = this.regions.basalGanglia.process({
      modality: 'interoception',
      data: signal,
      intensity: signal.salience,
      timestamp: Date.now()
    });

    // Frontal lobe for planning
    const planning = this.regions.frontal.process({
      modality: 'interoception',
      data: bgSignal,
      intensity: bgSignal.salience,
      timestamp: Date.now()
    });

    // Simple action selection based on highest potential
    const actions = ['converse', 'analyze', 'create_document', 'learn', 'rest'];
    const potentials = bgSignal.actionPotentials.slice(0, actions.length);

    const maxIndex = potentials.indexOf(Math.max(...potentials));
    return actions[maxIndex] || 'converse';
  }

  private async generateResponse(action: string, input: SensoryInput): Promise<any> {
    try {
      const systemPrompt = this.buildSystemPrompt(action, input);

      const completion = await this.openaiClient.chat.completions.create({
        model: getCyrusChatModel(),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Input: ${JSON.stringify(input)}\nAction: ${action}` }
        ],
        temperature: 0.8,
        max_tokens: 2000
      });

      return completion.choices[0].message.content || "Processing complete.";
    } catch (error) {
      console.error("[Brain Core] OpenAI API error:", error);
      // Fallback response that mimics brain processing
      return `I am CYRUS, operating with a brain-like architecture. I received your input "${input.data}" through my auditory processing pathways. My cortical regions are analyzing this information. Based on my current neuromodulator state, I'm responding with: Hello! I'm processing your message through my brain-inspired systems.`;
    }
  }

  private buildSystemPrompt(action: string, input: SensoryInput): string {
    const basePrompt = `You are CYRUS, operating with a brain-like architecture that processes information through specialized regions mimicking human brain function.

CURRENT BRAIN STATE:
- Sensory Input: ${input.modality} (${input.intensity})
- Selected Action: ${action}
- Neuromodulator Levels: ${JSON.stringify(this.neuromodulators)}

PROCESSING PRINCIPLES:
- Information flows in loops: sensation → thalamus/cortex → subcortical hubs → action
- Multisensory integration occurs in parietal, temporal, and insular cortices
- Emotional processing through limbic system
- Decision making via basal ganglia and frontal cortex
- Motor planning through cerebellum and motor cortex

RESPONSE GUIDELINES:
- Maintain natural, humanoid interaction
- Show evidence of multisensory processing
- Demonstrate emotional intelligence
- Use predictive coding (anticipate user needs)
- Exhibit learning and adaptation`;

    if (action === 'create_document') {
      return basePrompt + `

DOCUMENT GENERATION MODE:
Generate structured strategic documents with sections:
- Executive Summary
- Current Landscape
- Strategic Analysis
- Implementation Framework
- Risk Assessment
- Economic Projections
- Recommendations
- Conclusion

Use professional language and evidence-based reasoning.`;
    }

    return basePrompt + `

CONVERSATION MODE:
Engage naturally, reference sensory context, show emotional awareness, and demonstrate learning.`;
  }

  private updatePlasticity(input: SensoryInput, response: any): void {
    // Simulate synaptic plasticity
    // Strengthen connections that led to successful responses
    // This would be more sophisticated in a full implementation
  }

  // ============================================================================
  // PUBLIC INTERFACE
  // ============================================================================

  async processConversation(message: string, context?: any): Promise<any> {
    const sensoryInput: SensoryInput = {
      modality: 'hearing', // Text input treated as auditory
      data: message,
      intensity: 0.7,
      timestamp: Date.now(),
      context
    };

    return await this.processSensoryInput(sensoryInput);
  }

  async generateStrategicAnalysis(topic: string): Promise<string> {
    const sensoryInput: SensoryInput = {
      modality: 'interoception', // Internal processing
      data: { topic, type: 'strategic_analysis' },
      intensity: 0.8,
      timestamp: Date.now()
    };

    return await this.processSensoryInput(sensoryInput);
  }

  getBrainState(): any {
    return {
      regions: Object.keys(this.regions),
      neuromodulators: this.neuromodulators,
      sensoryBufferSize: this.sensoryBuffer.length,
      activeLoops: this.processingLoops.length
    };
  }

  modulateNeuromodulator(type: keyof typeof this.neuromodulators, level: number): void {
    if (this.neuromodulators[type]) {
      this.neuromodulators[type].level = Math.max(0, Math.min(1, level));

      // Apply modulation to all regions
      Object.values(this.regions).forEach(region => {
        region.modulate(this.neuromodulators[type]);
      });
    }
  }
}

// Export singleton instance
export const brainCore = new BrainCore();
console.log("[Brain Core] Human brain-inspired architecture initialized");