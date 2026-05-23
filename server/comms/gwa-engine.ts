/**
 * Group Work Assessment Engine — live sessions + calibrated ML scoring.
 */

import { db } from "../db.js";
import {
  gwaObservations,
  gwaReports,
  gwaSessions,
  onlineUsers,
} from "../../shared/models/comms.js";
import { eq, and, desc } from "drizzle-orm";
import { commsIntelligence } from "./comms-intelligence.js";
import {
  GWA_COMPETENCIES,
  GWA_DEFAULT_PHASE_MINUTES,
  GWA_PHASES,
  type GwaCompetency,
  type GwaCompetencyScores,
  type GwaFullReport,
  type GwaLiveMetrics,
  type GwaParticipantReport,
  type GwaPhase,
} from "../../shared/gwa-types.js";
import {
  analyzeMessage,
  avg,
  clamp,
  emptyCompetencies,
  extractParticipantFeatures,
  scoreParticipantFromRuntime,
  vectorizeScores,
  type GwaParticipantTelemetry,
  type GwaSessionRuntime,
} from "./gwa-scoring-core.js";
import { applyCalibratedModel, loadGwaModel } from "./gwa-model.js";

export function getGwaAlgorithmVersion(): string {
  return loadGwaModel()?.algorithmVersion || "cyrus-gwa-v1.0";
}

/** @deprecated use getGwaAlgorithmVersion() */
export const GWA_ALGORITHM_VERSION = "cyrus-gwa-v1.0";

type SessionRuntime = GwaSessionRuntime;

const activeByGroup = new Map<string, SessionRuntime>();
const runtimeBySession = new Map<string, SessionRuntime>();

function gini(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let num = 0;
  for (let i = 0; i < n; i++) num += (2 * (i + 1) - n - 1) * sorted[i];
  return num / (n * sum);
}

function phaseIndex(p: GwaPhase): number {
  return GWA_PHASES.indexOf(p);
}

function buildRuntime(row: typeof gwaSessions.$inferSelect): SessionRuntime {
  const phaseDurations = {
    ...GWA_DEFAULT_PHASE_MINUTES,
    ...((row.phaseDurations as Record<GwaPhase, number>) || {}),
  };
  const participantIds = (row.participantIds as string[]) || [];
  const telemetry = new Map<string, GwaParticipantTelemetry>();
  for (const uid of participantIds) {
    telemetry.set(uid, {
      userId: uid,
      messages: [],
      phaseFirstMessage: {},
      phaseLastMessage: {},
      responseLatencies: [],
      sentimentSamples: [],
    });
  }
  return {
    sessionId: row.id,
    groupId: row.groupId,
    phase: (row.currentPhase as GwaPhase) || "individual_preparation",
    phaseStartedAt: row.phaseStartedAt ? new Date(row.phaseStartedAt).getTime() : Date.now(),
    phaseDurations,
    participantIds,
    telemetry,
  };
}

async function loadRuntime(sessionId: string): Promise<SessionRuntime | null> {
  const cached = runtimeBySession.get(sessionId);
  if (cached) return cached;
  const [row] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, sessionId)).limit(1);
  if (!row || row.status !== "active") return null;
  const rt = buildRuntime(row);
  runtimeBySession.set(sessionId, rt);
  activeByGroup.set(row.groupId, rt);
  return rt;
}

function formatCompetencyLabel(c: GwaCompetency): string {
  return c.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function buildNarrative(
  name: string,
  comp: GwaCompetencyScores,
  overall: number,
): string {
  const top = [...GWA_COMPETENCIES].sort((a, b) => comp[b] - comp[a])[0];
  const band =
    overall >= 85
      ? "demonstrates exceptional collaborative capability"
      : overall >= 70
        ? "shows strong team performance with reliable engagement"
        : overall >= 55
          ? "shows developing skills with clear growth potential"
          : "would benefit from structured coaching and practice";
  return `${name} ${band}. Strongest competency signal: ${formatCompetencyLabel(top)} (${comp[top].toFixed(0)}/100). Calibrated by ${getGwaAlgorithmVersion()}.`;
}

function buildTeamSummary(
  teamScore: number,
  comp: GwaCompetencyScores,
  balance: number,
): string {
  const sorted = [...GWA_COMPETENCIES].sort((a, b) => comp[b] - comp[a]);
  return `Team composite ${teamScore.toFixed(0)}/100 with ${balance.toFixed(0)}% participation balance. Peak dimensions: ${formatCompetencyLabel(sorted[0])} and ${formatCompetencyLabel(sorted[1])}. Algorithm ${getGwaAlgorithmVersion()}.`;
}

function scoreWithCalibration(
  uid: string,
  rt: SessionRuntime,
  teamMsgCounts: number[],
  displayName: string,
): GwaParticipantReport {
  const base = scoreParticipantFromRuntime(uid, rt, teamMsgCounts, displayName);
  const model = loadGwaModel();
  if (!model) return base;

  const tel = rt.telemetry.get(uid)!;
  const teamMsgTotal = teamMsgCounts.reduce((a, b) => a + b, 0);
  const features = extractParticipantFeatures(tel, rt.participantIds.length, teamMsgTotal);
  const heuristic = vectorizeScores(base);
  const calibrated = applyCalibratedModel(heuristic, features, model);

  const overallScore = clamp(
    avg(Object.values(calibrated.competencies)) * 0.72 +
      avg(Object.values(calibrated.psychological)) * 0.28,
  );

  const ranked = [...GWA_COMPETENCIES].sort(
    (a, b) => calibrated.competencies[b] - calibrated.competencies[a],
  );
  const strengths: string[] = [];
  const developmentAreas: string[] = [];
  for (const c of ranked.slice(0, 2)) {
    if (calibrated.competencies[c] >= 70) strengths.push(formatCompetencyLabel(c));
  }
  for (const c of ranked.slice(-2)) {
    if (calibrated.competencies[c] < 65) developmentAreas.push(formatCompetencyLabel(c));
  }

  return {
    ...base,
    competencies: calibrated.competencies,
    psychological: calibrated.psychological,
    overallScore,
    percentileBand:
      overallScore >= 85
        ? "exceptional"
        : overallScore >= 70
          ? "strong"
          : overallScore >= 55
            ? "developing"
            : "at_risk",
    strengths,
    developmentAreas,
    narrativeSummary: buildNarrative(displayName, calibrated.competencies, overallScore),
  };
}

export class GroupWorkAssessmentEngine {
  getActiveSessionForGroup(groupId: string): SessionRuntime | null {
    return activeByGroup.get(groupId) || null;
  }

  async createSession(input: {
    groupId: string;
    title: string;
    scenarioBrief?: string;
    createdBy: string;
    participantIds: string[];
    assessorIds?: string[];
    totalDurationMinutes?: number;
    phaseDurations?: Partial<Record<GwaPhase, number>>;
  }) {
    const participants = [...new Set(input.participantIds.filter(Boolean))];
    if (participants.length < 3) {
      throw new Error("Group Work Assessment requires at least 3 participants (teams of 3–8+).");
    }
    if (activeByGroup.get(input.groupId)) {
      throw new Error("An active assessment already exists for this group.");
    }

    const phaseDurations = { ...GWA_DEFAULT_PHASE_MINUTES, ...input.phaseDurations };
    const now = new Date();
    const [row] = await db
      .insert(gwaSessions)
      .values({
        groupId: input.groupId,
        title: input.title,
        scenarioBrief: input.scenarioBrief || null,
        status: "active",
        currentPhase: "individual_preparation",
        phaseStartedAt: now,
        sessionStartedAt: now,
        totalDurationMinutes: input.totalDurationMinutes || 120,
        phaseDurations,
        participantIds: participants,
        assessorIds: input.assessorIds || [input.createdBy],
        createdBy: input.createdBy,
      })
      .returning();

    const rt = buildRuntime(row);
    runtimeBySession.set(row.id, rt);
    activeByGroup.set(input.groupId, rt);

    await db.insert(gwaObservations).values({
      sessionId: row.id,
      userId: input.createdBy,
      phase: "individual_preparation",
      eventType: "session_started",
      payload: { participantCount: participants.length },
    });

    return row;
  }

  async getActiveForGroup(groupId: string) {
    const rt = activeByGroup.get(groupId);
    if (rt) {
      const [row] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, rt.sessionId)).limit(1);
      return row || null;
    }
    const [row] = await db
      .select()
      .from(gwaSessions)
      .where(and(eq(gwaSessions.groupId, groupId), eq(gwaSessions.status, "active")))
      .orderBy(desc(gwaSessions.sessionStartedAt))
      .limit(1);
    if (row) {
      const runtime = buildRuntime(row);
      runtimeBySession.set(row.id, runtime);
      activeByGroup.set(groupId, runtime);
    }
    return row || null;
  }

  recordGroupMessage(groupId: string, userId: string, content: string, messageType: string) {
    const rt = activeByGroup.get(groupId);
    if (!rt) return;
    let tel = rt.telemetry.get(userId);
    if (!tel) {
      tel = {
        userId,
        messages: [],
        phaseFirstMessage: {},
        phaseLastMessage: {},
        responseLatencies: [],
        sentimentSamples: [],
      };
      rt.telemetry.set(userId, tel);
    }

    const now = Date.now();
    const phase = rt.phase;

    if (tel.phaseLastMessage[phase]) {
      tel.responseLatencies.push((now - tel.phaseLastMessage[phase]!) / 1000);
    }
    if (!tel.phaseFirstMessage[phase]) tel.phaseFirstMessage[phase] = now;
    tel.phaseLastMessage[phase] = now;

    const analysis = analyzeMessage(content, phase);
    tel.sentimentSamples.push(analysis.sentiment);
    tel.messages.push({ content, messageType, phase, at: now });
  }

  computeLiveMetrics(sessionId: string): GwaLiveMetrics | null {
    const rt = runtimeBySession.get(sessionId);
    if (!rt) return null;

    const phaseElapsedSec = Math.floor((Date.now() - rt.phaseStartedAt) / 1000);
    const phaseMin = rt.phaseDurations[rt.phase] || GWA_DEFAULT_PHASE_MINUTES[rt.phase];
    const phaseRemainingSec = Math.max(0, phaseMin * 60 - phaseElapsedSec);

    const participantActivity: GwaLiveMetrics["participantActivity"] = {};
    const teamPreview: Partial<GwaCompetencyScores> = {};

    for (const [uid, tel] of rt.telemetry) {
      const phaseMsgs = tel.messages.filter((m) => m.phase === rt.phase);
      let comm = 0;
      let team = 0;
      let detail = 0;
      let critical = 0;
      for (const m of phaseMsgs) {
        const a = analyzeMessage(m.content, rt.phase);
        comm += a.commScore;
        team += a.teamScore;
        detail += a.detailScore;
        critical += a.criticalScore;
      }
      const n = Math.max(1, phaseMsgs.length);
      participantActivity[uid] = {
        messageCount: tel.messages.length,
        wordCount: tel.messages.reduce((s, m) => s + m.content.split(/\s+/).filter(Boolean).length, 0),
        lastActiveAt: tel.phaseLastMessage[rt.phase]
          ? new Date(tel.phaseLastMessage[rt.phase]!).toISOString()
          : null,
        liveCompetencyPreview: {
          communication: clamp(comm / n),
          teamwork: clamp(team / n),
          attention_to_detail: clamp(detail / n),
          critical_thinking: clamp(critical / n),
        },
      };
    }

    const previews = Object.values(participantActivity).map((p) => p.liveCompetencyPreview);
    for (const c of GWA_COMPETENCIES) {
      teamPreview[c] = clamp(avg(previews.map((p) => p[c] || 0)));
    }

    return {
      sessionId,
      phase: rt.phase,
      phaseElapsedSec,
      phaseRemainingSec,
      participantActivity,
      teamPreview,
    };
  }

  async advancePhase(sessionId: string, userId: string) {
    const rt = await loadRuntime(sessionId);
    if (!rt) return null;

    const idx = phaseIndex(rt.phase);
    if (idx >= GWA_PHASES.length - 1) return null;

    const nextPhase = GWA_PHASES[idx + 1];
    const now = new Date();

    await db.insert(gwaObservations).values({
      sessionId,
      userId,
      phase: rt.phase,
      eventType: "phase_completed",
      payload: { nextPhase },
    });

    rt.phase = nextPhase;
    rt.phaseStartedAt = now.getTime();

    const [updated] = await db
      .update(gwaSessions)
      .set({ currentPhase: nextPhase, phaseStartedAt: now })
      .where(eq(gwaSessions.id, sessionId))
      .returning();

    return updated;
  }

  async finalizeSession(sessionId: string): Promise<GwaFullReport> {
    const rt = await loadRuntime(sessionId);
    if (!rt) {
      const [row] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, sessionId)).limit(1);
      if (!row) throw new Error("Session not found");
      if (row.status === "completed") {
        const [existing] = await db
          .select()
          .from(gwaReports)
          .where(eq(gwaReports.sessionId, sessionId))
          .limit(1);
        if (existing?.reportJson) return existing.reportJson as GwaFullReport;
      }
      throw new Error("Session is not active");
    }

    const names = await this.displayNameMap(rt.participantIds);
    const msgCounts = rt.participantIds.map((uid) => rt.telemetry.get(uid)?.messages.length || 0);

    const participants = rt.participantIds.map((uid) =>
      scoreWithCalibration(uid, rt, msgCounts, names[uid] || uid),
    );

    const teamCompetencies = emptyCompetencies();
    for (const c of GWA_COMPETENCIES) {
      teamCompetencies[c] = clamp(avg(participants.map((p) => p.competencies[c])));
    }

    const participationBalance = clamp((1 - gini(msgCounts)) * 100);
    const teamScore = clamp(
      avg(Object.values(teamCompetencies)) * 0.65 +
        participationBalance * 0.2 +
        avg(participants.map((p) => avg(Object.values(p.psychological)))) * 0.15,
    );

    const [sessionRow] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, sessionId)).limit(1);

    const report: GwaFullReport = {
      sessionId,
      groupId: rt.groupId,
      title: sessionRow?.title || "Group Work Assessment",
      completedAt: new Date().toISOString(),
      team: {
        teamScore,
        cohesionIndex: clamp(participationBalance * 0.6 + teamCompetencies.teamwork * 0.4),
        participationBalance,
        phaseCompletion: Object.fromEntries(GWA_PHASES.map((p) => [p, true])) as Record<GwaPhase, boolean>,
        summary: buildTeamSummary(teamScore, teamCompetencies, participationBalance),
      },
      participants,
      algorithmVersion: getGwaAlgorithmVersion(),
    };

    const now = new Date();
    await db
      .update(gwaSessions)
      .set({ status: "completed", sessionEndedAt: now, currentPhase: "qa" })
      .where(eq(gwaSessions.id, sessionId));

    activeByGroup.delete(rt.groupId);
    runtimeBySession.delete(sessionId);

    return report;
  }

  async saveReport(report: GwaFullReport, htmlReport: string) {
    await db
      .insert(gwaReports)
      .values({
        sessionId: report.sessionId,
        groupId: report.groupId,
        teamScore: String(report.team.teamScore.toFixed(1)),
        reportJson: report,
        htmlReport,
      })
      .onConflictDoUpdate({
        target: gwaReports.sessionId,
        set: {
          teamScore: String(report.team.teamScore.toFixed(1)),
          reportJson: report,
          htmlReport,
          generatedAt: new Date(),
        },
      });
  }

  async getReport(sessionId: string) {
    const [row] = await db.select().from(gwaReports).where(eq(gwaReports.sessionId, sessionId)).limit(1);
    return row || null;
  }

  async syncToIntelligence(report: GwaFullReport) {
    for (const p of report.participants) {
      try {
        await commsIntelligence.trackInteraction(p.userId, "gwa_assessment_complete", undefined, {
          sessionId: report.sessionId,
          groupId: report.groupId,
          overallScore: p.overallScore,
          competencies: p.competencies,
          psychological: p.psychological,
          algorithmVersion: getGwaAlgorithmVersion(),
        });
      } catch {
        /* non-fatal */
      }
    }
    await db
      .update(gwaReports)
      .set({ syncedToIntelligence: true })
      .where(eq(gwaReports.sessionId, report.sessionId));
  }

  private async displayNameMap(ids: string[]): Promise<Record<string, string>> {
    if (!ids.length) return {};
    const rows = await db
      .select({ id: onlineUsers.id, displayName: onlineUsers.displayName })
      .from(onlineUsers);
    const m: Record<string, string> = {};
    for (const r of rows) {
      if (ids.includes(r.id)) m[r.id] = r.displayName || r.id;
    }
    for (const id of ids) if (!m[id]) m[id] = id;
    return m;
  }
}

export const gwaEngine = new GroupWorkAssessmentEngine();
