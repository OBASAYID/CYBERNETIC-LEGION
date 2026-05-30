/**
 * Pshare broadcast feed — wired to server comms engine (/api/comms/pshare/*).
 */
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Radio, Send } from "lucide-react";
import { systemFetch } from "@/lib/system-api";

type PsharePost = {
  id: string;
  authorName?: string;
  body: string;
  createdAt?: string;
};

const C = {
  crimson: "#e11d48",
  border: "rgba(255,255,255,0.08)",
} as const;

export function PshareTabPanel() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");

  const postsQuery = useQuery<PsharePost[]>({
    queryKey: ["/api/comms/pshare/posts", "comms-hub"],
    queryFn: async () => {
      const res = await systemFetch("/api/comms/pshare/posts");
      if (!res.ok) throw new Error("Failed to load Pshare");
      const data = await res.json();
      return Array.isArray(data.posts) ? data.posts : [];
    },
    refetchInterval: 6000,
  });

  const createPost = useMutation({
    mutationFn: async (body: string) => {
      const res = await systemFetch("/api/comms/pshare/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Post failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setDraft("");
      void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
    },
  });

  const posts = postsQuery.data ?? [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        className="flex shrink-0 items-center justify-between px-5 py-3.5"
        style={{ borderBottom: `1px solid ${C.border}` }}
      >
        <div>
          <p className="text-sm font-bold text-white">Pshare</p>
          <p className="text-[10px] text-white/35">Broadcast to all operators</p>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{ background: `${C.crimson}18`, border: `1px solid ${C.crimson}35` }}
        >
          <Radio className="h-2.5 w-2.5 text-rose-400" strokeWidth={2} />
          <span className="text-[8px] font-bold text-rose-400">LIVE</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {postsQuery.isLoading && (
          <p className="text-[11px] text-white/40">Loading feed…</p>
        )}
        {postsQuery.isError && (
          <p className="text-[11px] text-amber-300/80">Pshare unavailable — check server comms routes.</p>
        )}
        {!postsQuery.isLoading && posts.length === 0 && (
          <p className="text-[11px] text-white/35">No broadcasts yet. Post the first update.</p>
        )}
        {posts.map((p) => (
          <div
            key={p.id}
            className="rounded-xl px-3 py-2.5"
            style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}` }}
          >
            <p className="text-[10px] font-semibold text-rose-300/90">{p.authorName ?? "Operator"}</p>
            <p className="mt-1 text-[12px] text-white/85 whitespace-pre-wrap">{p.body}</p>
          </div>
        ))}
      </div>

      <div className="shrink-0 border-t px-4 py-3" style={{ borderColor: C.border }}>
        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                const t = draft.trim();
                if (t) createPost.mutate(t);
              }
            }}
            placeholder="Broadcast message… (⌘↵ to send)"
            rows={2}
            className="flex-1 resize-none rounded-xl bg-white/5 px-3 py-2 text-[12px] text-white outline-none placeholder:text-white/25"
            style={{ border: `1px solid ${C.border}` }}
          />
          <button
            type="button"
            disabled={!draft.trim() || createPost.isPending}
            onClick={() => {
              const t = draft.trim();
              if (t) createPost.mutate(t);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:opacity-40"
            style={{ background: `${C.crimson}22`, border: `1px solid ${C.crimson}40` }}
          >
            <Send className="h-4 w-4 text-rose-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
