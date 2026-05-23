/** Group Work Assessment — shared types for timed team scenarios (university GWA-style). */

export const GWA_PHASES = [
  "individual_preparation",
  "group_discussion",
  "group_presentation",
  "individual_debrief",
  "qa",
] as const;

export type GwaPhase = (typeof GWA_PHASES)[number];

export const GWA_PHASE_LABELS: Record<GwaPhase, string> = {
  individual_preparation: "Individual preparation",
  group_discussion: "Group discussion",
  group_presentation: "Group presentation",
  individual_debrief: "Individual debrief",
  qa: "Q & A",
};

/** Default timed phase lengths (minutes) for a 120-minute session. */
export const GWA_DEFAULT_PHASE_MINUTES: Record<GwaPhase, number> = {
  individual_preparation: 54,
  group_discussion: 30,
  group_presentation: 20,
  individual_debrief: 10,
  qa: 6,
};

export const GWA_COMPETENCIES = [
  "communication",
  "teamwork",
  "time_management",
  "problem_solving",
  "attention_to_detail",
  "critical_thinking",
] as const;

export type GwaCompetency = (typeof GWA_COMPETENCIES)[number];

export const GWA_PSYCH_DIMENSIONS = [
  "emotional_regulation",
  "stress_resilience",
  "leadership_orientation",
  "collaborative_mindset",
  "growth_mindset",
  "self_awareness",
] as const;

export type GwaPsychDimension = (typeof GWA_PSYCH_DIMENSIONS)[number];

export type GwaCompetencyScores = Record<GwaCompetency, number>;
export type GwaPsychScores = Record<GwaPsychDimension, number>;

export type GwaParticipantReport = {
  userId: string;
  displayName: string;
  competencies: GwaCompetencyScores;
  psychological: GwaPsychScores;
  overallScore: number;
  percentileBand: "exceptional" | "strong" | "developing" | "at_risk";
  participationShare: number;
  messageCount: number;
  avgResponseLatencySec: number;
  strengths: string[];
  developmentAreas: string[];
  narrativeSummary: string;
};

export type GwaTeamReport = {
  teamScore: number;
  cohesionIndex: number;
  participationBalance: number;
  phaseCompletion: Record<GwaPhase, boolean>;
  summary: string;
};

export type GwaFullReport = {
  sessionId: string;
  groupId: string;
  title: string;
  completedAt: string;
  team: GwaTeamReport;
  participants: GwaParticipantReport[];
  algorithmVersion: string;
  assessorNotes?: string;
};

export type GwaLiveMetrics = {
  sessionId: string;
  phase: GwaPhase;
  phaseElapsedSec: number;
  phaseRemainingSec: number;
  participantActivity: Record<
    string,
    {
      messageCount: number;
      wordCount: number;
      lastActiveAt: string | null;
      liveCompetencyPreview: Partial<GwaCompetencyScores>;
    }
  >;
  teamPreview: Partial<GwaCompetencyScores>;
};
