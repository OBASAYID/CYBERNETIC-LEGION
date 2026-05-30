import { useState } from "react";
import {
  Search,
  Users,
  MessageSquare,
  Plus,
} from "lucide-react";

export interface Conversation {
  id: string;
  name: string;
  isGroup: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
  avatarColor?: string;
  participants?: string[];
  isOnline?: boolean;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onCreateGroup?: () => void;
  onNewChat?: () => void;
  holoSurface?: boolean;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onCreateGroup,
  onNewChat,
  holoSurface = false,
}: ConversationListProps) {
  const [search, setSearch] = useState("");

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const formatTime = (ts: string) => {
    if (!ts) return "";
    const d = new Date(ts);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (diff < 604800000) {
      return d.toLocaleDateString([], { weekday: "short" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const gradients = [
    "from-cyan-400 to-amber-600",
    "from-yellow-400 to-orange-500",
    "from-amber-500 to-orange-600",
    "from-lime-400 to-emerald-600",
    "from-sky-400 to-amber-500",
    "from-orange-500 to-amber-400",
  ];

  const getGradient = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return gradients[Math.abs(hash) % gradients.length];
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 px-3 pb-2 pt-3 sm:px-4 sm:pt-4">
        <div className="flex items-center justify-between">
          <h2
            className={
              holoSurface
                ? "text-base font-bold tracking-tight bg-gradient-to-r from-cyan-200 via-sky-200 to-violet-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(0,229,255,0.4)]"
                : "text-base font-bold tracking-tight bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(251,146,60,0.45)]"
            }
            style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
          >
            Chats
          </h2>
          <div className="flex items-center gap-1">
            {onNewChat && (
              <button
                onClick={onNewChat}
                className={
                  holoSurface
                    ? "p-2 rounded-lg text-cyan-200/55 transition hover:bg-cyan-500/15 hover:text-cyan-100 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                    : "p-2 rounded-lg text-amber-200/50 transition hover:bg-amber-500/12 hover:text-cyan-300 hover:shadow-[0_0_12px_rgba(34,211,238,0.35)]"
                }
                title="New Chat"
              >
                <MessageSquare className="w-5 h-5" />
              </button>
            )}
            {onCreateGroup && (
              <button
                onClick={onCreateGroup}
                className={
                  holoSurface
                    ? "p-2 rounded-lg text-cyan-200/50 transition hover:bg-violet-500/15 hover:text-violet-100 hover:shadow-[0_0_12px_rgba(139,92,246,0.28)]"
                    : "p-2 rounded-lg text-amber-200/50 transition hover:bg-orange-500/12 hover:text-orange-200 hover:shadow-[0_0_12px_rgba(251,146,60,0.3)]"
                }
                title="New Group"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
        <div className="relative">
          <Search
            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${holoSurface ? "text-cyan-300/45" : "text-amber-300/50"}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className={`w-full rounded-lg border py-2 pl-9 pr-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/40 ${
              holoSurface
                ? "border-cyan-500/35 bg-slate-950/50 placeholder-cyan-200/30"
                : "border-amber-500/30 bg-slate-950/55 placeholder-amber-200/35"
            }`}
          />
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto px-2 py-1 space-y-0.5 scrollbar-thin scrollbar-track-transparent ${
          holoSurface ? "scrollbar-thumb-cyan-900/50" : "scrollbar-thumb-amber-900/50"
        }`}
      >
        {filtered.length === 0 ? (
          <div className={`flex flex-col items-center justify-center py-12 ${holoSurface ? "text-cyan-200/50" : "text-amber-200/50"}`}>
            <div
              className={
                holoSurface
                  ? "mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/35 to-violet-500/25 shadow-[0_0_24px_rgba(0,229,255,0.35)]"
                  : "mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/35 to-cyan-500/25 shadow-[0_0_24px_rgba(251,146,60,0.35)]"
              }
            >
              <MessageSquare className="h-7 w-7 text-cyan-200/80" />
            </div>
            <p className={`text-sm ${holoSurface ? "text-cyan-100/85" : "text-amber-100/85"}`}>
              {search ? "No conversations found" : "No conversations yet"}
            </p>
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${
                selectedId === conv.id
                  ? holoSurface
                    ? "border border-cyan-400/40 bg-gradient-to-r from-cyan-600/22 to-violet-600/12 shadow-[0_0_22px_-6px_rgba(0,229,255,0.4)]"
                    : "border border-amber-400/35 bg-gradient-to-r from-amber-600/25 to-cyan-600/10 shadow-[0_0_22px_-6px_rgba(251,146,60,0.45)]"
                  : holoSurface
                    ? "hover:bg-cyan-950/25 border border-transparent hover:border-cyan-500/22"
                    : "hover:bg-amber-950/20 border border-transparent hover:border-amber-500/18"
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className={`w-11 h-11 rounded-full bg-gradient-to-br ${getGradient(conv.id)} flex items-center justify-center text-white text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,0,0.35),0_0_12px_rgba(6,182,212,0.2)]`}
                >
                  {conv.isGroup ? (
                    <Users className="w-5 h-5" />
                  ) : (
                    getInitials(conv.name)
                  )}
                </div>
                {conv.isOnline && !conv.isGroup && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 bg-lime-400 shadow-[0_0_8px_#a3e635]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span
                    className={`text-sm font-medium truncate ${
                      selectedId === conv.id ? "text-cyan-100" : holoSurface ? "text-cyan-50/95" : "text-amber-50"
                    }`}
                  >
                    {conv.name}
                  </span>
                  <span className={`text-[10px] shrink-0 ml-2 ${holoSurface ? "text-cyan-300/45" : "text-amber-300/50"}`}>
                    {formatTime(conv.lastMessageTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className={`text-xs truncate pr-2 ${holoSurface ? "text-cyan-200/55" : "text-amber-200/55"}`}>{conv.lastMessage}</p>
                  {conv.unreadCount > 0 && (
                    <span
                      className={
                        holoSurface
                          ? "shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-br from-cyan-400 to-sky-500 text-[10px] font-bold text-slate-950 rounded-full px-1 shadow-[0_0_10px_rgba(0,229,255,0.45)]"
                          : "shrink-0 min-w-[18px] h-[18px] flex items-center justify-center bg-gradient-to-br from-orange-500 to-amber-400 text-[10px] font-bold text-slate-950 rounded-full px-1 shadow-[0_0_10px_rgba(251,146,60,0.5)]"
                      }
                    >
                      {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
