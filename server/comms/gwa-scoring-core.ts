/**
 * Shared GWA scoring primitives — used by live engine, simulator, and trainer.
 * Self-contained (no DB) so `npm run gwa:train` works offline.
 */

import {
  GWA_COMPETENCIES,
  GWA_DEFAULT_PHASE_MINUTES,
  GWA_PHASES,
  GWA_PSYCH_DIMENSIONS,
  type GwaCompetency,
  type GwaCompetencyScores,
  type GwaParticipantReport,
  type GwaPhase,
  type GwaPsychDimension,
  type GwaPsychScores,
} from "../../shared/gwa-types.js";

export type GwaMessageRecord = {
  content: string;
  messageType: string;
  phase: GwaPhase;
  at: number;
};

export type GwaParticipantTelemetry = {
  userId: string;
  messages: GwaMessageRecord[];
  phaseFirstMessage: Partial<Record<GwaPhase, number>>;
  phaseLastMessage: Partial<Record<GwaPhase, number>>;
  responseLatencies: number[];
  sentimentSamples: number[];
};

export type GwaSessionRuntime = {
  sessionId: string;
  groupId: string;
  phase: GwaPhase;
  phaseStartedAt: number;
  phaseDurations: Record<GwaPhase, number>;
  participantIds: string[];
  telemetry: Map<string, GwaParticipantTelemetry>;
};

const TEAM_WORDS =
  /\b(we|us|our|together|team|collaborate|align|consensus|support|share|joint|collective)\b/i;
const DETAIL_WORDS =
  /\b(specifically|exactly|detail|verify|check|precision|accurate|step|data|metric|evidence|document)\b/i;
const CRITICAL_WORDS =
  /\b(because|therefore|however|analyze|evaluate|compare|hypothesis|assume|implication|tradeoff|why|how)\b/i;
const PROBLEM_WORDS =
  /\b(solve|solution|approach|strategy|plan|implement|fix|resolve|method|framework|root cause)\b/i;
const TIME_WORDS =
  /\b(deadline|schedule|time|minute|prioritize|urgent|timeline|phase|remaining|on track)\b/i;
const QUESTION_MARK = /\?/;
const PRESENTATION_MARKERS =
  /\b(conclusion|summary|present|slide|overview|findings|recommend|introduce|demonstrate)\b/i;
const DEBRIEF_MARKERS =
  /\b(reflect|learned|improve|would do differently|takeaway|insight|personally|my role)\b/i;
const GROWTH_WORDS =
  /\b(learn|grow|develop|feedback|better next|improvement|opportunity|practice)\b/i;

const POS = /\b(good|great|excellent|thanks|agree|success|helpful|clear|strong|progress)\b/i;
const NEG = /\b(bad|worst|hate|angry|fail|wrong|problem|worried|difficult|stressed)\b/i;

function quickSentiment(text: string): number {
  const t = text.toLowerCase();
  let s = 0;
  if (POS.test(t)) s += 0.35;
  if (NEG.test(t)) s -= 0.35;
  return Math.max(-1, Math.min(1, s));
}

export function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function stdDev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const m = avg(nums);
  return Math.sqrt(nums.reduce((s, n) => s + (n - m) ** 2, 0) / nums.length);
}

export function analyzeMessage(content: string, phase: GwaPhase) {
  const text = content || "";
  const words = text.split(/\s+/).filter(Boolean);
  const len = words.length;
  const sentiment = quickSentiment(text);

  return {
    wordCount: len,
    teamScore: (text.match(TEAM_WORDS) || []).length * 12 + (len > 8 ? 5 : 0),
    detailScore: (text.match(DETAIL_WORDS) || []).length * 14 + (len > 20 ? 8 : 0),
    criticalScore:
      (text.match(CRITICAL_WORDS) || []).length * 13 + (QUESTION_MARK.test(text) ? 10 : 0),
    problemScore: (text.match(PROBLEM_WORDS) || []).length * 14,
    timeScore: (text.match(TIME_WORDS) || []).length * 15,
    commScore: clamp(len * 1.2 + (text.match(QUESTION_MARK) || []).length * 8 + 40),
    presentationBoost: phase === "group_presentation" && PRESENTATION_MARKERS.test(text) ? 18 : 0,
    debriefBoost: phase === "individual_debrief" && DEBRIEF_MARKERS.test(text) ? 20 : 0,
    qaBoost: phase === "qa" && QUESTION_MARK.test(text) ? 15 : 0,
    growthBoost: (text.match(GROWTH_WORDS) || []).length * 12,
    sentiment,
  };
}

export const GWA_FEATURE_NAMES = [
  "msg_count_norm",
  "words_per_msg",
  "participation_share",
  "share_deviation",
  "latency_mean_norm",
  "latency_std_norm",
  "sentiment_mean",
  "sentiment_std",
  "phases_active_ratio",
  "team_marker_density",
  "detail_marker_density",
  "critical_marker_density",
  "problem_marker_density",
  "time_marker_density",
  "question_rate",
  "growth_marker_density",
  "prep_msg_ratio",
  "discussion_msg_ratio",
  "presentation_msg_ratio",
  "debrief_msg_ratio",
  "qa_msg_ratio",
  "presentation_markers",
  "debrief_markers",
  "on_time_phases_ratio",
] as const;

export type GwaFeatureName = (typeof GWA_FEATURE_NAMES)[number];

export function extractParticipantFeatures(
  tel: GwaParticipantTelemetry,
  teamSize: number,
  teamMsgTotal: number,
): number[] {
  const msgCount = tel.messages.length;
  const msgCountNorm = msgCount / Math.max(1, teamSize * 8);
  const wordTotal = tel.messages.reduce(
    (s, m) => s + m.content.split(/\s+/).filter(Boolean).length,
    0,
  );
  const participationShare = teamMsgTotal > 0 ? msgCount / teamMsgTotal : 0;
  const idealShare = 1 / Math.max(1, teamSize);
  const shareDeviation = Math.abs(participationShare - idealShare);
  const latMean = avg(tel.responseLatencies);
  const latStd = stdDev(tel.responseLatencies);

  let teamM = 0;
  let detailM = 0;
  let criticalM = 0;
  let problemM = 0;
  let timeM = 0;
  let questions = 0;
  let growthM = 0;
  let presMarkers = 0;
  let debriefMarkers = 0;
  let phasesActive = 0;

  const phaseCounts: Record<GwaPhase, number> = {
    individual_preparation: 0,
    group_discussion: 0,
    group_presentation: 0,
    individual_debrief: 0,
    qa: 0,
  };

  for (const m of tel.messages) {
    const a = analyzeMessage(m.content, m.phase);
    teamM += a.teamScore;
    detailM += a.detailScore;
    criticalM += a.criticalScore;
    problemM += a.problemScore;
    timeM += a.timeScore;
    growthM += a.growthBoost;
    if (QUESTION_MARK.test(m.content)) questions += 1;
    if (m.phase === "group_presentation" && PRESENTATION_MARKERS.test(m.content)) presMarkers += 1;
    if (m.phase === "individual_debrief" && DEBRIEF_MARKERS.test(m.content)) debriefMarkers += 1;
    phaseCounts[m.phase] += 1;
  }

  for (const p of GWA_PHASES) {
    if (phaseCounts[p] > 0) phasesActive += 1;
  }

  const denom = Math.max(1, msgCount);
  const onTimePhases = GWA_PHASES.filter((p) => (phaseCounts[p] || 0) >= 1).length;

  return [
    msgCountNorm,
    wordTotal / denom,
    participationShare,
    shareDeviation,
    latMean / 120,
    latStd / 120,
    avg(tel.sentimentSamples),
    stdDev(tel.sentimentSamples),
    phasesActive / GWA_PHASES.length,
    teamM / denom / 100,
    detailM / denom / 100,
    criticalM / denom / 100,
    problemM / denom / 100,
    timeM / denom / 100,
    questions / denom,
    growthM / denom / 100,
    phaseCounts.individual_preparation / denom,
    phaseCounts.group_discussion / denom,
    phaseCounts.group_presentation / denom,
    phaseCounts.individual_debrief / denom,
    phaseCounts.qa / denom,
    presMarkers / Math.max(1, phaseCounts.group_presentation),
    debriefMarkers / Math.max(1, phaseCounts.individual_debrief),
    onTimePhases / GWA_PHASES.length,
  ];
}

export function emptyCompetencies(): GwaCompetencyScores {
  return Object.fromEntries(GWA_COMPETENCIES.map((c) => [c, 0])) as GwaCompetencyScores;
}

export function emptyPsych(): GwaPsychScores {
  return Object.fromEntries(GWA_PSYCH_DIMENSIONS.map((p) => [p, 0])) as GwaPsychScores;
}

function percentileBand(score: number): GwaParticipantReport["percentileBand"] {
  if (score >= 85) return "exceptional";
  if (score >= 70) return "strong";
  if (score >= 55) return "developing";
  return "at_risk";
}

function formatCompetencyLabel(c: GwaCompetency): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

export function scoreParticipantFromRuntime(
  uid: string,
  rt: GwaSessionRuntime,
  teamMsgCounts: number[],
  displayName: string,
): GwaParticipantReport {
  const tel = rt.telemetry.get(uid) || {
    userId: uid,
    messages: [],
    phaseFirstMessage: {},
    phaseLastMessage: {},
    responseLatencies: [],
    sentimentSamples: [],
  };

  const competencies = emptyCompetencies();
  const phaseScores: Partial<Record<GwaPhase, Partial<GwaCompetencyScores>>> = {};

  for (const phase of GWA_PHASES) {
    const msgs = tel.messages.filter((m) => m.phase === phase);
    if (!msgs.length) {
      phaseScores[phase] = {
        communication: 35,
        teamwork: 40,
        time_management: 45,
        problem_solving: 38,
        attention_to_detail: 36,
        critical_thinking: 37,
      };
      continue;
    }

    let comm = 0;
    let team = 0;
    let time = 0;
    let problem = 0;
    let detail = 0;
    let critical = 0;

    for (const m of msgs) {
      const a = analyzeMessage(m.content, phase);
      comm += a.commScore + a.presentationBoost + a.qaBoost;
      team += a.teamScore;
      time += a.timeScore;
      problem += a.problemScore;
      detail += a.detailScore + a.detailScore * 0.3;
      critical += a.criticalScore + a.debriefBoost;
    }

    const n = msgs.length;
    const phaseDurationMin = rt.phaseDurations[phase] || GWA_DEFAULT_PHASE_MINUTES[phase];
    const firstAt = tel.phaseFirstMessage[phase];
    const onTimeBonus =
      firstAt && firstAt <= rt.phaseStartedAt + phaseDurationMin * 60 * 1000 * 0.85 ? 12 : 0;

    phaseScores[phase] = {
      communication: clamp(comm / n + onTimeBonus * 0.3),
      teamwork: clamp(team / n + (phase === "group_discussion" ? 15 : 0)),
      time_management: clamp(time / n + onTimeBonus + (msgs.length >= 2 ? 8 : 0)),
      problem_solving: clamp(problem / n + (phase === "individual_preparation" ? 12 : 0)),
      attention_to_detail: clamp(detail / n + (phase === "group_presentation" ? 10 : 0)),
      critical_thinking: clamp(critical / n + (phase === "qa" ? 12 : 0)),
    };
  }

  const phaseWeights: Record<GwaPhase, Partial<Record<GwaCompetency, number>>> = {
    individual_preparation: {
      problem_solving: 0.45,
      attention_to_detail: 0.35,
      critical_thinking: 0.2,
    },
    group_discussion: {
      communication: 0.35,
      teamwork: 0.4,
      critical_thinking: 0.25,
    },
    group_presentation: {
      communication: 0.5,
      time_management: 0.25,
      attention_to_detail: 0.25,
    },
    individual_debrief: {
      critical_thinking: 0.4,
      communication: 0.3,
      problem_solving: 0.3,
    },
    qa: {
      communication: 0.35,
      critical_thinking: 0.35,
      problem_solving: 0.3,
    },
  };

  for (const c of GWA_COMPETENCIES) {
    let weighted = 0;
    let wSum = 0;
    for (const phase of GWA_PHASES) {
      const pw = phaseWeights[phase][c] || 0;
      if (pw > 0 && phaseScores[phase]?.[c] != null) {
        weighted += (phaseScores[phase]![c] as number) * pw;
        wSum += pw;
      }
    }
    competencies[c] = wSum > 0 ? clamp(weighted / wSum) : 45;
  }

  const msgCount = tel.messages.length;
  const totalTeamMsgs = teamMsgCounts.reduce((a, b) => a + b, 0);
  const participationShare = totalTeamMsgs > 0 ? msgCount / totalTeamMsgs : 0;
  const idealShare = 1 / Math.max(1, rt.participantIds.length);
  const shareDeviation = Math.abs(participationShare - idealShare);
  const balancePenalty = shareDeviation * 40;
  competencies.teamwork = clamp(competencies.teamwork - balancePenalty * 0.5);
  competencies.communication = clamp(competencies.communication - balancePenalty * 0.3);

  const avgLatency = avg(tel.responseLatencies);
  const latencyScore = avgLatency > 0 ? clamp(100 - avgLatency * 2) : 55;
  competencies.time_management = clamp(competencies.time_management * 0.7 + latencyScore * 0.3);

  const sentimentStability = tel.sentimentSamples.length
    ? clamp(100 - stdDev(tel.sentimentSamples) * 80)
    : 60;

  const psychological: GwaPsychScores = {
    emotional_regulation: clamp(sentimentStability * 0.85 + competencies.communication * 0.15),
    stress_resilience: clamp(
      sentimentStability * 0.5 + competencies.time_management * 0.3 + (msgCount > 0 ? 15 : 0),
    ),
    leadership_orientation: clamp(
      competencies.communication * 0.35 +
        participationShare * 120 * 0.35 +
        competencies.critical_thinking * 0.3,
    ),
    collaborative_mindset: clamp(competencies.teamwork * 0.85 + (1 - shareDeviation) * 15),
    growth_mindset: clamp(
      (phaseScores.individual_debrief?.critical_thinking || 50) * 0.4 +
        avg(tel.messages.map((m) => analyzeMessage(m.content, m.phase).growthBoost)) * 2 +
        40,
    ),
    self_awareness: clamp(
      (phaseScores.individual_debrief?.communication || 45) * 0.5 +
        (phaseScores.individual_debrief?.critical_thinking || 45) * 0.5,
    ),
  };

  const overallScore = clamp(
    avg(Object.values(competencies)) * 0.72 +
      avg(Object.values(psychological)) * 0.28,
  );

  const ranked = [...GWA_COMPETENCIES].sort((a, b) => competencies[b] - competencies[a]);
  const strengths: string[] = [];
  const developmentAreas: string[] = [];
  for (const c of ranked.slice(0, 2)) {
    if (competencies[c] >= 70) strengths.push(formatCompetencyLabel(c));
  }
  for (const c of ranked.slice(-2)) {
    if (competencies[c] < 65) developmentAreas.push(formatCompetencyLabel(c));
  }

  return {
    userId: uid,
    displayName,
    competencies,
    psychological,
    overallScore,
    percentileBand: percentileBand(overallScore),
    participationShare: parseFloat((participationShare * 100).toFixed(1)),
    messageCount: msgCount,
    avgResponseLatencySec: parseFloat(avgLatency.toFixed(1)),
    strengths,
    developmentAreas,
    narrativeSummary: `${displayName} scored ${overallScore.toFixed(0)}/100.`,
  };
}

export function vectorizeScores(report: GwaParticipantReport): number[] {
  return [
    ...GWA_COMPETENCIES.map((c) => report.competencies[c]),
    ...GWA_PSYCH_DIMENSIONS.map((p) => report.psychological[p]),
  ];
}

export const GWA_TARGET_LABELS = [
  ...GWA_COMPETENCIES,
  ...GWA_PSYCH_DIMENSIONS,
] as const;
