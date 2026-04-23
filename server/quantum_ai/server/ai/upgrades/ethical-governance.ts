import OpenAI from 'openai';
import { experienceMemory } from '../experience-memory';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface EthicalAssessment {
  isEthical: boolean;
  score: number;
  concerns: EthicalConcern[];
  recommendations: string[];
  category: 'safe' | 'caution' | 'review' | 'block';
  reasoning: string;
}

export interface EthicalConcern {
  type: EthicalConcernType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

export type EthicalConcernType = 
  | 'harm_potential'
  | 'privacy_violation'
  | 'deception'
  | 'discrimination'
  | 'illegal_activity'
  | 'manipulation'
  | 'misinformation'
  | 'safety_risk'
  | 'consent_violation'
  | 'exploitation';

export interface ContentModerationResult {
  isApproved: boolean;
  flaggedCategories: string[];
  severity: 'none' | 'low' | 'medium' | 'high';
  explanation: string;
  suggestedModification?: string;
}

export interface SafetyConstraint {
  id: string;
  name: string;
  description: string;
  active: boolean;
  priority: number;
  checkFunction: (content: string, context?: any) => Promise<boolean>;
}

export interface EthicalPrinciple {
  name: string;
  description: string;
  weight: number;
  examples: string[];
}

export class EthicalGovernanceEngine {
  private safetyConstraints: Map<string, SafetyConstraint> = new Map();
  private ethicalPrinciples: EthicalPrinciple[] = [];
  private moderationHistory: Map<string, ContentModerationResult> = new Map();
  private blockedPatterns: RegExp[] = [];

  private harmfulPatterns = [
    /how to (make|create|build) (a |)(bomb|weapon|explosive)/i,
    /how to (hack|break into|exploit)/i,
    /how to (hurt|harm|kill|injure) (someone|people|myself)/i,
    /provide (illegal|illicit) (drugs|substances)/i,
    /generate (child|minor) (abuse|exploitation)/i,
    /create (malware|virus|ransomware)/i,
  ];

  private sensitiveTopics = [
    'weapons', 'drugs', 'violence', 'abuse', 'terrorism', 'extremism',
    'self-harm', 'suicide', 'illegal activities', 'hate speech'
  ];

  constructor() {
    console.log('[Ethical Governance] Initializing advanced ethical decision framework');
    this.initializeEthicalPrinciples();
    this.initializeSafetyConstraints();
    this.initializeBlockedPatterns();
  }

  private initializeEthicalPrinciples(): void {
    this.ethicalPrinciples = [
      {
        name: 'Beneficence',
        description: 'Act in ways that promote the well-being of others',
        weight: 1.0,
        examples: ['Provide helpful information', 'Offer support in difficult situations', 'Encourage positive outcomes']
      },
      {
        name: 'Non-maleficence',
        description: 'Avoid causing harm to others',
        weight: 1.0,
        examples: ['Do not provide dangerous instructions', 'Refuse harmful requests', 'Warn about potential risks']
      },
      {
        name: 'Autonomy',
        description: 'Respect individual decision-making and privacy',
        weight: 0.9,
        examples: ['Provide balanced information', 'Respect privacy', 'Support informed decisions']
      },
      {
        name: 'Justice',
        description: 'Treat all individuals fairly and equally',
        weight: 0.9,
        examples: ['Avoid discrimination', 'Provide equal quality service', 'Challenge unfair requests']
      },
      {
        name: 'Honesty',
        description: 'Be truthful and transparent',
        weight: 0.95,
        examples: ['Acknowledge limitations', 'Correct misinformation', 'Be clear about AI nature']
      },
      {
        name: 'Privacy',
        description: 'Protect personal information and data',
        weight: 0.9,
        examples: ['Do not share personal data', 'Encourage privacy practices', 'Warn about data exposure']
      }
    ];
  }

  private initializeSafetyConstraints(): void {
    const constraints: SafetyConstraint[] = [
      {
        id: 'no-harm',
        name: 'No Harm Principle',
        description: 'Prevent responses that could cause physical harm',
        active: true,
        priority: 1,
        checkFunction: async (content) => !this.containsHarmfulContent(content)
      },
      {
        id: 'no-illegal',
        name: 'Legal Compliance',
        description: 'Prevent assistance with illegal activities',
        active: true,
        priority: 1,
        checkFunction: async (content) => !this.containsIllegalContent(content)
      },
      {
        id: 'privacy-protection',
        name: 'Privacy Protection',
        description: 'Protect personal and sensitive information',
        active: true,
        priority: 2,
        checkFunction: async (content) => !this.containsPrivacyViolation(content)
      },
      {
        id: 'no-deception',
        name: 'Truthfulness',
        description: 'Prevent deceptive or misleading content',
        active: true,
        priority: 2,
        checkFunction: async (content) => true
      },
      {
        id: 'consent-required',
        name: 'Consent Requirement',
        description: 'Ensure appropriate consent for sensitive actions',
        active: true,
        priority: 3,
        checkFunction: async (content) => true
      }
    ];

    for (const constraint of constraints) {
      this.safetyConstraints.set(constraint.id, constraint);
    }
  }

  private initializeBlockedPatterns(): void {
    this.blockedPatterns = [
      ...this.harmfulPatterns,
      /\b(credit card|social security|ssn)\s*number\s*is\s*\d/i,
      /password\s*(is|:)\s*\S+/i,
    ];
  }

  private containsHarmfulContent(content: string): boolean {
    return this.harmfulPatterns.some(pattern => pattern.test(content));
  }

  private containsIllegalContent(content: string): boolean {
    const illegalPatterns = [
      /how to (commit|do|perform) (fraud|theft|robbery)/i,
      /how to (launder|hide) money/i,
      /where to (buy|get|find) (illegal|illicit)/i,
    ];
    return illegalPatterns.some(pattern => pattern.test(content));
  }

  private containsPrivacyViolation(content: string): boolean {
    const privacyPatterns = [
      /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/,
      /\b\d{16}\b/,
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b.*password/i,
    ];
    return privacyPatterns.some(pattern => pattern.test(content));
  }

  async assessEthics(
    content: string,
    context?: { userIntent?: string; conversationHistory?: string[] }
  ): Promise<EthicalAssessment> {
    const concerns: EthicalConcern[] = [];
    let score = 1.0;

    if (this.containsHarmfulContent(content)) {
      concerns.push({
        type: 'harm_potential',
        severity: 'critical',
        description: 'Content may enable physical harm',
        mitigation: 'Refuse request and provide safety resources'
      });
      score -= 0.5;
    }

    if (this.containsIllegalContent(content)) {
      concerns.push({
        type: 'illegal_activity',
        severity: 'critical',
        description: 'Content may assist with illegal activities',
        mitigation: 'Decline and explain legal concerns'
      });
      score -= 0.4;
    }

    if (this.containsPrivacyViolation(content)) {
      concerns.push({
        type: 'privacy_violation',
        severity: 'high',
        description: 'Content contains or requests sensitive personal data',
        mitigation: 'Remove sensitive data and warn about privacy'
      });
      score -= 0.3;
    }

    try {
      const aiAssessment = await this.getAIEthicalAssessment(content, context);
      concerns.push(...aiAssessment.concerns);
      score = Math.min(score, aiAssessment.score);
    } catch (error) {
      console.error('[Ethical Governance] AI assessment error:', error);
    }

    const category = this.categorizeEthicalScore(score, concerns);
    const recommendations = this.generateRecommendations(concerns);

    return {
      isEthical: score >= 0.6 && !concerns.some(c => c.severity === 'critical'),
      score: Math.max(0, score),
      concerns,
      recommendations,
      category,
      reasoning: this.generateReasoning(concerns, score)
    };
  }

  private async getAIEthicalAssessment(
    content: string,
    context?: { userIntent?: string; conversationHistory?: string[] }
  ): Promise<{ concerns: EthicalConcern[]; score: number }> {
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an ethical assessment system. Analyze the content for ethical concerns.
Return JSON with:
- concerns: array of {type, severity, description} where type is one of: harm_potential, privacy_violation, deception, discrimination, illegal_activity, manipulation, misinformation, safety_risk
- score: 0-1 ethical score (1 = fully ethical)
Be thorough but reasonable. Not everything is problematic.
Return only valid JSON.`
          },
          { 
            role: 'user', 
            content: `Content to assess: "${content}"${context?.userIntent ? `\nUser intent: ${context.userIntent}` : ''}`
          }
        ],
        max_tokens: 500,
        temperature: 0.2
      });

      const parsed = JSON.parse(
        (response.choices[0].message.content || '{}').replace(/```json\n?|\n?```/g, '')
      );

      return {
        concerns: (parsed.concerns || []).map((c: any) => ({
          type: c.type as EthicalConcernType,
          severity: c.severity || 'low',
          description: c.description
        })),
        score: parsed.score || 0.9
      };
    } catch (error) {
      return { concerns: [], score: 0.8 };
    }
  }

  private categorizeEthicalScore(
    score: number,
    concerns: EthicalConcern[]
  ): 'safe' | 'caution' | 'review' | 'block' {
    if (concerns.some(c => c.severity === 'critical')) return 'block';
    if (score >= 0.8) return 'safe';
    if (score >= 0.6) return 'caution';
    if (score >= 0.4) return 'review';
    return 'block';
  }

  private generateRecommendations(concerns: EthicalConcern[]): string[] {
    const recommendations: string[] = [];

    for (const concern of concerns) {
      if (concern.mitigation) {
        recommendations.push(concern.mitigation);
      }
    }

    if (concerns.some(c => c.type === 'harm_potential')) {
      recommendations.push('Consider providing mental health or safety resources');
    }

    if (concerns.some(c => c.type === 'privacy_violation')) {
      recommendations.push('Remove or redact sensitive personal information');
    }

    if (recommendations.length === 0) {
      recommendations.push('No specific ethical concerns detected');
    }

    return [...new Set(recommendations)];
  }

  private generateReasoning(concerns: EthicalConcern[], score: number): string {
    if (concerns.length === 0) {
      return 'No ethical concerns detected. Content appears safe and appropriate.';
    }

    const criticalConcerns = concerns.filter(c => c.severity === 'critical');
    const highConcerns = concerns.filter(c => c.severity === 'high');

    if (criticalConcerns.length > 0) {
      return `Critical ethical concerns detected: ${criticalConcerns.map(c => c.description).join('; ')}. Immediate intervention required.`;
    }

    if (highConcerns.length > 0) {
      return `High-priority ethical concerns identified: ${highConcerns.map(c => c.description).join('; ')}. Caution advised.`;
    }

    return `Minor ethical considerations noted. Overall ethical score: ${(score * 100).toFixed(0)}%.`;
  }

  async moderateContent(content: string): Promise<ContentModerationResult> {
    const assessment = await this.assessEthics(content);

    const flaggedCategories = assessment.concerns
      .filter(c => c.severity !== 'low')
      .map(c => c.type);

    let severity: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (assessment.concerns.some(c => c.severity === 'critical')) severity = 'high';
    else if (assessment.concerns.some(c => c.severity === 'high')) severity = 'medium';
    else if (assessment.concerns.length > 0) severity = 'low';

    const result: ContentModerationResult = {
      isApproved: assessment.category !== 'block',
      flaggedCategories,
      severity,
      explanation: assessment.reasoning,
      suggestedModification: assessment.category === 'caution' 
        ? 'Consider rephrasing to address ethical concerns' 
        : undefined
    };

    this.moderationHistory.set(
      `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      result
    );

    return result;
  }

  async checkSafetyConstraints(content: string, context?: any): Promise<{
    passed: boolean;
    failedConstraints: string[];
    suggestions: string[];
  }> {
    const failedConstraints: string[] = [];
    const suggestions: string[] = [];

    const sortedConstraints = Array.from(this.safetyConstraints.values())
      .filter(c => c.active)
      .sort((a, b) => a.priority - b.priority);

    for (const constraint of sortedConstraints) {
      try {
        const passed = await constraint.checkFunction(content, context);
        if (!passed) {
          failedConstraints.push(constraint.name);
          suggestions.push(`Review content for: ${constraint.description}`);
        }
      } catch (error) {
        console.error(`[Ethical Governance] Constraint check error (${constraint.id}):`, error);
      }
    }

    return {
      passed: failedConstraints.length === 0,
      failedConstraints,
      suggestions
    };
  }

  async generateEthicalPromptAddendum(
    userMessage: string,
    systemPrompt: string
  ): Promise<string> {
    const assessment = await this.assessEthics(userMessage);

    if (assessment.category === 'safe') {
      return systemPrompt;
    }

    let ethicalGuidance = `
ETHICAL GOVERNANCE ACTIVE:
Assessment Category: ${assessment.category.toUpperCase()}
Ethical Score: ${(assessment.score * 100).toFixed(0)}%
`;

    if (assessment.concerns.length > 0) {
      ethicalGuidance += `
Concerns Identified:
${assessment.concerns.map(c => `- ${c.type}: ${c.description}`).join('\n')}

Recommended Actions:
${assessment.recommendations.map(r => `- ${r}`).join('\n')}
`;
    }

    if (assessment.category === 'block') {
      ethicalGuidance += `
IMPORTANT: This request has been flagged for critical ethical concerns.
Politely decline to assist with this specific request.
Offer alternative help or redirect to appropriate resources.
Do NOT provide harmful, illegal, or dangerous information.`;
    } else if (assessment.category === 'caution') {
      ethicalGuidance += `
CAUTION: Proceed carefully with this request.
Ensure your response adheres to ethical guidelines.
Provide balanced, responsible information.`;
    }

    return `${systemPrompt}

${ethicalGuidance}`;
  }

  addSafetyConstraint(constraint: SafetyConstraint): void {
    this.safetyConstraints.set(constraint.id, constraint);
    console.log(`[Ethical Governance] Added safety constraint: ${constraint.name}`);
  }

  removeSafetyConstraint(constraintId: string): boolean {
    return this.safetyConstraints.delete(constraintId);
  }

  getActivePrinciples(): EthicalPrinciple[] {
    return this.ethicalPrinciples;
  }

  getModerationStats(): {
    totalModerated: number;
    approvalRate: number;
    flaggedCategories: Record<string, number>;
  } {
    const results = Array.from(this.moderationHistory.values());
    const approved = results.filter(r => r.isApproved).length;
    
    const categoryCount: Record<string, number> = {};
    for (const result of results) {
      for (const category of result.flaggedCategories) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    }

    return {
      totalModerated: results.length,
      approvalRate: results.length > 0 ? approved / results.length : 1,
      flaggedCategories: categoryCount
    };
  }
}

export const ethicalGovernance = new EthicalGovernanceEngine();
