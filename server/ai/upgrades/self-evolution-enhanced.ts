import OpenAI, { AzureOpenAI } from 'openai';
import { experienceMemory, TaskExperience, KnowledgeConcept, EvolutionEvent } from '../experience-memory.js';
import { vectorKnowledgeBase } from './vector-knowledge-base.js';
import { quantumBridge } from '../quantum-bridge-client.js';
import { db } from '../../db';
import { knowledgeGraph, performanceMetrics, evolutionLog } from '../../../shared/schema';
import { desc, sql } from 'drizzle-orm';

function asNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

const openaiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;

const openai = openaiApiKey && openaiBaseUrl
  ? new AzureOpenAI({
    endpoint: openaiBaseUrl,
    apiKey: openaiApiKey,
  })
  : openaiApiKey
    ? new OpenAI({
      apiKey: openaiApiKey,
    })
    : null;

export interface EvolutionMetrics {
  knowledgeGrowth: number;
  performanceImprovement: number;
  patternRecognitionAccuracy: number;
  learningVelocity: number;
  adaptationRate: number;
  cognitiveExpansion: number;
}

export interface SelfOptimization {
  type: 'prompt_optimization' | 'strategy_refinement' | 'knowledge_synthesis' | 'pattern_extraction';
  description: string;
  beforeState: any;
  afterState: any;
  improvement: number;
  appliedAt: Date;
}

export interface KnowledgeSynthesis {
  sourceConcepts: string[];
  synthesizedConcept: string;
  domain: string;
  confidence: number;
  novelty: number;
  connections: { from: string; to: string; strength: number }[];
}

export interface MetaLearningInsight {
  insight: string;
  category: 'performance' | 'knowledge' | 'strategy' | 'behavior';
  actionable: boolean;
  suggestedAction?: string;
  confidence: number;
}

export class SelfEvolutionEngine {
  private evolutionCycle: number = 0;
  private optimizationHistory: SelfOptimization[] = [];
  private learningPatterns: Map<string, number> = new Map();
  private synthesizedKnowledge: KnowledgeSynthesis[] = [];
  private metaInsights: MetaLearningInsight[] = [];

  private nexusSuccessfulSyncs: number = 0;

  private evolutionThresholds = {
    minExperiencesForPattern: 5,
    minConfidenceForSynthesis: 0.7,
    learningRateAdjustmentInterval: 10,
    knowledgeConsolidationInterval: 50
  };

  private trainingTriggered: boolean = false;
  private lastTrainingTime: number = 0;

  constructor() {
    console.log('[Self-Evolution Engine] Initializing enhanced self-improvement system');
    this.startEvolutionLoop();
    this.triggerInitialTraining();
  }

  private async triggerInitialTraining(): Promise<void> {
    setTimeout(async () => {
      try {
        if (!this.trainingTriggered) {
          console.log('[Self-Evolution] Triggering initial capability training pipeline...');
          const result = await quantumBridge.trainingStart({});
          if (result && result.status === 'started') {
            this.trainingTriggered = true;
            this.lastTrainingTime = Date.now();
            console.log('[Self-Evolution] Training pipeline started successfully');
            await experienceMemory.logEvolution({
              type: 'knowledge_integrated',
              description: 'Initial capability training pipeline triggered - training domain classifiers, topic models, and intent recognition',
              beforeState: { trainingTriggered: false },
              afterState: { trainingTriggered: true, timestamp: new Date().toISOString() },
              improvements: { trainingInitiated: 1 },
              trigger: 'self_evolution_initial_training'
            });
          }
        }
      } catch (error) {
        console.error('[Self-Evolution] Initial training trigger error:', error);
      }
    }, 15000);
  }

  private startEvolutionLoop(): void {
    setInterval(() => this.runEvolutionCycle(), 60000);

    setInterval(() => this.consolidateKnowledge(), 300000);

    setInterval(() => this.generateMetaInsights(), 600000);

    setInterval(() => this.checkTrainingNeeded(), 1800000);
  }

  private async checkTrainingNeeded(): Promise<void> {
    try {
      const timeSinceLastTraining = Date.now() - this.lastTrainingTime;
      if (timeSinceLastTraining < 3600000) return;

      const stats = await experienceMemory.getLearningStats();
      if (stats.totalExperiences > 0 && stats.totalExperiences % 50 === 0) {
        console.log('[Self-Evolution] Triggering periodic retraining based on accumulated experiences');
        const result = await quantumBridge.trainingStart({});
        if (result && result.status === 'started') {
          this.lastTrainingTime = Date.now();
        }
      }
    } catch (error) {
      console.error('[Self-Evolution] Training check error:', error);
    }
  }

  private async runEvolutionCycle(): Promise<void> {
    this.evolutionCycle++;

    try {
      await this.analyzePerformanceTrends();

      await this.extractNewPatterns();

      await this.optimizeStrategies();

      if (this.evolutionCycle % 10 === 0) {
        await this.synthesizeKnowledge();
      }

      if (this.evolutionCycle % 5 === 0) {
        await this.nexusEvolutionSync();
      }

      const verboseEvolution = process.env.CYRUS_VERBOSE_EVOLUTION === 'true';
      if (verboseEvolution || this.evolutionCycle % 25 === 0) {
        console.log(`[Self-Evolution] Cycle ${this.evolutionCycle} completed`);
      }
    } catch (error) {
      console.error('[Self-Evolution] Cycle error:', error);
    }
  }

  private async nexusEvolutionSync(): Promise<void> {
    try {
      if (!quantumBridge.isNexusOperational()) return;

      const stats = await experienceMemory.getLearningStats();
      const evolutionHistory = await experienceMemory.getEvolutionHistory(10);

      const nexusQuery = `Evolution analysis: ${stats.totalExperiences} experiences, ${stats.knowledgeConcepts} concepts, ${stats.averageSuccessRate}% success rate. Recent evolution events: ${evolutionHistory.recentEvents.map(e => e.description).join('; ')}`;

      const nexusResult = await quantumBridge.queryNexus(nexusQuery, true);

      if (nexusResult && nexusResult.status === 'success') {
        this.nexusSuccessfulSyncs++;

        const nexusEvolutionEvents = evolutionHistory.recentEvents.filter(
          e => e.improvements && (e.improvements as any).nexusImprovementPercent
        );
        const nexusImpactSummary = nexusEvolutionEvents.length > 0
          ? `${nexusEvolutionEvents.length} Nexus-driven improvements recorded`
          : 'Nexus impact data accumulating';

        const insight: MetaLearningInsight = {
          insight: `Nexus sync #${this.nexusSuccessfulSyncs}: ${stats.totalExperiences} experiences processed, ${stats.knowledgeConcepts} concepts tracked, ${nexusImpactSummary}`,
          category: 'strategy',
          actionable: true,
          suggestedAction: 'Continue Nexus-enhanced evolution cycles for improved knowledge synthesis',
          confidence: 0.85
        };
        this.metaInsights.unshift(insight);

        if (this.metaInsights.length > 50) {
          this.metaInsights = this.metaInsights.slice(0, 50);
        }

        await experienceMemory.logEvolution({
          type: 'strategy_improved',
          description: `Nexus quantum intelligence synchronized with evolution engine (cycle ${this.evolutionCycle}, sync #${this.nexusSuccessfulSyncs})`,
          beforeState: { evolutionCycle: this.evolutionCycle - 5, nexusSync: false, nexusImpactEvents: nexusEvolutionEvents.length },
          afterState: { evolutionCycle: this.evolutionCycle, nexusSync: true, nexusQuantumActive: nexusResult.quantum_enhanced || false, totalNexusSyncs: this.nexusSuccessfulSyncs },
          improvements: { nexusSyncCompleted: 1, evolutionCycle: this.evolutionCycle, totalNexusSyncs: this.nexusSuccessfulSyncs },
          trigger: 'nexus_evolution_sync'
        });
      }
    } catch (error) {
      console.error('[Self-Evolution] Nexus sync error:', error);
    }
  }

  private async analyzePerformanceTrends(): Promise<void> {
    try {
      const recentMetrics = await db.select()
        .from(performanceMetrics)
        .orderBy(desc(performanceMetrics.lastUpdated))
        .limit(50);

      const improvements: Record<string, number> = {};

      for (const metric of recentMetrics) {
        const improvementRate = asNumber(metric.improvementRate);
        if (improvementRate > 5) {
          improvements[metric.taskCategory] = improvementRate;
        }
      }

      if (Object.keys(improvements).length > 0) {
        await experienceMemory.logEvolution({
          type: 'performance_boost',
          description: `Performance improvements detected in ${Object.keys(improvements).length} task categories`,
          beforeState: {},
          afterState: improvements,
          improvements: { categoriesImproved: Object.keys(improvements).length },
          trigger: 'performance_analysis'
        });
      }
    } catch (error) {
      console.error('[Self-Evolution] Performance analysis error:', error);
    }
  }

  private async extractNewPatterns(): Promise<void> {
    try {
      const knowledge = await db.select()
        .from(knowledgeGraph)
        .orderBy(desc(knowledgeGraph.accessCount))
        .limit(100);

      const domainPatterns: Map<string, string[]> = new Map();

      for (const item of knowledge) {
        const domain = item.domain;
        if (!domainPatterns.has(domain)) {
          domainPatterns.set(domain, []);
        }
        domainPatterns.get(domain)!.push(item.concept);
      }

      for (const [domain, concepts] of domainPatterns) {
        if (concepts.length >= this.evolutionThresholds.minExperiencesForPattern) {
          const patternKey = `domain:${domain}`;
          const currentCount = this.learningPatterns.get(patternKey) || 0;
          this.learningPatterns.set(patternKey, currentCount + 1);
        }
      }
    } catch (error) {
      console.error('[Self-Evolution] Pattern extraction error:', error);
    }
  }

  private async optimizeStrategies(): Promise<void> {
    const topPatterns = Array.from(this.learningPatterns.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    for (const [pattern, frequency] of topPatterns) {
      if (frequency >= 3) {
        const optimization: SelfOptimization = {
          type: 'strategy_refinement',
          description: `Optimizing strategy for pattern: ${pattern}`,
          beforeState: { frequency: frequency - 1 },
          afterState: { frequency, optimized: true },
          improvement: 0.05,
          appliedAt: new Date()
        };

        this.optimizationHistory.push(optimization);

        if (this.optimizationHistory.length > 100) {
          this.optimizationHistory = this.optimizationHistory.slice(-50);
        }
      }
    }
  }

  async synthesizeKnowledge(): Promise<KnowledgeSynthesis[]> {
    try {
      const knowledge = await db.select()
        .from(knowledgeGraph)
        .orderBy(desc(knowledgeGraph.confidence))
        .limit(50);

      const domainGroups: Map<string, typeof knowledge> = new Map();
      for (const item of knowledge) {
        if (!domainGroups.has(item.domain)) {
          domainGroups.set(item.domain, []);
        }
        domainGroups.get(item.domain)!.push(item);
      }

      const syntheses: KnowledgeSynthesis[] = [];

      for (const [domain, items] of domainGroups) {
        if (items.length >= 3) {
          const concepts = items.map(i => i.concept);

          if (!openai) {
            console.log(`[Self-Evolution] OpenAI client not available for synthesis in domain: ${domain}`);
            continue;
          }

          try {
            const response = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              messages: [
                {
                  role: 'system',
                  content: `You are a knowledge synthesis engine. Given multiple concepts from the same domain, identify higher-level insights or patterns that connect them.
Return JSON with:
- synthesizedConcept: a new insight that connects the concepts
- connections: array of {from, to, strength} showing relationships
- novelty: 0-1 how novel this synthesis is
- confidence: 0-1 confidence in the synthesis
Return only valid JSON.`
                },
                {
                  role: 'user',
                  content: `Domain: ${domain}\nConcepts: ${concepts.join(', ')}`
                }
              ],
              max_tokens: 500,
              temperature: 0.4
            });

            let rawContent = (response.choices[0].message.content || '{}').replace(/```json\n?|\n?```/g, '').trim();
            const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
            if (jsonMatch) rawContent = jsonMatch[0];
            let parsed: any;
            try {
              parsed = JSON.parse(rawContent);
            } catch {
              console.log(`[Self-Evolution] Skipping malformed JSON for domain: ${domain}`);
              continue;
            }

            if (parsed.synthesizedConcept && parsed.confidence >= this.evolutionThresholds.minConfidenceForSynthesis) {
              const synthesis: KnowledgeSynthesis = {
                sourceConcepts: concepts,
                synthesizedConcept: parsed.synthesizedConcept,
                domain,
                confidence: parsed.confidence,
                novelty: parsed.novelty || 0.5,
                connections: parsed.connections || []
              };

              syntheses.push(synthesis);
              this.synthesizedKnowledge.push(synthesis);

              await experienceMemory.learnKnowledge({
                concept: parsed.synthesizedConcept,
                domain,
                relationships: synthesis.connections.map(c => ({
                  type: 'synthesized_from',
                  target: c.from,
                  strength: c.strength
                })),
                properties: {
                  synthesized: true,
                  sourceConcepts: concepts,
                  novelty: synthesis.novelty
                },
                confidence: Math.round(synthesis.confidence * 100),
                source: 'self_synthesis'
              });

              await vectorKnowledgeBase.addDocument(
                `Synthesized knowledge: ${parsed.synthesizedConcept}. Based on: ${concepts.join(', ')}`,
                { domain, importance: synthesis.confidence, tags: ['synthesized', 'meta-knowledge'] }
              );
            }
          } catch (error) {
            console.error('[Self-Evolution] Synthesis error for domain:', domain, error);
          }
        }
      }

      if (syntheses.length > 0) {
        const nexusActive = quantumBridge.isNexusOperational();
        await experienceMemory.logEvolution({
          type: 'knowledge_integrated',
          description: `Synthesized ${syntheses.length} new knowledge insights${nexusActive ? ' (Nexus-enhanced)' : ''}`,
          beforeState: { conceptCount: knowledge.length },
          afterState: { synthesizedCount: syntheses.length, nexusEnhanced: nexusActive },
          improvements: { newInsights: syntheses.length },
          trigger: nexusActive ? 'nexus_knowledge_synthesis' : 'knowledge_synthesis'
        });
      }

      return syntheses;
    } catch (error) {
      console.error('[Self-Evolution] Knowledge synthesis error:', error);
      return [];
    }
  }

  private async consolidateKnowledge(): Promise<void> {
    try {
      const stats = await experienceMemory.getLearningStats();

      if (stats.totalExperiences > this.evolutionThresholds.knowledgeConsolidationInterval) {
        console.log('[Self-Evolution] Running knowledge consolidation...');

        await this.synthesizeKnowledge();

        await experienceMemory.logEvolution({
          type: 'strategy_improved',
          description: 'Knowledge base consolidated and optimized',
          beforeState: { experiences: stats.totalExperiences, concepts: stats.knowledgeConcepts },
          afterState: {
            experiences: stats.totalExperiences,
            concepts: stats.knowledgeConcepts,
            synthesized: this.synthesizedKnowledge.length
          },
          improvements: { consolidationComplete: 1 },
          trigger: 'scheduled_consolidation'
        });
      }
    } catch (error) {
      console.error('[Self-Evolution] Consolidation error:', error);
    }
  }

  private async generateMetaInsights(): Promise<void> {
    try {
      const evolutionHistory = await experienceMemory.getEvolutionHistory(20);
      const learningStats = await experienceMemory.getLearningStats();

      const insights: MetaLearningInsight[] = [];

      if (evolutionHistory.recentEvents.length > 5) {
        const performanceEvents = evolutionHistory.recentEvents.filter(e => e.type === 'performance_boost');
        if (performanceEvents.length > 2) {
          insights.push({
            insight: 'Consistent performance improvements detected across multiple areas',
            category: 'performance',
            actionable: true,
            suggestedAction: 'Continue current optimization strategies',
            confidence: 0.8
          });
        }
      }

      if (learningStats.knowledgeConcepts > 50 && learningStats.averageSuccessRate > 80) {
        insights.push({
          insight: 'Strong knowledge base with high success rate indicates effective learning',
          category: 'knowledge',
          actionable: false,
          confidence: 0.9
        });
      }

      if (this.synthesizedKnowledge.length > 5) {
        const avgNovelty = this.synthesizedKnowledge.reduce((sum, s) => sum + s.novelty, 0) / this.synthesizedKnowledge.length;
        insights.push({
          insight: `Knowledge synthesis is generating insights with ${(avgNovelty * 100).toFixed(0)}% novelty`,
          category: 'strategy',
          actionable: avgNovelty < 0.3,
          suggestedAction: avgNovelty < 0.3 ? 'Explore more diverse knowledge domains' : undefined,
          confidence: 0.75
        });
      }

      this.metaInsights = [...insights, ...this.metaInsights].slice(0, 50);

      const verboseEvolution = process.env.CYRUS_VERBOSE_EVOLUTION === 'true';
      if (verboseEvolution || insights.length > 0) {
        console.log(`[Self-Evolution] Generated ${insights.length} new meta-insights`);
      }
    } catch (error) {
      console.error('[Self-Evolution] Meta-insight generation error:', error);
    }
  }

  async getEvolutionMetrics(): Promise<EvolutionMetrics> {
    try {
      const stats = await experienceMemory.getLearningStats();
      const evolutionHistory = await experienceMemory.getEvolutionHistory(50);

      const knowledgeGrowth = stats.knowledgeConcepts / Math.max(1, this.evolutionCycle);
      const performanceEvents = evolutionHistory.recentEvents.filter(e => e.type === 'performance_boost');
      const performanceImprovement = performanceEvents.length / Math.max(1, evolutionHistory.totalEvolutions);

      return {
        knowledgeGrowth,
        performanceImprovement,
        patternRecognitionAccuracy: stats.averageSuccessRate / 100,
        learningVelocity: stats.totalExperiences / Math.max(1, this.evolutionCycle),
        adaptationRate: this.optimizationHistory.length / Math.max(1, this.evolutionCycle),
        cognitiveExpansion: this.synthesizedKnowledge.length / Math.max(1, stats.knowledgeConcepts)
      };
    } catch (error) {
      console.error('[Self-Evolution] Metrics calculation error:', error);
      return {
        knowledgeGrowth: 0,
        performanceImprovement: 0,
        patternRecognitionAccuracy: 0,
        learningVelocity: 0,
        adaptationRate: 0,
        cognitiveExpansion: 0
      };
    }
  }

  getOptimizationHistory(): SelfOptimization[] {
    return this.optimizationHistory;
  }

  getSynthesizedKnowledge(): KnowledgeSynthesis[] {
    return this.synthesizedKnowledge;
  }

  getMetaInsights(): MetaLearningInsight[] {
    return this.metaInsights;
  }

  getEvolutionCycle(): number {
    return this.evolutionCycle;
  }

  async forceEvolutionCycle(): Promise<void> {
    console.log('[Self-Evolution] Manual evolution cycle triggered');
    await this.runEvolutionCycle();
  }

  async generateEvolutionReport(): Promise<{
    cycle: number;
    metrics: EvolutionMetrics;
    recentOptimizations: SelfOptimization[];
    knowledgeSyntheses: number;
    metaInsights: MetaLearningInsight[];
    recommendations: string[];
    nexusIntegration: { operational: boolean; syncCycles: number; quantumEnhanced: boolean };
  }> {
    const metrics = await this.getEvolutionMetrics();
    const nexusOperational = quantumBridge.isNexusOperational();
    const bridgeStatus = quantumBridge.getStatus();

    const recommendations: string[] = [];

    if (metrics.knowledgeGrowth < 0.5) {
      recommendations.push('Increase knowledge acquisition through more diverse interactions');
    }
    if (metrics.patternRecognitionAccuracy < 0.7) {
      recommendations.push('Focus on pattern recognition training to improve accuracy');
    }
    if (metrics.cognitiveExpansion < 0.1) {
      recommendations.push('Encourage more knowledge synthesis activities');
    }
    if (this.metaInsights.filter(i => i.actionable).length > 3) {
      recommendations.push('Review and act on pending actionable insights');
    }
    if (!nexusOperational) {
      recommendations.push('Activate Quantum Intelligence Nexus v2.0 for enhanced evolution capabilities');
    }

    return {
      cycle: this.evolutionCycle,
      metrics,
      recentOptimizations: this.optimizationHistory.slice(-10),
      knowledgeSyntheses: this.synthesizedKnowledge.length,
      metaInsights: this.metaInsights.slice(0, 10),
      recommendations,
      nexusIntegration: {
        operational: nexusOperational,
        syncCycles: this.nexusSuccessfulSyncs,
        quantumEnhanced: bridgeStatus.nexusActive
      }
    };
  }
}

export const selfEvolution = new SelfEvolutionEngine();
