import { useState, useCallback } from "react";
import { Check, Copy, Users } from "lucide-react";
import {
  commsCreateConference,
  commsJoinConference,
  type CommsConference,
} from "../../lib/comms-conference-api";

const LAST_CONFERENCE_KEY = "cyrus-comms-last-conference";

type StoredConference = {
  conferenceId: string;
  roomCode?: string;
  title?: string;
};

function readStoredConferenceId(): string {
  if (typeof sessionStorage === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(LAST_CONFERENCE_KEY);
    if (!raw) return "";
    const j = JSON.parse(raw) as StoredConference;
    return typeof j.conferenceId === "string" ? j.conferenceId : "";
  } catch {
    return "";
  }
}

function persistConference(c: StoredConference) {
  try {
    sessionStorage.setItem(LAST_CONFERENCE_KEY, JSON.stringify(c));
  } catch {
    /* quota / private mode */
  }
}

/**
 * Minimal conference bootstrap (Phase 3). Full multi-peer WebRTC UI can layer on these room IDs later.
 */
export function ConferenceQuickPanel({ displayName }: { displayName: string }) {
  const [title, setTitle] = useState("CYRUS room");
  const [joinId, setJoinId] = useState(readStoredConferenceId);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [lastCreated, setLastCreated] = useState<CommsConference | null>(null);
  const [copied, setCopied] = useState<null | "code" | "id">(null);

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
    persistConference({
      conferenceId: conference.conferenceId,
      roomCode: conference.roomCode,
      title: conference.title,
    });
    setLastCreated(conference);
    setJoinId(conference.conferenceId);
    setMessage(`Created "${conference.title}". Join uses the conference ID (below); room code is for humans to read aloud.`);
  }, [title, displayName]);

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
      try {
        const raw = sessionStorage.getItem(LAST_CONFERENCE_KEY);
        if (raw) {
          const prev = JSON.parse(raw) as StoredConference;
          if (prev.conferenceId === id) next = prev;
        }
      } catch {
        /* ignore */
      }
    }
    persistConference(next);
    setMessage("Joined conference on server. Add SFU-backed media when available.");
  }, [joinId, displayName, lastCreated]);

  return (
    <div className="rounded-xl border border-violet-500/25 bg-violet-950/20 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-200/90">
        <Users className="h-4 w-4" />
        Conference (server room)
      </h3>
      <p className="mb-3 text-[11px] text-white/45">
        Creates/joins the in-memory + DB-backed conference from the API. P2P mesh for multiple peers is not yet unified here.
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
          className="rounded-lg bg-violet-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-violet-600 disabled:opacity-50"
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
          className="rounded-lg border border-violet-400/40 bg-transparent px-3 py-2 text-xs font-medium text-violet-200 hover:bg-violet-500/10 disabled:opacity-50"
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
