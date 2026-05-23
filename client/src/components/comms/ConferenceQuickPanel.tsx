import { useState, useCallback, useEffect } from "react";
import { Check, Copy, Users } from "lucide-react";
import {
  commsCreateConference,
  commsJoinConference,
  readStoredConference,
  persistStoredConference,
  type CommsConference,
} from "../../lib/comms-conference-api";

type StoredConference = {
  conferenceId: string;
  roomCode?: string;
  title?: string;
};

function readStoredConferenceId(): string {
  return readStoredConference()?.conferenceId ?? "";
}

/**
 * Minimal conference bootstrap (Phase 3). Full multi-peer WebRTC UI can layer on these room IDs later.
 */
export function ConferenceQuickPanel({
  displayName,
  seedConference,
  onConferenceMedia,
}: {
  displayName: string;
  seedConference?: CommsConference | null;
  /** After REST create/join, start WebRTC media on the conference room ID. */
  onConferenceMedia?: (conference: CommsConference, action: "create" | "join") => void;
}) {
  const [title, setTitle] = useState("CYRUS room");
  const [joinId, setJoinId] = useState(readStoredConferenceId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<CommsConference | null>(
    () => seedConference ?? readStoredConference() as CommsConference | null,
  );
  const [copied, setCopied] = useState<null | "code" | "id">(null);

  useEffect(() => {
    if (!seedConference) return;
    setLastCreated(seedConference);
    setJoinId(seedConference.conferenceId);
    setMessage(`Round-table group call active — room ${seedConference.roomCode}.`);
  }, [seedConference]);

  const flashCopied = useCallback((which: "code" | "id") => {
    setCopied(which);
    window.setTimeout(() => setCopied(null), 2000);
  }, []);

  const copyText = useCallback(async (text: string, which: "code" | "id") => {
    try {
      await navigator.clipboard.writeText(text);
      flashCopied(which);
    } catch {
      setMessage("Could not copy — check browser permissions.");
    }
  }, [flashCopied]);

  const onCreate = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    const { conference, error } = await commsCreateConference({
      title: title.trim() || "Meeting",
      userName: displayName || "Host",
      maxParticipants: 50,
    });
    setBusy(false);
    if (error || !conference) {
      setMessage(error || "Create failed");
      return;
    }
    persistStoredConference({
      conferenceId: conference.conferenceId,
      roomCode: conference.roomCode,
      title: conference.title,
    });
    setLastCreated(conference);
    setJoinId(conference.conferenceId);
    setMessage(`Created "${conference.title}". Starting group media…`);
    onConferenceMedia?.(conference, "create");
  }, [title, displayName, onConferenceMedia]);

  const onJoin = useCallback(async () => {
    const id = joinId.trim();
    if (!id) return;
    setBusy(true);
    setMessage(null);
    const { success, error } = await commsJoinConference({
      conferenceId: id,
      userName: displayName || "Guest",
    });
    setBusy(false);
    if (!success) {
      setMessage(error || "Join failed");
      return;
    }
    let next: StoredConference = { conferenceId: id };
    if (lastCreated?.conferenceId === id) {
      next = {
        conferenceId: id,
        roomCode: lastCreated.roomCode,
        title: lastCreated.title,
      };
    } else {
      const prev = readStoredConference();
      if (prev?.conferenceId === id) next = prev;
    }
    persistStoredConference(next);
    setMessage("Joined conference — connecting media…");
    onConferenceMedia?.(
      lastCreated?.conferenceId === id
        ? lastCreated
        : { conferenceId: id, title: next.title || "Conference", roomCode: next.roomCode || "—" },
      "join",
    );
  }, [joinId, displayName, lastCreated, onConferenceMedia]);

  return (
    <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-950/25 via-violet-950/20 to-[#021018]/80 p-4 shadow-[0_0_32px_-8px_rgba(0,229,255,0.25)]">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-cyan-200/95">
        <Users className="h-4 w-4" />
        Conference bridge
      </h3>
      <p className="mb-3 text-[11px] leading-relaxed text-white/50">
        Server-backed rooms for round-table group calls. Create or join — media connects via SFU or star relay automatically.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-[11px] text-white/60">
          Room title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={() => void onCreate()}
          className="rounded-lg bg-cyan-600/85 px-3 py-2 text-xs font-medium text-white shadow-[0_0_16px_rgba(0,229,255,0.25)] hover:bg-cyan-500 disabled:opacity-50"
        >
          Create
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-[11px] text-white/60">
          Join by conference ID
          <input
            value={joinId}
            onChange={(e) => setJoinId(e.target.value)}
            placeholder="Paste conference UUID (restored from last session if saved)"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={busy || !joinId.trim()}
          onClick={() => void onJoin()}
          className="rounded-lg border border-cyan-400/45 bg-transparent px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-500/10 disabled:opacity-50"
        >
          Join
        </button>
      </div>
      {lastCreated && (
        <div className="mt-3 space-y-2 rounded-lg border border-white/10 bg-slate-950/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-white/40">Share / copy</p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[10px] text-white/45">Room code</p>
              <p className="font-mono text-sm text-violet-100">{lastCreated.roomCode}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void copyText(lastCreated.roomCode, "code")}
              className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/85 hover:bg-white/10 disabled:opacity-50"
              aria-label="Copy room code"
            >
              {copied === "code" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "code" ? "Copied" : "Copy"}
            </button>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-white/45">Conference ID (for Join)</p>
              <p className="break-all font-mono text-[11px] text-white/80">{lastCreated.conferenceId}</p>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void copyText(lastCreated.conferenceId, "id")}
              className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-[11px] text-white/85 hover:bg-white/10 disabled:opacity-50"
              aria-label="Copy conference ID"
            >
              {copied === "id" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied === "id" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
      {message && <p className="mt-2 text-[11px] text-emerald-200/90">{message}</p>}
    </div>
  );
}
