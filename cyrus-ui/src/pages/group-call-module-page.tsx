/**
 * CYRUS Group Call Intelligence Module — briefing dashboard, discussion, post-meeting synthesis.
 */
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  Brain,
  ChevronRight,
  FileText,
  GraduationCap,
  Loader2,
  MessageSquare,
  Phone,
  Sparkles,
  Upload,
  Users,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { getAuthenticatedUserId } from "@/lib/auth-storage";
import { usePresence } from "../../../client/src/contexts/PresenceContext";
import { useGroupCallIntelligence } from "../../../client/src/hooks/useGroupCallIntelligence";
import { useGroupWorkAssessment } from "../../../client/src/hooks/useGroupWorkAssessment";
import { GroupWorkAssessmentPanel } from "../../../client/src/components/comms/GroupWorkAssessmentPanel";
import type { GroupCallBriefing } from "@shared/group-call-intelligence-types";

const PHASE_COLORS = ["#3DDC84", "#F5A663", "#82CFFF", "#A78BFA", "#E70011"];

function slugGroupId(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `gcm-${slug || "session"}`;
}

function PillLabel({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
        accent ? "bg-[#E70011] text-white" : "bg-black text-white"
      }`}
    >
      {label}
    </span>
  );
}

function InsightCircle({
  title,
  children,
  index,
}: {
  title: string;
  children: React.ReactNode;
  index: number;
}) {
  const color = PHASE_COLORS[index % PHASE_COLORS.length];
  return (
    <div className="relative flex flex-col items-center gap-3 text-center">
      <div
        className="flex h-36 w-36 items-center justify-center rounded-full border-2 p-4 shadow-lg"
        style={{
          borderColor: `${color}88`,
          boxShadow: `0 0 24px ${color}33`,
          background: "rgba(18,18,24,0.92)",
        }}
      >
        <p className="text-[11px] font-bold uppercase tracking-widest text-white/90">{title}</p>
      </div>
      <div className="max-w-xs text-left text-xs leading-relaxed text-white/70">{children}</div>
    </div>
  );
}

function BriefingWorkspace({
  briefing,
  onOpenDiscussion,
}: {
  briefing: GroupCallBriefing;
  onOpenDiscussion: () => void;
}) {
  return (
    <div className="space-y-8">
      {/* Scope table — project scope template style */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#121218]/90">
        <div className="grid grid-cols-[180px_1fr] border-b border-white/10">
          <div className="border-r border-white/10 bg-black/40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-[#E70011]">
            Topic definition
          </div>
          <div className="px-4 py-3 text-sm text-white/85">
            <p className="font-semibold text-white">{briefing.topicDefinition}</p>
            <p className="mt-2 text-white/65">{briefing.topicExplanation}</p>
          </div>
        </div>
        <div className="grid grid-cols-[180px_1fr] border-b border-white/10">
          <div className="border-r border-white/10 bg-black/40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/80">
            Key terms
          </div>
          <div className="px-4 py-3">
            <ul className="space-y-2">
              {briefing.keyTerms.map((kt) => (
                <li key={kt.term} className="text-sm">
                  <span className="font-semibold text-[#82CFFF]">{kt.term}</span>
                  {kt.category ? (
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[9px] uppercase text-white/50">
                      {kt.category}
                    </span>
                  ) : null}
                  <span className="text-white/60"> — {kt.definition}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="grid grid-cols-[180px_1fr]">
          <div className="border-r border-white/10 bg-black/40 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white/80">
            Discussion rules
          </div>
          <div className="px-4 py-3">
            <ul className="list-disc space-y-1 pl-4 text-sm text-white/70">
              {briefing.discussionRules.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* WP-style approach guidelines */}
      <div>
        <h3 className="mb-4 text-xs font-black uppercase tracking-[0.35em] text-[#3DDC84]">
          Approach guidelines
        </h3>
        <div className="space-y-4">
          {briefing.approachGuidelines.map((g, i) => (
            <div key={g.phase} className="flex gap-4">
              <div className="w-16 shrink-0 text-2xl font-black text-white/25">{g.phase}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <div
                    className="h-px flex-1"
                    style={{ background: `linear-gradient(90deg, ${PHASE_COLORS[i]}88, transparent)` }}
                  />
                  <h4 className="shrink-0 text-sm font-bold text-white">{g.title}</h4>
                </div>
                <ul className="mt-2 space-y-1 pl-2">
                  {g.steps.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-xs text-white/65">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: PHASE_COLORS[i] }}
                      />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Research template — case study columns */}
      <div className="rounded-xl border border-white/10 bg-[#0f1018]/95 p-5">
        <h3 className="text-xs font-black uppercase tracking-[0.35em] text-[#A78BFA]">
          Research template
        </h3>
        <p className="mt-2 text-sm text-white/70">{briefing.researchTemplate.overview}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {briefing.researchTemplate.sections.map((sec) => (
            <div key={sec.title} className="rounded-lg border border-white/8 bg-black/30 p-4">
              <h4 className="text-sm font-bold text-white">{sec.title}</h4>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-white/60">
                {sec.prompts.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-white/45">Discussion questions</p>
          <ol className="mt-2 space-y-1">
            {briefing.researchTemplate.discussionQuestions.map((q, i) => (
              <li key={q} className="flex gap-2 text-xs text-white/75">
                <span className="font-bold text-[#82CFFF]">{String(i + 1).padStart(2, "0")}</span>
                {q}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenDiscussion}
        className="inline-flex items-center gap-2 rounded-xl bg-[#3DDC84]/15 px-5 py-3 text-sm font-bold text-[#3DDC84] ring-1 ring-[#3DDC84]/35 transition hover:bg-[#3DDC84]/25"
      >
        Open discussion panel
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function GroupCallModulePage() {
  const myUserId = getAuthenticatedUserId();
  const displayName =
    (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) || "CYRUS OPERATOR";
  const { onlineUsers } = usePresence();

  const [groupName, setGroupName] = useState("");
  const [agenda, setAgenda] = useState("");
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<"setup" | "briefing" | "discussion" | "summary">("setup");
  const [includeQuiz, setIncludeQuiz] = useState(true);
  const [discussionDraft, setDiscussionDraft] = useState("");
  const [gwaSessionId, setGwaSessionId] = useState<string | null>(null);
  const discussionRef = useRef<HTMLDivElement>(null);

  const groupId = useMemo(() => slugGroupId(groupName || "group-session"), [groupName]);
  const participantIds = useMemo(() => {
    const ids = onlineUsers.map((u) => u.id).slice(0, 7);
    if (!ids.includes(myUserId)) ids.unshift(myUserId);
    return ids;
  }, [onlineUsers, myUserId]);

  const intel = useGroupCallIntelligence(myUserId);
  const gwa = useGroupWorkAssessment(groupId, myUserId);

  const handleAgendaUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setAgenda((prev) => (prev ? `${prev}\n\n${text}` : text));
  };

  const handleGenerateBriefing = async () => {
    if (!groupName.trim() || !topic.trim()) return;
    await intel.generateBriefing.mutateAsync({
      groupName: groupName.trim(),
      agenda: agenda.trim(),
      topic: topic.trim(),
      sessionId: gwaSessionId || undefined,
    });
    setPhase("briefing");
  };

  const handleStartAssessment = async () => {
    if (!intel.briefing || participantIds.length < 3) return;
    const result = await gwa.startSession.mutateAsync({
      title: `${groupName} — ${topic}`,
      scenarioBrief: `${intel.briefing.topicDefinition}\n\n${intel.briefing.agenda}`,
      participantIds,
    });
    setGwaSessionId(result.session.id);
    await intel.generateBriefing.mutateAsync({
      groupName,
      agenda,
      topic,
      sessionId: result.session.id,
    });
    setPhase("discussion");
    setTimeout(() => discussionRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
  };

  const handleEndMeeting = async () => {
    if (!intel.briefing) return;
    let gwaReport: unknown;
    if (gwa.session?.id) {
      try {
        const report = await gwa.completeSession.mutateAsync(gwa.session.id);
        gwaReport = report;
      } catch {
        /* synthesize from notes only */
      }
    }
    await intel.generatePostMeeting.mutateAsync({
      briefing: intel.briefing,
      includeQuiz,
      sessionId: gwaSessionId || gwa.session?.id || undefined,
      gwaReport,
    });
    setPhase("summary");
  };

  const today = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });

  return (
    <ModuleWorkspacePageShell
      mode="workspace"
      theme="dashboard"
      kicker="Communications · Group Call Intelligence"
      title="Group Call Module"
      subtitle="CYRUS briefing, discussion facilitation, and post-meeting synthesis"
      icon={Users}
      backHref="/comms"
      headerEnd={
        <Link
          href="/comms?tab=group"
          className="inline-flex items-center gap-2 rounded-lg border border-[#82CFFF]/30 bg-[#82CFFF]/10 px-3 py-1.5 text-xs font-semibold text-[#82CFFF] transition hover:bg-[#82CFFF]/20"
        >
          <Phone className="h-3.5 w-3.5" />
          Live group call
        </Link>
      }
      commandContext={`Group: ${groupName || "—"} · Topic: ${topic || "—"}`}
      contentClassName="pb-16"
    >
      <div
        className="relative overflow-hidden rounded-2xl border border-white/8 p-6 md:p-8"
        style={{
          background:
            "linear-gradient(145deg, rgba(11,11,15,0.98) 0%, rgba(18,20,28,0.95) 50%, rgba(8,12,18,0.98) 100%)",
        }}
      >
        {/* Topographic subtle lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 20% 30%, transparent 0, transparent 40px, rgba(61,220,132,0.4) 41px, transparent 42px)",
          }}
          aria-hidden
        />

        {/* Header metadata — scope management pill style */}
        <header className="relative mb-8 border-b border-white/10 pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black lowercase tracking-tight text-white md:text-3xl">
                group call intelligence plan
              </h2>
              {intel.briefing?.degraded ? (
                <p className="mt-1 text-[10px] text-amber-400/90">
                  Heuristic mode — set OPENAI_API_KEY for full CYRUS synthesis
                </p>
              ) : null}
            </div>
            <ArrowRight className="h-5 w-5 text-[#E70011]" />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              { label: "Group name", value: groupName || "Add group name", accent: true },
              { label: "Documentation date", value: today },
              { label: "Topic / theme", value: topic || "Add topic or theme" },
              { label: "Session author", value: displayName },
            ].map(({ label, value, accent }) => (
              <div key={label} className="flex flex-wrap items-center gap-3">
                <PillLabel label={label} accent={accent} />
                <span className="text-sm text-white/75">{value}</span>
              </div>
            ))}
          </div>
        </header>

        {phase === "setup" && !intel.briefing ? (
          <div className="relative grid gap-8 lg:grid-cols-[1fr_1fr]">
            {/* Left — meeting agenda template */}
            <div className="space-y-4 rounded-xl border border-[#A78BFA]/25 bg-[#1a1030]/40 p-5">
              <div className="rounded-t-lg bg-[#6B46C1] px-4 py-3">
                <p className="text-lg font-black text-white">Team Meeting</p>
                <p className="text-sm text-white/80">Agenda setup</p>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Group name
                </label>
                <input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. Alpha Research Cell"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Topic / theme
                </label>
                <input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g. Cyber resilience strategy for distributed teams"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
                <label className="block text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Meeting agenda
                </label>
                <textarea
                  value={agenda}
                  onChange={(e) => setAgenda(e.target.value)}
                  rows={8}
                  placeholder="Numbered agenda items, objectives, and constraints…"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                />
                <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-[#82CFFF]">
                  <Upload className="h-3.5 w-3.5" />
                  Upload agenda document
                  <input type="file" accept=".txt,.md,.csv,.json" className="hidden" onChange={handleAgendaUpload} />
                </label>
              </div>
            </div>

            {/* Right — CYRUS insight preview circles */}
            <div className="flex flex-col items-center justify-center gap-6">
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-[#3DDC84]">
                <Sparkles className="h-4 w-4" />
                CYRUS will generate
              </p>
              <div className="grid gap-8 sm:grid-cols-1">
                <InsightCircle title="Definition" index={0}>
                  Define and explain the topic from your agenda inputs.
                </InsightCircle>
                <InsightCircle title="Key terms" index={1}>
                  Identify and define vocabulary the team must align on.
                </InsightCircle>
                <InsightCircle title="Guidelines" index={2}>
                  Approach phases and a printable research template.
                </InsightCircle>
              </div>
              <button
                type="button"
                disabled={!groupName.trim() || !topic.trim() || intel.isGeneratingBriefing}
                onClick={() => void handleGenerateBriefing()}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E70011] px-6 py-3 text-sm font-black uppercase tracking-wider text-white transition hover:bg-[#c9000f] disabled:opacity-40"
              >
                {intel.isGeneratingBriefing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4" />
                )}
                Activate CYRUS intelligence
              </button>
            </div>
          </div>
        ) : null}

        {(phase === "briefing" || phase === "discussion") && intel.briefing ? (
          <div className="relative grid gap-8 xl:grid-cols-[280px_1fr_260px]">
            {/* Sidebar — case study style */}
            <aside className="rounded-xl bg-[#2A2D32]/60 p-5">
              <p className="text-2xl font-black">
                <span className="text-[#82CFFF]">Group</span>{" "}
                <span className="text-white/80">Brief</span>
              </p>
              <blockquote className="mt-4 border-l-2 border-white/20 pl-3 text-xs italic leading-relaxed text-white/55">
                {intel.briefing.topicExplanation}
              </blockquote>
              <p className="mt-3 text-[10px] font-semibold text-[#82CFFF]">— CYRUS Intelligence</p>
              <div className="mt-6 space-y-2 border-t border-white/10 pt-4 text-xs text-white/60">
                <p>
                  <span className="font-bold text-white/80">Agenda</span>
                  <br />
                  {intel.briefing.agenda.slice(0, 200)}
                  {intel.briefing.agenda.length > 200 ? "…" : ""}
                </p>
              </div>
            </aside>

            <main>
              <BriefingWorkspace
                briefing={intel.briefing}
                onOpenDiscussion={() => {
                  setPhase("discussion");
                  setTimeout(() => discussionRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
                }}
              />
            </main>

            {/* Insight circles column */}
            <div className="hidden flex-col gap-6 xl:flex">
              <InsightCircle title="Solution 1" index={0}>
                {intel.briefing.topicDefinition}
              </InsightCircle>
              <InsightCircle title="Solution 2" index={1}>
                {intel.briefing.keyTerms.slice(0, 3).map((k) => k.term).join(" · ")}
              </InsightCircle>
              <InsightCircle title="Solution 3" index={2}>
                {intel.briefing.researchTemplate.discussionQuestions[0]}
              </InsightCircle>
            </div>
          </div>
        ) : null}

        {/* Discussion panel + GWA */}
        {(phase === "discussion" || phase === "briefing") && intel.briefing ? (
          <div ref={discussionRef} className="relative mt-10 space-y-6 border-t border-white/10 pt-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.25em] text-white">
                <MessageSquare className="h-4 w-4 text-[#82CFFF]" />
                Discussion panel
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 text-xs text-white/60">
                  <input
                    type="checkbox"
                    checked={includeQuiz}
                    onChange={(e) => setIncludeQuiz(e.target.checked)}
                    className="rounded"
                  />
                  Include quiz at end
                </label>
                <button
                  type="button"
                  disabled={participantIds.length < 3 || gwa.isActive}
                  onClick={() => void handleStartAssessment()}
                  className="rounded-lg border border-[#A78BFA]/40 bg-[#A78BFA]/10 px-3 py-1.5 text-xs font-semibold text-[#A78BFA] disabled:opacity-40"
                >
                  Start GWA session ({participantIds.length} online)
                </button>
                <button
                  type="button"
                  disabled={intel.isGeneratingSummary}
                  onClick={() => void handleEndMeeting()}
                  className="rounded-lg bg-[#E70011]/20 px-3 py-1.5 text-xs font-semibold text-[#E70011] ring-1 ring-[#E70011]/30 disabled:opacity-40"
                >
                  End meeting · synthesize
                </button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="flex max-h-80 flex-col rounded-xl border border-white/10 bg-black/40">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {intel.discussionNotes.length === 0 ? (
                    <p className="text-center text-xs text-white/40">
                      Capture team discussion notes here. Live call chat is on the GROUP tab.
                    </p>
                  ) : (
                    intel.discussionNotes.map((n) => (
                      <div key={n.id} className="rounded-lg bg-white/5 px-3 py-2">
                        <p className="text-[10px] font-bold text-[#82CFFF]">{n.displayName}</p>
                        <p className="text-sm text-white/80">{n.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex gap-2 border-t border-white/10 p-3">
                  <input
                    value={discussionDraft}
                    onChange={(e) => setDiscussionDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        intel.addDiscussionNote(discussionDraft, displayName);
                        setDiscussionDraft("");
                      }
                    }}
                    placeholder="Add discussion note…"
                    className="flex-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      intel.addDiscussionNote(discussionDraft, displayName);
                      setDiscussionDraft("");
                    }}
                    className="rounded-lg bg-[#82CFFF]/15 px-4 py-2 text-xs font-bold text-[#82CFFF]"
                  >
                    Post
                  </button>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10">
                <GroupWorkAssessmentPanel
                  groupId={groupId}
                  groupName={groupName}
                  myUserId={myUserId}
                  participantIds={participantIds}
                  getUserDisplayName={(id) =>
                    onlineUsers.find((u) => u.id === id)?.displayName || id.slice(0, 8)
                  }
                  holoSurface
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* Post-meeting summary — performance review style */}
        {phase === "summary" && intel.summary ? (
          <div className="relative mt-8 space-y-6 border-t border-white/10 pt-8">
            <div className="rounded-xl bg-[#f5f0e8]/95 p-6 text-black">
              <h3 className="text-lg font-black uppercase tracking-wide">Meeting results</h3>
              <p className="mt-2 text-sm text-black/75">{intel.summary.executiveSummary}</p>
              <p className="mt-3 text-sm">
                <span className="font-bold">Team approach:</span> {intel.summary.teamApproach}
              </p>
              <ul className="mt-3 list-disc pl-5 text-sm text-black/80">
                {intel.summary.outcomes.map((o) => (
                  <li key={o}>{o}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white">
                <GraduationCap className="h-4 w-4 text-[#F5A663]" />
                Participant engagement & tactical psychology
              </h4>
              {intel.summary.participants.map((p, i) => (
                <div key={p.userId} className="overflow-hidden rounded-xl border border-white/10">
                  <div
                    className="px-4 py-2 text-xs font-bold uppercase text-white"
                    style={{ background: PHASE_COLORS[i % PHASE_COLORS.length] }}
                  >
                    {p.displayName} · Engagement {p.engagementScore}/100
                  </div>
                  <div className="grid gap-3 bg-black/40 p-4 sm:grid-cols-2">
                    <div className="text-xs text-white/75">
                      <p className="font-semibold text-white">Approach</p>
                      <p className="mt-1">{p.approachSummary}</p>
                    </div>
                    <div className="text-xs text-white/75">
                      <p className="font-semibold text-white">Tactical psychology</p>
                      <ul className="mt-1 space-y-0.5">
                        {Object.entries(p.tacticalPsychology).map(([k, v]) => (
                          <li key={k} className="flex justify-between gap-2">
                            <span className="capitalize text-white/55">{k.replace(/([A-Z])/g, " $1")}</span>
                            <span className="font-mono text-[#3DDC84]">{v}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {intel.summary.quiz ? (
              <div className="rounded-xl border border-[#82CFFF]/30 bg-[#021018]/80 p-5">
                <h4 className="flex items-center gap-2 text-sm font-bold text-[#82CFFF]">
                  <FileText className="h-4 w-4" />
                  {intel.summary.quiz.title}
                </h4>
                <div className="mt-4 space-y-4">
                  {intel.summary.quiz.questions.map((q) => (
                    <div key={q.id} className="rounded-lg border border-white/10 bg-black/30 p-4">
                      <p className="text-sm font-medium text-white">{q.question}</p>
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, idx) => (
                          <li
                            key={opt}
                            className={`text-xs ${idx === q.correctIndex ? "text-[#3DDC84]" : "text-white/55"}`}
                          >
                            {String.fromCharCode(65 + idx)}. {opt}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-[10px] text-white/45">{q.rationale}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => {
                intel.resetSession();
                setPhase("setup");
                setGroupName("");
                setAgenda("");
                setTopic("");
                setGwaSessionId(null);
              }}
              className="text-xs text-white/50 underline hover:text-white/80"
            >
              Start new session
            </button>
          </div>
        ) : null}
      </div>
    </ModuleWorkspacePageShell>
  );
}
