import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Phone, Radio, Users } from "lucide-react";
import { Link } from "wouter";
import { systemFetch } from "@/lib/system-api";

type OnlineUser = {
  id: string;
  displayName?: string;
  name?: string;
  status?: "online" | "offline" | "busy" | "in_call";
  isOnline?: boolean;
  lastSeen?: string;
  profileImageUrl?: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusTone(status: string) {
  if (status === "in_call" || status === "busy") return "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]";
  if (status === "online") return "bg-emerald-400 shadow-[0_0_8px_rgba(74,222,128,0.85)]";
  return "bg-slate-500";
}

function seenAgo(iso?: string) {
  if (!iso) return "now";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 60_000) return "now";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function OnlineUsersSidebar() {
  const usersQuery = useQuery<OnlineUser[]>({
    queryKey: ["/api/comms/users/all", "dashboard-sidebar"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/users/all?includeSelf=1");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 12_000,
  });

  const users = useMemo(() => {
    const arr = usersQuery.data ?? [];
    return arr
      .map((u) => {
        const name = (u.displayName || u.name || "Operator").trim();
        const live = Boolean(u.isOnline || u.status === "online");
        const status = u.status ?? (live ? "online" : "offline");
        return { ...u, name, live, status };
      })
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [usersQuery.data]);

  const activeCount = users.filter((u) => u.live).length;

  return (
    <aside
      className="h-full min-h-[26rem] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-slate-950/82 via-slate-950/68 to-black/65 p-3 shadow-[0_0_38px_-20px_rgba(56,189,248,0.28)] backdrop-blur-sm"
      aria-label="Online users sidebar"
    >
      <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/12">
            <Users className="h-4 w-4 text-sky-300" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-sky-200/60">Live presence</p>
            <h3 className="text-sm font-semibold text-white/95">Online users</h3>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-200/85">
          <Radio className="h-3 w-3 animate-pulse" />
          {activeCount}
        </span>
      </div>

      {usersQuery.isLoading ? (
        <p className="px-1 text-xs text-white/50">Loading active operators…</p>
      ) : users.length === 0 ? (
        <p className="px-1 text-xs text-white/45">No active operators yet.</p>
      ) : (
        <div className="max-h-[min(66vh,34rem)] space-y-1.5 overflow-y-auto pr-1">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-2 rounded-xl border border-white/8 bg-slate-950/45 px-2.5 py-2">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10 text-[11px] font-semibold text-white">
                  {u.profileImageUrl ? (
                    <img src={u.profileImageUrl} alt={u.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(u.name)
                  )}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-slate-950 ${statusTone(u.status)}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/86">{u.name}</p>
                <p className="text-[10px] capitalize text-white/45">
                  {u.status.replace("_", " ")} · {seenAgo(u.lastSeen)}
                </p>
              </div>
              {u.live ? (
                <Link href="/comms">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-sky-400/25 bg-sky-500/10 text-sky-200/80 transition hover:bg-sky-500/20"
                    aria-label={`Contact ${u.name}`}
                    title="Open Comms"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ) : (
                <Activity className="h-3.5 w-3.5 text-white/20" aria-hidden />
              )}
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
