/**
 * Pshare chat history — manually archived posts (optional archive flow).
 */
import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { systemFetch } from "@/lib/system-api";
import { PsharePostCard } from "./pshare-post-card";
import type { PsharePost } from "./pshare-types";

const C = {
  border: "rgba(255,255,255,0.08)",
} as const;

type PshareHistoryPanelProps = {
  myUserId: string;
  isAdmin?: boolean;
};

export function PshareHistoryPanel({ myUserId, isAdmin = false }: PshareHistoryPanelProps) {
  const historyQuery = useQuery<PsharePost[]>({
    queryKey: ["/api/comms/pshare/history"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/pshare/history");
      if (!res.ok) throw new Error("Failed to load chat history");
      const data = await res.json();
      return Array.isArray(data.posts) ? data.posts : [];
    },
    refetchInterval: 30_000,
  });

  const posts = historyQuery.data ?? [];

  return (
    <div
      className="mx-4 mb-3 overflow-hidden rounded-xl border"
      style={{ borderColor: C.border, background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center gap-2 border-b px-3 py-2.5" style={{ borderColor: C.border }}>
        <History className="h-4 w-4 text-white/50" />
        <div>
          <p className="text-[11px] font-bold text-white">Chat history</p>
          <p className="text-[10px] text-white/45">Posts you remove from the live feed appear here until deleted</p>
        </div>
      </div>

      <div className="max-h-[min(52vh,28rem)] space-y-2 overflow-y-auto p-3">
        {historyQuery.isLoading && (
          <p className="text-[11px] text-white/40">Loading chat history…</p>
        )}
        {historyQuery.isError && (
          <p className="text-[11px] text-amber-200/80">Chat history unavailable right now.</p>
        )}
        {!historyQuery.isLoading && posts.length === 0 && (
          <p className="text-[11px] text-white/35">No archived Pshare posts yet.</p>
        )}
        {posts.map((post) => (
          <PsharePostCard
            key={post.id}
            post={post}
            myUserId={myUserId}
            variant="feed"
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}
