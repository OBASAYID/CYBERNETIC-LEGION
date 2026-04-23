/**
 * Quantum AI Bridge Client
 * Communicates with the Python Quantum AI Core to enhance CYRUS intelligence
 */

interface NexusIntelligence {
  status: string;
  machine_name: string;
  version: string;
  nexus_active: boolean;
  operations_count: number;
  processing_boost: boolean;
  query_processed: boolean;
  intelligence_layer: string;
  enhancement_signals: {
    query_type: string;
    quantum_processing: boolean;
    nexus_coherence: string;
    parallel_processing: boolean;
    deep_analysis?: boolean;
    precision_mode?: boolean;
  };
}

interface EnhancementResult {
  quantum_enhanced: boolean;
  processing_timestamp: string;
  original_query: string;
  query_classification: string;
  nexus_intelligence?: NexusIntelligence;
  enhancements: {
    writing_style?: {
      input_style_analysis: {
        dominant_style: string;
        style_scores: Record<string, number>;
        confidence: number;
      };
      recommended_response_style: string;
      style_guidelines: {
        tone: string;
        vocabulary: string;
        sentence_structure: string;
        pronouns: string;
        contractions: string;
        examples: string[];
      };
    };
    response_structure?: {
      sections: string[];
      include_metrics: boolean;
      include_visualization: boolean;
    };
    confidence_metrics?: {
      query_clarity: number;
      query_specificity: number;
      response_confidence: number;
      recommendation: string;
      nexus_enhanced?: boolean;
      nexus_processing_status?: string;
    };
    analytical_framework?: {
      approach: string;
      steps: string[];
      output_format: string;
    };
    mathematical_context?: {
      notation_style: string;
      include_derivations: boolean;
      include_proofs: boolean;
      decimal_precision: number;
      scientific_notation: boolean;
    };
  };
  processing_time_seconds: number;
}

interface StyleAnalysis {
  style_scores: Record<string, number>;
  dominant_style: string;
  confidence: number;
  mechanics: Record<string, any>;
  grammar_patterns: Record<string, any>;
  sentence_structure: Record<string, any>;
  text_length: number;
  word_count: number;
}

interface AdaptedStyle {
  adapted_text: string;
  target_style: string;
}

const QUANTUM_BRIDGE_URL = process.env.QUANTUM_BRIDGE_URL || "http://quantum-bridge:5001";

class QuantumBridgeClient {
  private baseUrl: string;
  private isAvailable: boolean = false;
  private nexusAvailable: boolean = false;
  private nexusActive: boolean = false;
  private lastHealthCheck: number = 0;
  private healthCheckInterval: number = 30000;

  constructor(baseUrl: string = QUANTUM_BRIDGE_URL) {
    this.baseUrl = baseUrl;
  }

  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval && this.isAvailable) {
      return this.isAvailable;
    }

    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(2000)
      });
      if (response.ok) {
        const data = await response.json();
        this.isAvailable = true;
        this.nexusAvailable = data.nexus_available || false;
        this.nexusActive = data.nexus_active || false;
      } else {
        this.isAvailable = false;
      }
      this.lastHealthCheck = now;
      return this.isAvailable;
    } catch (error) {
      this.isAvailable = false;
      this.nexusAvailable = false;
      this.nexusActive = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  async getNexusStatus(): Promise<NexusIntelligence | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;

    try {
      const response = await fetch(`${this.baseUrl}/nexus/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async queryNexus(query: string, enableQuantum: boolean = true): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;

    try {
      const response = await fetch(`${this.baseUrl}/nexus/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, enable_quantum: enableQuantum }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async enhanceResponse(message: string, context?: Record<string, any>): Promise<EnhancementResult | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, context }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        console.error('[Quantum Bridge] Enhancement failed:', response.status);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Quantum Bridge] Enhancement error:', error);
      return null;
    }
  }

  async adaptStyle(text: string, targetStyle: string): Promise<AdaptedStyle | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/adapt-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, style: targetStyle }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Quantum Bridge] Style adaptation error:', error);
      return null;
    }
  }

  async analyzeStyle(text: string): Promise<StyleAnalysis | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/analyze-style`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: AbortSignal.timeout(5000)
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[Quantum Bridge] Style analysis error:', error);
      return null;
    }
  }

  buildSystemPromptEnhancement(enhancement: EnhancementResult): string {
    const parts: string[] = [];
    
    parts.push(`\n\n[QUANTUM INTELLIGENCE ENHANCEMENT - Active]`);
    parts.push(`Query Classification: ${enhancement.query_classification.toUpperCase()}`);
    
    if (enhancement.enhancements.writing_style) {
      const style = enhancement.enhancements.writing_style;
      parts.push(`\nRECOMMENDED WRITING STYLE: ${style.recommended_response_style.toUpperCase()}`);
      parts.push(`- Tone: ${style.style_guidelines.tone}`);
      parts.push(`- Vocabulary: ${style.style_guidelines.vocabulary}`);
      parts.push(`- Sentence Structure: ${style.style_guidelines.sentence_structure}`);
      parts.push(`- Contractions: ${style.style_guidelines.contractions}`);
    }
    
    if (enhancement.enhancements.response_structure) {
      const struct = enhancement.enhancements.response_structure;
      parts.push(`\nRESPONSE STRUCTURE:`);
      parts.push(`- Sections: ${struct.sections.join(' → ')}`);
      if (struct.include_metrics) parts.push(`- Include quantitative metrics where applicable`);
    }
    
    if (enhancement.enhancements.analytical_framework) {
      const framework = enhancement.enhancements.analytical_framework;
      parts.push(`\nANALYTICAL APPROACH: ${framework.approach}`);
      parts.push(`Steps: ${framework.steps.join(' → ')}`);
    }
    
    if (enhancement.enhancements.confidence_metrics) {
      const conf = enhancement.enhancements.confidence_metrics;
      if (conf.recommendation === 'high_detail') {
        parts.push(`\nDETAIL LEVEL: HIGH - User expects comprehensive, detailed response`);
      }
    }
    
    if (enhancement.nexus_intelligence?.processing_boost) {
      parts.push(`\n[QUANTUM INTELLIGENCE NEXUS v2.0 - ACTIVE]`);
      parts.push(`Nexus Machine: ${enhancement.nexus_intelligence.machine_name}`);
      parts.push(`Intelligence Layer: ${enhancement.nexus_intelligence.intelligence_layer}`);
      parts.push(`Status: ${enhancement.nexus_intelligence.nexus_active ? 'FULLY OPERATIONAL' : 'STANDBY'}`);
      
      if (enhancement.nexus_intelligence.enhancement_signals?.deep_analysis) {
        parts.push(`Mode: DEEP ANALYSIS - Apply maximum precision, rigor, and comprehensive reasoning`);
      }
      if (enhancement.nexus_intelligence.enhancement_signals?.precision_mode) {
        parts.push(`Precision: MAXIMUM - Provide exact data, specific metrics, and verified information`);
      }
      parts.push(`Quantum Processing: ${enhancement.nexus_intelligence.enhancement_signals?.quantum_processing ? 'ENGAGED' : 'STANDBY'}`);
    }

    parts.push(`\nCRITICAL: You MUST use the following structure for your response. Do not include any other text outside these sections except your final natural response:
1. ◈ QUANTUM ANALYSIS START ◈
2. Engineering/Science Processing Pathway: (List specific algorithms used from your core: High-Dimensional, SVD, Random Walk, ML, etc.)
3. Technical Results & Metrics: (Include mathematical formulations and data points)
4. Core Interpretation: (Technical summary of the findings)
5. ◈ QUANTUM ANALYSIS END ◈
6. Natural conversational response following your personality guidelines (sweet, feminine, Botswana heritage).`);

    return parts.join('\n');
  }

  // Note: The main inference call happens in server/routes.ts or similar, 
  // utilizing the prompt from buildSystemPromptEnhancement.


  async nexusPredict(features: number[]): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusBatchPredict(features: number[][]): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/batch-predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusExplain(features: number[], method: string = 'feature_importance', numFeatures: number = 10): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/explain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features, method, num_features: numFeatures }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusEDA(csvPath?: string, data?: Record<string, any>[], targetCol?: string): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/eda`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_path: csvPath, data, target_col: targetCol }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusPreprocess(csvPath?: string, operations: string[] = ['impute', 'scale']): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/preprocess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv_path: csvPath, operations }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusExecuteTool(toolName: string, params: Record<string, any> = {}): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/execute-tool`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: toolName, params }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusListTools(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/tools`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusModelInfo(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/model-info`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusSystemStatus(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/system-status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusMemoryStatus(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/memory`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusExplainSHAP(features: number[]): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/explain-shap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusExplainLIME(features: number[], numFeatures: number = 10): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/explain-lime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ features, num_features: numFeatures }),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusFairness(yTrue: number[], yPred: number[], protectedGroup: number[]): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/fairness`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ y_true: yTrue, y_pred: yPred, protected_group: protectedGroup }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusTrainStart(params: {epochs?: number; batch_size?: number; learning_rate?: number; data_samples?: number; n_features?: number; n_classes?: number} = {}): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/train/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusTrainStatus(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/train/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async nexusTrainStop(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy || !this.nexusActive) return null;
    try {
      const response = await fetch(`${this.baseUrl}/nexus/train/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async visualAnalyze(query: string): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/visual/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async visualDetect(query: string): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/visual/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async visualGenerate(topic: string): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/visual/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
        signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async visualTopics(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/visual/topics`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async trainingStart(config: {n_topics?: number; similarity_threshold?: number} = {}): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/training/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
        signal: AbortSignal.timeout(10000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async trainingStop(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/training/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async trainingStatus(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/training/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async trainingModels(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/training/models`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async trainingClassify(query: string): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/training/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(5000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async trainingHistory(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/training/history`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisVisualize(
    domain: string, topic: string, viewType: string = "overview",
    quality: string = "high", renderingStyle: string = "photorealistic",
    includeAnnotations: boolean = true, includeDimensions: boolean = true
  ): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/visualize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain, topic, view_type: viewType, quality,
          include_references: true, rendering_style: renderingStyle,
          include_annotations: includeAnnotations, include_dimensions: includeDimensions
        }),
        signal: AbortSignal.timeout(30000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisVisualizeAdvanced(
    userRequest: string, accuracyLevel: string = "high",
    includeReferences: boolean = true
  ): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/visualize-advanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_request: userRequest,
          accuracy_level: accuracyLevel,
          include_references: includeReferences
        }),
        signal: AbortSignal.timeout(60000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisDomains(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/domains`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisTopics(domain: string): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/topics/${domain}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisStatus(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisRules(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/rules`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisReferences(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/references`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  async scivisHistory(): Promise<Record<string, any> | null> {
    const isHealthy = await this.checkHealth();
    if (!isHealthy) return null;
    try {
      const response = await fetch(`${this.baseUrl}/scivis/history`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (!response.ok) return null;
      return await response.json();
    } catch { return null; }
  }

  getStatus(): { available: boolean; lastCheck: number; nexusAvailable: boolean; nexusActive: boolean } {
    return {
      available: this.isAvailable,
      lastCheck: this.lastHealthCheck,
      nexusAvailable: this.nexusAvailable,
      nexusActive: this.nexusActive
    };
  }

  isNexusOperational(): boolean {
    return this.isAvailable && this.nexusActive;
  }
}

export const quantumBridge = new QuantumBridgeClient();
export type { EnhancementResult, StyleAnalysis, AdaptedStyle, NexusIntelligence };
