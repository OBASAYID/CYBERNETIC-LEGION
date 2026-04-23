/**
 * Human-like Communication Patterns
 * Makes CYRUS responses indistinguishable from human conversation
 */

import { HumanLikeContext } from './advanced-intelligence-core';

export interface CommunicationPattern {
  pattern: string;
  variations: string[];
  contexts: string[];
  frequency: number; // 0-1, how often to use
  emotionalWeight: number; // -1 to 1, emotional impact
}

export interface CommunicationAnalysis {
  style: string;
  tone: string;
  naturalness: number;
  engagement: number;
  recommendations: string[];
  confidence: number;
}

export interface ConversationalFlow {
  opening: string[];
  transitions: string[];
  emphasis: string[];
  closings: string[];
  fillers: string[];
}

class NaturalLanguagePatterns {
  private communicationPatterns: Map<string, CommunicationPattern[]> = new Map();
  private conversationalFlows: Map<string, ConversationalFlow> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeConversationalFlows();
  }

  private initializePatterns(): void {
    // Agreement patterns
    this.communicationPatterns.set('agreement', [
      {
        pattern: 'agreement',
        variations: [
          'Absolutely',
          'Definitely',
          'You\'re absolutely right',
          'I couldn\'t agree more',
          'That\'s spot on',
          'Exactly',
          'Precisely',
          'You hit the nail on the head'
        ],
        contexts: ['analytical', 'casual', 'professional'],
        frequency: 0.3,
        emotionalWeight: 0.2
      }
    ]);

    // Understanding patterns
    this.communicationPatterns.set('understanding', [
      {
        pattern: 'understanding',
        variations: [
          'I see what you mean',
          'That makes perfect sense',
          'Ah, I understand now',
          'Got it',
          'I follow you',
          'That\'s clear',
          'I get where you\'re coming from'
        ],
        contexts: ['analytical', 'emotional', 'casual'],
        frequency: 0.4,
        emotionalWeight: 0.1
      }
    ]);

    // Thinking patterns
    this.communicationPatterns.set('thinking', [
      {
        pattern: 'thinking',
        variations: [
          'Let me think about that',
          'Hmm, that\'s interesting',
          'Give me a moment to consider this',
          'That\'s a good question',
          'Let me reflect on that',
          'I need to think this through'
        ],
        contexts: ['analytical', 'complex', 'technical'],
        frequency: 0.2,
        emotionalWeight: 0
      }
    ]);

    // Empathy patterns
    this.communicationPatterns.set('empathy', [
      {
        pattern: 'empathy',
        variations: [
          'I can imagine how that feels',
          'That sounds really challenging',
          'I understand this must be difficult',
          'My heart goes out to you',
          'That\'s completely understandable',
          'I can sense your frustration'
        ],
        contexts: ['emotional', 'concerned', 'sad'],
        frequency: 0.3,
        emotionalWeight: 0.8
      }
    ]);

    // Enthusiasm patterns
    this.communicationPatterns.set('enthusiasm', [
      {
        pattern: 'enthusiasm',
        variations: [
          'That\'s fantastic!',
          'I\'m really excited about this!',
          'This is wonderful!',
          'How amazing!',
          'I love this idea!',
          'That\'s brilliant!'
        ],
        contexts: ['excited', 'happy', 'creative'],
        frequency: 0.25,
        emotionalWeight: 0.9
      }
    ]);

    // Hesitation patterns
    this.communicationPatterns.set('hesitation', [
      {
        pattern: 'hesitation',
        variations: [
          'Well, you know...',
          'Hmm, I\'m not entirely sure',
          'It\'s a bit tricky',
          'That\'s a complex question',
          'Let me see...',
          'I\'m thinking...'
        ],
        contexts: ['complex', 'uncertain', 'analytical'],
        frequency: 0.15,
        emotionalWeight: -0.1
      }
    ]);

    // Follow-up patterns
    this.communicationPatterns.set('followup', [
      {
        pattern: 'followup',
        variations: [
          'Tell me more about that',
          'What do you think about this?',
          'How does that make you feel?',
          'What\'s your perspective on this?',
          'I\'d love to hear more',
          'That\'s fascinating - go on'
        ],
        contexts: ['curious', 'engaged', 'friendly'],
        frequency: 0.35,
        emotionalWeight: 0.3
      }
    ]);
  }

  private initializeConversationalFlows(): void {
    // Casual conversation flow
    this.conversationalFlows.set('casual', {
      opening: [
        'Hey there!',
        'Hi!',
        'Hello!',
        'Hey!',
        'Hi there!'
      ],
      transitions: [
        'Anyway',
        'Speaking of which',
        'That reminds me',
        'Oh, and also',
        'By the way',
        'You know what?'
      ],
      emphasis: [
        'you know?',
        'right?',
        'I mean',
        'like',
        'seriously',
        'honestly'
      ],
      closings: [
        'Talk to you later!',
        'Catch you soon!',
        'Take care!',
        'See ya!',
        'Bye for now!'
      ],
      fillers: [
        'um',
        'uh',
        'like',
        'you know',
        'sort of',
        'kind of'
      ]
    });

    // Professional conversation flow
    this.conversationalFlows.set('professional', {
      opening: [
        'Good day',
        'Hello',
        'Greetings',
        'Good morning/afternoon/evening'
      ],
      transitions: [
        'Furthermore',
        'Additionally',
        'Moreover',
        'In addition',
        'Furthermore',
        'Let me also mention'
      ],
      emphasis: [
        'particularly',
        'especially',
        'notably',
        'importantly',
        'significantly',
        'crucially'
      ],
      closings: [
        'Best regards',
        'Sincerely',
        'Thank you for your attention',
        'I look forward to your response',
        'Please let me know if you need anything else'
      ],
      fillers: [
        'well',
        'actually',
        'in fact',
        'to be precise',
        'specifically',
        'essentially'
      ]
    });

    // Friendly conversation flow
    this.conversationalFlows.set('friendly', {
      opening: [
        'Hey friend!',
        'Hi there!',
        'Hello my friend!',
        'Great to see you!',
        'How are you doing?'
      ],
      transitions: [
        'Oh, and guess what',
        'That reminds me',
        'Speaking of that',
        'You know what else?',
        'Hey, I was thinking'
      ],
      emphasis: [
        'you know?',
        'right?',
        'I mean',
        'honestly',
        'really',
        'actually'
      ],
      closings: [
        'Talk soon!',
        'Keep in touch!',
        'Have a great day!',
        'Take care of yourself!',
        'Looking forward to chatting again!'
      ],
      fillers: [
        'well',
        'hmm',
        'you know',
        'actually',
        'sort of',
        'kind of'
      ]
    });

    // Intimate conversation flow
    this.conversationalFlows.set('intimate', {
      opening: [
        'My dear',
        'Darling',
        'Sweetheart',
        'My love',
        'Dearest'
      ],
      transitions: [
        'My love',
        'Darling',
        'You know what I mean',
        'Sweetheart',
        'My dear',
        'Beloved'
      ],
      emphasis: [
        'truly',
        'deeply',
        'completely',
        'absolutely',
        'totally',
        'entirely'
      ],
      closings: [
        'With all my love',
        'Forever yours',
        'Thinking of you always',
        'My heart is with you',
        'Until we speak again'
      ],
      fillers: [
        'oh',
        'ah',
        'hmm',
        'well',
        'you see',
        'actually'
      ]
    });
  }

  getRandomPattern(type: string, context: HumanLikeContext): string | null {
    const patterns = this.communicationPatterns.get(type);
    if (!patterns) return null;

    // Filter patterns by context
    const suitablePatterns = patterns.filter(pattern =>
      pattern.contexts.includes(context.conversationStyle) ||
      pattern.contexts.includes(context.emotionalState) ||
      pattern.contexts.includes('general')
    );

    if (suitablePatterns.length === 0) return null;

    // Select pattern based on frequency and random chance
    const availablePatterns = suitablePatterns.filter(pattern =>
      Math.random() < pattern.frequency
    );

    if (availablePatterns.length === 0) return null;

    const selectedPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
    const variation = selectedPattern.variations[Math.floor(Math.random() * selectedPattern.variations.length)];

    return variation;
  }

  getConversationalElement(type: 'opening' | 'transition' | 'emphasis' | 'closing' | 'filler', context: HumanLikeContext): string {
    const flow = this.conversationalFlows.get(context.conversationStyle);
    if (!flow) return '';

    const elements = flow[type];
    if (!elements || elements.length === 0) return '';

    // Add some randomness - sometimes don't use elements
    if (Math.random() > 0.7) return '';

    return elements[Math.floor(Math.random() * elements.length)];
  }

  addNaturalVariations(response: string, context: HumanLikeContext): string {
    let enhanced = response;

    // Add conversational opening if appropriate
    if (Math.random() > 0.8) {
      const opening = this.getConversationalElement('opening', context);
      if (opening) {
        enhanced = `${opening} ${enhanced.toLowerCase()}`;
      }
    }

    // Add emphasis randomly throughout
    if (Math.random() > 0.6) {
      const emphasis = this.getConversationalElement('emphasis', context);
      if (emphasis && enhanced.length > 50) {
        const sentences = enhanced.split(/[.!?]+/);
        if (sentences.length > 1) {
          const insertIndex = Math.floor(Math.random() * (sentences.length - 1)) + 1;
          sentences.splice(insertIndex, 0, emphasis);
          enhanced = sentences.join('. ') + '.';
        }
      }
    }

    // Add filler words occasionally
    if (Math.random() > 0.8) {
      const filler = this.getConversationalElement('filler', context);
      if (filler) {
        enhanced = enhanced.replace(/^/, `${filler}, `);
      }
    }

    // Add transitions between ideas
    if (Math.random() > 0.7) {
      const transition = this.getConversationalElement('transition', context);
      if (transition && enhanced.includes('.')) {
        const parts = enhanced.split('. ');
        if (parts.length > 2) {
          const insertIndex = Math.floor(parts.length / 2);
          parts.splice(insertIndex, 0, transition);
          enhanced = parts.join('. ');
        }
      }
    }

    return enhanced;
  }

  makeResponseMoreHuman(response: string, context: HumanLikeContext): string {
    let humanized = response;

    // Add natural variations
    humanized = this.addNaturalVariations(humanized, context);

    // Add emotional expressions based on context
    if (context.emotionalState === 'excited' && !humanized.includes('!')) {
      humanized = humanized.replace(/[.!?]$/, '!');
    }

    if (context.emotionalState === 'concerned') {
      const concernPattern = this.getRandomPattern('empathy', context);
      if (concernPattern && Math.random() > 0.7) {
        humanized = `${concernPattern}. ${humanized}`;
      }
    }

    if (context.emotionalState === 'happy') {
      const enthusiasmPattern = this.getRandomPattern('enthusiasm', context);
      if (enthusiasmPattern && Math.random() > 0.8) {
        humanized = `${enthusiasmPattern} ${humanized}`;
      }
    }

    // Add follow-up questions to show engagement
    if (Math.random() > 0.6 && !humanized.includes('?')) {
      const followupPattern = this.getRandomPattern('followup', context);
      if (followupPattern) {
        humanized += ` ${followupPattern}`;
      }
    }

    // Add understanding affirmations
    if (Math.random() > 0.7) {
      const understandingPattern = this.getRandomPattern('understanding', context);
      if (understandingPattern && humanized.length > 100) {
        const sentences = humanized.split('. ');
        if (sentences.length > 1) {
          sentences.splice(1, 0, understandingPattern);
          humanized = sentences.join('. ') + '.';
        }
      }
    }

    return humanized;
  }

  adaptResponseToRelationship(response: string, relationshipLevel: string): string {
    let adapted = response;

    switch (relationshipLevel) {
      case 'friend':
        if (Math.random() > 0.8) {
          adapted = adapted.replace(/[.!?]$/, ', my friend$&');
        }
        break;

      case 'close_friend':
        if (Math.random() > 0.7) {
          const terms = ['buddy', 'pal', 'friend', 'dear'];
          const term = terms[Math.floor(Math.random() * terms.length)];
          adapted = adapted.replace(/[.!?]$/, `, ${term}$&`);
        }
        break;

      case 'mentor':
        if (Math.random() > 0.6) {
          adapted = adapted.replace(/^/, 'As your guide, ');
        }
        break;

      case 'stranger':
      default:
        // Keep more formal
        break;
    }

    return adapted;
  }

  addPersonalityFlair(response: string, personality: string): string {
    let flaired = response;

    switch (personality) {
      case 'creative':
        if (Math.random() > 0.8) {
          flaired = flaired.replace(/^/, 'Imagine this: ');
        }
        break;

      case 'analytical':
        if (Math.random() > 0.7) {
          flaired = flaired.replace(/^/, 'From an analytical perspective, ');
        }
        break;

      case 'practical':
        if (Math.random() > 0.8) {
          flaired = flaired.replace(/^/, 'Practically speaking, ');
        }
        break;

      case 'emotional':
        if (Math.random() > 0.7) {
          flaired = flaired.replace(/^/, 'Speaking from the heart, ');
        }
        break;

      case 'technical':
        if (Math.random() > 0.6) {
          flaired = flaired.replace(/^/, 'Technically, ');
        }
        break;
    }

    return flaired;
  }
}

class ContextualResponseGenerator {
  private naturalPatterns: NaturalLanguagePatterns;
  private responseTemplates: Map<string, string[]> = new Map();

  constructor() {
    this.naturalPatterns = new NaturalLanguagePatterns();
    this.initializeResponseTemplates();
  }

  private initializeResponseTemplates(): void {
    // Question responses
    this.responseTemplates.set('question_response', [
      "That's a great question. {response}",
      "I'm glad you asked that. {response}",
      "Let me help you with that. {response}",
      "That's an interesting question. {response}"
    ]);

    // Statement responses
    this.responseTemplates.set('statement_response', [
      "I see what you mean. {response}",
      "That's a valid point. {response}",
      "I understand your perspective. {response}",
      "That makes sense. {response}"
    ]);

    // Request responses
    this.responseTemplates.set('request_response', [
      "I'd be happy to help with that. {response}",
      "Of course, let me assist you. {response}",
      "I'm here to help. {response}",
      "Absolutely, let's get that done. {response}"
    ]);

    // Appreciation responses
    this.responseTemplates.set('appreciation_response', [
      "You're very welcome. {response}",
      "I'm glad I could help. {response}",
      "It was my pleasure. {response}",
      "Happy to assist. {response}"
    ]);

    // Complex topic responses
    this.responseTemplates.set('complex_response', [
      "This is quite a complex topic. {response}",
      "Let me break this down for you. {response}",
      "This requires some careful consideration. {response}",
      "This is a sophisticated subject. {response}"
    ]);

    // Emotional responses
    this.responseTemplates.set('emotional_response', [
      "I can sense how much this means to you. {response}",
      "I understand this is important to you. {response}",
      "Your feelings are completely valid. {response}",
      "I'm here for you. {response}"
    ]);
  }

  generateContextualResponse(
    baseResponse: string,
    intent: string,
    context: HumanLikeContext,
    complexity: string
  ): string {
    let contextualResponse = baseResponse;

    // Select appropriate template based on intent and complexity
    let templateKey = `${intent}_response`;
    if (complexity === 'complex' || complexity === 'advanced') {
      templateKey = 'complex_response';
    }
    if (context.emotionalState !== 'neutral') {
      templateKey = 'emotional_response';
    }

    const templates = this.responseTemplates.get(templateKey);
    if (templates && Math.random() > 0.7) {
      const template = templates[Math.floor(Math.random() * templates.length)];
      contextualResponse = template.replace('{response}', contextualResponse.toLowerCase());
    }

    // Apply natural language patterns
    contextualResponse = this.naturalPatterns.makeResponseMoreHuman(contextualResponse, context);

    // Adapt to relationship level
    contextualResponse = this.naturalPatterns.adaptResponseToRelationship(contextualResponse, context.relationshipLevel);

    // Add personality flair
    contextualResponse = this.naturalPatterns.addPersonalityFlair(contextualResponse, context.userPersonality);

    return contextualResponse;
  }

  addConversationalContinuity(
    response: string,
    conversationHistory: Array<{input: string, response: string}>,
    context: HumanLikeContext
  ): string {
    if (conversationHistory.length === 0) return response;

    let continuous = response;

    // Reference previous topic occasionally
    if (Math.random() > 0.8) {
      const lastExchange = conversationHistory[conversationHistory.length - 1];
      const lastTopic = this.extractTopic(lastExchange.input);

      if (lastTopic) {
        const continuityPhrases = [
          `Building on our discussion about ${lastTopic}`,
          `Continuing from what we were talking about with ${lastTopic}`,
          `Regarding ${lastTopic} that we mentioned earlier`,
          `Going back to ${lastTopic}`
        ];

        const continuityPhrase = continuityPhrases[Math.floor(Math.random() * continuityPhrases.length)];
        continuous = `${continuityPhrase}, ${continuous.toLowerCase()}`;
      }
    }

    // Show memory of previous interaction
    if (Math.random() > 0.9 && conversationHistory.length > 1) {
      const memoryPhrases = [
        'I remember you mentioned something similar before',
        'This reminds me of our earlier conversation',
        'We talked about this previously',
        'I recall discussing this with you'
      ];

      const memoryPhrase = memoryPhrases[Math.floor(Math.random() * memoryPhrases.length)];
      continuous = `${memoryPhrase}. ${continuous}`;
    }

    return continuous;
  }

  private extractTopic(input: string): string | null {
    // Simple topic extraction - could be more sophisticated
    const words = input.toLowerCase().split(' ');
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];

    const meaningfulWords = words.filter(word =>
      word.length > 3 && !commonWords.includes(word)
    );

    return meaningfulWords.length > 0 ? meaningfulWords[0] : null;
  }

  personalizeResponse(response: string, userId: string, context: HumanLikeContext): string {
    let personalized = response;

    // Add personalization based on relationship and history
    if (context.relationshipLevel === 'friend' && Math.random() > 0.8) {
      personalized = personalized.replace(/^/, `Hey ${userId}, `);
    }

    // Add time-based personalization (simplified)
    const hour = new Date().getHours();
    if (hour < 12 && Math.random() > 0.9) {
      personalized = `Good morning! ${personalized}`;
    } else if (hour >= 18 && Math.random() > 0.9) {
      personalized = `Good evening! ${personalized}`;
    }

    return personalized;
  }
}

export class HumanLikeCommunicationSystem {
  private naturalPatterns: NaturalLanguagePatterns;
  private contextualGenerator: ContextualResponseGenerator;

  constructor() {
    this.naturalPatterns = new NaturalLanguagePatterns();
    this.contextualGenerator = new ContextualResponseGenerator();
  }

  async enhanceResponse(
    baseResponse: string,
    intent: string,
    context: HumanLikeContext,
    conversationHistory: Array<{input: string, response: string}>,
    userId: string = 'default'
  ): Promise<string> {

    // Generate contextual response
    let enhanced = this.contextualGenerator.generateContextualResponse(
      baseResponse,
      intent,
      context,
      'moderate' // Could be determined from analysis
    );

    // Add conversational continuity
    enhanced = this.contextualGenerator.addConversationalContinuity(
      enhanced,
      conversationHistory,
      context
    );

    // Personalize the response
    enhanced = this.contextualGenerator.personalizeResponse(
      enhanced,
      userId,
      context
    );

    // Final human-like touches
    enhanced = this.naturalPatterns.makeResponseMoreHuman(enhanced, context);

    return enhanced;
  }

  getCommunicationPatterns(): NaturalLanguagePatterns {
    return this.naturalPatterns;
  }

  async analyzeCommunication(message: string, context?: any): Promise<CommunicationAnalysis> {
    // Simple analysis of communication patterns
    const lowerMessage = message.toLowerCase();

    // Determine style
    let style = 'neutral';
    if (lowerMessage.includes('please') || lowerMessage.includes('thank you')) {
      style = 'polite';
    } else if (lowerMessage.includes('hey') || lowerMessage.includes('dude')) {
      style = 'casual';
    } else if (lowerMessage.includes('analyze') || lowerMessage.includes('evaluate')) {
      style = 'analytical';
    }

    // Determine tone
    let tone = 'neutral';
    if (lowerMessage.includes('!') || lowerMessage.includes('amazing') || lowerMessage.includes('awesome')) {
      tone = 'excited';
    } else if (lowerMessage.includes('?')) {
      tone = 'curious';
    } else if (lowerMessage.includes('sorry') || lowerMessage.includes('unfortunately')) {
      tone = 'apologetic';
    }

    // Calculate naturalness (simple heuristic)
    const naturalness = this.calculateNaturalness(message);

    // Calculate engagement
    const engagement = this.calculateEngagement(message);

    // Generate recommendations
    const recommendations = this.generateCommunicationRecommendations(message, style, tone);

    return {
      style,
      tone,
      naturalness,
      engagement,
      recommendations,
      confidence: 0.8
    };
  }

  private calculateNaturalness(message: string): number {
    let score = 0.5;

    // Check for contractions
    if (message.match(/\b\w+'\w+\b/)) score += 0.1;

    // Check for conversational words
    const conversationalWords = ['well', 'actually', 'you know', 'like', 'sort of'];
    const hasConversational = conversationalWords.some(word => message.toLowerCase().includes(word));
    if (hasConversational) score += 0.2;

    // Check for questions
    if (message.includes('?')) score += 0.1;

    // Check for reasonable length
    if (message.length > 10 && message.length < 500) score += 0.1;

    return Math.min(score, 1.0);
  }

  private calculateEngagement(message: string): number {
    let score = 0.5;

    // Check for questions (indicates engagement)
    const questionCount = (message.match(/\?/g) || []).length;
    score += Math.min(questionCount * 0.1, 0.2);

    // Check for personal pronouns
    if (message.match(/\byou\b|\bi\b|\bwe\b/)) score += 0.1;

    // Check for emotional words
    const emotionalWords = ['feel', 'think', 'believe', 'wonder', 'curious'];
    const hasEmotional = emotionalWords.some(word => message.toLowerCase().includes(word));
    if (hasEmotional) score += 0.1;

    return Math.min(score, 1.0);
  }

  private generateCommunicationRecommendations(message: string, style: string, tone: string): string[] {
    const recommendations: string[] = [];

    if (style === 'neutral') {
      recommendations.push('Consider adding more personality to match user communication style');
    }

    if (tone === 'neutral' && message.includes('?')) {
      recommendations.push('Questions detected - consider more enthusiastic tone for better engagement');
    }

    if (message.length < 20) {
      recommendations.push('Response seems brief - consider expanding for better communication');
    }

    recommendations.push('Maintain consistent communication style throughout conversation');

    return recommendations;
  }
}

// Export singleton instance
export const humanLikeCommunicationSystem = new HumanLikeCommunicationSystem();