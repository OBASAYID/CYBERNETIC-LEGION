import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Newspaper, RefreshCw } from "lucide-react";
import { systemFetch } from "@/lib/system-api";
import { cn } from "@/lib/utils";
import { LiveBroadcastBadge } from "./operator-consoles";
import type { NewsItem } from "./types";
import { newsItemAccent } from "./types";

function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function NewsTrendFeed({ className }: { className?: string }) {
  const newsQuery = useQuery<NewsItem[]>({
    queryKey: ["/api/comms/news"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/news");
      if (!res.ok) throw new Error("Failed to load news feed");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const items = newsQuery.data ?? [];

  return (
    <section
      className={cn(
        "relative mt-auto overflow-hidden rounded-2xl border border-red-500/20 bg-gradient-to-b from-slate-950/80 via-slate-950/60 to-black/50 p-4 shadow-[0_0_40px_-18px_rgba(248,113,113,0.25)] backdrop-blur-sm",
        className,
      )}
      aria-label="Live broadcast news feed"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/45 to-transparent" />
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/30 bg-red-500/10">
            <Newspaper className="h-4 w-4 text-red-200" aria-hidden />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[10px] font-mono uppercase tracking-[0.32em] text-red-200/55">Signal desk</p>
              <LiveBroadcastBadge />
            </div>
            <h2
              className="text-sm font-semibold text-white/95"
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              Live broadcast news feed
            </h2>
          </div>
        </div>
        <button
          type="button"
          onClick={() => newsQuery.refetch()}
          disabled={newsQuery.isFetching}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-white/12 bg-slate-950/40 px-3 text-[11px] text-white/75 touch-manipulation hover:border-red-400/30 hover:text-white"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", newsQuery.isFetching && "animate-spin")} aria-hidden />
          Refresh
        </button>
      </div>

      {newsQuery.isLoading ? (
        <p className="text-xs text-white/55">Tuning live headlines…</p>
      ) : newsQuery.isError ? (
        <p className="text-xs text-amber-200/80">News feed unavailable — check API keys or network.</p>
      ) : items.length === 0 ? (
        <p className="text-xs text-white/55">No headlines yet. Feed refreshes every minute.</p>
      ) : (
        <ul className="max-h-[min(42vh,22rem)] space-y-2 overflow-y-auto pr-1">
          {items.slice(0, 12).map((item) => {
            const accent = newsItemAccent(item);
            return (
              <li
                key={item.id}
                className="rounded-xl border border-white/10 bg-slate-950/45 p-3 transition hover:border-white/20"
                style={{ borderLeftColor: accent, borderLeftWidth: 3 }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-white/95">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-1 line-clamp-2 text-xs text-white/60">{item.summary}</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-wide text-white/45">
                      <span style={{ color: accent }}>{item.source || "Wire"}</span>
                      <span>·</span>
                      <span>{formatWhen(item.publishedAt)}</span>
                      {item.category ? (
                        <>
                          <span>·</span>
                          <span>{item.category}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {item.url && item.url !== "#" ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-cyan-400/35 hover:text-cyan-100"
                      aria-label={`Open article: ${item.title}`}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
