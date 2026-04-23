/**
 * Advanced Contextual Understanding System
 * Deep contextual analysis and understanding for human-like intelligence
 */

import { knowledgeSynthesisEngine, type KnowledgeNode } from './knowledge-synthesis-engine.js';
import { quantumCore, type QuantumProcessingResult } from './quantum-core.js';
import { localLLM } from './local-llm-client.js';

export interface ContextLayer {
  id: string;
  type: 'immediate' | 'short_term' | 'long_term' | 'episodic' | 'semantic';
  content: any;
  timestamp: Date;
  relevance: number;
  connections: string[]; // IDs of related contexts
  metadata: {
    source: string;
    confidence: number;
    emotional_valence?: number;
    urgency?: number;
  };
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  currentTopic: string;
  conversationHistory: ConversationTurn[];
  activeContexts: ContextLayer[];
  userProfile: UserProfile;
  emotionalState: EmotionalState;
  knowledgeContext: KnowledgeContext;
}

export interface ConversationTurn {
  id: string;
  timestamp: Date;
  userMessage: string;
  aiResponse: string;
  contextSnapshot: ContextSnapshot;
  emotionalTone: {
    user: number; // -1 to 1 (negative to positive)
    ai: number;
  };
  topics: string[];
  intents: string[];
}

export interface ContextSnapshot {
  activeContexts: string[]; // Context layer IDs
  dominantTopic: string;
  emotionalState: EmotionalState;
  knowledgeGaps: string[];
  unresolvedQuestions: string[];
}

export interface UserProfile {
  preferences: {
    communication_style: 'formal' | 'casual' | 'technical' | 'conversational';
    depth_preference: 'brief' | 'detailed' | 'comprehensive';
    humor_sensitivity: number; // 0-1
    emotional_openness: number; // 0-1
  };
  knowledge_level: {
    [domain: string]: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  };
  interaction_history: {
    total_conversations: number;
    average_session_length: number;
    common_topics: string[];
    preferred_response_length: number;
  };
  personality_traits: {
    openness: number; // 0-1
    conscientiousness: number; // 0-1
    extraversion: number; // 0-1
    agreeableness: number; // 0-1
    neuroticism: number; // 0-1
  };
}

export interface EmotionalState {
  current: {
    valence: number; // -1 to 1 (sad to happy)
    arousal: number; // 0-1 (calm to excited)
    dominance: number; // 0-1 (submissive to dominant)
  };
  trend: {
    direction: 'increasing' | 'decreasing' | 'stable';
    duration: number; // minutes
  };
  triggers: string[];
  expression: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'neutral';
}

export interface KnowledgeContext {
  active_domains: string[];
  recent_queries: string[];
  knowledge_gaps: string[];
  expertise_areas: string[];
  learning_objectives: string[];
}

class ContextManager {
  private contextLayers: Map<string, ContextLayer> = new Map();
  private conversationContexts: Map<string, ConversationContext> = new Map();
  private contextConnections: Map<string, Set<string>> = new Map();

  async createContextLayer(
    type: ContextLayer['type'],
    content: any,
    metadata: Partial<ContextLayer['metadata']> = {}
  ): Promise<string> {
    const layerId = this.generateLayerId();

    const layer: ContextLayer = {
      id: layerId,
      type,
      content,
      timestamp: new Date(),
      relevance: 1.0,
      connections: [],
      metadata: {
        source: metadata.source || 'system',
        confidence: metadata.confidence || 0.8,
        emotional_valence: metadata.emotional_valence,
        urgency: metadata.urgency
      }
    };

    this.contextLayers.set(layerId, layer);

    // Create connections to related contexts
    await this.createContextConnections(layer);

    return layerId;
  }

  private async createContextConnections(newLayer: ContextLayer): Promise<void> {
    const relatedLayers: string[] = [];

    // Convert Map to array for iteration
    const layerEntries = Array.from(this.contextLayers.entries());

    for (const [id, layer] of layerEntries) {
      if (id === newLayer.id) continue;

      const similarity = await this.calculateContextSimilarity(newLayer, layer);
      if (similarity > 0.3) {
        relatedLayers.push(id);

        // Add bidirectional connection
        if (!layer.connections.includes(newLayer.id)) {
          layer.connections.push(newLayer.id);
        }
      }
    }

    newLayer.connections = relatedLayers;
  }

  private async calculateContextSimilarity(layer1: ContextLayer, layer2: ContextLayer): Promise<number> {
    // Calculate similarity based on content, type, and metadata
    let similarity = 0;

    // Type similarity
    if (layer1.type === layer2.type) similarity += 0.3;

    // Content similarity (simplified)
    if (typeof layer1.content === 'string' && typeof layer2.content === 'string') {
      const contentSimilarity = await this.calculateTextSimilarity(layer1.content, layer2.content);
      similarity += contentSimilarity * 0.4;
    }

    // Emotional similarity
    if (layer1.metadata.emotional_valence !== undefined && layer2.metadata.emotional_valence !== undefined) {
      const emotionalDiff = Math.abs(layer1.metadata.emotional_valence - layer2.metadata.emotional_valence);
      similarity += (1 - emotionalDiff) * 0.2;
    }

    // Temporal proximity (more recent contexts are more similar)
    const timeDiff = Math.abs(layer1.timestamp.getTime() - layer2.timestamp.getTime());
    const timeSimilarity = Math.max(0, 1 - (timeDiff / (24 * 60 * 60 * 1000))); // 24 hours
    similarity += timeSimilarity * 0.1;

    return Math.min(similarity, 1.0);
  }

  private async calculateTextSimilarity(text1: string, text2: string): Promise<number> {
    // Simple word overlap similarity
    const words1 = new Set(text1.toLowerCase().split(' '));
    const words2 = new Set(text2.toLowerCase().split(' '));

    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);

    const intersection = new Set(words1Array.filter(x => words2Array.includes(x)));
    const union = new Set([...words1Array, ...words2Array]);

    return intersection.size / union.size;
  }

  private generateLayerId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async updateContextRelevance(layerId: string, newRelevance: number): Promise<void> {
    const layer = this.contextLayers.get(layerId);
    if (layer) {
      layer.relevance = Math.max(0, Math.min(1, newRelevance));

      // Decay older contexts
      const age = Date.now() - layer.timestamp.getTime();
      const ageDecay = Math.max(0.1, 1 - (age / (7 * 24 * 60 * 60 * 1000))); // 7 days
      layer.relevance *= ageDecay;
    }
  }

  getContextLayer(layerId: string): ContextLayer | undefined {
    return this.contextLayers.get(layerId);
  }

  getRelatedContexts(layerId: string, maxDepth: number = 2): ContextLayer[] {
    const visited = new Set<string>();
    const related: ContextLayer[] = [];
    const queue: { id: string; depth: number }[] = [{ id: layerId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (visited.has(id) || depth > maxDepth) continue;

      visited.add(id);
      const layer = this.contextLayers.get(id);
      if (layer && id !== layerId) {
        related.push(layer);
      }

      // Add connected contexts to queue
      if (layer) {
        for (const connectedId of layer.connections) {
          if (!visited.has(connectedId)) {
            queue.push({ id: connectedId, depth: depth + 1 });
          }
        }
      }
    }

    return related.sort((a, b) => b.relevance - a.relevance);
  }

  async pruneOldContexts(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<void> {
    const cutoff = Date.now() - maxAge;
    const toRemove: string[] = [];

    // Convert Map to array for iteration
    const layerEntries = Array.from(this.contextLayers.entries());

    for (const [id, layer] of layerEntries) {
      if (layer.timestamp.getTime() < cutoff && layer.relevance < 0.3) {
        toRemove.push(id);
      }
    }

    for (const id of toRemove) {
      this.contextLayers.delete(id);
    }
  }
}

class ConversationAnalyzer {
  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async analyzeConversationTurn(
    userMessage: string,
    previousTurns: ConversationTurn[],
    userProfile: UserProfile
  ): Promise<{
    topics: string[];
    intents: string[];
    emotionalTone: number;
    contextNeeds: string[];
    knowledgeRequirements: string[];
  }> {

    // Analyze topics
    const topics = await this.extractTopics(userMessage, previousTurns);

    // Analyze intents
    const intents = await this.extractIntents(userMessage, userProfile);

    // Analyze emotional tone
    const emotionalTone = await this.analyzeEmotionalTone(userMessage);

    // Determine context needs
    const contextNeeds = await this.determineContextNeeds(userMessage, previousTurns);

    // Determine knowledge requirements
    const knowledgeRequirements = await this.determineKnowledgeRequirements(userMessage, topics);

    return {
      topics,
      intents,
      emotionalTone,
      contextNeeds,
      knowledgeRequirements
    };
  }

  private async extractTopics(message: string, previousTurns: ConversationTurn[]): Promise<string[]> {
    // Use quantum analysis for topic extraction
    const analysis = await quantumCore.analyzeQuery(message);

    // Extract topics from current message
    const currentTopics = await this.extractTopicsFromText(message);

    // Consider conversation history for topic continuity
    const recentTopics = previousTurns.slice(-3).flatMap(turn => turn.topics);
    const topicFrequency = this.calculateTopicFrequency([...currentTopics, ...recentTopics]);

    // Return most relevant topics
    return Object.entries(topicFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  private async extractTopicsFromText(text: string): Promise<string[]> {
    // Simple topic extraction - could use more advanced NLP
    const topicKeywords = {
      technology: ['computer', 'software', 'ai', 'machine learning', 'programming'],
      science: ['physics', 'chemistry', 'biology', 'quantum', 'research'],
      business: ['company', 'market', 'finance', 'strategy', 'management'],
      health: ['medical', 'health', 'disease', 'treatment', 'wellness'],
      education: ['learning', 'teaching', 'school', 'university', 'knowledge'],
      entertainment: ['movie', 'music', 'game', 'book', 'art'],
      politics: ['government', 'policy', 'election', 'law', 'politics'],
      sports: ['game', 'team', 'player', 'sport', 'competition']
    };

    const lowerText = text.toLowerCase();
    const topics: string[] = [];

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword));
      if (matches.length > 0) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private calculateTopicFrequency(topics: string[]): { [topic: string]: number } {
    const frequency: { [topic: string]: number } = {};
    for (const topic of topics) {
      frequency[topic] = (frequency[topic] || 0) + 1;
    }
    return frequency;
  }

  private async extractIntents(message: string, userProfile: UserProfile): Promise<string[]> {
    const intents: string[] = [];
    const lowerMessage = message.toLowerCase();

    // Question intents
    if (lowerMessage.includes('what') || lowerMessage.includes('how') || lowerMessage.includes('why')) {
      intents.push('information_request');
    }

    // Action intents
    if (lowerMessage.includes('do') || lowerMessage.includes('make') || lowerMessage.includes('create')) {
      intents.push('action_request');
    }

    // Opinion intents
    if (lowerMessage.includes('think') || lowerMessage.includes('believe') || lowerMessage.includes('opinion')) {
      intents.push('opinion_request');
    }

    // Social intents
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('how are you')) {
      intents.push('social_greeting');
    }

    // Clarification intents
    if (lowerMessage.includes('mean') || lowerMessage.includes('explain') || lowerMessage.includes('clarify')) {
      intents.push('clarification_request');
    }

    // Learning intents
    if (lowerMessage.includes('learn') || lowerMessage.includes('teach') || lowerMessage.includes('understand')) {
      intents.push('learning_request');
    }

    return intents;
  }

  private async analyzeEmotionalTone(message: string): Promise<number> {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy', 'joy', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'sad', 'angry', 'hate', 'disappointed'];

    const lowerMessage = message.toLowerCase();
    const words = lowerMessage.split(' ');

    let positiveScore = 0;
    let negativeScore = 0;

    for (const word of words) {
      if (positiveWords.some(pw => word.includes(pw))) positiveScore++;
      if (negativeWords.some(nw => word.includes(nw))) negativeScore++;
    }

    const totalEmotionalWords = positiveScore + negativeScore;
    if (totalEmotionalWords === 0) return 0;

    return (positiveScore - negativeScore) / totalEmotionalWords;
  }

  private async determineContextNeeds(message: string, previousTurns: ConversationTurn[]): Promise<string[]> {
    const needs: string[] = [];

    // Check for pronouns that need resolution
    if (message.match(/\b(it|this|that|these|those|he|she|they|we)\b/)) {
      needs.push('pronoun_resolution');
    }

    // Check for temporal references
    if (message.match(/\b(before|after|then|now|later|recently|previously)\b/)) {
      needs.push('temporal_context');
    }

    // Check for references to previous conversation
    if (message.match(/\b(you said|you mentioned|earlier|last time)\b/)) {
      needs.push('conversation_history');
    }

    // Check for domain-specific context
    const technicalTerms = this.countTechnicalTerms(message);
    if (technicalTerms > 2) {
      needs.push('domain_expertise');
    }

    return needs;
  }

  private countTechnicalTerms(message: string): number {
    const technicalTerms = [
      'algorithm', 'quantum', 'neural', 'optimization', 'vectorization',
      'differential', 'integral', 'matrix', 'tensor', 'probability'
    ];

    const lowerMessage = message.toLowerCase();
    return technicalTerms.reduce((count, term) =>
      count + (lowerMessage.includes(term) ? 1 : 0), 0
    );
  }

  private async determineKnowledgeRequirements(message: string, topics: string[]): Promise<string[]> {
    const requirements: string[] = [];

    // Basic knowledge requirements based on topics
    for (const topic of topics) {
      requirements.push(`${topic}_knowledge`);
    }

    // Specific requirements based on message content
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('explain') || lowerMessage.includes('how does')) {
      requirements.push('explanatory_knowledge');
    }

    if (lowerMessage.includes('compare') || lowerMessage.includes('difference')) {
      requirements.push('comparative_knowledge');
    }

    if (lowerMessage.includes('example') || lowerMessage.includes('instance')) {
      requirements.push('practical_examples');
    }

    return requirements;
  }
}

class UserProfileManager {
  private profiles: Map<string, UserProfile> = new Map();

  async getOrCreateProfile(userId: string): Promise<UserProfile> {
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId)!;
    }

    // Create default profile
    const defaultProfile: UserProfile = {
      preferences: {
        communication_style: 'conversational',
        depth_preference: 'detailed',
        humor_sensitivity: 0.5,
        emotional_openness: 0.6
      },
      knowledge_level: {},
      interaction_history: {
        total_conversations: 0,
        average_session_length: 0,
        common_topics: [],
        preferred_response_length: 150
      },
      personality_traits: {
        openness: 0.7,
        conscientiousness: 0.6,
        extraversion: 0.5,
        agreeableness: 0.8,
        neuroticism: 0.3
      }
    };

    this.profiles.set(userId, defaultProfile);
    return defaultProfile;
  }

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);

    // Deep merge updates
    this.deepMerge(profile, updates);
  }

  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  async learnFromInteraction(userId: string, turn: ConversationTurn): Promise<void> {
    const profile = await this.getOrCreateProfile(userId);

    // Update interaction history
    profile.interaction_history.total_conversations += 1;

    // Update common topics
    profile.interaction_history.common_topics = [
      ...profile.interaction_history.common_topics,
      ...turn.topics
    ].slice(-20); // Keep last 20 topics

    // Update preferred response length based on user engagement
    const responseLength = turn.aiResponse.length;
    profile.interaction_history.preferred_response_length =
      (profile.interaction_history.preferred_response_length + responseLength) / 2;

    // Update personality traits based on interaction patterns
    this.updatePersonalityTraits(profile, turn);
  }

  private updatePersonalityTraits(profile: UserProfile, turn: ConversationTurn): void {
    // Simple personality inference based on interaction patterns
    const userTone = turn.emotionalTone.user;
    const responseLength = turn.aiResponse.length;

    // Extraversion: longer responses might indicate more engagement
    if (responseLength > 200) {
      profile.personality_traits.extraversion = Math.min(1, profile.personality_traits.extraversion + 0.01);
    }

    // Agreeableness: positive emotional tone
    if (userTone > 0.2) {
      profile.personality_traits.agreeableness = Math.min(1, profile.personality_traits.agreeableness + 0.01);
    }

    // Neuroticism: negative emotional tone
    if (userTone < -0.2) {
      profile.personality_traits.neuroticism = Math.min(1, profile.personality_traits.neuroticism + 0.02);
    }
  }
}

export class AdvancedContextualUnderstanding {
  private contextManager: ContextManager;
  private conversationAnalyzer: ConversationAnalyzer;
  private userProfileManager: UserProfileManager;
  private activeConversations: Map<string, ConversationContext> = new Map();

  constructor() {
    this.contextManager = new ContextManager();
    this.conversationAnalyzer = new ConversationAnalyzer(this.contextManager);
    this.userProfileManager = new UserProfileManager();
  }

  async processUserMessage(
    userId: string,
    sessionId: string,
    message: string
  ): Promise<{
    understanding: {
      topics: string[];
      intents: string[];
      emotionalTone: number;
      contextNeeds: string[];
      knowledgeRequirements: string[];
    };
    context: ConversationContext;
    recommendations: string[];
  }> {

    // Get or create conversation context
    const context = await this.getOrCreateConversationContext(userId, sessionId);

    // Analyze the message
    const understanding = await this.conversationAnalyzer.analyzeConversationTurn(
      message,
      context.conversationHistory,
      context.userProfile
    );

    // Update context with new information
    await this.updateConversationContext(context, message, understanding);

    // Generate recommendations for response
    const recommendations = await this.generateResponseRecommendations(context, understanding);

    return {
      understanding,
      context,
      recommendations
    };
  }

  private async getOrCreateConversationContext(userId: string, sessionId: string): Promise<ConversationContext> {
    const contextKey = `${userId}_${sessionId}`;

    if (this.activeConversations.has(contextKey)) {
      return this.activeConversations.get(contextKey)!;
    }

    // Create new context
    const userProfile = await this.userProfileManager.getOrCreateProfile(userId);

    const context: ConversationContext = {
      userId,
      sessionId,
      currentTopic: '',
      conversationHistory: [],
      activeContexts: [],
      userProfile,
      emotionalState: {
        current: { valence: 0, arousal: 0.5, dominance: 0.5 },
        trend: { direction: 'stable', duration: 0 },
        triggers: [],
        expression: 'neutral'
      },
      knowledgeContext: {
        active_domains: [],
        recent_queries: [],
        knowledge_gaps: [],
        expertise_areas: [],
        learning_objectives: []
      }
    };

    this.activeConversations.set(contextKey, context);
    return context;
  }

  private async updateConversationContext(
    context: ConversationContext,
    message: string,
    understanding: any
  ): Promise<void> {

    // Update current topic
    if (understanding.topics.length > 0) {
      context.currentTopic = understanding.topics[0];
    }

    // Update emotional state
    context.emotionalState.current.valence = understanding.emotionalTone;
    context.emotionalState.expression = this.mapToneToExpression(understanding.emotionalTone);

    // Update knowledge context
    context.knowledgeContext.active_domains = understanding.topics;
    context.knowledgeContext.recent_queries.push(message);
    context.knowledgeContext.recent_queries = context.knowledgeContext.recent_queries.slice(-10);

    // Create context layers for important information
    if (understanding.topics.length > 0) {
      const topicLayerId = await this.contextManager.createContextLayer(
        'short_term',
        { type: 'topic', topics: understanding.topics },
        { source: 'conversation_analysis', confidence: 0.8 }
      );
      context.activeContexts.push(await this.contextManager.getContextLayer(topicLayerId)!);
    }

    // Create emotional context layer
    const emotionalLayerId = await this.contextManager.createContextLayer(
      'immediate',
      { type: 'emotional', tone: understanding.emotionalTone },
      {
        source: 'conversation_analysis',
        confidence: 0.9,
        emotional_valence: understanding.emotionalTone
      }
    );
    context.activeContexts.push(await this.contextManager.getContextLayer(emotionalLayerId)!);

    // Limit active contexts
    context.activeContexts = context.activeContexts.slice(-10);
  }

  private mapToneToExpression(tone: number): EmotionalState['expression'] {
    if (tone > 0.5) return 'joy';
    if (tone > 0.2) return 'joy';
    if (tone < -0.5) return 'sadness';
    if (tone < -0.2) return 'sadness';
    if (Math.abs(tone) < 0.1) return 'neutral';
    return 'neutral';
  }

  private async generateResponseRecommendations(
    context: ConversationContext,
    understanding: any
  ): Promise<string[]> {

    const recommendations: string[] = [];

    // Style recommendations based on user profile
    const style = context.userProfile.preferences.communication_style;
    recommendations.push(`Use ${style} communication style`);

    // Depth recommendations
    const depth = context.userProfile.preferences.depth_preference;
    recommendations.push(`Provide ${depth} level of detail`);

    // Emotional recommendations
    if (understanding.emotionalTone < -0.3) {
      recommendations.push('Use empathetic and supportive language');
    } else if (understanding.emotionalTone > 0.3) {
      recommendations.push('Match positive emotional tone');
    }

    // Context recommendations
    if (understanding.contextNeeds.includes('pronoun_resolution')) {
      recommendations.push('Clarify pronoun references');
    }

    if (understanding.contextNeeds.includes('conversation_history')) {
      recommendations.push('Reference previous conversation points');
    }

    // Knowledge recommendations
    if (understanding.knowledgeRequirements.includes('explanatory_knowledge')) {
      recommendations.push('Provide clear explanations with examples');
    }

    if (understanding.knowledgeRequirements.includes('practical_examples')) {
      recommendations.push('Include real-world examples');
    }

    return recommendations;
  }

  async addConversationTurn(
    userId: string,
    sessionId: string,
    userMessage: string,
    aiResponse: string,
    understanding: any
  ): Promise<void> {

    const context = await this.getOrCreateConversationContext(userId, sessionId);

    const turn: ConversationTurn = {
      id: this.generateTurnId(),
      timestamp: new Date(),
      userMessage,
      aiResponse,
      contextSnapshot: {
        activeContexts: context.activeContexts.map(layer => layer.id),
        dominantTopic: context.currentTopic,
        emotionalState: context.emotionalState,
        knowledgeGaps: context.knowledgeContext.knowledge_gaps,
        unresolvedQuestions: [] // Could be populated based on analysis
      },
      emotionalTone: {
        user: understanding.emotionalTone,
        ai: await this.analyzeEmotionalTone(aiResponse)
      },
      topics: understanding.topics,
      intents: understanding.intents
    };

    context.conversationHistory.push(turn);

    // Update user profile based on interaction
    await this.userProfileManager.learnFromInteraction(userId, turn);

    // Limit conversation history
    context.conversationHistory = context.conversationHistory.slice(-50);
  }

  private async analyzeEmotionalTone(text: string): Promise<number> {
    return await this.conversationAnalyzer['analyzeEmotionalTone'](text);
  }

  private generateTurnId(): string {
    return `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public methods
  async getConversationContext(userId: string, sessionId: string): Promise<ConversationContext | undefined> {
    const contextKey = `${userId}_${sessionId}`;
    return this.activeConversations.get(contextKey);
  }

  async getUserProfile(userId: string): Promise<UserProfile> {
    return await this.userProfileManager.getOrCreateProfile(userId);
  }

  async searchRelatedContexts(query: string, userId: string, sessionId: string): Promise<ContextLayer[]> {
    const context = await this.getConversationContext(userId, sessionId);
    if (!context) return [];

    // Search through active contexts
    const relatedContexts: ContextLayer[] = [];
    for (const layer of context.activeContexts) {
      const similarity = await this.contextManager['calculateTextSimilarity'](query, JSON.stringify(layer.content));
      if (similarity > 0.2) {
        relatedContexts.push(layer);
      }
    }

    return relatedContexts.sort((a, b) => b.relevance - a.relevance);
  }

  async pruneOldData(): Promise<void> {
    await this.contextManager.pruneOldContexts();
  }
}

// Export singleton instance
export const advancedContextualUnderstanding = new AdvancedContextualUnderstanding();