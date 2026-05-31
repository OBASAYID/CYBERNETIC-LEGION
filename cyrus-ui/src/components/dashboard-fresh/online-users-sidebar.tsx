import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Phone, Radio, Users } from "lucide-react";
import { Link } from "wouter";
import { usePresence } from "../../../../client/src/contexts/PresenceContext";
import { systemFetch } from "@/lib/system-api";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_CONSOLE_SHADOW,
  DASHBOARD_DARK_CONSOLE_BG,
  DASHBOARD_DARK_CONSOLE_INNER,
} from "@/components/dashboard-fresh/operator-consoles";

type OnlineUser = {
  id: string;
  displayName?: string;
  name?: string;
  status?: "online" | "offline" | "busy" | "in_call";
  isOnline?: boolean;
  lastSeen?: string;
  profileImageUrl?: string | null;
};

type SidebarUser = {
  id: string;
  name: string;
  live: boolean;
  status: string;
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

type OnlineUsersSidebarProps = {
  className?: string;
};

export function OnlineUsersSidebar({ className }: OnlineUsersSidebarProps) {
  const { onlineUsers, isConnected } = usePresence();

  const usersQuery = useQuery<OnlineUser[]>({
    queryKey: ["/api/comms/users/all", "dashboard-sidebar"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/users/all?includeSelf=1");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: isConnected ? 60_000 : 12_000,
  });

  const users = useMemo((): SidebarUser[] => {
    const restById = new Map(
      (usersQuery.data ?? []).map((u) => [u.id, u]),
    );

    const liveRows: SidebarUser[] =
      isConnected && onlineUsers.length > 0
        ? onlineUsers.map((u) => {
            const rest = restById.get(u.id);
            const name = (u.displayName || rest?.displayName || rest?.name || "Operator").trim();
            const status = u.inCall ? "in_call" : "online";
            return {
              id: u.id,
              name,
              live: true,
              status,
              lastSeen: u.lastActivity ?? rest?.lastSeen,
              profileImageUrl: u.profileImageUrl ?? rest?.profileImageUrl ?? null,
            };
          })
        : (usersQuery.data ?? []).map((u) => {
            const name = (u.displayName || u.name || "Operator").trim();
            const live = Boolean(u.isOnline || u.status === "online");
            const status = u.status ?? (live ? "online" : "offline");
            return {
              id: u.id,
              name,
              live,
              status,
              lastSeen: u.lastSeen,
              profileImageUrl: u.profileImageUrl ?? null,
            };
          });

    return liveRows
      .sort((a, b) => {
        if (a.live !== b.live) return a.live ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  }, [isConnected, onlineUsers, usersQuery.data]);

  const activeCount = users.filter((u) => u.live).length;
  const isLoading = !isConnected && usersQuery.isLoading;

  return (
    <aside
      className={cn(
        "relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-white/14 p-3.5 backdrop-blur-xl cyrus-xs-live-panel-sidebar",
        DASHBOARD_DARK_CONSOLE_BG,
        DASHBOARD_CONSOLE_SHADOW,
        className,
      )}
      aria-label="Online users sidebar"
    >
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.08]" aria-hidden />
      <div className="pointer-events-none absolute -left-8 bottom-8 h-28 w-28 rounded-full bg-black/40 blur-2xl" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      <div className="mb-2.5 flex shrink-0 items-center justify-between border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/12">
            <Users className="h-4 w-4 text-sky-300" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-sky-200/60">Live panel</p>
            <h3 className="text-sm font-semibold text-white/95">Activity</h3>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-200/85">
          <Radio className="h-3 w-3 animate-pulse" />
          {activeCount}
        </span>
      </div>

      {isLoading ? (
        <p className="px-1 text-xs text-white/50">Loading active operators…</p>
      ) : users.length === 0 ? (
        <p className="px-1 text-xs text-white/45">No active operators yet.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {users.map((u) => (
            <div key={u.id} className={`px-3 py-2.5 text-slate-100 shadow-[0_10px_22px_rgba(0,0,0,0.45)] ${DASHBOARD_DARK_CONSOLE_INNER}`}>
              <div className="flex items-center gap-2">
              <div className="relative">
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/30 bg-slate-100 text-[11px] font-semibold text-slate-900">
                  {u.profileImageUrl ? (
                    <img src={u.profileImageUrl} alt={u.name} className="h-full w-full object-cover" />
                  ) : (
                    initials(u.name)
                  )}
                </div>
                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-white ${statusTone(u.status)}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/95">{u.name}</p>
                <p className="text-[10px] text-slate-200/78">
                  {u.live ? "Just joined the channel" : "Viewed updates"} · {seenAgo(u.lastSeen)}
                </p>
                <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-300/55">
                  {u.live ? "Reply" : "Standby"}
                </p>
              </div>
              {u.live ? (
                <Link href="/comms">
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/24 bg-white/12 text-slate-100 transition hover:bg-white/20"
                    aria-label={`Contact ${u.name}`}
                    title="Open Comms"
                  >
                    <Phone className="h-3.5 w-3.5" />
                  </button>
                </Link>
              ) : (
                <Activity className="h-3.5 w-3.5 text-slate-300/65" aria-hidden />
              )}
              </div>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
