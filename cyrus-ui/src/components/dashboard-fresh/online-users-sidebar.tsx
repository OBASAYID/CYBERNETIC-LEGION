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
} from "@/components/dashboard-fresh/operator-consoles";

const DISPLAY_FONT = "'Orbitron', system-ui, sans-serif";
const BODY_FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

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

/** Reference-style warm stat cards — orange/yellow family with crimson stripe. */
const USER_CARD_THEMES = [
  {
    shell: "bg-gradient-to-br from-[#fde68a] via-[#facc15] to-[#fb923c]",
    name: "text-amber-950",
    meta: "text-amber-900/80",
    label: "text-amber-950/65",
    chip: "border-amber-900/15 bg-white/45 text-amber-950",
    action: "border-amber-950/20 bg-white/50 text-amber-950 hover:bg-white/75",
  },
  {
    shell: "bg-gradient-to-br from-[#fdba74] via-[#f97316] to-[#ea580c]",
    name: "text-orange-950",
    meta: "text-orange-900/80",
    label: "text-orange-950/65",
    chip: "border-orange-950/15 bg-white/40 text-orange-950",
    action: "border-orange-950/20 bg-white/45 text-orange-950 hover:bg-white/70",
  },
  {
    shell: "bg-gradient-to-br from-[#fef08a] via-[#fbbf24] to-[#f59e0b]",
    name: "text-yellow-950",
    meta: "text-yellow-900/80",
    label: "text-yellow-950/65",
    chip: "border-yellow-950/15 bg-white/45 text-yellow-950",
    action: "border-yellow-950/20 bg-white/50 text-yellow-950 hover:bg-white/75",
  },
  {
    shell: "bg-gradient-to-br from-[#fcd34d] via-[#f59e0b] to-[#d97706]",
    name: "text-amber-950",
    meta: "text-amber-900/80",
    label: "text-amber-950/65",
    chip: "border-amber-900/15 bg-white/40 text-amber-950",
    action: "border-amber-950/20 bg-white/45 text-amber-950 hover:bg-white/70",
  },
] as const;

const STANDBY_THEME = {
  shell: "bg-gradient-to-br from-[#fef3c7]/90 via-[#fde68a]/75 to-[#fed7aa]/80",
  name: "text-amber-950/85",
  meta: "text-amber-900/60",
  label: "text-amber-900/50",
  chip: "border-amber-900/10 bg-white/35 text-amber-900/70",
  action: "border-amber-900/15 bg-white/35 text-amber-900/70",
};

function themeIndexForUser(userId: string) {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) hash = (hash + userId.charCodeAt(i) * (i + 1)) % 9973;
  return hash % USER_CARD_THEMES.length;
}

function userCardTheme(userId: string, live: boolean) {
  if (!live) return STANDBY_THEME;
  return USER_CARD_THEMES[themeIndexForUser(userId)] ?? USER_CARD_THEMES[0];
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function statusTone(status: string) {
  if (status === "in_call" || status === "busy") return "bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.85)]";
  if (status === "online") return "bg-emerald-600 shadow-[0_0_6px_rgba(5,150,105,0.85)]";
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

function activityLine(user: SidebarUser) {
  if (user.status === "in_call") return "On a live call";
  if (user.live) return "Just joined the channel";
  return "Viewed updates";
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
    const restById = new Map((usersQuery.data ?? []).map((u) => [u.id, u]));

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
      style={{ fontFamily: BODY_FONT }}
    >
      <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.06]" aria-hidden />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="mb-3 flex shrink-0 items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl border border-[#E70011]/35 bg-[#E70011]/15 shadow-[0_0_18px_rgba(231,0,17,0.25)]">
            <Users className="h-4 w-4 text-[#ff6b6b]" aria-hidden />
          </div>
          <div>
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.34em] text-white/45"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Live panel
            </p>
            <h3
              className="text-[15px] font-bold leading-tight text-white"
              style={{ fontFamily: DISPLAY_FONT }}
            >
              Activity
            </h3>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-[#E70011]/35 bg-[#E70011]/12 px-2.5 py-1 text-[10px] font-bold text-[#ffb4b4]">
          <Radio className="h-3 w-3 animate-pulse text-[#ff6b6b]" />
          {activeCount}
        </span>
      </div>

      {isLoading ? (
        <p className="px-1 text-[13px] leading-relaxed text-white/55">Loading active operators…</p>
      ) : users.length === 0 ? (
        <p className="px-1 text-[13px] leading-relaxed text-white/45">No active operators yet.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto pr-0.5">
          {users.map((u) => {
            const theme = userCardTheme(u.id, u.live);
            return (
              <article
                key={u.id}
                className={cn(
                  "relative overflow-hidden rounded-2xl border border-[#E70011]/55 border-l-[5px] border-l-[#E70011] px-3 py-3 shadow-[0_14px_28px_rgba(0,0,0,0.28)]",
                  theme.shell,
                )}
              >
                <div className="flex items-start gap-2.5">
                  <div className="relative shrink-0">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-white/70 bg-white text-[12px] font-bold text-slate-900 shadow-sm">
                      {u.profileImageUrl ? (
                        <img src={u.profileImageUrl} alt={u.name} className="h-full w-full object-cover" />
                      ) : (
                        initials(u.name)
                      )}
                    </div>
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white ${statusTone(u.status)}`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("truncate text-[13px] font-bold leading-snug", theme.name)}>{u.name}</p>
                      <span className={cn("shrink-0 text-[10px] font-semibold tabular-nums", theme.label)}>
                        {seenAgo(u.lastSeen)}
                      </span>
                    </div>
                    <p className={cn("mt-0.5 text-[12px] leading-snug", theme.meta)}>{activityLine(u)}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
                          theme.chip,
                        )}
                        style={{ fontFamily: DISPLAY_FONT }}
                      >
                        {u.live ? "Reply" : "Standby"}
                      </span>
                      {u.live ? (
                        <Link href="/comms">
                          <button
                            type="button"
                            className={cn(
                              "inline-flex h-8 w-8 items-center justify-center rounded-xl border transition",
                              theme.action,
                            )}
                            aria-label={`Contact ${u.name}`}
                            title="Open Comms"
                          >
                            <Phone className="h-3.5 w-3.5" />
                          </button>
                        </Link>
                      ) : (
                        <Activity className={cn("h-3.5 w-3.5", theme.label)} aria-hidden />
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </aside>
  );
}
