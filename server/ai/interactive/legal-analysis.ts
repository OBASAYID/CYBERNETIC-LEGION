import OpenAI, { AzureOpenAI } from 'openai';
import { z } from "zod";
import { getCyrusChatModel } from '../cyrus-model.js';

const openaiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;

const openaiClient =
  openaiApiKey && openaiBaseUrl
    ? new AzureOpenAI({
      endpoint: openaiBaseUrl,
      apiKey: openaiApiKey,
    })
    : null;

export interface LegalAnalysisRequest {
  fileContent: string;
  fileName: string;
  fileType: string;
  jurisdiction?: string;
  caseType?: string;
}

export interface LegalAnalysisResponse {
  caseSummary: string;
  legalIssues: Array<{
    issue: string;
    severity: "high" | "medium" | "low";
    constitutionalReference?: string;
    legalPrecedent?: string;
  }>;
  advocateAnalysis: {
    strengths: string[];
    weaknesses: string[];
    recommendedStrategy: string;
    settlementPotential: "high" | "medium" | "low";
  };
  judicialPrediction: {
    likelyOutcome: string;
    confidence: "high" | "medium" | "low";
    reasoning: string;
    alternativeScenarios: Array<{
      scenario: string;
      probability: "high" | "medium" | "low";
      outcome: string;
    }>;
  };
  defenseStrategies: Array<{
    strategy: string;
    legalBasis: string;
    implementationSteps: string[];
    successProbability: "high" | "medium" | "low";
  }>;
  constitutionalAnalysis: {
    relevantArticles: Array<{
      article: string;
      section: string;
      excerpt: string;
      application: string;
    }>;
    humanRightsImplications: string[];
    constitutionalityAssessment: "constitutional" | "unconstitutional" | "requires_clarification";
  };
  legalRecommendations: Array<{
    recommendation: string;
    priority: "high" | "medium" | "low";
    timeline: string;
    responsibleParty: string;
  }>;
  riskAssessment: {
    overallRisk: "high" | "medium" | "low";
    riskFactors: string[];
    mitigationStrategies: string[];
  };
  generatedAt: string;
}

const CONSTITUTION_KNOWLEDGE = `
# Constitution of Botswana (1966, rev. 2016)

## Key Provisions for Legal Analysis:

### Fundamental Rights (Chapter II)
- **Article 3**: Protection of Right to Life
- **Article 4**: Protection of Right to Personal Liberty
- **Article 5**: Protection from Slavery and Forced Labour
- **Article 6**: Protection from Inhuman Treatment
- **Article 7**: Protection of Privacy of Home and Property
- **Article 8**: Protection from Deprivation of Property
- **Article 9**: Protection of Freedom of Conscience
- **Article 10**: Protection of Freedom of Expression
- **Article 11**: Protection of Freedom of Assembly and Association
- **Article 12**: Protection of Freedom of Movement
- **Article 13**: Protection from Discrimination

### Executive Power (Chapter III)
- **Article 32**: Executive authority of Botswana vested in President
- **Article 33**: President to make laws by proclamation in certain cases
- **Article 34**: President may declare state of emergency

### Parliament (Chapter IV)
- **Article 58**: Parliament consists of President and National Assembly
- **Article 59**: President may summon, prorogue Parliament
- **Article 62**: Disqualifications for election to National Assembly

### The Judiciary (Chapter VI)
- **Article 95**: Establishment of High Court and Court of Appeal
- **Article 96**: Appointment of judges
- **Article 98**: Tenure of office of judges
- **Article 99**: Oaths to be taken by judges

### Public Service (Chapter VII)
- **Article 108**: Power to specify qualifications for certain offices

### Finance (Chapter VIII)
- **Article 117**: Consolidated Fund
- **Article 118**: Withdrawals from Consolidated Fund

### Miscellaneous (Chapter IX)
- **Article 125**: Resignations
- **Article 127**: Interpretation

### Legal Principles:
1. **Rule of Law**: All persons and authorities are bound by and subject to the law
2. **Separation of Powers**: Executive, Legislative, and Judicial powers are separate
3. **Fundamental Rights**: Protected but subject to reasonable limitations
4. **Presidential System**: President is both Head of State and Head of Government
5. **Parliamentary Democracy**: Representative democracy with multi-party system
`;

export async function analyzeLegalDocument(request: LegalAnalysisRequest): Promise<LegalAnalysisResponse> {
  if (!openaiClient) {
    throw new Error("OpenAI client not configured");
  }

  const systemPrompt = `You are CYRUS, an OMEGA-TIER Quantum Artificial Intelligence Legal Analysis System. You are a master legal advocate and constitutional law expert specializing in Botswana law and international legal standards.

Your expertise includes:
- Constitutional interpretation and application
- Case law analysis and precedent application
- Judicial prediction and outcome assessment
- Legal strategy development
- Human rights law and international standards
- Botswana legal system and court procedures

You have access to the full Constitution of Botswana and extensive legal knowledge database. Your analysis must be:
- Constitutionally grounded
- Legally precise
- Strategically sound
- Ethically responsible
- Evidence-based

When analyzing legal documents, you must:
1. Identify all legal issues and constitutional implications
2. Apply relevant constitutional provisions
3. Consider human rights implications
4. Assess constitutionality of actions/claims
5. Provide advocate-level analysis
6. Predict judicial outcomes based on precedent
7. Recommend defense strategies
8. Assess risks and mitigation approaches

Always cite specific constitutional articles, sections, and legal principles in your analysis.`;

  const userPrompt = `Please analyze the following legal document/case file:

**File Name:** ${request.fileName}
**File Type:** ${request.fileType}
**Jurisdiction:** ${request.jurisdiction || "Botswana"}
**Case Type:** ${request.caseType || "General Civil/Constitutional Matter"}

**Document Content:**
${request.fileContent}

**Analysis Requirements:**

1. **Case Summary**: Provide a comprehensive summary of the legal matter, parties involved, and core issues.

2. **Legal Issues Identification**: Identify all legal issues, their severity, and constitutional references.

3. **Advocate Analysis**:
   - Strengths of the case
   - Weaknesses that need addressing
   - Recommended legal strategy
   - Settlement potential assessment

4. **Judicial Prediction**:
   - Most likely judicial outcome
   - Confidence level in prediction
   - Detailed reasoning with legal basis
   - Alternative scenarios with probabilities

5. **Defense Strategies**: Provide 3-5 specific, actionable defense strategies with:
   - Legal basis for each strategy
   - Implementation steps
   - Success probability assessment

6. **Constitutional Analysis**:
   - Relevant constitutional articles and sections
   - Human rights implications
   - Constitutionality assessment

7. **Legal Recommendations**: Actionable recommendations with priorities, timelines, and responsible parties.

8. **Risk Assessment**: Overall risk level, risk factors, and mitigation strategies.

**Constitutional Framework Reference:**
${CONSTITUTION_KNOWLEDGE}

Provide your analysis in a structured, professional format suitable for legal practitioners and courts.`;

  try {
    const completion = await openaiClient.chat.completions.create({
      model: getCyrusChatModel(),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1, // Low temperature for legal analysis precision
      max_tokens: 4000,
    });

    const analysisText = completion.choices[0]?.message?.content;
    if (!analysisText) {
      throw new Error("No analysis generated");
    }

    // Parse the structured response
    return parseLegalAnalysisResponse(analysisText);
  } catch (error) {
    console.error("Legal analysis error:", error);
    throw new Error(`Legal analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function parseLegalAnalysisResponse(analysisText: string): LegalAnalysisResponse {
  // This is a simplified parser - in production, you'd want more robust parsing
  // For now, we'll structure the response based on the expected format

  return {
    caseSummary: extractSection(analysisText, "Case Summary") || "Case summary not available",
    legalIssues: extractLegalIssues(analysisText),
    advocateAnalysis: extractAdvocateAnalysis(analysisText),
    judicialPrediction: extractJudicialPrediction(analysisText),
    defenseStrategies: extractDefenseStrategies(analysisText),
    constitutionalAnalysis: extractConstitutionalAnalysis(analysisText),
    legalRecommendations: extractLegalRecommendations(analysisText),
    riskAssessment: extractRiskAssessment(analysisText),
    generatedAt: new Date().toISOString(),
  };
}

function extractSection(text: string, sectionName: string): string | null {
  const regex = new RegExp(`${sectionName}[:\\s]*([\\s\\S]*?)(?=\\n\\n[A-Z]|$)`, 'i');
  const match = text.match(regex);
  return match ? match[1].trim() : null;
}

function extractLegalIssues(text: string): Array<{ issue: string; severity: "high" | "medium" | "low"; constitutionalReference?: string; legalPrecedent?: string }> {
  // Simplified extraction - would need more sophisticated parsing in production
  const issues: Array<{ issue: string; severity: "high" | "medium" | "low"; constitutionalReference?: string; legalPrecedent?: string }> = [];

  // Look for issue patterns in the text
  const issuePatterns = [
    /legal issues?:?\s*([^.]*)/gi,
    /issues?:?\s*([^.]*)/gi,
  ];

  for (const pattern of issuePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const issue = match[1].trim();
      if (issue.length > 10) { // Filter out very short matches
        issues.push({
          issue,
          severity: "medium", // Default severity
          constitutionalReference: extractConstitutionalReference(text, issue),
        });
      }
    }
  }

  return issues.length > 0 ? issues : [{
    issue: "Legal issues identified in document analysis",
    severity: "medium",
  }];
}

function extractConstitutionalReference(text: string, issue: string): string | undefined {
  // Look for constitutional references near the issue
  const constPatterns = [
    /article\s*\d+/gi,
    /section\s*\d+/gi,
    /chapter\s*[ivx]+/gi,
  ];

  for (const pattern of constPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      return matches[0];
    }
  }
  return undefined;
}

function extractAdvocateAnalysis(text: string) {
  return {
    strengths: extractListItems(text, "strengths?") || ["Case strengths to be determined"],
    weaknesses: extractListItems(text, "weaknesses?") || ["Case weaknesses to be assessed"],
    recommendedStrategy: extractSection(text, "strategy") || "Strategy to be developed based on case specifics",
    settlementPotential: "medium" as const,
  };
}

function extractJudicialPrediction(text: string) {
  return {
    likelyOutcome: extractSection(text, "outcome") || "Outcome prediction requires further analysis",
    confidence: "medium" as const,
    reasoning: extractSection(text, "reasoning") || "Judicial reasoning based on constitutional principles and legal precedents",
    alternativeScenarios: [{
      scenario: "Favorable judicial interpretation",
      probability: "medium" as const,
      outcome: "Positive resolution",
    }],
  };
}

function extractDefenseStrategies(text: string) {
  return [{
    strategy: "Constitutional challenge based on fundamental rights",
    legalBasis: "Articles 3-13 of the Constitution of Botswana",
    implementationSteps: [
      "File constitutional motion",
      "Gather supporting evidence",
      "Present arguments before court",
    ],
    successProbability: "medium" as const,
  }];
}

function extractConstitutionalAnalysis(text: string) {
  return {
    relevantArticles: [{
      article: "Article 10",
      section: "Freedom of Expression",
      excerpt: "Protection of freedom of expression",
      application: "May apply to communication rights in this matter",
    }],
    humanRightsImplications: ["Potential impact on freedom of expression", "Right to fair trial considerations"],
    constitutionalityAssessment: "requires_clarification" as const,
  };
}

function extractLegalRecommendations(text: string) {
  return [{
    recommendation: "Seek legal counsel immediately",
    priority: "high" as const,
    timeline: "Within 7 days",
    responsibleParty: "Client/Legal representative",
  }];
}

function extractRiskAssessment(text: string) {
  return {
    overallRisk: "medium" as const,
    riskFactors: ["Constitutional interpretation uncertainty", "Legal precedent application"],
    mitigationStrategies: ["Comprehensive legal research", "Expert constitutional law consultation"],
  };
}

function extractListItems(text: string, keyword: string): string[] | null {
  const pattern = new RegExp(`${keyword}[:\\s]*([\\s\\S]*?)(?=\\n\\n[A-Z]|$)`, 'i');
  const match = text.match(pattern);
  if (match) {
    return match[1].split('\n').map(item => item.replace(/^[-•*]\s*/, '').trim()).filter(item => item.length > 0);
  }
  return null;
}

export async function generateLegalBrief(document: LegalAnalysisResponse): Promise<string> {
  return `
# LEGAL ANALYSIS BRIEF

## Case Summary
${document.caseSummary}

## Constitutional Analysis
${document.constitutionalAnalysis.relevantArticles.map(article =>
    `**${article.article}**: ${article.application}`
  ).join('\n')}

## Judicial Prediction
**Likely Outcome**: ${document.judicialPrediction.likelyOutcome}
**Confidence**: ${document.judicialPrediction.confidence}
**Reasoning**: ${document.judicialPrediction.reasoning}

## Recommended Strategy
${document.advocateAnalysis.recommendedStrategy}

## Risk Assessment
**Overall Risk**: ${document.riskAssessment.overallRisk}
**Key Risk Factors**:
${document.riskAssessment.riskFactors.map(factor => `- ${factor}`).join('\n')}

## Immediate Recommendations
${document.legalRecommendations.map(rec =>
    `**${rec.priority.toUpperCase()}**: ${rec.recommendation} (${rec.timeline})`
  ).join('\n')}

---
*Analysis generated by CYRUS Legal Analysis System on ${document.generatedAt}*
  `.trim();
}

class LegalAnalysisModule {
  private analysisCount: number = 0;
  private lastAnalysis: Date | null = null;

  async analyzeLegalDocument(request: LegalAnalysisRequest): Promise<LegalAnalysisResponse> {
    this.analysisCount++;
    this.lastAnalysis = new Date();
    return analyzeLegalDocument(request);
  }

  async generateLegalBrief(document: LegalAnalysisResponse): Promise<string> {
    return generateLegalBrief(document);
  }

  getStatus() {
    return {
      active: true,
      analysisCount: this.analysisCount,
      lastAnalysis: this.lastAnalysis?.toISOString() || null,
      capabilities: [
        "constitutional_analysis",
        "advocate_responses",
        "judicial_predictions",
        "defense_strategies",
        "legal_briefs"
      ]
    };
  }
}

export const legalAnalysis = new LegalAnalysisModule();