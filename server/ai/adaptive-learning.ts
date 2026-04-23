import { experienceMemory, TaskExperience, KnowledgeConcept, EvolutionEvent } from './experience-memory.js';

export interface LearningContext {
  taskType: string;
  input: any;
  startTime: number;
}

export interface PatternRecognitionResult {
  patterns: string[];
  confidence: number;
  suggestedOptimizations: string[];
}

export interface AdaptiveResponse {
  optimizedApproach: string | null;
  predictedTime: number;
  learningApplied: boolean;
  confidenceLevel: number;
}

export class AdaptiveLearningAlgorithms {
  private activeLearningContexts: Map<string, LearningContext> = new Map();
  private patternThreshold = 0.7;
  private minSamplesForPattern = 3;

  constructor() {
    console.log('[Adaptive Learning] Self-improvement algorithms initialized');
  }

  startTaskTracking(taskId: string, taskType: string, input: any): void {
    this.activeLearningContexts.set(taskId, {
      taskType,
      input,
      startTime: Date.now()
    });
  }

  async endTaskTracking(
    taskId: string, 
    success: boolean, 
    result?: any,
    strategyUsed?: string,
    branchesActivated?: string[]
  ): Promise<void> {
    const context = this.activeLearningContexts.get(taskId);
    if (!context) return;

    const executionTime = Date.now() - context.startTime;
    const successScore = success ? 100 : Math.max(0, 50 - Math.floor(executionTime / 1000));

    const experience: TaskExperience = {
      taskType: context.taskType,
      taskDescription: this.extractTaskDescription(context.input),
      input: context.input,
      executionTimeMs: executionTime,
      successScore,
      strategyUsed,
      branchesActivated,
      learnedPatterns: this.extractPatterns(context.input, result, success)
    };

    await experienceMemory.recordExperience(experience);
    this.activeLearningContexts.delete(taskId);
  }

  private extractTaskDescription(input: any): string {
    if (typeof input === 'string') {
      return input.substring(0, 100);
    }
    if (input?.message) {
      return String(input.message).substring(0, 100);
    }
    if (input?.query) {
      return String(input.query).substring(0, 100);
    }
    return 'Generic task';
  }

  private extractPatterns(input: any, result: any, success: boolean): Record<string, any> {
    const patterns: Record<string, any> = {};
    
    const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
    
    if (/\b(calculate|compute|solve|math)\b/i.test(inputStr)) {
      patterns['mathematical_operation'] = { detected: true, success };
    }
    if (/\b(navigate|route|location|map|direction)\b/i.test(inputStr)) {
      patterns['navigation_task'] = { detected: true, success };
    }
    if (/\b(analyze|examine|inspect|detect)\b/i.test(inputStr)) {
      patterns['analysis_task'] = { detected: true, success };
    }
    if (/\b(fly|drone|uav|takeoff|land)\b/i.test(inputStr)) {
      patterns['drone_operation'] = { detected: true, success };
    }
    if (/\b(research|search|find|lookup)\b/i.test(inputStr)) {
      patterns['research_task'] = { detected: true, success };
    }
    if (/\b(write|draft|compose|create)\b/i.test(inputStr)) {
      patterns['content_creation'] = { detected: true, success };
    }
    if (/\b(trade|forex|crypto|stock|market)\b/i.test(inputStr)) {
      patterns['trading_analysis'] = { detected: true, success };
    }

    patterns['input_length'] = inputStr.length;
    patterns['has_context'] = inputStr.length > 200;
    patterns['execution_success'] = success;

    return patterns;
  }

  async getAdaptiveResponse(taskType: string, input: any): Promise<AdaptiveResponse> {
    const strategy = await experienceMemory.getOptimizedStrategy(taskType);
    
    return {
      optimizedApproach: strategy.recommendedStrategy,
      predictedTime: strategy.expectedTimeMs,
      learningApplied: strategy.confidence > 50,
      confidenceLevel: strategy.confidence
    };
  }

  async learnFromConversation(
    userMessage: string, 
    aiResponse: string, 
    context?: Record<string, any>
  ): Promise<void> {
    const concepts = this.extractConceptsFromText(userMessage + ' ' + aiResponse);
    
    for (const concept of concepts) {
      await experienceMemory.learnKnowledge({
        concept: concept.name,
        domain: concept.domain,
        relationships: concept.relationships,
        properties: { 
          mentionedIn: 'conversation',
          context: context?.moduleContext || 'general'
        },
        confidence: 60,
        source: 'conversation_learning'
      });
    }
  }

  private extractConceptsFromText(text: string): {
    name: string;
    domain: string;
    relationships: { type: string; target: string; strength: number }[];
  }[] {
    const concepts: {
      name: string;
      domain: string;
      relationships: { type: string; target: string; strength: number }[];
    }[] = [];

    const domainPatterns: Record<string, RegExp> = {
      'Technology': /\b(AI|machine learning|quantum|software|hardware|algorithm|neural|computer)\b/gi,
      'Geography': /\b(Botswana|Africa|country|city|location|region|continent)\b/gi,
      'Military': /\b(drone|UAV|tactical|defense|security|command|mission)\b/gi,
      'Finance': /\b(trading|forex|crypto|stock|market|investment|currency)\b/gi,
      'Science': /\b(physics|chemistry|biology|mathematics|research|experiment)\b/gi
    };

    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      const matches = text.match(pattern);
      if (matches) {
        const uniqueMatches = [...new Set(matches.map(m => m.toLowerCase()))];
        for (const match of uniqueMatches) {
          concepts.push({
            name: match,
            domain,
            relationships: this.inferRelationships(match, text)
          });
        }
      }
    }

    return concepts.slice(0, 10);
  }

  private inferRelationships(
    concept: string, 
    text: string
  ): { type: string; target: string; strength: number }[] {
    const relationships: { type: string; target: string; strength: number }[] = [];
    const lowerText = text.toLowerCase();
    const conceptIndex = lowerText.indexOf(concept.toLowerCase());
    
    if (conceptIndex === -1) return relationships;

    const contextWindow = lowerText.slice(
      Math.max(0, conceptIndex - 100),
      Math.min(lowerText.length, conceptIndex + concept.length + 100)
    );

    const verbPatterns = [
      { verb: /\bis\b/, type: 'is_a' },
      { verb: /\bhas\b/, type: 'has' },
      { verb: /\bused for\b/, type: 'used_for' },
      { verb: /\brelated to\b/, type: 'related_to' },
      { verb: /\bpart of\b/, type: 'part_of' },
      { verb: /\bcreated by\b/, type: 'created_by' }
    ];

    for (const { verb, type } of verbPatterns) {
      if (verb.test(contextWindow)) {
        relationships.push({
          type,
          target: 'context_derived',
          strength: 0.5
        });
      }
    }

    return relationships;
  }

  async reinforceLearning(
    taskType: string,
    wasSuccessful: boolean,
    feedback?: string
  ): Promise<void> {
    if (wasSuccessful) {
      await experienceMemory.logEvolution({
        type: 'strategy_improved',
        description: `Positive reinforcement for ${taskType} task`,
        beforeState: { reinforcement: 'none' },
        afterState: { reinforcement: 'positive', feedback },
        improvements: { successReinforcement: 1 },
        trigger: 'user_feedback'
      });
    }
  }

  async analyzeForOptimization(taskType: string): Promise<{
    currentPerformance: number;
    suggestedOptimizations: string[];
    learningProgress: number;
  }> {
    const strategy = await experienceMemory.getOptimizedStrategy(taskType);
    const stats = await experienceMemory.getLearningStats();

    return {
      currentPerformance: strategy.confidence,
      suggestedOptimizations: strategy.optimizations,
      learningProgress: Math.min(100, stats.totalExperiences * 2)
    };
  }

  generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }
}

export const adaptiveLearning = new AdaptiveLearningAlgorithms();
