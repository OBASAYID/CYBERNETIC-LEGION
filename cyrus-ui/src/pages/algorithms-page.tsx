import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BookOpen, CircuitBoard, ExternalLink } from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";
import { systemFetch } from "@/lib/system-api";

type CatalogResponse = {
  success: boolean;
  catalog: {
    version: string;
    orchestrator: {
      title: string;
      description: string;
      items: Array<{
        id: string;
        name: string;
        description: string;
        uiRoute?: string;
        apis?: Array<{ method: string; path: string; summary?: string }>;
      }>;
    };
    upgradeApis: Array<{
      id: string;
      title: string;
      description: string;
      items: Array<{
        id: string;
        name: string;
        description: string;
        uiRoute?: string;
        apis?: Array<{ method: string; path: string }>;
      }>;
    }>;
    pythonCore: {
      id: string;
      title: string;
      description: string;
      items: Array<{ id: string; name: string; description: string; uiRoute?: string }>;
    };
    assetIntelligence?: {
      id: string;
      title: string;
      description: string;
      items: Array<{
        id: string;
        name: string;
        description: string;
        uiRoute?: string;
        apis?: Array<{ method: string; path: string; summary?: string }>;
      }>;
    };
    mcp?: {
      id: string;
      title: string;
      description: string;
      items: Array<{
        id: string;
        name: string;
        description: string;
        uiRoute?: string;
        apis?: Array<{ method: string; path: string }>;
      }>;
    };
  };
  ts: number;
};

export function AlgorithmsPage() {
  const { data, isLoading, error } = useQuery<CatalogResponse>({
    queryKey: ["/api/algorithms/catalog"],
    queryFn: async () => {
      const res = await systemFetch("/api/algorithms/catalog");
      if (!res.ok) throw new Error("Failed to load algorithm catalog");
      return res.json();
    },
  });

  const cat = data?.catalog;

  return (
    <ModuleWorkspacePageShell
      kicker="Integrated"
      title="Algorithms & API map"
      icon={CircuitBoard}
      subtitle="Orchestrator engines, upgrade REST endpoints, and Python core-algorithm families in one view. Open a module to run the UI; use API paths from the same origin (session may be required for some routes)."
      headerEnd={
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href="/intelligence">
            <button
              type="button"
              className="rounded-full border border-cyan-400/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 hover:bg-cyan-500/20"
            >
              Intelligence Hub
            </button>
          </Link>
          <Link href="/modules">
            <button
              type="button"
              className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs hover:bg-white/10"
            >
              Modules console
            </button>
          </Link>
          <Link href="/quantum">
            <button
              type="button"
              className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1.5 text-xs text-violet-100 hover:bg-violet-500/20"
            >
              Quantum UI
            </button>
          </Link>
        </div>
      }
    >
      <div className="max-w-5xl space-y-8 overflow-y-auto">
        {isLoading && <p className="text-sm text-white/45">Loading catalog…</p>}
        {error && <p className="text-sm text-rose-300">{(error as Error).message}</p>}

        {cat && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-5 h-5 text-[#e11d48]/80" />
                <h2 className="text-lg font-bold text-white">{cat.orchestrator.title}</h2>
                <span className="text-[10px] text-white/40 ml-auto">v{cat.version}</span>
              </div>
              <p className="text-xs text-white/50 mb-4">{cat.orchestrator.description}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {cat.orchestrator.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-white/10 bg-black/40 px-3 py-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-white">{item.name}</p>
                        <p className="text-[11px] text-white/50 mt-0.5">{item.description}</p>
                      </div>
                      {item.uiRoute ? (
                        <Link href={item.uiRoute}>
                          <span className="text-[10px] text-cyan-300 hover:underline shrink-0">Open</span>
                        </Link>
                      ) : null}
                    </div>
                    {item.apis?.length ? (
                      <ul className="mt-2 space-y-1 text-[10px] font-mono text-white/45">
                        {item.apis.slice(0, 2).map((a) => (
                          <li key={`${item.id}-${a.path}`}>
                            {a.method} {a.path}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>

            {cat.upgradeApis.map((family) => (
              <section key={family.id} className="rounded-2xl border border-cyan-400/10 bg-cyan-950/20 p-5">
                <h2 className="text-lg font-medium text-white mb-1">{family.title}</h2>
                <p className="text-xs text-white/50 mb-4">{family.description}</p>
                <div className="space-y-4">
                  {family.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-black/35 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                        </div>
                        {item.uiRoute ? (
                          <Link href={item.uiRoute}>
                            <button
                              type="button"
                              className="text-[11px] px-2 py-1 rounded-lg border border-cyan-400/30 text-cyan-200 hover:bg-cyan-500/10"
                            >
                              UI
                            </button>
                          </Link>
                        ) : null}
                      </div>
                      {item.apis?.length ? (
                        <ul className="mt-3 space-y-1.5 text-[11px] font-mono text-emerald-200/80">
                          {item.apis.map((a) => (
                            <li key={`${item.id}-${a.path}`} className="flex items-center gap-2">
                              <span className="text-white/40 w-11 shrink-0">{a.method}</span>
                              <code className="text-emerald-100/90">{a.path}</code>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}

            {cat.assetIntelligence ? (
              <section className="rounded-2xl border border-emerald-400/15 bg-emerald-950/20 p-5">
                <h2 className="text-lg font-medium text-white mb-1">{cat.assetIntelligence.title}</h2>
                <p className="text-xs text-white/50 mb-4">{cat.assetIntelligence.description}</p>
                <div className="space-y-4">
                  {cat.assetIntelligence.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-black/35 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-xs text-white/50 mt-0.5">{item.description}</p>
                        </div>
                        {item.uiRoute ? (
                          <Link href={item.uiRoute}>
                            <button type="button" className="text-[11px] px-2 py-1 rounded-lg border border-emerald-400/30 text-emerald-200 hover:bg-emerald-500/10">
                              Open Hub
                            </button>
                          </Link>
                        ) : null}
                      </div>
                      {item.apis?.length ? (
                        <ul className="mt-3 space-y-1.5 text-[11px] font-mono text-emerald-200/80">
                          {item.apis.map((a) => (
                            <li key={`${item.id}-${a.path}`} className="flex items-center gap-2">
                              <span className="text-white/40 w-11 shrink-0">{a.method}</span>
                              <code className="text-emerald-100/90">{a.path}</code>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {cat.mcp ? (
              <section className="rounded-2xl border border-cyan-400/15 bg-cyan-950/20 p-5">
                <h2 className="text-lg font-medium text-white mb-1">{cat.mcp.title}</h2>
                <p className="text-xs text-white/50 mb-4">{cat.mcp.description}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {cat.mcp.items.map((item) => (
                    <div key={item.id} className="rounded-xl border border-white/10 bg-black/35 px-3 py-3 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-white">{item.name}</p>
                          <p className="text-[11px] text-white/50 mt-0.5">{item.description}</p>
                        </div>
                        {item.uiRoute ? (
                          <Link href={item.uiRoute}>
                            <span className="text-[10px] text-cyan-300 hover:underline shrink-0">Open</span>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="rounded-2xl border border-violet-400/15 bg-violet-950/25 p-5">
              <h2 className="text-lg font-medium text-white mb-1">{cat.pythonCore.title}</h2>
              <p className="text-xs text-white/50 mb-4">{cat.pythonCore.description}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {cat.pythonCore.items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm">
                    <p className="font-medium text-violet-100">{item.name}</p>
                    <p className="text-[11px] text-white/50 mt-0.5">{item.description}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-white/40 mt-4 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                Code: <span className="font-mono">server/quantum_ai/core_algorithms/</span>
              </p>
            </section>
          </>
        )}
      </div>
    </ModuleWorkspacePageShell>
  );
}

export default AlgorithmsPage;
