/**
 * Synthetic Group Work Assessment sessions with known ground-truth archetypes.
 */

import { randomBytes } from "crypto";
import {
  GWA_DEFAULT_PHASE_MINUTES,
  GWA_PHASES,
  type GwaCompetencyScores,
  type GwaPhase,
  type GwaPsychScores,
} from "../../shared/gwa-types.js";
import type { GwaParticipantTelemetry, GwaSessionRuntime } from "./gwa-scoring-core.js";
import { analyzeMessage } from "./gwa-scoring-core.js";

export type GwaArchetype =
  | "leader"
  | "collaborator"
  | "analyst"
  | "facilitator"
  | "quiet"
  | "dominant"
  | "stressed"
  | "disengaged";

const ARCHETYPE_TRUTH: Record<
  GwaArchetype,
  { competencies: GwaCompetencyScores; psychological: GwaPsychScores }
> = {
  leader: {
    competencies: {
      communication: 88,
      teamwork: 78,
      time_management: 82,
      problem_solving: 80,
      attention_to_detail: 72,
      critical_thinking: 79,
    },
    psychological: {
      emotional_regulation: 80,
      stress_resilience: 78,
      leadership_orientation: 92,
      collaborative_mindset: 76,
      growth_mindset: 74,
      self_awareness: 70,
    },
  },
  collaborator: {
    competencies: {
      communication: 82,
      teamwork: 91,
      time_management: 74,
      problem_solving: 76,
      attention_to_detail: 70,
      critical_thinking: 75,
    },
    psychological: {
      emotional_regulation: 84,
      stress_resilience: 80,
      leadership_orientation: 62,
      collaborative_mindset: 93,
      growth_mindset: 78,
      self_awareness: 76,
    },
  },
  analyst: {
    competencies: {
      communication: 72,
      teamwork: 68,
      time_management: 79,
      problem_solving: 90,
      attention_to_detail: 92,
      critical_thinking: 88,
    },
    psychological: {
      emotional_regulation: 78,
      stress_resilience: 75,
      leadership_orientation: 58,
      collaborative_mindset: 70,
      growth_mindset: 72,
      self_awareness: 74,
    },
  },
  facilitator: {
    competencies: {
      communication: 85,
      teamwork: 86,
      time_management: 80,
      problem_solving: 77,
      attention_to_detail: 74,
      critical_thinking: 81,
    },
    psychological: {
      emotional_regulation: 86,
      stress_resilience: 82,
      leadership_orientation: 72,
      collaborative_mindset: 88,
      growth_mindset: 80,
      self_awareness: 82,
    },
  },
  quiet: {
    competencies: {
      communication: 52,
      teamwork: 58,
      time_management: 60,
      problem_solving: 55,
      attention_to_detail: 58,
      critical_thinking: 54,
    },
    psychological: {
      emotional_regulation: 65,
      stress_resilience: 58,
      leadership_orientation: 40,
      collaborative_mindset: 55,
      growth_mindset: 50,
      self_awareness: 48,
    },
  },
  dominant: {
    competencies: {
      communication: 78,
      teamwork: 48,
      time_management: 70,
      problem_solving: 72,
      attention_to_detail: 65,
      critical_thinking: 68,
    },
    psychological: {
      emotional_regulation: 62,
      stress_resilience: 60,
      leadership_orientation: 85,
      collaborative_mindset: 42,
      growth_mindset: 55,
      self_awareness: 50,
    },
  },
  stressed: {
    competencies: {
      communication: 58,
      teamwork: 55,
      time_management: 45,
      problem_solving: 52,
      attention_to_detail: 50,
      critical_thinking: 48,
    },
    psychological: {
      emotional_regulation: 38,
      stress_resilience: 32,
      leadership_orientation: 45,
      collaborative_mindset: 50,
      growth_mindset: 44,
      self_awareness: 46,
    },
  },
  disengaged: {
    competencies: {
      communication: 38,
      teamwork: 35,
      time_management: 40,
      problem_solving: 36,
      attention_to_detail: 34,
      critical_thinking: 35,
    },
    psychological: {
      emotional_regulation: 42,
      stress_resilience: 40,
      leadership_orientation: 30,
      collaborative_mindset: 32,
      growth_mindset: 35,
      self_awareness: 38,
    },
  },
};

const ARCHETYPES = Object.keys(ARCHETYPE_TRUTH) as GwaArchetype[];

const PHASE_TEMPLATES: Record<GwaPhase, string[]> = {
  individual_preparation: [
    "I'll analyze the data specifically and verify each metric before we meet.",
    "My approach is to solve this using a structured framework and document evidence.",
    "Planning our strategy now — deadline is tight so I'm prioritizing key steps.",
  ],
  group_discussion: [
    "I agree — together we should align on the solution because it affects our team outcome.",
    "How do we evaluate this tradeoff? I think we need to compare both options carefully.",
    "Let's collaborate and share our findings so we can reach consensus.",
  ],
  group_presentation: [
    "In conclusion, our findings demonstrate a clear recommendation for the group.",
    "I'll present the overview: summary of analysis, key data, and next steps.",
    "Our team solution addresses the root cause with a practical implementation plan.",
  ],
  individual_debrief: [
    "Personally I learned that I should improve how I support the team next time.",
    "Reflecting on my role — I would do differently by listening more in discussion.",
    "My takeaway is growth opportunity: practice giving clearer feedback.",
  ],
  qa: [
    "Why did we choose that approach? Because the evidence supports it — how would you evaluate alternatives?",
    "Can you clarify the timeline? We prioritized on track delivery for the deadline.",
    "Good question — specifically the data shows our hypothesis was correct.",
  ],
};

function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function noise(scale: number): number {
  return (Math.random() - 0.5) * 2 * scale;
}

export type SimulatedParticipant = {
  userId: string;
  archetype: GwaArchetype;
  groundTruth: { competencies: GwaCompetencyScores; psychological: GwaPsychScores };
};

export type SimulatedSession = {
  runtime: GwaSessionRuntime;
  participants: SimulatedParticipant[];
};

function activityMultiplier(archetype: GwaArchetype): number {
  switch (archetype) {
    case "dominant":
      return 2.4;
    case "leader":
    case "facilitator":
      return 1.6;
    case "collaborator":
    case "analyst":
      return 1.2;
    case "quiet":
      return 0.45;
    case "disengaged":
      return 0.25;
    case "stressed":
      return 0.7;
    default:
      return 1;
  }
}

function enrichMessage(base: string, archetype: GwaArchetype, phase: GwaPhase): string {
  let text = base;
  if (archetype === "dominant") text = `I think ${text} We should follow my plan.`;
  if (archetype === "collaborator" || archetype === "facilitator")
    text = `${text} Together we can align on this.`;
  if (archetype === "analyst") text = `${text} Specifically verify the data and evidence.`;
  if (archetype === "stressed") text = `${text} This is difficult and I'm worried about the deadline.`;
  if (archetype === "disengaged") text = Math.random() > 0.5 ? "ok" : "yeah";
  if (phase === "qa" && Math.random() > 0.4) text += " Why? How does that work?";
  return text;
}

export function generateSimulatedSession(teamSize?: number): SimulatedSession {
  const size = teamSize ?? randInt(3, 8);
  const sessionId = randomBytes(8).toString("hex");
  const groupId = `sim_group_${sessionId}`;
  const participantIds: string[] = [];
  const participants: SimulatedParticipant[] = [];
  const telemetry = new Map<string, GwaParticipantTelemetry>();

  for (let i = 0; i < size; i++) {
    const userId = `sim_user_${sessionId}_${i}`;
    const archetype = pick(ARCHETYPES);
    participantIds.push(userId);

    const truth = ARCHETYPE_TRUTH[archetype];
    const groundTruth = {
      competencies: Object.fromEntries(
        Object.entries(truth.competencies).map(([k, v]) => [k, Math.max(0, Math.min(100, v + noise(6)))]),
      ) as GwaCompetencyScores,
      psychological: Object.fromEntries(
        Object.entries(truth.psychological).map(([k, v]) => [k, Math.max(0, Math.min(100, v + noise(6)))]),
      ) as GwaPsychScores,
    };

    participants.push({ userId, archetype, groundTruth });
    telemetry.set(userId, {
      userId,
      messages: [],
      phaseFirstMessage: {},
      phaseLastMessage: {},
      responseLatencies: [],
      sentimentSamples: [],
    });
  }

  const runtime: GwaSessionRuntime = {
    sessionId,
    groupId,
    phase: "individual_preparation",
    phaseStartedAt: Date.now() - 3600000,
    phaseDurations: { ...GWA_DEFAULT_PHASE_MINUTES },
    participantIds,
    telemetry,
  };

  let t = runtime.phaseStartedAt;

  for (const phase of GWA_PHASES) {
    runtime.phase = phase;
    runtime.phaseStartedAt = t;

    for (const p of participants) {
      const tel = telemetry.get(p.userId)!;
      const mult = activityMultiplier(p.archetype);
      const baseCount = Math.max(0, Math.round(randInt(1, 5) * mult));
      const msgCount = p.archetype === "disengaged" ? randInt(0, 2) : baseCount;

      for (let m = 0; m < msgCount; m++) {
        t += randInt(8000, 45000);
        if (tel.phaseLastMessage[phase]) {
          tel.responseLatencies.push((t - tel.phaseLastMessage[phase]!) / 1000);
        }
        if (!tel.phaseFirstMessage[phase]) tel.phaseFirstMessage[phase] = t;
        tel.phaseLastMessage[phase] = t;

        const content = enrichMessage(pick(PHASE_TEMPLATES[phase]), p.archetype, phase);
        tel.messages.push({ content, messageType: "text", phase, at: t });
        tel.sentimentSamples.push(analyzeMessage(content, phase).sentiment);
      }
    }

    t += (runtime.phaseDurations[phase] || 10) * 60 * 1000;
  }

  return { runtime, participants };
}

export function groundTruthVector(p: SimulatedParticipant): number[] {
  return [
    ...Object.values(p.groundTruth.competencies),
    ...Object.values(p.groundTruth.psychological),
  ];
}
