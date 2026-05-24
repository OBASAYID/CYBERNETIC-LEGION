import { useMemo, useState } from "react";
import {
  Brain,
  ChevronDown,
  ChevronUp,
  Clock,
  FileText,
  GraduationCap,
  Play,
  SkipForward,
  Square,
  Users,
} from "lucide-react";
import { useGroupWorkAssessment } from "../../hooks/useGroupWorkAssessment";
import { GWA_COMPETENCIES, GWA_PHASES, GWA_PHASE_LABELS } from "@shared/gwa-types";

type Props = {
  groupId: string;
  groupName: string;
  myUserId: string;
  participantIds?: string[];
  getUserDisplayName?: (id: string) => string;
  holoSurface?: boolean;
};

function formatCountdown(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GroupWorkAssessmentPanel({
  groupId,
  groupName,
  myUserId,
  participantIds = [],
  getUserDisplayName,
  holoSurface = false,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [title, setTitle] = useState(`${groupName} — Group Work Assessment`);
  const [brief, setBrief] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  const members = useMemo(() => {
    const ids = [...new Set(participantIds.filter(Boolean))];
    if (!ids.includes(myUserId)) ids.unshift(myUserId);
    return ids;
  }, [participantIds, myUserId]);

  const gwa = useGroupWorkAssessment(groupId, myUserId);
  const name = (id: string) => getUserDisplayName?.(id) || id.slice(0, 8);

  const phaseIdx = gwa.session
    ? GWA_PHASES.indexOf(gwa.session.currentPhase as (typeof GWA_PHASES)[number])
    : -1;
  const phaseProgress = phaseIdx >= 0 ? ((phaseIdx + 1) / GWA_PHASES.length) * 100 : 0;

  const border = holoSurface ? "border-cyan-500/35" : "border-violet-500/35";
  const bg = holoSurface ? "bg-[#021018]/92" : "bg-slate-950/90";
  const accent = holoSurface ? "text-cyan-300" : "text-violet-300";

  if (gwa.report) {
    return (
      <div className={`shrink-0 border-b ${border} ${bg} backdrop-blur-md`}>
        <div className="px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accent}`}>
                <GraduationCap className="h-4 w-4" />
                Assessment complete
              </p>
              <p className="mt-1 text-sm text-white/90">
                Team score{" "}
                <span className="font-bold text-emerald-400">{gwa.report.team.teamScore.toFixed(0)}/100</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => gwa.openHtmlReport(gwa.report!.sessionId)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                holoSurface
                  ? "border-cyan-400/40 bg-cyan-950/40 text-cyan-100 hover:bg-cyan-900/50"
                  : "border-violet-400/40 bg-violet-950/40 text-violet-100 hover:bg-violet-900/50"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Full report
            </button>
          </div>
          <div className="mt-3 max-h-48 space-y-2 overflow-y-auto">
            {gwa.report.participants.map((p) => (
              <div
                key={p.userId}
                className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white/90">{p.displayName}</span>
                  <span className="text-emerald-300">{p.overallScore.toFixed(0)}/100</span>
                </div>
                <p className="mt-1 line-clamp-2 text-white/55">{p.narrativeSummary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`shrink-0 border-b ${border} ${bg} backdrop-blur-md`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-left"
      >
        <span className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-wider ${accent}`}>
          <Brain className="h-4 w-4" />
          Group Work Assessment · AI analytics
        </span>
        {expanded ? <ChevronUp className="h-4 w-4 text-white/50" /> : <ChevronDown className="h-4 w-4 text-white/50" />}
      </button>

      {expanded ? (
        <div className="space-y-3 px-4 pb-3">
          {!gwa.isActive ? (
            <>
              <p className="text-[11px] leading-relaxed text-white/55">
                University-style timed team scenario. CYRUS observes group chat across preparation,
                discussion, presentation, debrief, and Q&amp;A — then generates capability + psychological
                reports more consistent than human assessors.
              </p>
              <div className="flex items-center gap-2 text-[10px] text-white/45">
                <Users className="h-3.5 w-3.5" />
                {members.length} participants
                {members.length < 3 ? (
                  <span className="text-amber-400"> — need at least 3 to start</span>
                ) : null}
              </div>
              {showSetup ? (
                <div className="space-y-2">
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white"
                    placeholder="Assessment title"
                  />
                  <textarea
                    value={brief}
                    onChange={(e) => setBrief(e.target.value)}
                    rows={2}
                    className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white"
                    placeholder="Scenario brief (optional)"
                  />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={members.length < 3 || gwa.startSession.isPending}
                  onClick={() => {
                    if (!showSetup) {
                      setShowSetup(true);
                      return;
                    }
                    void gwa.startSession.mutateAsync({
                      title: title.trim() || `${groupName} GWA`,
                      scenarioBrief: brief.trim() || undefined,
                      participantIds: members,
                    });
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-40 ${
                    holoSurface
                      ? "bg-cyan-600/80 text-white hover:bg-cyan-500/90"
                      : "bg-violet-600/80 text-white hover:bg-violet-500/90"
                  }`}
                >
                  <Play className="h-3.5 w-3.5" />
                  {showSetup ? "Start timed assessment" : "Configure & start"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-white/90">{gwa.session?.title}</p>
                  <p className={`text-[11px] ${accent}`}>
                    Phase: {gwa.phaseLabel}
                    {gwa.metrics ? (
                      <span className="ml-2 inline-flex items-center gap-1 text-white/50">
                        <Clock className="h-3 w-3" />
                        {formatCountdown(gwa.metrics.phaseRemainingSec)} left
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={gwa.advancePhase.isPending}
                    onClick={() => gwa.session && void gwa.advancePhase.mutateAsync(gwa.session.id)}
                    className="flex items-center gap-1 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/80 hover:bg-white/10"
                  >
                    <SkipForward className="h-3 w-3" />
                    Next phase
                  </button>
                  <button
                    type="button"
                    disabled={gwa.completeSession.isPending}
                    onClick={() => gwa.session && void gwa.completeSession.mutateAsync(gwa.session.id)}
                    className="flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-950/40 px-2.5 py-1 text-[10px] font-medium text-rose-200 hover:bg-rose-900/40"
                  >
                    <Square className="h-3 w-3" />
                    End &amp; report
                  </button>
                </div>
              </div>

              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className={`h-full transition-all ${holoSurface ? "bg-cyan-400" : "bg-violet-400"}`}
                  style={{ width: `${phaseProgress}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {GWA_PHASES.map((p, i) => (
                  <span
                    key={p}
                    className={`rounded-full px-2 py-0.5 text-[9px] ${
                      i <= phaseIdx
                        ? holoSurface
                          ? "bg-cyan-500/25 text-cyan-100"
                          : "bg-violet-500/25 text-violet-100"
                        : "bg-white/5 text-white/35"
                    }`}
                  >
                    {GWA_PHASE_LABELS[p]}
                  </span>
                ))}
              </div>

              {gwa.metrics?.teamPreview ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {GWA_COMPETENCIES.slice(0, 6).map((c) => {
                    const v = gwa.metrics!.teamPreview[c] ?? 0;
                    return (
                      <div key={c} className="rounded-lg border border-white/8 bg-black/25 px-2 py-1.5">
                        <p className="text-[9px] uppercase tracking-wide text-white/40">
                          {c.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm font-semibold text-white/90">{Math.round(v)}</p>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {gwa.metrics?.participantActivity ? (
                <div className="max-h-24 space-y-1 overflow-y-auto text-[10px] text-white/50">
                  {Object.entries(gwa.metrics.participantActivity).map(([uid, act]) => (
                    <div key={uid} className="flex justify-between gap-2">
                      <span>{name(uid)}</span>
                      <span>
                        {act.messageCount} msgs · preview comm{" "}
                        {Math.round(act.liveCompetencyPreview.communication || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}

          {(gwa.error || gwa.startSession.error || gwa.completeSession.error) && (
            <p className="text-[11px] text-rose-400">
              {gwa.error ||
                (gwa.startSession.error instanceof Error ? gwa.startSession.error.message : null) ||
                (gwa.completeSession.error instanceof Error ? gwa.completeSession.error.message : null)}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
