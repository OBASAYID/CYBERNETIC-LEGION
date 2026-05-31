/**
 * CYRUS Group Call Intelligence — structured briefing and post-meeting synthesis.
 */

import type {
  GroupCallBriefing,
  GroupCallBriefingInput,
  GroupCallMeetingSummary,
  GroupCallPostMeetingInput,
} from "../../shared/group-call-intelligence-types.js";

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object in model response");
  }
}

function tokenizeTerms(text: string): string[] {
  const words = text
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  const freq = new Map<string, number>();
  for (const w of words) {
    const k = w.toLowerCase();
    if (["about", "their", "which", "would", "should", "meeting", "group"].includes(k)) continue;
    freq.set(k, (freq.get(k) || 0) + 1);
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([w]) => w.charAt(0).toUpperCase() + w.slice(1));
}

function heuristicBriefing(input: GroupCallBriefingInput): GroupCallBriefing {
  const terms = tokenizeTerms(`${input.topic} ${input.agenda}`);
  return {
    generatedAt: new Date().toISOString(),
    groupName: input.groupName,
    agenda: input.agenda,
    topic: input.topic,
    topicDefinition: `${input.topic} — the central theme for ${input.groupName}.`,
    topicExplanation: `The team will explore "${input.topic}" using the provided agenda as a structured roadmap. CYRUS recommends clarifying scope, constraints, and success criteria before deep discussion.`,
    keyTerms: terms.map((term) => ({
      term,
      definition: `Key concept related to ${input.topic}; define with team-specific context during preparation.`,
      category: "Core",
    })),
    approachGuidelines: [
      {
        phase: "01",
        title: "Scope & objectives",
        steps: [
          "Confirm meeting purpose and expected deliverables",
          "Identify stakeholders and decision rights",
          "Agree on time-boxed agenda items",
        ],
      },
      {
        phase: "02",
        title: "Research & preparation",
        steps: [
          "Individual review of key terms and background",
          "Collect evidence, data, or precedents",
          "Prepare one contribution per participant",
        ],
      },
      {
        phase: "03",
        title: "Group discussion",
        steps: [
          "Rotate speaking turns; capture decisions live",
          "Challenge assumptions respectfully",
          "Converge on a shared approach or solution",
        ],
      },
      {
        phase: "04",
        title: "Verification & next steps",
        steps: [
          "Summarize outcomes and owners",
          "Optional CYRUS quiz to validate understanding",
          "Schedule follow-up if required",
        ],
      },
    ],
    researchTemplate: {
      overview: `Research brief for "${input.topic}" — use this template during individual preparation.`,
      sections: [
        {
          title: "Background",
          prompts: [
            "What is the historical or operational context?",
            "Who is affected and why does this matter now?",
          ],
        },
        {
          title: "Problem framing",
          prompts: [
            "What is the core challenge or opportunity?",
            "What constraints or risks must we respect?",
          ],
        },
        {
          title: "Solution space",
          prompts: [
            "What options or frameworks apply?",
            "What evidence supports each option?",
          ],
        },
      ],
      discussionQuestions: [
        `How does our team define success for "${input.topic}"?`,
        "Which assumptions should we validate first?",
        "What is the minimum viable outcome for this session?",
      ],
    },
    discussionRules: [
      "One speaker at a time; use raise-hand in the live call",
      "Anchor comments to agenda items and key terms",
      "Document decisions and open questions in the discussion panel",
      "CYRUS tracks engagement for post-meeting synthesis",
    ],
    degraded: true,
  };
}

function heuristicPostMeeting(input: GroupCallPostMeetingInput): GroupCallMeetingSummary {
  const participants =
    input.gwaReport?.participants?.map((p) => ({
      userId: p.userId,
      displayName: p.displayName,
      engagementScore: p.overallScore ?? 65,
      tacticalPsychology: {
        leadership: Math.round(p.psychological?.leadership_orientation ?? 55),
        collaboration: Math.round(p.psychological?.collaborative_mindset ?? 60),
        analyticalThinking: Math.round(p.competencies?.critical_thinking ?? 58),
        adaptability: Math.round(p.psychological?.growth_mindset ?? 57),
        emotionalIntelligence: Math.round(p.psychological?.self_awareness ?? 56),
      },
      approachSummary: p.narrativeSummary || "Participated in group discussion with measurable contribution.",
      strengths: p.strengths?.length ? p.strengths : ["Active participation"],
      developmentAreas: p.developmentAreas?.length ? p.developmentAreas : ["Continue building depth on topic"],
    })) ?? [];

  const noteCount = input.discussionNotes?.length ?? 0;
  return {
    generatedAt: new Date().toISOString(),
    executiveSummary: `The ${input.briefing.groupName} session addressed "${input.briefing.topic}". ${noteCount} discussion notes captured. Team score: ${input.gwaReport?.teamScore?.toFixed(0) ?? "—"}/100.`,
    teamApproach: input.gwaReport?.teamSummary || "The team followed CYRUS approach guidelines through preparation, discussion, and synthesis.",
    outcomes: [
      "Topic scope reviewed and key terms aligned",
      "Group discussion completed with documented notes",
      "Post-meeting intelligence generated by CYRUS",
    ],
    actionItems: [
      { action: "Review CYRUS summary and assign follow-ups", assignee: "Team lead" },
      { action: "Archive research template for future sessions" },
    ],
    participants,
    quiz: input.includeQuiz
      ? {
          title: `${input.briefing.topic} — comprehension check`,
          questions: [
            {
              id: "q1",
              question: `What is the primary focus of "${input.briefing.topic}"?`,
              options: [
                input.briefing.topicDefinition.slice(0, 80),
                "Unrelated administrative tasks",
                "Personal introductions only",
                "None of the above",
              ],
              correctIndex: 0,
              rationale: "The session centered on the stated topic and agenda.",
            },
          ],
        }
      : undefined,
    degraded: true,
  };
}

async function callCyrusJson<T>(system: string, user: string): Promise<T | null> {
  const openaiApiKey =
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!openaiApiKey) return null;

  const OpenAI = (await import("openai")).default;
  const { getCyrusChatModel } = await import("../ai/cyrus-model.js");
  const client = new OpenAI({
    apiKey: openaiApiKey,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const completion = await client.chat.completions.create({
    model: getCyrusChatModel(),
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    max_tokens: 2800,
    temperature: 0.35,
    response_format: { type: "json_object" },
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return null;
  return extractJsonObject(raw) as T;
}

const BRIEFING_SYSTEM = `You are CYRUS, a group-work intelligence engine for structured team meetings.
Return ONLY valid JSON matching this schema:
{
  "topicDefinition": "one sentence",
  "topicExplanation": "2-4 sentences",
  "keyTerms": [{ "term": "", "definition": "", "category": "" }],
  "approachGuidelines": [{ "phase": "01", "title": "", "steps": ["..."] }],
  "researchTemplate": {
    "overview": "",
    "sections": [{ "title": "", "prompts": ["..."], "resources": ["optional url or reading"] }],
    "discussionQuestions": ["..."]
  },
  "discussionRules": ["..."]
}
Generate 6-10 key terms, 4 approach guideline phases, 3 research sections, 5+ discussion questions.`;

const POST_MEETING_SYSTEM = `You are CYRUS synthesizing a completed group meeting.
Return ONLY valid JSON:
{
  "executiveSummary": "",
  "teamApproach": "",
  "outcomes": ["..."],
  "actionItems": [{ "action": "", "assignee": "", "due": "" }],
  "participants": [{
    "userId": "",
    "displayName": "",
    "engagementScore": 0-100,
    "tacticalPsychology": {
      "leadership": 0-100,
      "collaboration": 0-100,
      "analyticalThinking": 0-100,
      "adaptability": 0-100,
      "emotionalIntelligence": 0-100
    },
    "approachSummary": "",
    "strengths": ["..."],
    "developmentAreas": ["..."]
  }],
  "quiz": {
    "title": "",
    "questions": [{
      "id": "q1",
      "question": "",
      "options": ["a","b","c","d"],
      "correctIndex": 0,
      "rationale": ""
    }]
  }
}
Omit "quiz" entirely if quiz not requested. Rate engagement and tactical psychology from evidence in notes and GWA metrics.`;

export async function generateGroupCallBriefing(
  input: GroupCallBriefingInput,
): Promise<GroupCallBriefing> {
  const userPrompt = JSON.stringify({
    groupName: input.groupName,
    agenda: input.agenda,
    topic: input.topic,
  });

  try {
    const parsed = await callCyrusJson<{
      topicDefinition: string;
      topicExplanation: string;
      keyTerms: GroupCallBriefing["keyTerms"];
      approachGuidelines: GroupCallBriefing["approachGuidelines"];
      researchTemplate: GroupCallBriefing["researchTemplate"];
      discussionRules: string[];
    }>(BRIEFING_SYSTEM, userPrompt);

    if (parsed?.topicDefinition) {
      return {
        generatedAt: new Date().toISOString(),
        groupName: input.groupName,
        agenda: input.agenda,
        topic: input.topic,
        topicDefinition: parsed.topicDefinition,
        topicExplanation: parsed.topicExplanation || parsed.topicDefinition,
        keyTerms: parsed.keyTerms || [],
        approachGuidelines: parsed.approachGuidelines || [],
        researchTemplate: parsed.researchTemplate || heuristicBriefing(input).researchTemplate,
        discussionRules: parsed.discussionRules || [],
      };
    }
  } catch (e) {
    console.warn("[GroupCallIntel] Briefing AI failed:", e instanceof Error ? e.message : e);
  }

  return heuristicBriefing(input);
}

export async function generateGroupCallPostMeeting(
  input: GroupCallPostMeetingInput,
): Promise<GroupCallMeetingSummary> {
  const userPrompt = JSON.stringify({
    briefing: {
      groupName: input.briefing.groupName,
      topic: input.briefing.topic,
      agenda: input.briefing.agenda,
    },
    includeQuiz: !!input.includeQuiz,
    discussionNotes: input.discussionNotes?.slice(-40) ?? [],
    gwaReport: input.gwaReport ?? null,
  });

  try {
    const parsed = await callCyrusJson<{
      executiveSummary: string;
      teamApproach: string;
      outcomes: string[];
      actionItems: GroupCallMeetingSummary["actionItems"];
      participants: GroupCallMeetingSummary["participants"];
      quiz?: GroupCallMeetingSummary["quiz"];
    }>(POST_MEETING_SYSTEM, userPrompt);

    if (parsed?.executiveSummary) {
      return {
        generatedAt: new Date().toISOString(),
        executiveSummary: parsed.executiveSummary,
        teamApproach: parsed.teamApproach,
        outcomes: parsed.outcomes || [],
        actionItems: parsed.actionItems || [],
        participants: parsed.participants || [],
        quiz: input.includeQuiz ? parsed.quiz : undefined,
      };
    }
  } catch (e) {
    console.warn("[GroupCallIntel] Post-meeting AI failed:", e instanceof Error ? e.message : e);
  }

  return heuristicPostMeeting(input);
}
