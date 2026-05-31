import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { gwaObservations, gwaSessions } from "../../shared/models/comms.js";
import type {
  GroupCallBriefing,
  GroupCallDiscussionNote,
  GroupCallMeetingSummary,
} from "../../shared/group-call-intelligence-types.js";
import {
  generateGroupCallBriefing,
  generateGroupCallPostMeeting,
} from "./group-call-intelligence-service.js";
import { gwaEngine } from "./gwa-engine.js";

const router = Router();

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    (typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"] : null) ||
    (typeof req.headers["X-Device-Id"] === "string" ? req.headers["X-Device-Id"] : null) ||
    null
  );
}

async function loadBriefingFromSession(sessionId: string): Promise<GroupCallBriefing | null> {
  const [row] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, sessionId)).limit(1);
  if (!row) return null;
  const metrics = (row.liveMetrics as Record<string, unknown>) || {};
  const stored = metrics.cyrusBriefing as GroupCallBriefing | undefined;
  if (stored?.topicDefinition) return stored;
  return null;
}

async function persistBriefing(sessionId: string, userId: string, briefing: GroupCallBriefing) {
  const [row] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, sessionId)).limit(1);
  if (!row) throw new Error("Session not found");

  const metrics = { ...((row.liveMetrics as Record<string, unknown>) || {}), cyrusBriefing: briefing };
  await db
    .update(gwaSessions)
    .set({
      liveMetrics: metrics,
      scenarioBrief: `${briefing.topic}\n\n${briefing.agenda}`,
    })
    .where(eq(gwaSessions.id, sessionId));

  await db.insert(gwaObservations).values({
    sessionId,
    userId,
    phase: row.currentPhase,
    eventType: "cyrus_briefing_generated",
    payload: { topic: briefing.topic, keyTermCount: briefing.keyTerms.length },
  });
}

type GroupCallPostMeetingGwa = {
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

router.post("/api/comms/group-call/briefing/generate", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { groupName, agenda, topic } = req.body || {};
  if (!groupName || !topic) {
    return res.status(400).json({ error: "groupName and topic are required" });
  }

  try {
    const briefing = await generateGroupCallBriefing({
      groupName: String(groupName).trim(),
      agenda: String(agenda || "").trim(),
      topic: String(topic).trim(),
    });
    res.json({ success: true, briefing });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Briefing generation failed" });
  }
});

router.get("/api/comms/group-call/sessions/:sessionId/briefing", async (req: any, res) => {
  try {
    const briefing = await loadBriefingFromSession(req.params.sessionId);
    if (!briefing) return res.status(404).json({ error: "Briefing not found for session" });
    res.json({ briefing });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Failed to load briefing" });
  }
});

router.post("/api/comms/group-call/sessions/:sessionId/briefing/generate", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { groupName, agenda, topic } = req.body || {};
  if (!groupName || !topic) {
    return res.status(400).json({ error: "groupName and topic are required" });
  }

  try {
    const briefing = await generateGroupCallBriefing({
      groupName: String(groupName).trim(),
      agenda: String(agenda || "").trim(),
      topic: String(topic).trim(),
    });
    await persistBriefing(req.params.sessionId, userId, briefing);
    res.json({ success: true, briefing });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Failed to generate session briefing" });
  }
});

router.post("/api/comms/group-call/sessions/:sessionId/post-meeting/generate", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { briefing, discussionNotes, includeQuiz } = req.body || {};
  if (!briefing?.topic) {
    return res.status(400).json({ error: "briefing object is required" });
  }

  try {
    let gwaReport: GroupCallPostMeetingGwa | undefined;
    const reportRow = await gwaEngine.getReport(req.params.sessionId);
    if (reportRow?.reportJson) {
      const r = reportRow.reportJson as {
        team?: { teamScore?: number; summary?: string };
        participants?: GroupCallPostMeetingGwa["participants"];
      };
      gwaReport = {
        teamScore: r.team?.teamScore,
        teamSummary: r.team?.summary,
        participants: r.participants,
      };
    } else {
      try {
        const finalized = await gwaEngine.finalizeSession(req.params.sessionId);
        gwaReport = {
          teamScore: finalized.team.teamScore,
          teamSummary: finalized.team.summary,
          participants: finalized.participants,
        };
      } catch {
        /* session may still be active */
      }
    }

    const summary = await generateGroupCallPostMeeting({
      briefing,
      discussionNotes: (discussionNotes as GroupCallDiscussionNote[]) || [],
      includeQuiz: !!includeQuiz,
      gwaReport,
    });

    await db.insert(gwaObservations).values({
      sessionId: req.params.sessionId,
      userId,
      eventType: "cyrus_post_meeting_summary",
      payload: summary as unknown as Record<string, unknown>,
    });

    const [row] = await db.select().from(gwaSessions).where(eq(gwaSessions.id, req.params.sessionId)).limit(1);
    if (row) {
      const metrics = {
        ...((row.liveMetrics as Record<string, unknown>) || {}),
        cyrusPostMeeting: summary,
      };
      await db.update(gwaSessions).set({ liveMetrics: metrics }).where(eq(gwaSessions.id, req.params.sessionId));
    }

    res.json({ success: true, summary });
  } catch (e: any) {
    res.status(400).json({ error: e?.message || "Post-meeting synthesis failed" });
  }
});

router.post("/api/comms/group-call/post-meeting/generate", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const { briefing, discussionNotes, includeQuiz, gwaReport } = req.body || {};
  if (!briefing?.topic) {
    return res.status(400).json({ error: "briefing object is required" });
  }

  try {
    const summary: GroupCallMeetingSummary = await generateGroupCallPostMeeting({
      briefing,
      discussionNotes: (discussionNotes as GroupCallDiscussionNote[]) || [],
      includeQuiz: !!includeQuiz,
      gwaReport,
    });
    res.json({ success: true, summary });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || "Post-meeting synthesis failed" });
  }
});

export const groupCallIntelligenceRouter = router;
