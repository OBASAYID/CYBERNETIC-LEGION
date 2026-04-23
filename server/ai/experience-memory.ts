import { db } from '../db.js';
import { experienceLearning, knowledgeGraph, performanceMetrics, evolutionLog } from '../../shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import crypto from 'crypto';

function asNumber(value: string | number | null | undefined, fallback = 0): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function toDbNumeric(value: number | null | undefined): string | null | undefined {
  if (value == null) return value;
  return value.toString();
}

function toDbRequiredNumeric(value: number): string {
  return value.toString();
}

export interface TaskExperience {
  taskType: string;
  taskDescription: string;
  input: any;
  executionTimeMs: number;
  successScore: number;
  strategyUsed?: string;
  branchesActivated?: string[];
  learnedPatterns?: Record<string, any>;
  nexusEnhanced?: boolean;
  nexusIntelligenceLayer?: string;
  nexusCoherence?: string;
  nexusProcessingBoost?: boolean;
}

export interface LearnedPattern {
  pattern: string;
  frequency: number;
  successRate: number;
  optimizations: string[];
}

export interface KnowledgeConcept {
  concept: string;
  domain: string;
  relationships: { type: string; target: string; strength: number }[];
  properties: Record<string, any>;
  confidence: number;
  source: string;
}

export interface EvolutionEvent {
  type: 'optimization' | 'pattern_learned' | 'knowledge_integrated' | 'strategy_improved' | 'performance_boost';
  description: string;
  beforeState: Record<string, any>;
  afterState: Record<string, any>;
  improvements: Record<string, number>;
  trigger: string;
}

export class ExperienceMemoryEngine {
  private patternCache: Map<string, LearnedPattern[]> = new Map();
  private performanceCache: Map<string, { avgTime: number; bestTime: number; executions: number }> = new Map();
  private evolutionThreshold = 10;
  private learningRate = 0.1;

  constructor() {
    console.log('[Experience Memory] Initializing self-evolution learning system');
    this.loadCachedPatterns();
  }

  private async loadCachedPatterns(): Promise<void> {
    try {
      const metrics = await db.select().from(performanceMetrics).limit(100);
      for (const metric of metrics) {
        const averageTimeMs = asNumber(metric.averageTimeMs);
        const bestTimeMs = asNumber(metric.bestTimeMs, averageTimeMs);
        this.performanceCache.set(`${metric.metricType}:${metric.taskCategory}`, {
          avgTime: averageTimeMs,
          bestTime: bestTimeMs,
          executions: metric.totalExecutions || 1
        });
      }
      console.log(`[Experience Memory] Loaded ${metrics.length} performance metrics from memory`);
    } catch (error) {
      console.log('[Experience Memory] Starting with fresh memory state');
    }
  }

  private generateInputSignature(input: any): string {
    const normalized = typeof input === 'string' ? input : JSON.stringify(input);
    return crypto.createHash('md5').update(normalized).digest('hex').substring(0, 16);
  }

  async recordExperience(experience: TaskExperience): Promise<void> {
    const inputSignature = this.generateInputSignature(experience.input);
    
    const enhancedPatterns = {
      ...(experience.learnedPatterns || {}),
      ...(experience.nexusEnhanced ? {
        nexus_enhanced: true,
        nexus_layer: experience.nexusIntelligenceLayer || 'quantum_nexus_v2',
        nexus_coherence: experience.nexusCoherence || 'unknown',
        nexus_boost: experience.nexusProcessingBoost || false
      } : {})
    };
    
    try {
      await db.insert(experienceLearning).values({
        taskType: experience.taskType,
        taskDescription: experience.taskDescription,
        inputSignature,
        executionTimeMs: experience.executionTimeMs,
        successScore: experience.nexusEnhanced 
          ? Math.min(100, experience.successScore + 5)
          : experience.successScore,
        strategyUsed: experience.nexusEnhanced 
          ? `${experience.strategyUsed || 'default'}_nexus_enhanced` 
          : experience.strategyUsed,
        branchesActivated: experience.branchesActivated,
        optimizationsApplied: experience.nexusEnhanced ? ['nexus_intelligence_v2'] : [],
        learnedPatterns: enhancedPatterns
      });

      await this.updatePerformanceMetrics(experience);
      await this.checkForEvolution(experience);
      
      if (experience.nexusEnhanced) {
        this.trackNexusImpact(experience);
      }
      
    } catch (error) {
      console.error('[Experience Memory] Failed to record experience:', error);
    }
  }

  private async trackNexusImpact(experience: TaskExperience): Promise<void> {
    const nexusKey = `nexus:${experience.taskType}`;
    const cached = this.performanceCache.get(nexusKey);
    const nonNexusKey = `${experience.taskType}:${experience.taskDescription.substring(0, 50)}`;
    const nonNexusCached = this.performanceCache.get(nonNexusKey);
    
    if (cached && nonNexusCached && cached.executions >= 5) {
      const improvement = nonNexusCached.avgTime > 0 
        ? ((nonNexusCached.avgTime - cached.avgTime) / nonNexusCached.avgTime) * 100 
        : 0;
      
      if (improvement > 5) {
        await this.logEvolution({
          type: 'performance_boost',
          description: `Nexus intelligence providing ${improvement.toFixed(1)}% performance improvement in ${experience.taskType} tasks`,
          beforeState: { avgTime: nonNexusCached.avgTime, source: 'standard' },
          afterState: { avgTime: cached.avgTime, source: 'nexus_enhanced' },
          improvements: { nexusImprovementPercent: improvement, taskType: experience.taskType as any },
          trigger: 'nexus_feedback_loop'
        });
      }
    }
  }

  private async updatePerformanceMetrics(experience: TaskExperience): Promise<void> {
    const key = `${experience.taskType}:${experience.taskDescription.substring(0, 50)}`;
    const existing = this.performanceCache.get(key);
    
    if (experience.nexusEnhanced) {
      const nexusKey = `nexus:${experience.taskType}`;
      const nexusExisting = this.performanceCache.get(nexusKey);
      if (nexusExisting) {
        const newAvg = Math.round(
          (nexusExisting.avgTime * nexusExisting.executions + experience.executionTimeMs) / (nexusExisting.executions + 1)
        );
        this.performanceCache.set(nexusKey, {
          avgTime: newAvg,
          bestTime: Math.min(nexusExisting.bestTime, experience.executionTimeMs),
          executions: nexusExisting.executions + 1
        });
      } else {
        this.performanceCache.set(nexusKey, {
          avgTime: experience.executionTimeMs,
          bestTime: experience.executionTimeMs,
          executions: 1
        });
      }
    }

    if (existing) {
      const newAvg = Math.round(
        (existing.avgTime * existing.executions + experience.executionTimeMs) / (existing.executions + 1)
      );
      const newBest = Math.min(existing.bestTime, experience.executionTimeMs);
      const improvementRate = existing.bestTime > 0 
        ? Math.round(((existing.avgTime - newAvg) / existing.avgTime) * 100)
        : 0;

      this.performanceCache.set(key, {
        avgTime: newAvg,
        bestTime: newBest,
        executions: existing.executions + 1
      });

      try {
        await db.update(performanceMetrics)
          .set({
            averageTimeMs: toDbRequiredNumeric(newAvg),
            bestTimeMs: toDbNumeric(newBest),
            improvementRate: toDbNumeric(improvementRate),
            totalExecutions: existing.executions + 1,
            successRate: toDbNumeric(Math.round((experience.successScore + (existing.executions * 80)) / (existing.executions + 1))),
            lastUpdated: new Date()
          })
          .where(and(
            eq(performanceMetrics.metricType, experience.taskType),
            eq(performanceMetrics.taskCategory, experience.taskDescription.substring(0, 50))
          ));
      } catch (error) {
        console.error('[Experience Memory] Failed to update metrics:', error);
      }
    } else {
      this.performanceCache.set(key, {
        avgTime: experience.executionTimeMs,
        bestTime: experience.executionTimeMs,
        executions: 1
      });

      try {
        await db.insert(performanceMetrics).values({
          metricType: experience.taskType,
          taskCategory: experience.taskDescription.substring(0, 50),
          averageTimeMs: toDbNumeric(experience.executionTimeMs)!,
          bestTimeMs: toDbNumeric(experience.executionTimeMs),
          improvementRate: toDbNumeric(0),
          totalExecutions: 1,
          successRate: toDbNumeric(experience.successScore)
        });
      } catch (error) {
        console.error('[Experience Memory] Failed to insert metrics:', error);
      }
    }
  }

  private async checkForEvolution(experience: TaskExperience): Promise<void> {
    const key = `${experience.taskType}:${experience.taskDescription.substring(0, 50)}`;
    const cached = this.performanceCache.get(key);
    
    if (cached && cached.executions >= this.evolutionThreshold && cached.executions % this.evolutionThreshold === 0) {
      const improvementRate = cached.avgTime > 0 
        ? ((cached.avgTime - cached.bestTime) / cached.avgTime) * 100 
        : 0;
      
      if (improvementRate > 10) {
        await this.logEvolution({
          type: 'performance_boost',
          description: `Achieved ${improvementRate.toFixed(1)}% improvement in ${experience.taskType} tasks`,
          beforeState: { avgTime: cached.avgTime, executions: cached.executions - this.evolutionThreshold },
          afterState: { avgTime: cached.avgTime, bestTime: cached.bestTime, executions: cached.executions },
          improvements: { timeReduction: improvementRate, executionsToImprove: this.evolutionThreshold },
          trigger: 'performance_milestone'
        });
      }
    }
  }

  async learnKnowledge(concept: KnowledgeConcept): Promise<void> {
    try {
      const existing = await db.select()
        .from(knowledgeGraph)
        .where(and(
          eq(knowledgeGraph.concept, concept.concept),
          eq(knowledgeGraph.domain, concept.domain)
        ))
        .limit(1);

      if (existing.length > 0) {
        const currentRelations = (existing[0].relationships as any[]) || [];
        const mergedRelations = this.mergeRelationships(currentRelations, concept.relationships);
        const mergedProps = { ...(existing[0].properties as object), ...concept.properties };
        const previousConfidence = asNumber(existing[0].confidence, 50);
        const newConfidence = Math.min(100, previousConfidence + 5);
        
        await db.update(knowledgeGraph)
          .set({
            relationships: mergedRelations,
            properties: mergedProps,
            confidence: toDbNumeric(newConfidence),
            lastAccessed: new Date(),
            accessCount: (existing[0].accessCount || 0) + 1
          })
          .where(eq(knowledgeGraph.id, existing[0].id));

        await this.logEvolution({
          type: 'knowledge_integrated',
          description: `Enhanced knowledge of "${concept.concept}" in ${concept.domain} domain`,
          beforeState: { confidence: previousConfidence, relations: currentRelations.length },
          afterState: { confidence: newConfidence, relations: mergedRelations.length },
          improvements: { confidenceGain: newConfidence - previousConfidence },
          trigger: 'knowledge_reinforcement'
        });
      } else {
        await db.insert(knowledgeGraph).values({
          concept: concept.concept,
          domain: concept.domain,
          relationships: concept.relationships,
          properties: concept.properties,
          confidence: toDbNumeric(concept.confidence),
          source: concept.source,
          accessCount: 1
        });

        await this.logEvolution({
          type: 'knowledge_integrated',
          description: `Learned new concept: "${concept.concept}" in ${concept.domain} domain`,
          beforeState: { known: false },
          afterState: { known: true, confidence: concept.confidence },
          improvements: { newConceptsLearned: 1 },
          trigger: 'new_knowledge'
        });
      }
    } catch (error) {
      console.error('[Experience Memory] Failed to learn knowledge:', error);
    }
  }

  private mergeRelationships(
    existing: { type: string; target: string; strength: number }[],
    incoming: { type: string; target: string; strength: number }[]
  ): { type: string; target: string; strength: number }[] {
    const merged = new Map<string, { type: string; target: string; strength: number }>();
    
    for (const rel of existing) {
      merged.set(`${rel.type}:${rel.target}`, rel);
    }
    
    for (const rel of incoming) {
      const key = `${rel.type}:${rel.target}`;
      const current = merged.get(key);
      if (current) {
        merged.set(key, { ...rel, strength: Math.min(1, current.strength + 0.1) });
      } else {
        merged.set(key, rel);
      }
    }
    
    return Array.from(merged.values());
  }

  async logEvolution(event: EvolutionEvent): Promise<void> {
    try {
      await db.insert(evolutionLog).values({
        evolutionType: event.type,
        description: event.description,
        beforeState: event.beforeState,
        afterState: event.afterState,
        improvementMetrics: event.improvements,
        triggeredBy: event.trigger
      });
      console.log(`[Experience Memory] Evolution event: ${event.description}`);
    } catch (error) {
      console.error('[Experience Memory] Failed to log evolution:', error);
    }
  }

  async getOptimizedStrategy(taskType: string, inputSignature?: string): Promise<{
    recommendedStrategy: string | null;
    expectedTimeMs: number;
    optimizations: string[];
    confidence: number;
  }> {
    try {
      const similar = await db.select()
        .from(experienceLearning)
        .where(eq(experienceLearning.taskType, taskType))
        .orderBy(desc(experienceLearning.successScore))
        .limit(10);

      if (similar.length === 0) {
        return {
          recommendedStrategy: null,
          expectedTimeMs: 1000,
          optimizations: [],
          confidence: 0
        };
      }

      const bestStrategy = similar[0].strategyUsed;
      const avgTime = Math.round(similar.reduce((sum, e) => sum + e.executionTimeMs, 0) / similar.length);
      const successRate = similar.reduce((sum, e) => sum + e.successScore, 0) / similar.length;
      
      const optimizations: string[] = [];
      const patterns = similar.flatMap(e => Object.keys((e.learnedPatterns as object) || {}));
      const patternCounts = new Map<string, number>();
      patterns.forEach(p => patternCounts.set(p, (patternCounts.get(p) || 0) + 1));
      
      patternCounts.forEach((count, pattern) => {
        if (count >= 3) {
          optimizations.push(`Apply pattern: ${pattern}`);
        }
      });

      return {
        recommendedStrategy: bestStrategy,
        expectedTimeMs: avgTime,
        optimizations,
        confidence: Math.round(successRate)
      };
    } catch (error) {
      console.error('[Experience Memory] Failed to get optimized strategy:', error);
      return {
        recommendedStrategy: null,
        expectedTimeMs: 1000,
        optimizations: [],
        confidence: 0
      };
    }
  }

  async queryKnowledge(concept: string, domain?: string): Promise<{
    found: boolean;
    concept?: string;
    domain?: string;
    relationships?: any[];
    properties?: Record<string, any>;
    confidence?: number;
  }> {
    try {
      const query = domain 
        ? and(eq(knowledgeGraph.concept, concept), eq(knowledgeGraph.domain, domain))
        : eq(knowledgeGraph.concept, concept);
      
      const results = await db.select()
        .from(knowledgeGraph)
        .where(query)
        .limit(1);

      if (results.length === 0) {
        return { found: false };
      }

      await db.update(knowledgeGraph)
        .set({ 
          lastAccessed: new Date(),
          accessCount: (results[0].accessCount || 0) + 1
        })
        .where(eq(knowledgeGraph.id, results[0].id));

      return {
        found: true,
        concept: results[0].concept,
        domain: results[0].domain,
        relationships: results[0].relationships as any[],
        properties: results[0].properties as Record<string, any>,
        confidence: asNumber(results[0].confidence, 50)
      };
    } catch (error) {
      console.error('[Experience Memory] Failed to query knowledge:', error);
      return { found: false };
    }
  }

  async getEvolutionHistory(limit = 20): Promise<{
    totalEvolutions: number;
    recentEvents: { type: string; description: string; improvements: any; date: Date }[];
    improvementSummary: Record<string, number>;
  }> {
    try {
      const events = await db.select()
        .from(evolutionLog)
        .orderBy(desc(evolutionLog.evolvedAt))
        .limit(limit);

      const total = await db.select({ count: sql<number>`count(*)` })
        .from(evolutionLog);

      const improvementSummary: Record<string, number> = {};
      events.forEach(e => {
        const metrics = e.improvementMetrics as Record<string, number>;
        if (metrics) {
          Object.entries(metrics).forEach(([key, value]) => {
            improvementSummary[key] = (improvementSummary[key] || 0) + (typeof value === 'number' ? value : 0);
          });
        }
      });

      return {
        totalEvolutions: Number(total[0]?.count || 0),
        recentEvents: events.map(e => ({
          type: e.evolutionType,
          description: e.description,
          improvements: e.improvementMetrics,
          date: e.evolvedAt
        })),
        improvementSummary
      };
    } catch (error) {
      console.error('[Experience Memory] Failed to get evolution history:', error);
      return { totalEvolutions: 0, recentEvents: [], improvementSummary: {} };
    }
  }

  async getLearningStats(): Promise<{
    totalExperiences: number;
    knowledgeConcepts: number;
    evolutionEvents: number;
    averageSuccessRate: number;
    topPerformingTasks: { task: string; successRate: number }[];
  }> {
    try {
      const [expCount, knowCount, evoCount, metrics] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(experienceLearning),
        db.select({ count: sql<number>`count(*)` }).from(knowledgeGraph),
        db.select({ count: sql<number>`count(*)` }).from(evolutionLog),
        db.select().from(performanceMetrics).orderBy(desc(performanceMetrics.successRate)).limit(5)
      ]);

      const avgSuccess = metrics.length > 0
        ? Math.round(metrics.reduce((sum, m) => sum + asNumber(m.successRate), 0) / metrics.length)
        : 0;

      return {
        totalExperiences: Number(expCount[0]?.count || 0),
        knowledgeConcepts: Number(knowCount[0]?.count || 0),
        evolutionEvents: Number(evoCount[0]?.count || 0),
        averageSuccessRate: avgSuccess,
        topPerformingTasks: metrics.map(m => ({
          task: `${m.metricType}: ${m.taskCategory}`,
          successRate: asNumber(m.successRate)
        }))
      };
    } catch (error) {
      console.error('[Experience Memory] Failed to get learning stats:', error);
      return {
        totalExperiences: 0,
        knowledgeConcepts: 0,
        evolutionEvents: 0,
        averageSuccessRate: 0,
        topPerformingTasks: []
      };
    }
  }
}

export const experienceMemory = new ExperienceMemoryEngine();
