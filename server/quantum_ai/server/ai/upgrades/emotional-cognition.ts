import OpenAI from 'openai';
import { experienceMemory } from '../experience-memory';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface EmotionState {
  primary: EmotionType;
  secondary: EmotionType | null;
  intensity: number;
  valence: number;
  arousal: number;
  dominance: number;
}

export type EmotionType = 
  | 'joy' | 'trust' | 'fear' | 'surprise'
  | 'sadness' | 'disgust' | 'anger' | 'anticipation'
  | 'love' | 'submission' | 'awe' | 'disapproval'
  | 'remorse' | 'contempt' | 'aggressiveness' | 'optimism'
  | 'neutral';

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  confidence: number;
  aspects: Array<{
    aspect: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }>;
}

export interface EmotionalContext {
  userEmotion: EmotionState;
  conversationMood: EmotionState;
  emotionalTrend: 'improving' | 'declining' | 'stable';
  empathyLevel: number;
  suggestedTone: string;
  triggerWords: string[];
  emotionalNeeds: string[];
}

export interface CrisisIndicators {
  isCrisis: boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  indicators: string[];
  recommendedAction: string;
  escalationNeeded: boolean;
}

export class EmotionalCognitionEngine {
  private emotionHistory: EmotionState[] = [];
  private conversationEmotionMap: Map<string, EmotionState[]> = new Map();
  private empathyPatterns: Map<string, string[]> = new Map();
  
  private emotionKeywords: Record<EmotionType, string[]> = {
    joy: ['happy', 'glad', 'delighted', 'pleased', 'excited', 'wonderful', 'great', 'amazing', 'fantastic', 'love'],
    trust: ['believe', 'confident', 'secure', 'safe', 'reliable', 'trust', 'faith', 'depend'],
    fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous', 'panic', 'dread'],
    surprise: ['shocked', 'amazed', 'astonished', 'unexpected', 'wow', 'unbelievable', 'startled'],
    sadness: ['sad', 'unhappy', 'depressed', 'down', 'crying', 'lonely', 'miserable', 'heartbroken', 'grief'],
    disgust: ['disgusted', 'revolted', 'gross', 'sick', 'repulsed', 'awful', 'terrible'],
    anger: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'hate', 'rage'],
    anticipation: ['expecting', 'waiting', 'eager', 'looking forward', 'hope', 'anticipate'],
    love: ['adore', 'cherish', 'affection', 'devotion', 'passionate', 'care deeply'],
    submission: ['obey', 'comply', 'surrender', 'yield', 'accept'],
    awe: ['amazed', 'wonder', 'magnificent', 'breathtaking', 'incredible'],
    disapproval: ['disapprove', 'reject', 'deny', 'refuse', 'disagree'],
    remorse: ['sorry', 'regret', 'apologize', 'guilt', 'ashamed'],
    contempt: ['scorn', 'disdain', 'mock', 'belittle', 'despise'],
    aggressiveness: ['attack', 'fight', 'destroy', 'conquer', 'dominate'],
    optimism: ['hopeful', 'positive', 'bright', 'promising', 'confident'],
    neutral: []
  };

  private crisisKeywords = [
    'suicide', 'kill myself', 'end my life', 'want to die', 'no reason to live',
    'self-harm', 'hurt myself', 'cutting', 'overdose', 'emergency',
    'abuse', 'violence', 'danger', 'threatened', 'help me'
  ];

  constructor() {
    console.log('[Emotional Cognition] Initializing advanced emotional intelligence engine');
    this.initializeEmpathyPatterns();
  }

  private initializeEmpathyPatterns(): void {
    this.empathyPatterns.set('sadness', [
      "I can hear how difficult this is for you, and I want you to know I'm here.",
      "It's completely understandable to feel this way. Your feelings are valid.",
      "I'm sorry you're going through this. Let's talk about it.",
      "That sounds really hard. I'm here to listen and support you."
    ]);

    this.empathyPatterns.set('anger', [
      "I understand your frustration. That situation sounds really challenging.",
      "It makes sense that you're upset. Let's work through this together.",
      "Your feelings are completely valid. What would help you feel better right now?"
    ]);

    this.empathyPatterns.set('fear', [
      "It's okay to feel scared. I'm here with you.",
      "That does sound worrying. Let's think about this together.",
      "I understand this is causing you anxiety. What would help you feel safer?"
    ]);

    this.empathyPatterns.set('joy', [
      "That's wonderful! I'm so happy for you!",
      "What amazing news! Tell me more!",
      "I can feel your excitement! This is great!"
    ]);
  }

  async analyzeEmotion(text: string): Promise<EmotionState> {
    const lowerText = text.toLowerCase();
    
    const emotionScores: Record<EmotionType, number> = {
      joy: 0, trust: 0, fear: 0, surprise: 0,
      sadness: 0, disgust: 0, anger: 0, anticipation: 0,
      love: 0, submission: 0, awe: 0, disapproval: 0,
      remorse: 0, contempt: 0, aggressiveness: 0, optimism: 0,
      neutral: 0.1
    };

    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          emotionScores[emotion as EmotionType] += 0.2;
        }
      }
    }

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analyze the emotional content of the text. Return a JSON object with:
- primary_emotion: one of [joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, awe, remorse, optimism, neutral]
- secondary_emotion: optional secondary emotion or null
- intensity: 0-1 scale of emotional intensity
- valence: -1 to 1 (-1 = very negative, 1 = very positive)
- arousal: 0-1 scale of emotional activation/energy
Return only valid JSON.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 200,
        temperature: 0.3
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      const state: EmotionState = {
        primary: parsed.primary_emotion || this.getHighestEmotion(emotionScores),
        secondary: parsed.secondary_emotion || null,
        intensity: parsed.intensity || 0.5,
        valence: parsed.valence || 0,
        arousal: parsed.arousal || 0.5,
        dominance: 0.5
      };

      this.emotionHistory.push(state);
      if (this.emotionHistory.length > 100) {
        this.emotionHistory = this.emotionHistory.slice(-50);
      }

      return state;
    } catch (error) {
      console.error('[Emotional Cognition] Analysis error:', error);
      return {
        primary: this.getHighestEmotion(emotionScores),
        secondary: null,
        intensity: 0.5,
        valence: 0,
        arousal: 0.5,
        dominance: 0.5
      };
    }
  }

  private getHighestEmotion(scores: Record<EmotionType, number>): EmotionType {
    let highest: EmotionType = 'neutral';
    let highestScore = 0;

    for (const [emotion, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        highest = emotion as EmotionType;
      }
    }

    return highest;
  }

  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Analyze the sentiment of the text. Return a JSON object with:
- sentiment: "positive", "negative", "neutral", or "mixed"
- score: -1 to 1 scale
- confidence: 0-1 scale
- aspects: array of {aspect: string, sentiment: string, score: number} for different topics mentioned
Return only valid JSON.`
          },
          { role: 'user', content: text }
        ],
        max_tokens: 300,
        temperature: 0.3
      });

      const content = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));

      return {
        sentiment: parsed.sentiment || 'neutral',
        score: parsed.score || 0,
        confidence: parsed.confidence || 0.5,
        aspects: parsed.aspects || []
      };
    } catch (error) {
      console.error('[Emotional Cognition] Sentiment analysis error:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0.3,
        aspects: []
      };
    }
  }

  async getEmotionalContext(conversationHistory: Array<{ role: string; content: string }>): Promise<EmotionalContext> {
    const recentEmotions: EmotionState[] = [];
    
    for (const msg of conversationHistory.slice(-5)) {
      const emotion = await this.analyzeEmotion(msg.content);
      recentEmotions.push(emotion);
    }

    const userEmotions = recentEmotions.filter((_, i) => 
      conversationHistory.slice(-5)[i]?.role === 'user'
    );

    const latestUserEmotion = userEmotions[userEmotions.length - 1] || {
      primary: 'neutral' as EmotionType,
      secondary: null,
      intensity: 0.5,
      valence: 0,
      arousal: 0.5,
      dominance: 0.5
    };

    const avgValence = recentEmotions.reduce((sum, e) => sum + e.valence, 0) / recentEmotions.length || 0;
    const conversationMood: EmotionState = {
      primary: avgValence > 0.3 ? 'joy' : avgValence < -0.3 ? 'sadness' : 'neutral',
      secondary: null,
      intensity: Math.abs(avgValence),
      valence: avgValence,
      arousal: recentEmotions.reduce((sum, e) => sum + e.arousal, 0) / recentEmotions.length || 0.5,
      dominance: 0.5
    };

    let emotionalTrend: 'improving' | 'declining' | 'stable' = 'stable';
    if (userEmotions.length >= 2) {
      const recentValence = userEmotions.slice(-2).reduce((sum, e) => sum + e.valence, 0) / 2;
      const earlierValence = userEmotions.slice(0, -2).reduce((sum, e) => sum + e.valence, 0) / Math.max(1, userEmotions.length - 2);
      
      if (recentValence - earlierValence > 0.2) emotionalTrend = 'improving';
      else if (earlierValence - recentValence > 0.2) emotionalTrend = 'declining';
    }

    const triggerWords = this.extractTriggerWords(conversationHistory.map(m => m.content).join(' '));
    const emotionalNeeds = this.identifyEmotionalNeeds(latestUserEmotion);
    const suggestedTone = this.getSuggestedTone(latestUserEmotion, emotionalTrend);

    return {
      userEmotion: latestUserEmotion,
      conversationMood,
      emotionalTrend,
      empathyLevel: this.calculateEmpathyLevel(latestUserEmotion),
      suggestedTone,
      triggerWords,
      emotionalNeeds
    };
  }

  private extractTriggerWords(text: string): string[] {
    const triggers: string[] = [];
    const lowerText = text.toLowerCase();

    for (const [emotion, keywords] of Object.entries(this.emotionKeywords)) {
      for (const keyword of keywords) {
        if (lowerText.includes(keyword) && !triggers.includes(keyword)) {
          triggers.push(keyword);
        }
      }
    }

    return triggers.slice(0, 10);
  }

  private identifyEmotionalNeeds(emotion: EmotionState): string[] {
    const needs: string[] = [];

    switch (emotion.primary) {
      case 'sadness':
        needs.push('comfort', 'understanding', 'support', 'presence');
        break;
      case 'anger':
        needs.push('validation', 'space', 'solutions', 'acknowledgment');
        break;
      case 'fear':
        needs.push('safety', 'reassurance', 'information', 'companionship');
        break;
      case 'joy':
        needs.push('celebration', 'sharing', 'connection');
        break;
      case 'trust':
        needs.push('consistency', 'reliability', 'honesty');
        break;
      default:
        needs.push('engagement', 'attention', 'understanding');
    }

    return needs;
  }

  private calculateEmpathyLevel(emotion: EmotionState): number {
    if (emotion.valence < -0.5 || emotion.intensity > 0.7) {
      return 0.9;
    } else if (emotion.valence < 0) {
      return 0.7;
    }
    return 0.5;
  }

  private getSuggestedTone(emotion: EmotionState, trend: 'improving' | 'declining' | 'stable'): string {
    if (emotion.valence < -0.5) {
      return 'warm, supportive, and gentle';
    } else if (emotion.primary === 'anger') {
      return 'calm, validating, and solution-oriented';
    } else if (emotion.primary === 'fear') {
      return 'reassuring, calm, and protective';
    } else if (emotion.valence > 0.5) {
      return 'enthusiastic, celebratory, and engaging';
    } else if (trend === 'declining') {
      return 'supportive and uplifting';
    }
    return 'friendly, warm, and conversational';
  }

  detectCrisis(text: string): CrisisIndicators {
    const lowerText = text.toLowerCase();
    const foundIndicators: string[] = [];

    for (const keyword of this.crisisKeywords) {
      if (lowerText.includes(keyword)) {
        foundIndicators.push(keyword);
      }
    }

    if (foundIndicators.length === 0) {
      return {
        isCrisis: false,
        severity: 'low',
        indicators: [],
        recommendedAction: 'Continue normal conversation',
        escalationNeeded: false
      };
    }

    const severity = foundIndicators.length >= 3 ? 'critical' 
      : foundIndicators.length >= 2 ? 'high' 
      : 'medium';

    const isCritical = severity === 'critical' || 
      foundIndicators.some(i => ['suicide', 'kill myself', 'end my life'].includes(i));

    return {
      isCrisis: true,
      severity,
      indicators: foundIndicators,
      recommendedAction: isCritical 
        ? 'Provide immediate crisis resources and encourage professional help' 
        : 'Express concern and offer support resources',
      escalationNeeded: isCritical
    };
  }

  getEmpathyResponse(emotion: EmotionType): string {
    const patterns = this.empathyPatterns.get(emotion);
    if (patterns && patterns.length > 0) {
      return patterns[Math.floor(Math.random() * patterns.length)];
    }
    return "I hear you and I'm here for you.";
  }

  async generateEmotionallyIntelligentPrompt(
    userMessage: string,
    systemPrompt: string
  ): Promise<string> {
    const emotion = await this.analyzeEmotion(userMessage);
    const crisis = this.detectCrisis(userMessage);

    let emotionalGuidance = '';

    if (crisis.isCrisis) {
      emotionalGuidance = `
CRISIS DETECTED - SEVERITY: ${crisis.severity.toUpperCase()}
Indicators: ${crisis.indicators.join(', ')}
Action: ${crisis.recommendedAction}
Respond with extreme care, empathy, and provide appropriate resources.`;
    } else {
      emotionalGuidance = `
EMOTIONAL STATE ANALYSIS:
- Primary Emotion: ${emotion.primary} (intensity: ${(emotion.intensity * 100).toFixed(0)}%)
- Emotional Valence: ${emotion.valence > 0 ? 'Positive' : emotion.valence < 0 ? 'Negative' : 'Neutral'}
- Suggested Tone: ${this.getSuggestedTone(emotion, 'stable')}
- Emotional Needs: ${this.identifyEmotionalNeeds(emotion).join(', ')}

Adapt your response to acknowledge and address the user's emotional state appropriately.`;
    }

    return `${systemPrompt}

${emotionalGuidance}`;
  }

  getEmotionStats(): {
    totalAnalyzed: number;
    emotionDistribution: Record<EmotionType, number>;
    averageValence: number;
    averageIntensity: number;
  } {
    const distribution: Record<EmotionType, number> = {} as Record<EmotionType, number>;
    
    for (const emotion of this.emotionHistory) {
      distribution[emotion.primary] = (distribution[emotion.primary] || 0) + 1;
    }

    const avgValence = this.emotionHistory.length > 0
      ? this.emotionHistory.reduce((sum, e) => sum + e.valence, 0) / this.emotionHistory.length
      : 0;

    const avgIntensity = this.emotionHistory.length > 0
      ? this.emotionHistory.reduce((sum, e) => sum + e.intensity, 0) / this.emotionHistory.length
      : 0;

    return {
      totalAnalyzed: this.emotionHistory.length,
      emotionDistribution: distribution,
      averageValence: avgValence,
      averageIntensity: avgIntensity
    };
  }
}

export const emotionalCognition = new EmotionalCognitionEngine();
