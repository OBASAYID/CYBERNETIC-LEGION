/**
 * VR HUD — four communication consoles (reference arc): Video · Text+media+voice note · Voice · Group.
 * Active console gets cyan emphasis; each allocates dedicated actions.
 */

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  ChevronRight,
  Mic,
  Paperclip,
  Send,
  Users,
  Video,
  Phone,
  X,
  MessageSquare,
} from "lucide-react";
import type { OrbitalPeerNode } from "./CommsOrbitalCommandDeck";
import { CommsGeodesicSphere } from "./CommsGeodesicSphere";

const CYAN = "#00e5ff";

export type PeerHudConsole = "video" | "text" | "voice" | "group";

function linkScoreFromPeerId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return 120_000 + (h % 890_000);
}

function SegBar({ pct }: { pct: number }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-cyan-950/70">
      <div
        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-400"
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}

const MEDIA_ACCEPT =
  "image/*,video/*,audio/*,.glb,.gltf,.obj,.fbx,.stl,.usdz,application/octet-stream," +
  "model/gltf-binary,model/gltf+json,.mp3,.m4a,.wav,.ogg,.flac,.aac,.mp4,.webm,.mov";

export function CommsOrbitalPeerFocusPanel({
  peer,
  darkMode,
  onClose,
  onVoice,
  onVideo,
  /** Opens full Chat tab with this peer selected (thread + history). */
  onOpenFullChat,
  /** Soft video-session ping via chat. */
  onInvite,
  onSendText,
  onSendMedia,
  onSendVoice,
  onOpenGroupHub,
  textDisabled = false,
}: {
  peer: OrbitalPeerNode;
  darkMode: boolean;
  onClose: () => void;
  onVoice: () => void;
  onVideo: () => void;
  onOpenFullChat?: () => void;
  onInvite?: () => void;
  onSendText?: (userId: string, text: string) => void;
  onSendMedia?: (userId: string, file: File, caption: string) => void;
  onSendVoice?: (userId: string, blob: Blob, duration: number) => void;
  onOpenGroupHub?: () => void;
  textDisabled?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const [active, setActive] = useState<PeerHudConsole>("video");
  const [draft, setDraft] = useState("");
  const [mediaCaption, setMediaCaption] = useState("");
  const [sendFlash, setSendFlash] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recChunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [recSec, setRecSec] = useState(0);
  const recSecRef = useRef(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const flash = useCallback((msg: string) => {
    setSendFlash(msg);
    window.setTimeout(() => setSendFlash(null), 2200);
  }, []);

  const busy = peer.inCall === true;
  const firstName = peer.displayName.trim().split(/\s+/)[0] ?? peer.displayName;
  const score = linkScoreFromPeerId(peer.id).toLocaleString();
  const canText = Boolean(onSendText) || Boolean(onOpenFullChat);
  const textActionsDisabled = textDisabled || !canText;

  const glass = darkMode
    ? "border-cyan-400/45 bg-[#030810]/92 shadow-[0_0_80px_-12px_rgba(0,229,255,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]"
    : "border-sky-400/50 bg-white/82 shadow-[0_0_50px_-10px_rgba(14,165,233,0.35)]";

  const consoleWrap = (key: PeerHudConsole, rot: string, children: ReactNode) => {
    const isOn = active === key;
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => setActive(key)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setActive(key);
          }
        }}
        className={`flex min-h-[11rem] w-full cursor-pointer flex-col rounded-xl p-2 text-left transition sm:min-h-[12rem] sm:p-2.5 ${rot} ${
          isOn
            ? "border-2 border-cyan-400/75 bg-gradient-to-b from-cyan-950/45 to-black/45 shadow-[0_0_26px_-6px_rgba(0,229,255,0.4)] ring-1 ring-cyan-400/30"
            : darkMode
              ? "border border-white/10 bg-black/25 opacity-[0.72] hover:opacity-95"
              : "border border-slate-200/80 bg-white/45 opacity-80 hover:opacity-100"
        }`}
      >
        {children}
      </div>
    );
  };

  const startRec = async () => {
    if (!onSendVoice || textActionsDisabled) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
      recChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) recChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(recChunksRef.current, { type: "audio/webm" });
        const dur = recSecRef.current;
        void onSendVoice(peer.id, blob, dur);
        flash("Voice note sent");
        setRecording(false);
        setRecSec(0);
        recSecRef.current = 0;
        if (recTimerRef.current) clearInterval(recTimerRef.current);
      };
      rec.start();
      mediaRecorderRef.current = rec;
      setRecording(true);
      setRecSec(0);
      recSecRef.current = 0;
      recTimerRef.current = setInterval(() => {
        recSecRef.current += 1;
        setRecSec(recSecRef.current);
      }, 1000);
    } catch {
      flash("Mic denied");
    }
  };

  const stopRec = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    if (recTimerRef.current) clearInterval(recTimerRef.current);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f || !onSendMedia) return;
    void onSendMedia(peer.id, f, mediaCaption.trim());
    setMediaCaption("");
    flash(`Sent · ${f.name.slice(0, 24)}${f.name.length > 24 ? "…" : ""}`);
  };

  const sendDraft = () => {
    const t = draft.trim();
    if (onSendText && t) {
      onSendText(peer.id, t);
      setDraft("");
      flash("Message sent");
      return;
    }
    if (onOpenFullChat) {
      onOpenFullChat();
      flash(t ? "Continue in chat thread" : "Opening thread");
      if (t) setDraft("");
    }
  };

  return (
    <div
      className="animate-hud-in relative z-[5] mx-auto mb-4 mt-1 w-full max-w-[26rem] px-1 sm:max-w-5xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`hud-title-${uid}`}
    >
      <div
        className="pointer-events-none absolute -inset-3 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${CYAN}55 0%, transparent 55%)`,
          animation: "hud-breathe 3.2s ease-in-out infinite",
        }}
      />

      <div
        className={`relative overflow-hidden rounded-[1.35rem] border-2 backdrop-blur-2xl ${glass}`}
        style={{
          transform: "perspective(1200px) rotateX(3deg)",
          transformOrigin: "50% 100%",
          clipPath: "polygon(0 0, 100% 0, 100% calc(100% - 12px), 52% 100%, 48% 100%, 0 calc(100% - 12px))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.11]"
          style={{
            backgroundImage: `
              linear-gradient(${CYAN}33 1px, transparent 1px),
              linear-gradient(90deg, ${CYAN}22 1px, transparent 1px)
            `,
            backgroundSize: "14px 14px",
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent opacity-80"
          style={{ animation: "hud-scan 4s ease-in-out infinite" }}
        />

        <button
          type="button"
          onClick={onClose}
          className={`absolute right-2 top-2 z-20 rounded-lg border p-2 transition sm:right-3 sm:top-3 ${
            darkMode
              ? "border-white/15 text-white/70 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:text-cyan-100"
              : "border-slate-300 text-slate-600 hover:border-sky-400 hover:bg-sky-50"
          }`}
          aria-label="Close link panel"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative flex items-start justify-between gap-3 px-3 pb-2 pt-3 pr-12 sm:px-5 sm:pt-4 sm:pr-14">
          <div className="min-w-0">
            <p
              className={`font-mono text-[10px] uppercase tracking-[0.35em] sm:text-[11px] ${darkMode ? "text-white/90" : "text-slate-900"}`}
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              Hola · {firstName.toUpperCase()}
            </p>
            <p className="mt-1 font-mono text-[8px] uppercase tracking-wider text-cyan-500/70 sm:text-[9px]">
              Select a console · cyan = active
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[8px] uppercase tracking-[0.28em] text-cyan-400/70 sm:text-[9px]">Link score</p>
            <p
              className="text-lg font-bold tabular-nums text-cyan-300 sm:text-2xl"
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              {score}
            </p>
          </div>
        </div>

        <div className="relative mx-auto flex h-[8.5rem] w-full max-w-[15rem] items-center justify-center sm:h-[10rem] sm:max-w-[17rem]">
          <div className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2">
            <CommsGeodesicSphere size={190} className="opacity-[0.95] sm:scale-105" />
          </div>
          <div
            className="absolute left-1/2 top-1/2 z-[1] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-cyan-400/18 to-violet-500/10 blur-2xl sm:h-36 sm:w-36"
            aria-hidden
          />
          <div
            className={`relative z-[2] flex h-[4rem] w-[4rem] items-center justify-center overflow-hidden rounded-full border-2 shadow-[0_0_36px_-6px_rgba(0,229,255,0.5)] sm:h-[4.75rem] sm:w-[4.75rem] ${
              busy ? "border-fuchsia-400/75" : "border-cyan-300/70"
            }`}
          >
            {peer.avatarUrl ? (
              <img src={peer.avatarUrl} alt="" className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-900/90 to-slate-950 text-xl font-bold text-cyan-100 sm:text-2xl">
                {peer.displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <h3
          id={`hud-title-${uid}`}
          className={`relative z-[2] px-3 text-center text-sm font-semibold sm:px-5 sm:text-base ${darkMode ? "text-white" : "text-slate-900"}`}
          style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          {peer.displayName}
        </h3>
        <p
          className={`relative z-[2] mt-0.5 px-3 text-center font-mono text-[9px] uppercase tracking-wider sm:text-[10px] ${busy ? "text-fuchsia-300/90" : "text-emerald-400/90"}`}
        >
          {busy ? "● In call — text & media still available" : "● Consoles ready"}
        </p>

        {sendFlash ? (
          <p className="relative z-[2] px-3 text-center font-mono text-[9px] text-emerald-400/90 sm:text-[10px]">{sendFlash}</p>
        ) : null}

        <div
          className="relative z-[2] mt-2 grid grid-cols-1 gap-2 px-3 pb-2 sm:gap-3 sm:px-4 md:grid-cols-2 lg:grid-cols-4"
          style={{ perspective: "1400px" }}
        >
          {/* 1 — Video */}
          {consoleWrap(
            "video",
            "lg:[transform:rotateY(5deg)] lg:[transform-origin:right_center]",
            <>
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-cyan-300" />
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-cyan-200 sm:text-[9px]">
                  Video call
                </span>
              </div>
              <p className={`mt-1 text-[8px] leading-snug sm:text-[9px] ${darkMode ? "text-white/45" : "text-slate-600"}`}>
                Live mesh video link to this node.
              </p>
              <div className="mt-2">
                <SegBar pct={busy ? 40 : 100} />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onVideo();
                  onClose();
                }}
                className="mt-2 w-full rounded-lg border border-cyan-500/40 bg-cyan-500/15 py-2 font-mono text-[9px] font-bold uppercase tracking-wide text-cyan-100 transition hover:bg-cyan-500/25 disabled:opacity-40"
              >
                Start video
              </button>
              {onInvite ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={(e) => {
                    e.stopPropagation();
                    onInvite();
                    flash("Invite sent");
                  }}
                  className="mt-1.5 w-full rounded-lg border border-white/10 py-1.5 font-mono text-[8px] uppercase text-white/70 hover:border-cyan-400/35 disabled:opacity-40"
                >
                  Soft invite (chat)
                </button>
              ) : null}
              <div className="mt-auto flex justify-end pt-1 text-cyan-400/70">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </div>
            </>,
          )}

          {/* 2 — Text + voice note + media (video, audio, 3D) */}
          {consoleWrap(
            "text",
            "lg:[transform:rotateY(2deg)] lg:[transform-origin:center]",
            <>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-violet-300" />
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-violet-100 sm:text-[9px]">
                  Text & media
                </span>
              </div>
              <p className={`mt-1 text-[8px] leading-snug sm:text-[9px] ${darkMode ? "text-white/45" : "text-slate-600"}`}>
                Messages, voice notes, video, audio, 3D (.glb / .gltf).
              </p>
              <div className="mt-2">
                <SegBar pct={75} />
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                disabled={textActionsDisabled}
                placeholder={onSendText ? "Type…" : "Open thread…"}
                rows={2}
                className={`mt-2 w-full resize-none rounded-lg border px-2 py-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-40 ${
                  darkMode
                    ? "border-cyan-500/25 bg-black/40 text-white placeholder:text-white/25"
                    : "border-slate-300 bg-white text-slate-900"
                }`}
              />
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={textActionsDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    sendDraft();
                  }}
                  className="inline-flex flex-1 items-center justify-center gap-1 rounded-lg border border-violet-400/40 bg-violet-500/15 py-1.5 font-mono text-[8px] uppercase text-violet-100 disabled:opacity-40"
                >
                  <Send className="h-3 w-3" />
                  Send
                </button>
                {onOpenFullChat ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFullChat();
                    }}
                    className="rounded-lg border border-white/15 px-2 py-1.5 font-mono text-[8px] uppercase text-white/70 hover:border-cyan-400/35"
                  >
                    Full chat
                  </button>
                ) : null}
              </div>
              <input ref={fileRef} type="file" className="hidden" accept={MEDIA_ACCEPT} onChange={onPickFile} />
              <div className="mt-1 flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={!onSendMedia || textActionsDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileRef.current?.click();
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 font-mono text-[8px] uppercase text-cyan-100 disabled:opacity-40"
                >
                  <Paperclip className="h-3 w-3" />
                  Media
                </button>
                {!recording ? (
                  <button
                    type="button"
                    disabled={!onSendVoice || textActionsDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      void startRec();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 font-mono text-[8px] uppercase text-emerald-100 disabled:opacity-40"
                  >
                    <Mic className="h-3 w-3" />
                    Note
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      stopRec();
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-rose-500/40 bg-rose-500/15 px-2 py-1 font-mono text-[8px] uppercase text-rose-100"
                  >
                    Stop {recSec}s
                  </button>
                )}
              </div>
              <input
                type="text"
                value={mediaCaption}
                onChange={(e) => setMediaCaption(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Caption (optional)"
                className={`mt-1 w-full rounded border px-2 py-1 text-[9px] focus:outline-none focus:ring-1 focus:ring-cyan-500/40 ${
                  darkMode ? "border-white/10 bg-black/30 text-white/90" : "border-slate-300"
                }`}
              />
            </>,
          )}

          {/* 3 — Voice */}
          {consoleWrap(
            "voice",
            "lg:[transform:rotateY(-2deg)] lg:[transform-origin:center]",
            <>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-300" />
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-emerald-100 sm:text-[9px]">
                  Voice call
                </span>
              </div>
              <p className={`mt-1 text-[8px] leading-snug sm:text-[9px] ${darkMode ? "text-white/45" : "text-slate-600"}`}>
                Secure audio channel to this node.
              </p>
              <div className="mt-2">
                <SegBar pct={busy ? 35 : 100} />
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation();
                  onVoice();
                  onClose();
                }}
                className="mt-2 w-full rounded-lg border border-emerald-500/40 bg-emerald-500/15 py-2 font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-100 transition hover:bg-emerald-500/25 disabled:opacity-40"
              >
                Start voice
              </button>
              <div className="mt-auto flex justify-end pt-2 text-emerald-400/60">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </div>
            </>,
          )}

          {/* 4 — Group */}
          {consoleWrap(
            "group",
            "lg:[transform:rotateY(-5deg)] lg:[transform-origin:left_center]",
            <>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-fuchsia-300" />
                <span className="font-mono text-[8px] font-bold uppercase tracking-wider text-fuchsia-100 sm:text-[9px]">
                  Group hub
                </span>
              </div>
              <p className={`mt-1 text-[8px] leading-snug sm:text-[9px] ${darkMode ? "text-white/45" : "text-slate-600"}`}>
                Conference rooms, bridge codes, multi-party mesh.
              </p>
              <div className="mt-2">
                <SegBar pct={55} />
              </div>
              <button
                type="button"
                disabled={!onOpenGroupHub}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenGroupHub?.();
                  onClose();
                }}
                className="mt-2 w-full rounded-lg border border-fuchsia-500/40 bg-fuchsia-500/12 py-2 font-mono text-[9px] font-bold uppercase tracking-wide text-fuchsia-100 transition hover:bg-fuchsia-500/22 disabled:opacity-40"
              >
                Open group console
              </button>
              <p className={`mt-1 text-[7px] leading-snug sm:text-[8px] ${darkMode ? "text-white/35" : "text-slate-500"}`}>
                Switches to Calls — create or join a conference, then add peers.
              </p>
            </>,
          )}
        </div>

        <p className={`relative z-[2] px-4 pb-3 pt-1 text-center text-[8px] sm:text-[9px] ${darkMode ? "text-white/35" : "text-slate-500"}`}>
          Tap a console to focus · ESC to dismiss · Video/Voice start closes HUD
        </p>
      </div>

      <style>{`
        @keyframes hud-in {
          from { opacity: 0; transform: perspective(1200px) rotateX(10deg) translateY(14px) scale(0.96); }
          to { opacity: 1; transform: perspective(1200px) rotateX(0deg) translateY(0) scale(1); }
        }
        @keyframes hud-breathe {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(1.02); }
        }
        @keyframes hud-scan {
          0%, 100% { opacity: 0.35; transform: translateX(-8%); }
          50% { opacity: 0.9; transform: translateX(8%); }
        }
        .animate-hud-in {
          animation: hud-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }
      `}</style>
    </div>
  );
}
