import { useState } from "react";
import { Link } from "wouter";
import {
  Brain,
  Database,
  Globe,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import {
  useAssetCatalog,
  useAssetSearch,
  useAssetStats,
  useAutomationStatus,
  useGrowthStatus,
  useMcpHealth,
  usePlatformIntelligenceActions,
  usePlatformSnapshot,
  type MissionDomain,
} from "@/hooks/usePlatformIntelligence";

const DOMAINS: { id: MissionDomain; label: string }[] = [
  { id: "general", label: "General" },
  { id: "education", label: "Education" },
  { id: "health", label: "Health" },
  { id: "military", label: "Military" },
  { id: "communication", label: "Communication" },
];

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-white/45 mt-0.5">{hint}</p> : null}
    </div>
  );
}

function ActionButton({
  onClick,
  disabled,
  loading,
  children,
  variant = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  children: React.ReactNode;
  variant?: "default" | "primary";
}) {
  const base =
    variant === "primary"
      ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
      : "border-white/15 bg-white/5 text-white/90 hover:bg-white/10";
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs disabled:opacity-50 ${base}`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
      {children}
    </button>
  );
}

export function IntelligenceHubPage() {
  const snapshot = usePlatformSnapshot();
  const assets = useAssetStats();
  const growth = useGrowthStatus();
  const automation = useAutomationStatus();
  const mcp = useMcpHealth();
  const catalog = useAssetCatalog();
  const actions = usePlatformIntelligenceActions();

  const [searchQ, setSearchQ] = useState("");
  const [ingestUrl, setIngestUrl] = useState("");
  const [mineTarget, setMineTarget] = useState("2000");
  const [missionDomain, setMissionDomain] = useState<MissionDomain>("general");
  const [missionObjective, setMissionObjective] = useState("");
  const [missionResult, setMissionResult] = useState<Record<string, unknown> | null>(null);

  const search = useAssetSearch(searchQ, searchQ.length > 1);

  const assetTotal = Number((assets.data as any)?.total ?? 0);
  const kbEntries = Number((growth.data as any)?.knowledgeBaseEntries ?? 0);
  const mcpActive = Number((mcp.data as any)?.activeCount ?? 0);
  const mcpTotal = Number((mcp.data as any)?.totalServers ?? 0);
  const models = (snapshot.data as any)?.calibratedModels ?? {};
  const modelCount = Object.values(models).filter(Boolean).length;

  const runMission = async () => {
    if (!missionObjective.trim()) return;
    const result = await actions.executeMission.mutateAsync({
      domain: missionDomain,
      objective: missionObjective.trim(),
    });
    setMissionResult(result);
  };

  return (
    <ModuleWorkspacePageShell
      kicker="Platform intelligence"
      title="Intelligence Hub"
      icon={Brain}
      subtitle="Mine open-web knowledge and assets, run autonomous cycles, and execute cross-domain missions — OpenAI-free when CYRUS_OPENAI_INDEPENDENT is set."
      headerEnd={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/files">
            <button type="button" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
              Documents
            </button>
          </Link>
          <Link href="/ops">
            <button type="button" className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10">
              Ops console
            </button>
          </Link>
          <Link href="/algorithms">
            <button type="button" className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100">
              API map
            </button>
          </Link>
        </div>
      }
    >
      <div className="max-w-6xl space-y-6 overflow-y-auto pb-8">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Assets" value={assetTotal.toLocaleString()} hint="Images + 3D models" />
          <StatCard label="Knowledge" value={kbEntries.toLocaleString()} hint="Local KB entries" />
          <StatCard label="Calibrated models" value={`${modelCount}/4`} hint="GWA · doc · vision · assets" />
          <StatCard label="MCP servers" value={`${mcpActive}/${mcpTotal || 3}`} hint="Agent tooling" />
        </div>

        {/* Mission */}
        <section className="rounded-2xl border border-amber-400/15 bg-amber-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-amber-200" />
            <h2 className="text-lg font-medium text-white">Mission planner</h2>
          </div>
          <p className="text-xs text-white/50 mb-4">
            Route an objective through CYRUS domains. Auto-correct runs asset resume, mining, and MCP sync when confidence is low.
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {DOMAINS.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setMissionDomain(d.id)}
                className={`rounded-full px-3 py-1 text-xs border ${
                  missionDomain === d.id
                    ? "border-amber-400/50 bg-amber-500/20 text-amber-100"
                    : "border-white/10 bg-black/30 text-white/60"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
          <textarea
            value={missionObjective}
            onChange={(e) => setMissionObjective(e.target.value)}
            placeholder="Describe what you want CYRUS to accomplish…"
            className="w-full min-h-[80px] rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <ActionButton
              variant="primary"
              loading={actions.executeMission.isPending}
              onClick={() => void runMission()}
              disabled={!missionObjective.trim()}
            >
              <Play className="h-3.5 w-3.5" />
              Execute mission
            </ActionButton>
            <ActionButton loading={actions.selfCorrect.isPending} onClick={() => void actions.selfCorrect.mutateAsync()}>
              <RefreshCw className="h-3.5 w-3.5" />
              Self-correct
            </ActionButton>
          </div>
          {missionResult ? (
            <pre className="mt-4 max-h-48 overflow-auto rounded-xl border border-white/10 bg-black/50 p-3 text-[11px] text-emerald-100/90">
              {JSON.stringify(missionResult, null, 2)}
            </pre>
          ) : null}
        </section>

        {/* Growth + Automation */}
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-2xl border border-cyan-400/15 bg-cyan-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="h-5 w-5 text-cyan-200" />
              <h2 className="text-lg font-medium text-white">Knowledge growth</h2>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Wikipedia + trusted web sources → knowledge base + asset mining.
            </p>
            <p className="text-[11px] text-white/45 mb-3">
              {(growth.data as any)?.growthRunning ? "Running…" : "Idle"}
              {(growth.data as any)?.lastGrowth ? " · last run recorded" : ""}
            </p>
            <ActionButton
              variant="primary"
              loading={actions.runGrowth.isPending}
              onClick={() => void actions.runGrowth.mutateAsync(parseInt(mineTarget, 10) || 2000)}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Start growth run
            </ActionButton>
          </section>

          <section className="rounded-2xl border border-violet-400/15 bg-violet-950/20 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-5 w-5 text-violet-200" />
              <h2 className="text-lg font-medium text-white">Automation cycle</h2>
            </div>
            <p className="text-xs text-white/50 mb-3">
              Full cycle: observe → MCP → resume → grow → mine → calibrate → verify.
            </p>
            <p className="text-[11px] text-white/45 mb-3">
              Scheduler: {(automation.data as any)?.enabled ? "enabled" : "off (set CYRUS_INTELLIGENCE_AUTO=1 on server)"}
              {(automation.data as any)?.cycleRunning ? " · cycle running" : ""}
            </p>
            <ActionButton
              variant="primary"
              loading={actions.runAutomation.isPending}
              onClick={() => void actions.runAutomation.mutateAsync()}
            >
              <Play className="h-3.5 w-3.5" />
              Run automation cycle
            </ActionButton>
          </section>
        </div>

        {/* Assets */}
        <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Database className="h-5 w-5 text-emerald-200" />
            <h2 className="text-lg font-medium text-white">Asset library</h2>
          </div>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <label className="text-xs text-white/50">
              Mine target
              <input
                type="number"
                value={mineTarget}
                onChange={(e) => setMineTarget(e.target.value)}
                className="mt-1 block w-28 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-sm text-white"
              />
            </label>
            <ActionButton loading={actions.mineAssets.isPending} onClick={() => void actions.mineAssets.mutateAsync(parseInt(mineTarget, 10) || 2000)}>
              Mine web assets
            </ActionButton>
            <ActionButton loading={actions.resumeAssets.isPending} onClick={() => void actions.resumeAssets.mutateAsync()}>
              Resume failed
            </ActionButton>
            <ActionButton loading={actions.trainAssets.isPending} onClick={() => void actions.trainAssets.mutateAsync()}>
              Train ML model
            </ActionButton>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2">
              <Search className="h-4 w-4 text-white/40" />
              <input
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                placeholder="Search assets (e.g. heart anatomy)"
                className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
              />
            </div>
            <input
              value={ingestUrl}
              onChange={(e) => setIngestUrl(e.target.value)}
              placeholder="Paste image or 3D URL"
              className="flex-1 min-w-[200px] rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/30"
            />
            <ActionButton
              loading={actions.ingestUrl.isPending}
              disabled={!ingestUrl.trim()}
              onClick={() => {
                void actions.ingestUrl.mutateAsync(ingestUrl.trim()).then(() => setIngestUrl(""));
              }}
            >
              Ingest URL
            </ActionButton>
          </div>
          {search.data?.results?.length ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 mb-4">
              {search.data.results.map((a) => (
                <div key={String(a.id)} className="rounded-xl border border-white/10 bg-black/35 p-2 text-xs">
                  {(a as any).publicPath ? (
                    <img
                      src={String((a as any).publicPath)}
                      alt={String((a as any).title || "asset")}
                      className="mb-2 h-24 w-full rounded-lg object-cover bg-black/50"
                    />
                  ) : null}
                  <p className="font-medium text-white truncate">{String((a as any).title || "Asset")}</p>
                  <p className="text-white/45 truncate">{String((a as any).domain)} · {String((a as any).kind)}</p>
                </div>
              ))}
            </div>
          ) : null}
          {catalog.data?.assets?.length ? (
            <div>
              <p className="text-[11px] text-white/40 mb-2">Recent ingests</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {catalog.data.assets.slice(-8).reverse().map((a) => (
                  <div key={String(a.id)} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] text-white/70 truncate">
                    {String(a.title || a.id)}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {/* MCP */}
        {mcp.data ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-sm font-medium text-white mb-3">MCP integration</h2>
            <div className="flex flex-wrap gap-2">
              {((mcp.data as any).servers as Array<Record<string, unknown>> | undefined)?.map((s) => (
                <span
                  key={String(s.id)}
                  className={`rounded-full px-3 py-1 text-[11px] border ${
                    s.active ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200" : "border-amber-400/30 bg-amber-500/10 text-amber-200"
                  }`}
                >
                  {String(s.id)} {s.active ? "active" : "degraded"}
                </span>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </ModuleWorkspacePageShell>
  );
}

export default IntelligenceHubPage;
