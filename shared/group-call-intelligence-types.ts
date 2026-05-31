/** CYRUS Group Call Intelligence — briefing, discussion, and post-meeting artifacts. */

export type GroupCallKeyTerm = {
  term: string;
  definition: string;
  category?: string;
};

export type GroupCallApproachGuideline = {
  phase: string;
  title: string;
  steps: string[];
};

export type GroupCallResearchSection = {
  title: string;
  prompts: string[];
  resources?: string[];
};

export type GroupCallBriefing = {
  generatedAt: string;
  groupName: string;
  agenda: string;
  topic: string;
  topicDefinition: string;
  topicExplanation: string;
  keyTerms: GroupCallKeyTerm[];
  approachGuidelines: GroupCallApproachGuideline[];
  researchTemplate: {
    overview: string;
    sections: GroupCallResearchSection[];
    discussionQuestions: string[];
  };
  discussionRules: string[];
  degraded?: boolean;
};

export type GroupCallDiscussionNote = {
  id: string;
  userId: string;
  displayName: string;
  content: string;
  createdAt: string;
};

export type GroupCallQuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  rationale: string;
};

export type GroupCallTacticalPsychology = {
  leadership: number;
  collaboration: number;
  analyticalThinking: number;
  adaptability: number;
  emotionalIntelligence: number;
};

export type GroupCallParticipantInsights = {
  userId: string;
  displayName: string;
  engagementScore: number;
  tacticalPsychology: GroupCallTacticalPsychology;
  approachSummary: string;
  strengths: string[];
  developmentAreas: string[];
};

export type GroupCallMeetingSummary = {
  generatedAt: string;
  sessionId?: string;
  executiveSummary: string;
  teamApproach: string;
  outcomes: string[];
  actionItems: Array<{ action: string; assignee?: string; due?: string }>;
  participants: GroupCallParticipantInsights[];
  quiz?: {
    title: string;
    questions: GroupCallQuizQuestion[];
  };
  degraded?: boolean;
};

export type GroupCallBriefingInput = {
  groupName: string;
  agenda: string;
  topic: string;
};

export type GroupCallPostMeetingInput = {
  briefing: GroupCallBriefing;
  discussionNotes?: GroupCallDiscussionNote[];
  includeQuiz?: boolean;
  gwaReport?: {
    teamScore?: number;
    teamSummary?: string;
    participants?: Array<{
      userId: string;
      displayName: string;
      overallScore?: number;
      narrativeSummary?: string;
      strengths?: string[];
      developmentAreas?: string[];
      competencies?: Record<string, number>;
      psychological?: Record<string, number>;
    }>;
  };
};
