import { useCallback, useEffect, useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { annotateCommsSharedMedia } from "../../lib/comms-shared-media";
import { systemFetch } from "@shared/cyrus-api-client";

type Annotation = {
  userId?: string;
  userName?: string | null;
  displayName?: string | null;
  type?: string;
  data?: { text?: string } | null;
  timestamp?: string;
};

type CommsMediaCommentsProps = {
  mediaId?: string;
  fileUrl?: string;
  roomId: string;
  currentUserId: string;
  currentUserName?: string;
  socketRef?: React.MutableRefObject<{
    emit: (event: string, payload: unknown) => void;
    connected?: boolean;
    on?: (event: string, handler: (payload: unknown) => void) => void;
    off?: (event: string, handler: (payload: unknown) => void) => void;
  } | null>;
};

function annotationAuthor(a: Annotation): string {
  return a.userName || a.displayName || "User";
}

export function CommsMediaComments({
  mediaId: mediaIdProp,
  fileUrl,
  roomId,
  currentUserId,
  currentUserName,
  socketRef,
}: CommsMediaCommentsProps) {
  const [resolvedMediaId, setResolvedMediaId] = useState(mediaIdProp || "");
  const [comments, setComments] = useState<Annotation[]>([]);
  const [draft, setDraft] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mediaIdProp) setResolvedMediaId(mediaIdProp);
  }, [mediaIdProp]);

  const load = useCallback(async () => {
    try {
      const res = await systemFetch(
        `/api/comms/shared-media?callSessionId=${encodeURIComponent(roomId)}&limit=100`,
      );
      if (!res.ok) return;
      const rows = (await res.json()) as Array<{
        mediaId: string;
        fileUrl?: string | null;
        annotations?: Annotation[];
      }>;
      const row =
        (resolvedMediaId ? rows.find((r) => r.mediaId === resolvedMediaId) : undefined) ||
        (fileUrl ? rows.find((r) => r.fileUrl === fileUrl) : undefined);
      if (row?.mediaId && !resolvedMediaId) setResolvedMediaId(row.mediaId);
      const list = Array.isArray(row?.annotations)
        ? row!.annotations!.filter((a) => a.type === "comment")
        : [];
      setComments(list);
      if (list.length > 0) setOpen(true);
    } catch {
      /* non-fatal */
    }
  }, [resolvedMediaId, fileUrl, roomId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const socket = socketRef?.current;
    if (!socket?.on || !socket.off || !resolvedMediaId) return;

    const onAnnotated = (payload: unknown) => {
      const data = payload as { mediaId?: string; annotation?: Annotation };
      if (data.mediaId !== resolvedMediaId || data.annotation?.type !== "comment") return;
      setComments((prev) => [...prev, data.annotation!]);
      setOpen(true);
    };

    socket.on("media-annotated", onAnnotated);
    return () => {
      socket.off?.("media-annotated", onAnnotated);
    };
  }, [socketRef, resolvedMediaId]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || saving || !resolvedMediaId) return;
    setSaving(true);
    const annotationData = { text };
    try {
      if (socketRef?.current?.connected) {
        socketRef.current.emit("annotate-media", {
          mediaId: resolvedMediaId,
          annotationType: "comment",
          annotationData,
          roomId,
        });
      } else {
        await annotateCommsSharedMedia(resolvedMediaId, {
          annotationType: "comment",
          annotationData,
          userName: currentUserName,
        });
      }
      setComments((prev) => [
        ...prev,
        {
          userId: currentUserId,
          userName: currentUserName || "You",
          type: "comment",
          data: annotationData,
          timestamp: new Date().toISOString(),
        },
      ]);
      setDraft("");
      setOpen(true);
    } finally {
      setSaving(false);
    }
  };

  if (!resolvedMediaId && !fileUrl) return null;

  if (!open && comments.length === 0) {
    return (
      <div className="rounded-lg border border-cyan-500/15 bg-cyan-950/20 px-2 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 text-[10px] text-cyan-200/70 hover:text-cyan-100"
        >
          <MessageSquarePlus className="h-3 w-3" />
          Add review comment
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-cyan-500/15 bg-cyan-950/25 px-2 py-2">
      <p className="text-[9px] font-mono uppercase tracking-wider text-cyan-300/50">Team review</p>
      {comments.slice(-4).map((c, i) => (
        <div key={`${c.timestamp}-${i}`} className="text-[10px] text-white/75">
          <span className="font-medium text-cyan-200/80">{annotationAuthor(c)}: </span>
          <span>{typeof c.data?.text === "string" ? c.data.text : ""}</span>
        </div>
      ))}
      <div className="flex gap-1 pt-1">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Comment on this file…"
          className="min-w-0 flex-1 rounded border border-gray-700/50 bg-black/30 px-2 py-1 text-[10px] text-white placeholder:text-white/30"
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <button
          type="button"
          disabled={!draft.trim() || saving || !resolvedMediaId}
          onClick={() => void submit()}
          className="rounded bg-cyan-600/80 px-2 py-1 text-[10px] text-white disabled:opacity-40"
        >
          Post
        </button>
      </div>
    </div>
  );
}
