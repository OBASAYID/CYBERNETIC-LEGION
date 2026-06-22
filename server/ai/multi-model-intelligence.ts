/**
 * CYRUS MULTI-MODEL INTELLIGENCE SYSTEM
 * 
 * Combines capabilities from all leading AI models:
 * - GPT-4 (OpenAI): Deep reasoning, broad knowledge
 * - Claude (Anthropic): Safety, nuance, long context
 * - Gemini (Google): Multimodal, real-time knowledge
 * - Grok (xAI): Real-time data, humor, personality
 * - Llama (Meta): Open-source, local inference
 * 
 * Creates a hybrid AI that surpasses any single model
 */

import fetch from 'node-fetch';
import { enhancedLocalLLM } from './enhanced-local-llm.js';

export interface MultiModelConfig {
  providers: {
    openai?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    anthropic?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    google?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    xai?: {
      apiKey: string;
      model: string;
      enabled: boolean;
    };
    local?: {
      enabled: boolean;
    };
  };
  strategy: 'parallel' | 'cascade' | 'voting' | 'specialized';
}

export interface ModelResponse {
  model: string;
  response: string;
  confidence: number;
  reasoning?: string;
  latency: number;
}

export interface MultiModelResponse {
  finalResponse: string;
  modelResponses: ModelResponse[];
  strategy: string;
  confidence: number;
  reasoning: string;
}

class MultiModelIntelligence {
  private config: MultiModelConfig;
  
  constructor() {
    this.config = this.loadConfig();
    console.log(`[Multi-Model] Initialized with strategy: ${this.config.strategy}`);
    console.log(`[Multi-Model] Available providers:`, Object.keys(this.config.providers).filter(k => this.config.providers[k as keyof typeof this.config.providers]?.enabled));
  }

  private loadConfig(): MultiModelConfig {
    const openaiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const googleKey = process.env.GOOGLE_AI_API_KEY;
    const xaiKey = process.env.XAI_API_KEY;

    return {
      providers: {
        openai: openaiKey ? {
          apiKey: openaiKey,
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          enabled: true,
        } : undefined,
        anthropic: anthropicKey ? {
          apiKey: anthropicKey,
          model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
          enabled: true,
        } : undefined,
        google: googleKey ? {
          apiKey: googleKey,
          model: process.env.GOOGLE_MODEL || 'gemini-2.0-flash-exp',
          enabled: true,
        } : undefined,
        xai: xaiKey ? {
          apiKey: xaiKey,
          model: process.env.XAI_MODEL || 'grok-beta',
          enabled: true,
        } : undefined,
        local: {
          enabled: process.env.USE_LOCAL_LLM !== 'false',
        },
      },
      strategy: (process.env.CYRUS_MULTI_MODEL_STRATEGY as MultiModelConfig['strategy']) || 'cascade',
    };
  }

  /**
   * Main inference method - routes to appropriate strategy
   */
  async infer(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options: {
      strategy?: MultiModelConfig['strategy'];
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<MultiModelResponse> {
    const strategy = options.strategy || this.config.strategy;

    console.log(`[Multi-Model] Processing with strategy: ${strategy}`);

    switch (strategy) {
      case 'parallel':
        return this.parallelInference(messages, options);
      case 'cascade':
        return this.cascadeInference(messages, options);
      case 'voting':
        return this.votingInference(messages, options);
      case 'specialized':
        return this.specializedInference(messages, options);
      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  /**
   * Parallel inference: Query all models simultaneously, synthesize best response
   */
  private async parallelInference(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<MultiModelResponse> {
    const promises: Promise<ModelResponse>[] = [];

    // Query all available providers
    if (this.config.providers.openai?.enabled) {
      promises.push(this.queryGPT(messages, options));
    }
    if (this.config.providers.anthropic?.enabled) {
      promises.push(this.queryClaude(messages, options));
    }
    if (this.config.providers.google?.enabled) {
      promises.push(this.queryGemini(messages, options));
    }
    if (this.config.providers.xai?.enabled) {
      promises.push(this.queryGrok(messages, options));
    }
    if (this.config.providers.local?.enabled) {
      promises.push(this.queryLocal(messages, options));
    }

    const results = await Promise.allSettled(promises);
    
    const successful = results
      .filter((r): r is PromiseFulfilledResult<ModelResponse> => r.status === 'fulfilled')
      .map(r => r.value);

    if (successful.length === 0) {
      throw new Error('All models failed to respond');
    }

    // Synthesize responses
    const finalResponse = await this.synthesizeResponses(successful, messages);

    const avgConfidence = successful.reduce((sum, r) => sum + r.confidence, 0) / successful.length;

    return {
      finalResponse,
      modelResponses: successful,
      strategy: 'parallel',
      confidence: avgConfidence,
      reasoning: `Combined insights from ${successful.length} models`,
    };
  }

  /**
   * Cascade inference: Try models in order until success
   */
  private async cascadeInference(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<MultiModelResponse> {
    // Try in order of quality/cost
    const cascade = [
      { name: 'GPT-4', fn: () => this.queryGPT(messages, options), enabled: this.config.providers.openai?.enabled },
      { name: 'Claude', fn: () => this.queryClaude(messages, options), enabled: this.config.providers.anthropic?.enabled },
      { name: 'Gemini', fn: () => this.queryGemini(messages, options), enabled: this.config.providers.google?.enabled },
      { name: 'Grok', fn: () => this.queryGrok(messages, options), enabled: this.config.providers.xai?.enabled },
      { name: 'Local', fn: () => this.queryLocal(messages, options), enabled: this.config.providers.local?.enabled },
    ];

    for (const model of cascade) {
      if (!model.enabled) continue;

      try {
        console.log(`[Multi-Model Cascade] Trying ${model.name}...`);
        const response = await model.fn();
        
        return {
          finalResponse: response.response,
          modelResponses: [response],
          strategy: 'cascade',
          confidence: response.confidence,
          reasoning: `Successfully answered by ${model.name}`,
        };
      } catch (error) {
        console.warn(`[Multi-Model Cascade] ${model.name} failed:`, error instanceof Error ? error.message : String(error));
        continue;
      }
    }

    throw new Error('All models in cascade failed');
  }

  /**
   * Voting inference: Multiple models vote on answer
   */
  private async votingInference(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<MultiModelResponse> {
    // Query multiple models
    const responses = await this.parallelInference(messages, options);

    // For now, use the highest confidence response
    // In production, implement sophisticated voting logic
    const bestResponse = responses.modelResponses.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );

    return {
      finalResponse: bestResponse.response,
      modelResponses: responses.modelResponses,
      strategy: 'voting',
      confidence: bestResponse.confidence,
      reasoning: `Selected response from ${bestResponse.model} based on highest confidence`,
    };
  }

  /**
   * Specialized inference: Route to best model for task type
   */
  private async specializedInference(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<MultiModelResponse> {
    try {
    const lastMessage = messages[messages.length - 1].content.toLowerCase();

    // Determine task type and select best model
    let selectedModel: () => Promise<ModelResponse>;
    let modelName: string;
    let reasoning: string;

    if (lastMessage.includes('code') || lastMessage.includes('program') || lastMessage.includes('function')) {
      // GPT-4 excels at code
      if (this.config.providers.openai?.enabled) {
        selectedModel = () => this.queryGPT(messages, options);
        modelName = 'GPT-4';
        reasoning = 'Code task - using GPT-4 for technical excellence';
      } else if (this.config.providers.local?.enabled) {
        selectedModel = () => this.queryLocal(messages, { ...options, model: 'cyrus-code' });
        modelName = 'CodeLlama';
        reasoning = 'Code task - using local code model';
      } else {
        selectedModel = () => this.queryLocal(messages, options);
        modelName = 'Local';
        reasoning = 'Fallback to local model';
      }
    } else if (lastMessage.includes('analyze') || lastMessage.includes('review') || lastMessage.includes('evaluate')) {
      // Claude excels at analysis
      if (this.config.providers.anthropic?.enabled) {
        selectedModel = () => this.queryClaude(messages, options);
        modelName = 'Claude';
        reasoning = 'Analysis task - using Claude for depth and nuance';
      } else if (this.config.providers.openai?.enabled) {
        selectedModel = () => this.queryGPT(messages, options);
        modelName = 'GPT-4';
        reasoning = 'Analysis task - using GPT-4 (Claude unavailable)';
      } else {
        selectedModel = () => this.queryLocal(messages, options);
        modelName = 'Local';
        reasoning = 'Fallback to local model';
      }
    } else if (lastMessage.includes('news') || lastMessage.includes('current') || lastMessage.includes('latest')) {
      // Gemini/Grok for real-time info
      if (this.config.providers.google?.enabled) {
        selectedModel = () => this.queryGemini(messages, options);
        modelName = 'Gemini';
        reasoning = 'Real-time info - using Gemini for up-to-date knowledge';
      } else if (this.config.providers.xai?.enabled) {
        selectedModel = () => this.queryGrok(messages, options);
        modelName = 'Grok';
        reasoning = 'Real-time info - using Grok for current data';
      } else if (this.config.providers.openai?.enabled) {
        selectedModel = () => this.queryGPT(messages, options);
        modelName = 'GPT-4';
        reasoning = 'Real-time info - using GPT-4 (Gemini/Grok unavailable)';
      } else {
        selectedModel = () => this.queryLocal(messages, options);
        modelName = 'Local';
        reasoning = 'Real-time info - using local model';
      }
    } else {
      // Default to best available
      if (this.config.providers.openai?.enabled) {
        selectedModel = () => this.queryGPT(messages, options);
        modelName = 'GPT-4';
        reasoning = 'General task - using GPT-4';
      } else if (this.config.providers.anthropic?.enabled) {
        selectedModel = () => this.queryClaude(messages, options);
        modelName = 'Claude';
        reasoning = 'General task - using Claude';
      } else if (this.config.providers.google?.enabled) {
        selectedModel = () => this.queryGemini(messages, options);
        modelName = 'Gemini';
        reasoning = 'General task - using Gemini';
      } else {
        selectedModel = () => this.queryLocal(messages, options);
        modelName = 'Local';
        reasoning = 'Using local model';
      }
    }

    const response = await selectedModel();

    return {
      finalResponse: response.response,
      modelResponses: [response],
      strategy: 'specialized',
      confidence: response.confidence,
      reasoning,
    };
  } catch (error) {
    console.warn('[Multi-Model] Specialized routing failed, using cascade:', error instanceof Error ? error.message : String(error));
    return this.cascadeInference(messages, options);
  }
}

  private getOpenAIChatUrl(): string {
    const base =
      process.env.AI_INTEGRATIONS_OPENAI_BASE_URL?.trim() ||
      process.env.OPENAI_BASE_URL?.trim() ||
      "https://api.openai.com/v1";
    return `${base.replace(/\/$/, "")}/chat/completions`;
  }

  /**
   * Query GPT-4 (OpenAI)
   */
  private async queryGPT(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    if (!this.config.providers.openai) {
      throw new Error('OpenAI not configured');
    }

    const response = await fetch(this.getOpenAIChatUrl(), {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.providers.openai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.providers.openai.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const latency = Date.now() - startTime;

    return {
      model: 'GPT-4',
      response: data.choices[0].message.content,
      confidence: 0.9,
      latency,
    };
  }

  /**
   * Query Claude (Anthropic)
   */
  private async queryClaude(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    if (!this.config.providers.anthropic) {
      throw new Error('Anthropic not configured');
    }

    // Separate system message
    const systemMessage = messages.find(m => m.role === 'system')?.content || '';
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.config.providers.anthropic.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.providers.anthropic.model,
        system: systemMessage,
        messages: userMessages,
        max_tokens: options.maxTokens ?? 4000,
        temperature: options.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const latency = Date.now() - startTime;

    return {
      model: 'Claude',
      response: data.content[0].text,
      confidence: 0.92,
      latency,
    };
  }

  /**
   * Query Gemini (Google)
   */
  private async queryGemini(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    if (!this.config.providers.google) {
      throw new Error('Google AI not configured');
    }

    // Convert messages to Gemini format (preserve system instruction)
    const systemMessage = messages.find((m) => m.role === "system")?.content || "";
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        maxOutputTokens: options.maxTokens ?? 4000,
      },
    };
    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage }] };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.config.providers.google.model}:generateContent?key=${this.config.providers.google.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      throw new Error(`Google AI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const latency = Date.now() - startTime;

    return {
      model: 'Gemini',
      response: data.candidates[0].content.parts[0].text,
      confidence: 0.88,
      latency,
    };
  }

  /**
   * Query Grok (xAI)
   */
  private async queryGrok(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    if (!this.config.providers.xai) {
      throw new Error('xAI not configured');
    }

    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.providers.xai.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.config.providers.xai.model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json() as any;
    const latency = Date.now() - startTime;

    return {
      model: 'Grok',
      response: data.choices[0].message.content,
      confidence: 0.87,
      latency,
    };
  }

  /**
   * Query local model
   */
  private async queryLocal(
    messages: Array<{ role: string; content: string }>,
    options: any
  ): Promise<ModelResponse> {
    const startTime = Date.now();
    
    const response = await enhancedLocalLLM.chat(messages as any, options);
    const latency = Date.now() - startTime;

    return {
      model: response.model,
      response: response.response,
      confidence: response.confidence,
      latency,
    };
  }

  /**
   * Synthesize multiple responses into one superior answer
   */
  private async synthesizeResponses(
    responses: ModelResponse[],
    originalMessages: Array<{ role: string; content: string }>
  ): Promise<string> {
    // Use the best available model to synthesize
    const synthesisPrompt = `You are synthesizing responses from multiple AI models to create the best possible answer.

Original question: ${originalMessages[originalMessages.length - 1].content}

Responses from different models:
${responses.map((r, i) => `\n${i + 1}. ${r.model} (confidence: ${r.confidence}):\n${r.response}`).join('\n\n')}

Synthesize these into one superior answer that:
1. Combines the best insights from each model
2. Resolves any contradictions
3. Provides the most accurate and comprehensive response
4. Maintains clarity and coherence

Synthesized response:`;

    try {
      if (this.config.providers.openai?.enabled) {
        const result = await this.queryGPT([
          { role: 'system', content: 'You are a synthesis expert combining AI model outputs.' },
          { role: 'user', content: synthesisPrompt }
        ], { temperature: 0.5 });
        return result.response;
      }
      
      // Fallback: return highest confidence response
      const best = responses.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      return best.response;
    } catch {
      // Final fallback
      return responses[0].response;
    }
  }

  /**
   * Get system status
   */
  getStatus() {
    const enabledProviders = Object.entries(this.config.providers)
      .filter(([_, config]) => config?.enabled)
      .map(([name]) => name);

    return {
      strategy: this.config.strategy,
      providers: enabledProviders,
      operational: enabledProviders.length > 0,
      capabilities: {
        parallelProcessing: enabledProviders.length > 1,
        specializedRouting: true,
        modelSynthesis: this.config.providers.openai?.enabled || enabledProviders.length > 1,
        fallbackCascade: enabledProviders.length > 0,
        resilientUnifiedInfer: true,
      },
    };
  }
}

// Export singleton instance
export const multiModelIntelligence = new MultiModelIntelligence();
export default multiModelIntelligence;
