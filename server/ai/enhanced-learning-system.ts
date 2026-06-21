/**
 * CYRUS ENHANCED LEARNING & INTERACTION SYSTEM
 * 
 * Enables Cyrus to:
 * - Learn from every interaction
 * - Provide personalized advice
 * - Adapt communication style to users
 * - Build and maintain user profiles
 * - Improve responses over time
 * - Share knowledge across domains
 */

import fs from 'fs/promises';
import path from 'path';
import { enhancedLocalLLM } from './enhanced-local-llm.js';
import { multiModelIntelligence } from './multi-model-intelligence.js';

export interface UserProfile {
  userId: string;
  preferences: {
    communicationStyle: 'formal' | 'casual' | 'technical' | 'friendly';
    expertiseLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    primaryLanguage: string;
    interests: string[];
    learningGoals: string[];
  };
  interactionHistory: {
    totalInteractions: number;
    topicsDiscussed: Map<string, number>;
    feedbackReceived: Array<{
      timestamp: Date;
      feedback: 'positive' | 'negative' | 'neutral';
      context: string;
    }>;
    learningProgress: Map<string, number>; // topic -> progress percentage
  };
  adaptations: {
    preferredModels: string[];
    responseLength: 'brief' | 'moderate' | 'detailed';
    technicality: 'simple' | 'moderate' | 'advanced';
  };
  createdAt: Date;
  lastInteraction: Date;
}

export interface LearningContext {
  topic: string;
  userQuery: string;
  previousInteractions: string[];
  userProfile: UserProfile;
  objective: 'learn' | 'solve' | 'explore' | 'create';
}

export interface PersonalizedResponse {
  response: string;
  confidence: number;
  adaptations: string[];
  learningOpportunities: string[];
  followUpSuggestions: string[];
  resources: Array<{ type: string; description: string; url?: string }>;
}

class EnhancedLearningSystem {
  private profilesDir: string;
  private profiles: Map<string, UserProfile>;
  private knowledgeBase: Map<string, any>;
  private interactionLog: Array<{ userId: string; timestamp: Date; interaction: any }>;

  constructor() {
    this.profilesDir = path.join(process.cwd(), '.cyrus-learning');
    this.profiles = new Map();
    this.knowledgeBase = new Map();
    this.interactionLog = [];
    
    this.initLearningSystem();
  }

  private async initLearningSystem() {
    try {
      await fs.mkdir(this.profilesDir, { recursive: true });
      await this.loadUserProfiles();
      console.log('[Learning System] Initialized');
    } catch (error) {
      console.error('[Learning System] Init failed:', error);
    }
  }

  /**
   * Load existing user profiles
   */
  private async loadUserProfiles() {
    try {
      const files = await fs.readdir(this.profilesDir);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const profilePath = path.join(this.profilesDir, file);
          const profileData = await fs.readFile(profilePath, 'utf-8');
          const profile = JSON.parse(profileData);
          
          // Convert serialized Maps back
          profile.interactionHistory.topicsDiscussed = new Map(Object.entries(profile.interactionHistory.topicsDiscussed || {}));
          profile.interactionHistory.learningProgress = new Map(Object.entries(profile.interactionHistory.learningProgress || {}));
          
          this.profiles.set(profile.userId, profile);
        }
      }
      
      console.log(`[Learning System] Loaded ${this.profiles.size} user profiles`);
    } catch (error) {
      console.warn('[Learning System] No existing profiles found');
    }
  }

  /**
   * Save user profile
   */
  private async saveUserProfile(userId: string) {
    const profile = this.profiles.get(userId);
    if (!profile) return;

    try {
      // Convert Maps to objects for JSON serialization
      const serializable = {
        ...profile,
        interactionHistory: {
          ...profile.interactionHistory,
          topicsDiscussed: Object.fromEntries(profile.interactionHistory.topicsDiscussed),
          learningProgress: Object.fromEntries(profile.interactionHistory.learningProgress),
        },
      };

      const profilePath = path.join(this.profilesDir, `${userId}.json`);
      await fs.writeFile(profilePath, JSON.stringify(serializable, null, 2));
    } catch (error) {
      console.error('[Learning System] Failed to save profile:', error);
    }
  }

  /**
   * Get or create user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile> {
    if (this.profiles.has(userId)) {
      return this.profiles.get(userId)!;
    }

    // Create new profile
    const newProfile: UserProfile = {
      userId,
      preferences: {
        communicationStyle: 'friendly',
        expertiseLevel: 'intermediate',
        primaryLanguage: 'en',
        interests: [],
        learningGoals: [],
      },
      interactionHistory: {
        totalInteractions: 0,
        topicsDiscussed: new Map(),
        feedbackReceived: [],
        learningProgress: new Map(),
      },
      adaptations: {
        preferredModels: [],
        responseLength: 'moderate',
        technicality: 'moderate',
      },
      createdAt: new Date(),
      lastInteraction: new Date(),
    };

    this.profiles.set(userId, newProfile);
    await this.saveUserProfile(userId);
    
    return newProfile;
  }

  /**
   * Generate personalized response with learning context
   */
  async generatePersonalizedResponse(
    userId: string,
    query: string,
    context?: LearningContext
  ): Promise<PersonalizedResponse> {
    const profile = await this.getUserProfile(userId);

    // Detect topic
    const topic = context?.topic || await this.detectTopic(query);

    // Build personalized system prompt
    const systemPrompt = this.buildPersonalizedPrompt(profile, topic);

    // Get response from multi-model intelligence
    const response = await multiModelIntelligence.infer([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: query }
    ]);

    // Update interaction history
    profile.interactionHistory.totalInteractions++;
    profile.lastInteraction = new Date();
    
    const topicCount = profile.interactionHistory.topicsDiscussed.get(topic) || 0;
    profile.interactionHistory.topicsDiscussed.set(topic, topicCount + 1);

    // Identify learning opportunities
    const learningOpportunities = await this.identifyLearningOpportunities(query, topic, profile);

    // Generate follow-up suggestions
    const followUpSuggestions = await this.generateFollowUpSuggestions(query, topic);

    // Find relevant resources
    const resources = await this.findRelevantResources(topic);

    // Save updated profile
    await this.saveUserProfile(userId);

    // Log interaction for learning
    this.logInteraction(userId, query, response.finalResponse, topic);

    return {
      response: response.finalResponse,
      confidence: response.confidence,
      adaptations: [`Style: ${profile.preferences.communicationStyle}`, `Level: ${profile.preferences.expertiseLevel}`],
      learningOpportunities,
      followUpSuggestions,
      resources,
    };
  }

  /**
   * Build personalized system prompt based on user profile
   */
  private buildPersonalizedPrompt(profile: UserProfile, topic: string): string {
    const style = profile.preferences.communicationStyle;
    const level = profile.preferences.expertiseLevel;
    const interests = profile.preferences.interests.join(', ');

    let basePrompt = `You are CYRUS, an advanced AI assistant. `;

    // Adjust for communication style
    switch (style) {
      case 'formal':
        basePrompt += `Maintain a professional, formal tone. Use precise terminology and structured responses. `;
        break;
      case 'casual':
        basePrompt += `Use a friendly, conversational tone. Be approachable and engaging. `;
        break;
      case 'technical':
        basePrompt += `Focus on technical accuracy and depth. Use industry-standard terminology. `;
        break;
      case 'friendly':
        basePrompt += `Be warm, helpful, and encouraging. Make complex topics accessible. `;
        break;
    }

    // Adjust for expertise level
    switch (level) {
      case 'beginner':
        basePrompt += `Explain concepts clearly with simple examples. Avoid jargon unless necessary and explain it. `;
        break;
      case 'intermediate':
        basePrompt += `Balance detail and clarity. Assume basic knowledge but explain advanced concepts. `;
        break;
      case 'advanced':
        basePrompt += `Provide in-depth technical details. Assume strong foundational knowledge. `;
        break;
      case 'expert':
        basePrompt += `Focus on nuanced insights and cutting-edge information. Engage at an expert level. `;
        break;
    }

    // Add interests context
    if (interests) {
      basePrompt += `The user has shown interest in: ${interests}. `;
    }

    // Add topic-specific guidance
    const topicProgress = profile.interactionHistory.learningProgress.get(topic) || 0;
    if (topicProgress > 0) {
      basePrompt += `The user has ${topicProgress}% progress in ${topic}. Build on their existing knowledge. `;
    }

    // Add response length preference
    switch (profile.adaptations.responseLength) {
      case 'brief':
        basePrompt += `Keep responses concise and to-the-point. `;
        break;
      case 'moderate':
        basePrompt += `Provide balanced responses with appropriate detail. `;
        break;
      case 'detailed':
        basePrompt += `Provide comprehensive, thorough explanations. `;
        break;
    }

    return basePrompt;
  }

  /**
   * Detect topic from query
   */
  private async detectTopic(query: string): Promise<string> {
    const queryLower = query.toLowerCase();

    // Simple keyword-based topic detection
    const topics = {
      'programming': ['code', 'function', 'programming', 'software', 'bug', 'algorithm'],
      'data science': ['data', 'analysis', 'machine learning', 'ai', 'statistics'],
      'web development': ['website', 'html', 'css', 'react', 'frontend', 'backend'],
      'medical': ['health', 'medical', 'diagnosis', 'treatment', 'symptom'],
      'legal': ['law', 'legal', 'contract', 'rights', 'regulation'],
      'finance': ['money', 'investment', 'trading', 'finance', 'stock'],
      'education': ['learn', 'study', 'teach', 'education', 'course'],
      'business': ['business', 'marketing', 'strategy', 'management'],
      'technology': ['tech', 'innovation', 'technology', 'gadget'],
    };

    for (const [topic, keywords] of Object.entries(topics)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return topic;
      }
    }

    return 'general';
  }

  /**
   * Identify learning opportunities based on query and profile
   */
  private async identifyLearningOpportunities(
    query: string,
    topic: string,
    profile: UserProfile
  ): Promise<string[]> {
    const opportunities: string[] = [];

    // Check if topic is new to user
    const topicCount = profile.interactionHistory.topicsDiscussed.get(topic) || 0;
    if (topicCount === 0) {
      opportunities.push(`Explore fundamentals of ${topic}`);
    }

    // Check expertise level gaps
    if (profile.preferences.expertiseLevel === 'beginner') {
      opportunities.push('Build foundational knowledge');
      opportunities.push('Practice with simple examples');
    }

    // Suggest related topics
    const relatedTopics = this.getRelatedTopics(topic);
    if (relatedTopics.length > 0) {
      opportunities.push(`Explore related: ${relatedTopics.slice(0, 2).join(', ')}`);
    }

    return opportunities;
  }

  /**
   * Generate contextual follow-up suggestions
   */
  private async generateFollowUpSuggestions(query: string, topic: string): Promise<string[]> {
    const suggestions: string[] = [];

    // Generic follow-ups based on topic
    if (topic === 'programming') {
      suggestions.push('Would you like to see code examples?');
      suggestions.push('Should I explain the underlying concepts?');
    } else if (topic === 'data science') {
      suggestions.push('Would you like to explore the mathematical foundations?');
      suggestions.push('Should we discuss real-world applications?');
    } else {
      suggestions.push('Would you like more details?');
      suggestions.push('Should I provide examples?');
    }

    return suggestions;
  }

  /**
   * Find relevant learning resources
   */
  private async findRelevantResources(topic: string): Promise<Array<{ type: string; description: string; url?: string }>> {
    const resources: Array<{ type: string; description: string; url?: string }> = [];

    // This would integrate with actual resource databases
    // For now, provide generic guidance
    resources.push({
      type: 'documentation',
      description: `Official documentation for ${topic}`,
    });

    resources.push({
      type: 'tutorial',
      description: `Interactive tutorials for ${topic}`,
    });

    return resources;
  }

  /**
   * Get related topics
   */
  private getRelatedTopics(topic: string): string[] {
    const relationships: Record<string, string[]> = {
      'programming': ['algorithms', 'data structures', 'software design'],
      'web development': ['programming', 'databases', 'api design'],
      'data science': ['statistics', 'machine learning', 'data visualization'],
      'medical': ['anatomy', 'pharmacology', 'diagnostics'],
      'legal': ['contract law', 'intellectual property', 'compliance'],
    };

    return relationships[topic] || [];
  }

  /**
   * Update user preferences based on feedback
   */
  async updatePreferences(
    userId: string,
    updates: Partial<UserProfile['preferences']>
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    Object.assign(profile.preferences, updates);
    await this.saveUserProfile(userId);
    
    console.log(`[Learning System] Updated preferences for ${userId}`);
  }

  /**
   * Record user feedback
   */
  async recordFeedback(
    userId: string,
    feedback: 'positive' | 'negative' | 'neutral',
    context: string
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    
    profile.interactionHistory.feedbackReceived.push({
      timestamp: new Date(),
      feedback,
      context,
    });

    // Adapt based on feedback
    if (feedback === 'negative') {
      // Adjust response style
      if (profile.adaptations.responseLength === 'detailed') {
        profile.adaptations.responseLength = 'moderate';
      }
    }

    await this.saveUserProfile(userId);
  }

  /**
   * Update learning progress
   */
  async updateLearningProgress(
    userId: string,
    topic: string,
    progress: number
  ): Promise<void> {
    const profile = await this.getUserProfile(userId);
    profile.interactionHistory.learningProgress.set(topic, Math.min(100, progress));
    await this.saveUserProfile(userId);
  }

  /**
   * Log interaction for system learning
   */
  private logInteraction(userId: string, query: string, response: string, topic: string) {
    this.interactionLog.push({
      userId,
      timestamp: new Date(),
      interaction: { query, response, topic },
    });

    // Keep log size manageable
    if (this.interactionLog.length > 1000) {
      this.interactionLog.shift();
    }
  }

  /**
   * Get user statistics
   */
  getUserStats(userId: string): {
    totalInteractions: number;
    topTopics: Array<{ topic: string; count: number }>;
    learningStreak: number;
    expertiseGrowth: string[];
  } | null {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const topTopics = Array.from(profile.interactionHistory.topicsDiscussed.entries())
      .map(([topic, count]) => ({ topic, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalInteractions: profile.interactionHistory.totalInteractions,
      topTopics,
      learningStreak: 0, // Calculate based on daily interactions
      expertiseGrowth: [], // Track expertise level changes over time
    };
  }

  /**
   * Generate learning report
   */
  async generateLearningReport(userId: string): Promise<string> {
    const profile = this.profiles.get(userId);
    if (!profile) return 'No profile found';

    const stats = this.getUserStats(userId);
    if (!stats) return 'No statistics available';

    const report = `
# Learning Report for ${userId}

## Overview
- **Total Interactions**: ${stats.totalInteractions}
- **Account Age**: ${Math.floor((Date.now() - profile.createdAt.getTime()) / (1000 * 60 * 60 * 24))} days
- **Last Interaction**: ${profile.lastInteraction.toLocaleDateString()}

## Top Topics
${stats.topTopics.map((t, i) => `${i + 1}. ${t.topic}: ${t.count} interactions`).join('\n')}

## Learning Progress
${Array.from(profile.interactionHistory.learningProgress.entries())
  .map(([topic, progress]) => `- ${topic}: ${progress}%`)
  .join('\n')}

## Preferences
- **Communication Style**: ${profile.preferences.communicationStyle}
- **Expertise Level**: ${profile.preferences.expertiseLevel}
- **Interests**: ${profile.preferences.interests.join(', ') || 'None specified'}

## Recommendations
- Continue exploring your top topics to deepen expertise
- Branch out into related areas for broader knowledge
- Practice applying concepts through projects
`;

    return report.trim();
  }
}

// Export singleton instance
export const enhancedLearningSystem = new EnhancedLearningSystem();
export default enhancedLearningSystem;
