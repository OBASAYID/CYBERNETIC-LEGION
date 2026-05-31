import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePresence } from "../../../../client/src/contexts/PresenceContext";
import { systemFetch } from "@/lib/system-api";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_CONSOLE_SHADOW,
  DASHBOARD_DARK_CONSOLE_BG,
} from "@/components/dashboard-fresh/operator-consoles";

/** Reference activity feed — clean sans like the book dashboard mock. */
const BODY_FONT =
  "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', system-ui, sans-serif";

/** Frosted activity card shell from reference (dark glass, soft radius, no stripe). */
const ACTIVITY_CARD =
  "rounded-[20px] border border-white/[0.06] bg-white/[0.08] px-3.5 py-3 shadow-[0_10px_28px_rgba(0,0,0,0.22)] backdrop-blur-md";

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

function activityMessage(user: SidebarUser) {
  if (user.status === "in_call") return "Joined a live comms channel.";
  if (user.live) return "Just joined the channel.";
  return "Viewed recent Pshare updates.";
}

type OnlineUsersSidebarProps = {
  className?: string;
};

function ActivityUserCard({ user }: { user: SidebarUser }) {
  return (
    <article className={cn(ACTIVITY_CARD, !user.live && "opacity-80")}>
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/10">
          {user.profileImageUrl ? (
            <img src={user.profileImageUrl} alt={user.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-white/15 text-[11px] font-semibold text-white/90">
              {initials(user.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <p className="truncate text-[13px] font-semibold leading-tight text-white">{user.name}</p>
            <span className="shrink-0 text-[11px] font-normal tabular-nums text-white/40">
              {seenAgo(user.lastSeen)}
            </span>
          </div>

          <p className="mt-1.5 text-[13px] font-normal leading-[1.45] text-white/88">
            {activityMessage(user)}
          </p>

          {user.live ? (
            <Link href="/comms">
              <button
                type="button"
                className="mt-2 text-[12px] font-normal text-white/38 transition hover:text-white/62"
              >
                Reply
              </button>
            </Link>
          ) : (
            <span className="mt-2 inline-block text-[12px] font-normal text-white/32">Reply</span>
          )}
        </div>
      </div>
    </article>
  );
}

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

  const isLoading = !isConnected && usersQuery.isLoading;

  return (
    <aside
      className={cn(
        "relative flex h-full min-h-[26rem] flex-col overflow-hidden rounded-2xl border border-white/14 p-4 backdrop-blur-xl cyrus-xs-live-panel-sidebar",
        DASHBOARD_DARK_CONSOLE_BG,
        DASHBOARD_CONSOLE_SHADOW,
        className,
      )}
      aria-label="Online users sidebar"
      style={{ fontFamily: BODY_FONT }}
    >
      <h3 className="mb-3 shrink-0 text-[15px] font-semibold tracking-[-0.01em] text-white">Activity</h3>

      {isLoading ? (
        <p className="text-[13px] text-white/45">Loading active operators…</p>
      ) : users.length === 0 ? (
        <p className="text-[13px] text-white/40">No active operators yet.</p>
      ) : (
        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-0.5">
          {users.map((u) => (
            <ActivityUserCard key={u.id} user={u} />
          ))}
        </div>
      )}
    </aside>
  );
}
