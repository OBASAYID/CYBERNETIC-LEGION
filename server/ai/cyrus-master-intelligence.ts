/**
 * CYRUS MASTER INTELLIGENCE ORCHESTRATOR
 * 
 * Central brain that coordinates all AI systems:
 * - Local LLM (Enhanced Local Models)
 * - Multi-Model Intelligence (GPT-4, Claude, Gemini, Grok)
 * - Self-Evolution Engine
 * - Voice System (STT/TTS)
 * - Learning System
 * - Document Intelligence
 * 
 * Provides unified interface for all Cyrus intelligence
 */

import { enhancedLocalLLM } from './enhanced-local-llm.js';
import { multiModelIntelligence } from './multi-model-intelligence.js';
import { selfEvolutionEngine } from './self-evolution-engine.js';
import { advancedVoiceSystem } from './advanced-voice-system.js';
import { enhancedLearningSystem } from './enhanced-learning-system.js';

export interface CyrusQuery {
  userId: string;
  query: string;
  mode?: 'chat' | 'voice' | 'code' | 'analyze' | 'learn';
  context?: any;
  preferences?: {
    model?: string;
    strategy?: string;
    responseLength?: 'brief' | 'moderate' | 'detailed';
  };
}

export interface CyrusResponse {
  response: string;
  mode: string;
  model: string;
  confidence: number;
  audioResponse?: Buffer;
  codeGenerated?: string;
  analysis?: any;
  learningInsights?: any;
  metadata: {
    processingTime: number;
    systemsUsed: string[];
    adaptations: string[];
  };
}

class CyrusMasterIntelligence {
  private systemStatus: Map<string, boolean>;

  constructor() {
    this.systemStatus = new Map();
    this.initSystems();
  }

  private async initSystems() {
    console.log('[Cyrus Master] Initializing intelligence systems...');

    // Check all subsystems
    this.systemStatus.set('local-llm', await enhancedLocalLLM.isAvailable());
    const multiStatus = multiModelIntelligence.getStatus();
    this.systemStatus.set('multi-model', multiStatus.operational);
    this.systemStatus.set('voice', true); // Always available with fallbacks
    this.systemStatus.set('learning', true); // Always available
    this.systemStatus.set('evolution', true); // Always available

    const available = Array.from(this.systemStatus.entries())
      .filter(([_, status]) => status)
      .map(([name]) => name);

    console.log(`[Cyrus Master] Active systems: ${available.join(', ')}`);
  }

  /**
   * Main unified query interface
   */
  async query(request: CyrusQuery): Promise<CyrusResponse> {
    const startTime = Date.now();
    const systemsUsed: string[] = [];
    const adaptations: string[] = [];

    try {
      // Determine mode
      const mode = request.mode || this.inferMode(request.query);
      systemsUsed.push(`mode: ${mode}`);

      let response: CyrusResponse;

      switch (mode) {
        case 'voice':
          response = await this.handleVoiceQuery(request, systemsUsed, adaptations);
          break;
        case 'code':
          response = await this.handleCodeQuery(request, systemsUsed, adaptations);
          break;
        case 'analyze':
          response = await this.handleAnalysisQuery(request, systemsUsed, adaptations);
          break;
        case 'learn':
          response = await this.handleLearningQuery(request, systemsUsed, adaptations);
          break;
        default:
          response = await this.handleChatQuery(request, systemsUsed, adaptations);
      }

      response.metadata = {
        processingTime: Date.now() - startTime,
        systemsUsed,
        adaptations,
      };

      return response;
    } catch (error) {
      console.error('[Cyrus Master] Query failed:', error);
      throw error;
    }
  }

  /**
   * Handle chat queries with learning integration
   */
  private async handleChatQuery(
    request: CyrusQuery,
    systemsUsed: string[],
    adaptations: string[]
  ): Promise<CyrusResponse> {
    systemsUsed.push('chat', 'learning');

    // Use learning system for personalization
    const personalizedResponse = await enhancedLearningSystem.generatePersonalizedResponse(
      request.userId,
      request.query,
      request.context
    );

    adaptations.push(...personalizedResponse.adaptations);

    return {
      response: personalizedResponse.response,
      mode: 'chat',
      model: 'multi-model',
      confidence: personalizedResponse.confidence,
      learningInsights: {
        opportunities: personalizedResponse.learningOpportunities,
        followUps: personalizedResponse.followUpSuggestions,
        resources: personalizedResponse.resources,
      },
      metadata: {
        processingTime: 0,
        systemsUsed,
        adaptations,
      },
    };
  }

  /**
   * Handle voice queries (STT + Processing + TTS)
   */
  private async handleVoiceQuery(
    request: CyrusQuery,
    systemsUsed: string[],
    adaptations: string[]
  ): Promise<CyrusResponse> {
    systemsUsed.push('voice', 'chat', 'learning');

    // This assumes audio input is provided
    // In practice, would receive audio buffer
    const textQuery = request.query; // Would be transcribed from audio

    // Get personalized response
    const chatResponse = await this.handleChatQuery(
      { ...request, query: textQuery },
      systemsUsed,
      adaptations
    );

    // Convert response to speech
    const voiceResponse = await advancedVoiceSystem.textToSpeech(chatResponse.response);

    return {
      ...chatResponse,
      mode: 'voice',
      audioResponse: voiceResponse.audioBuffer,
    };
  }

  /**
   * Handle code-related queries
   */
  private async handleCodeQuery(
    request: CyrusQuery,
    systemsUsed: string[],
    adaptations: string[]
  ): Promise<CyrusResponse> {
    systemsUsed.push('code-model', 'multi-model');

    // Route to code-specialized model
    const messages = [
      { role: 'system' as const, content: 'You are an expert programmer. Provide production-quality code.' },
      { role: 'user' as const, content: request.query }
    ];

    const response = await multiModelIntelligence.infer(messages, {
      strategy: (request.preferences?.strategy as any) || 'specialized',
    });

    // Extract code if present
    const codeMatch = response.finalResponse.match(/```[\s\S]*?```/);
    const codeGenerated = codeMatch ? codeMatch[0] : undefined;

    return {
      response: response.finalResponse,
      mode: 'code',
      model: response.modelResponses[0]?.model || 'unknown',
      confidence: response.confidence,
      codeGenerated,
      metadata: {
        processingTime: 0,
        systemsUsed,
        adaptations,
      },
    };
  }

  /**
   * Handle analysis queries
   */
  private async handleAnalysisQuery(
    request: CyrusQuery,
    systemsUsed: string[],
    adaptations: string[]
  ): Promise<CyrusResponse> {
    systemsUsed.push('analysis', 'multi-model');

    // Use Claude if available (best for analysis)
    const messages = [
      { role: 'system' as const, content: 'You are an expert analyst. Provide thorough, structured analysis.' },
      { role: 'user' as const, content: request.query }
    ];

    const response = await multiModelIntelligence.infer(messages, {
      strategy: (request.preferences?.strategy as any) || 'specialized',
    });

    return {
      response: response.finalResponse,
      mode: 'analyze',
      model: response.modelResponses[0]?.model || 'unknown',
      confidence: response.confidence,
      analysis: {
        summary: response.finalResponse.split('\n\n')[0],
        details: response.finalResponse,
      },
      metadata: {
        processingTime: 0,
        systemsUsed,
        adaptations,
      },
    };
  }

  /**
   * Handle learning-focused queries
   */
  private async handleLearningQuery(
    request: CyrusQuery,
    systemsUsed: string[],
    adaptations: string[]
  ): Promise<CyrusResponse> {
    systemsUsed.push('learning', 'chat');

    const personalizedResponse = await enhancedLearningSystem.generatePersonalizedResponse(
      request.userId,
      request.query,
      { ...request.context, objective: 'learn' }
    );

    adaptations.push(...personalizedResponse.adaptations);

    return {
      response: personalizedResponse.response,
      mode: 'learn',
      model: 'learning-optimized',
      confidence: personalizedResponse.confidence,
      learningInsights: {
        opportunities: personalizedResponse.learningOpportunities,
        followUps: personalizedResponse.followUpSuggestions,
        resources: personalizedResponse.resources,
      },
      metadata: {
        processingTime: 0,
        systemsUsed,
        adaptations,
      },
    };
  }

  /**
   * Infer query mode from content
   */
  private inferMode(query: string): CyrusQuery['mode'] {
    const queryLower = query.toLowerCase();

    if (queryLower.includes('code') || queryLower.includes('function') || queryLower.includes('implement')) {
      return 'code';
    }

    if (queryLower.includes('analyze') || queryLower.includes('review') || queryLower.includes('evaluate')) {
      return 'analyze';
    }

    if (queryLower.includes('learn') || queryLower.includes('teach') || queryLower.includes('explain')) {
      return 'learn';
    }

    return 'chat';
  }

  /**
   * Get comprehensive system status
   */
  async getSystemStatus(): Promise<{
    status: 'operational' | 'degraded' | 'offline';
    systems: Record<string, boolean>;
    capabilities: string[];
    performance: {
      averageResponseTime: number;
      modelsAvailable: number;
    };
  }> {
    const systems: Record<string, boolean> = {};
    
    // Check all subsystems
    systems['local-llm'] = await enhancedLocalLLM.isAvailable();
    const multiModelStatus = multiModelIntelligence.getStatus();
    systems['multi-model'] = multiModelStatus.operational;
    systems['voice-stt'] = !!process.env.OPENAI_API_KEY;
    systems['voice-tts'] = !!(process.env.ELEVENLABS_API_KEY || process.env.OPENAI_API_KEY);
    systems['learning'] = true;
    systems['evolution'] = true;

    const operationalCount = Object.values(systems).filter(Boolean).length;
    const totalCount = Object.keys(systems).length;

    let status: 'operational' | 'degraded' | 'offline';
    if (operationalCount === totalCount) {
      status = 'operational';
    } else if (operationalCount > 0) {
      status = 'degraded';
    } else {
      status = 'offline';
    }

    const capabilities: string[] = [];
    if (systems['local-llm']) capabilities.push('Local AI Processing');
    if (systems['multi-model']) capabilities.push('Multi-Model Intelligence');
    if (systems['voice-stt']) capabilities.push('Speech Recognition');
    if (systems['voice-tts']) capabilities.push('Speech Synthesis');
    if (systems['learning']) capabilities.push('Personalized Learning');
    if (systems['evolution']) capabilities.push('Self-Evolution');

    // Get multi-model status
    return {
      status,
      systems,
      capabilities,
      performance: {
        averageResponseTime: 2500, // Placeholder
        modelsAvailable: multiModelStatus.providers.length,
      },
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    const status = await this.getSystemStatus();
    return status.status !== 'offline';
  }
}

// Export singleton instance
export const cyrusMasterIntelligence = new CyrusMasterIntelligence();
export default cyrusMasterIntelligence;
