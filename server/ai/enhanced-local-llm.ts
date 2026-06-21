/**
 * Enhanced Local LLM Client - Multi-Model Intelligence System
 * 
 * Provides intelligent routing to specialized models based on query type
 * Combines capabilities from multiple AI paradigms
 */

import fetch from 'node-fetch';

export interface LocalLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LocalLLMResponse {
  response: string;
  model: string;
  confidence: number;
  reasoning?: string;
}

export type ModelSpecialization = 
  | 'general'
  | 'code'
  | 'medical'
  | 'legal'
  | 'vision'
  | 'reasoning';

interface ModelConfig {
  name: string;
  specialization: ModelSpecialization;
  temperature: number;
  keywords: string[];
  priority: number;
}

export class EnhancedLocalLLMClient {
  private baseUrl: string;
  private models: ModelConfig[];
  private defaultModel: string;
  
  constructor(baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.defaultModel = process.env.OLLAMA_MODEL || 'cyrus-general';
    
    // Define specialized models
    this.models = [
      {
        name: process.env.OLLAMA_CODE_MODEL || 'cyrus-code',
        specialization: 'code',
        temperature: 0.3,
        keywords: ['code', 'function', 'implement', 'refactor', 'debug', 'programming', 'algorithm', 'typescript', 'javascript', 'python', 'self-evolution', 'modify'],
        priority: 10,
      },
      {
        name: process.env.OLLAMA_MEDICAL_MODEL || 'cyrus-medical',
        specialization: 'medical',
        temperature: 0.5,
        keywords: ['medical', 'health', 'diagnosis', 'treatment', 'symptom', 'disease', 'drug', 'patient', 'anatomy', 'clinical'],
        priority: 9,
      },
      {
        name: process.env.OLLAMA_LEGAL_MODEL || 'cyrus-legal',
        specialization: 'legal',
        temperature: 0.4,
        keywords: ['legal', 'law', 'contract', 'agreement', 'compliance', 'regulation', 'statute', 'court', 'liability', 'rights'],
        priority: 9,
      },
      {
        name: 'llava:7b',
        specialization: 'vision',
        temperature: 0.6,
        keywords: ['image', 'vision', 'visual', 'photo', 'picture', 'see', 'look', 'analyze image'],
        priority: 8,
      },
      {
        name: 'llama3.1:8b',
        specialization: 'reasoning',
        temperature: 0.7,
        keywords: ['analyze', 'reason', 'think', 'complex', 'philosophical', 'ethical', 'strategic'],
        priority: 7,
      },
      {
        name: this.defaultModel,
        specialization: 'general',
        temperature: 0.7,
        keywords: [],
        priority: 5,
      },
    ];
  }

  /**
   * Intelligently route query to best model
   */
  private selectModel(query: string): ModelConfig {
    const queryLower = query.toLowerCase();
    let bestModel = this.models[this.models.length - 1]; // default to general
    let bestScore = 0;

    for (const model of this.models) {
      let score = 0;
      for (const keyword of model.keywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          score += model.priority;
        }
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    console.log(`[Enhanced LLM] Selected model: ${bestModel.name} (specialization: ${bestModel.specialization}, score: ${bestScore})`);
    return bestModel;
  }

  /**
   * Chat with intelligent model selection
   */
  async chat(messages: LocalLLMMessage[], options: any = {}): Promise<LocalLLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const query = lastMessage.content;
    
    // Select best model for this query
    const selectedModel = options.model ? 
      this.models.find(m => m.name === options.model) || this.models[this.models.length - 1] :
      this.selectModel(query);

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.name,
          messages,
          stream: false,
          options: {
            temperature: options.temperature ?? selectedModel.temperature,
            num_ctx: options.num_ctx ?? 32768,
            top_p: options.top_p ?? 0.9,
            top_k: options.top_k ?? 40,
          },
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return {
        response: data.message?.content || data.response || '',
        model: selectedModel.name,
        confidence: 0.85,
      };
    } catch (error) {
      console.warn(`[Enhanced LLM] ${selectedModel.name} failed, trying fallback:`, error);
      return this.fallbackChat(messages, selectedModel.name);
    }
  }

  /**
   * Ensemble approach: Query multiple models and combine responses
   */
  async ensembleChat(messages: LocalLLMMessage[], modelNames?: string[]): Promise<LocalLLMResponse> {
    const modelsToQuery = modelNames || [this.defaultModel, 'llama3.1:8b'];
    
    const responses = await Promise.allSettled(
      modelsToQuery.map(modelName => 
        this.chat(messages, { model: modelName })
      )
    );

    const successful = responses
      .filter((r): r is PromiseFulfilledResult<LocalLLMResponse> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successful.length === 0) {
      throw new Error('All ensemble models failed');
    }

    // For now, return the first successful response
    // In production, implement sophisticated ensemble logic
    const best = successful[0];
    
    return {
      ...best,
      response: `[Ensemble from ${successful.length} models]\n\n${best.response}`,
      confidence: Math.min(0.95, best.confidence * successful.length / modelsToQuery.length),
    };
  }

  /**
   * Generate with selected model
   */
  async generate(prompt: string, options: any = {}): Promise<LocalLLMResponse> {
    const selectedModel = this.selectModel(prompt);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: selectedModel.name,
          prompt,
          stream: false,
          options: {
            temperature: options.temperature ?? selectedModel.temperature,
            num_ctx: options.num_ctx ?? 16384,
          },
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = await response.json() as any;
      return {
        response: data.response || '',
        model: selectedModel.name,
        confidence: 0.8,
      };
    } catch (error) {
      console.warn(`[Enhanced LLM] Generate failed:`, error);
      return this.fallbackResponse(prompt, selectedModel.name);
    }
  }

  /**
   * Fallback for when primary model fails
   */
  private async fallbackChat(messages: LocalLLMMessage[], failedModel: string): Promise<LocalLLMResponse> {
    // Try general model as fallback
    if (failedModel !== this.defaultModel) {
      try {
        const response = await fetch(`${this.baseUrl}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.defaultModel,
            messages,
            stream: false,
          })
        });

        if (response.ok) {
          const data = await response.json() as any;
          return {
            response: data.message?.content || data.response || '',
            model: this.defaultModel,
            confidence: 0.7,
          };
        }
      } catch {
        // Continue to hardcoded fallback
      }
    }

    // Last resort: intelligent hardcoded response
    return this.fallbackResponse(messages[messages.length - 1].content, failedModel);
  }

  /**
   * Intelligent fallback responses
   */
  private fallbackResponse(query: string, failedModel: string): LocalLLMResponse {
    const queryLower = query.toLowerCase();
    
    let response = "I understand your request. ";

    if (queryLower.includes('code') || queryLower.includes('function') || queryLower.includes('implement')) {
      response += "For code-related tasks, I can help you with implementation, debugging, and refactoring. Please ensure the local LLM service is running for full code intelligence.";
    } else if (queryLower.includes('medical') || queryLower.includes('health')) {
      response += "For medical questions, I recommend consulting with healthcare professionals. I can provide general health information when the medical intelligence model is available.";
    } else if (queryLower.includes('legal') || queryLower.includes('law')) {
      response += "For legal matters, I recommend consulting with licensed attorneys. I can provide general legal information when the legal intelligence model is available.";
    } else if (queryLower.includes('analyze') || queryLower.includes('explain')) {
      response += "I can help analyze and explain complex topics. Please ensure the local LLM service is running for detailed analysis.";
    } else {
      response += "I'm here to help. Please ensure the local LLM service (Ollama) is running for full intelligence capabilities.";
    }

    return {
      response,
      model: 'fallback',
      confidence: 0.3,
    };
  }

  /**
   * Check if local LLM is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * List available models
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json() as any;
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get model info
   */
  async getModelInfo(modelName: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });
      
      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Health check for all specialized models
   */
  async healthCheck(): Promise<Record<string, boolean>> {
    const isAvailable = await this.isAvailable();
    if (!isAvailable) {
      return { service: false };
    }

    const availableModels = await this.listModels();
    const health: Record<string, boolean> = { service: true };

    for (const model of this.models) {
      health[model.name] = availableModels.includes(model.name);
    }

    return health;
  }
}

// Export singleton instance
export const enhancedLocalLLM = new EnhancedLocalLLMClient();
export default enhancedLocalLLM;
