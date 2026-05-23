/**
 * Unified Comms UI for the global mesh link (/cyrus-comm-io) — no separate tab.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useCommsP2PLayer } from "./CommsP2PLayerContext";
import { usePresence } from "../../contexts/PresenceContext";
import { uploadAndBuildCommsMediaPayload } from "../../lib/comms-media-upload";
import { COMMS_MEDIA_FILE_ACCEPT } from "../../lib/comms-media-upload";
import {
  attachMediaStreamToAudio,
  attachMediaStreamToVideo,
  extractAudioOnlyStream,
} from "../../lib/comms-video-playback";
import { Link2, MapPin, Radio, ChevronDown, ChevronUp, Paperclip } from "lucide-react";

/** Single-line status for NEXUS header (presence string passed from parent). */
export function CommsMeshLinkHeaderBadge({
  presenceLinePrefix,
}: {
  presenceLinePrefix: string;
}) {
  const { linkConnected, linkJoined, meshUsers } = useCommsP2PLayer();
  const mesh = linkConnected && linkJoined;
  return (
    <p className="truncate text-[10px] font-mono text-cyan-100/50 sm:text-[11px]">
      {presenceLinePrefix}
      <span className="text-white/35"> · </span>
      <span className={mesh ? "text-sky-300/90" : "text-violet-300/85"}>
        Mesh {mesh ? "on" : "…"} ({meshUsers.length} peer{meshUsers.length === 1 ? "" : "s"})
      </span>
      <span className="text-white/35"> · </span>
      <span className="text-white/40">Cortex-M4F + PSRAM/flash + cellular/sat RF</span>
    </p>
  );
}

/** Strip between NTN banner and channel nav — mesh controls + off-grid DM. */
export function CommsP2PUnifiedStrip() {
  const {
    selfId,
    linkConnected,
    linkJoined,
    meshUsers,
    inMeshCall,
    meshSelectedPeer,
    setMeshSelectedPeer,
    meshMessagesForPeer,
    sendMeshMessage,
    shareMeshLocation,
    setShareMeshLocation,
    meshLocationLines,
    linkLog,
  } = useCommsP2PLayer();
  const { sendChatMessage, myUserId } = usePresence();
  const meshMediaRef = useRef<HTMLInputElement>(null);
  const [meshUploading, setMeshUploading] = useState(false);

  const sendMeshMedia = useCallback(
    async (file: File) => {
      const peer = meshSelectedPeer;
      if (!peer) return;
      setMeshUploading(true);
      try {
        const uid = myUserId || selfId;
        const payload = await uploadAndBuildCommsMediaPayload(file, "", uid);
        if (payload) {
          sendChatMessage(peer, payload);
          sendMeshMessage(`📎 ${payload.fileName || file.name} (via encrypted comms)`);
        }
      } finally {
        setMeshUploading(false);
      }
    },
    [meshSelectedPeer, myUserId, selfId, sendChatMessage, sendMeshMessage],
  );

  const [expandDm, setExpandDm] = useState(false);
  const [expandLog, setExpandLog] = useState(false);
  const mesh = linkConnected && linkJoined;
  const peerLabel = meshUsers.find((u) => u.userId === meshSelectedPeer)?.displayName;

  return (
    <div className="rounded-xl border border-violet-500/25 bg-gradient-to-r from-violet-950/40 via-slate-950/50 to-cyan-950/35 px-3 py-2.5 sm:px-4">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono uppercase tracking-[0.18em] text-violet-200/85">
        <Link2 className="h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
        <span>Unified mesh link</span>
        <span className="hidden text-white/25 sm:inline">·</span>
        <span className="font-normal normal-case tracking-normal text-white/55">
          Same Comms module — /cyrus-comm-io + WebRTC alongside /cyrus-io presence
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <Radio className={`h-3.5 w-3.5 ${mesh ? "text-emerald-400" : "text-violet-400/90"}`} />
          {mesh ? "Registry joined" : linkConnected ? "Joining…" : "Socket offline"}
        </span>
        <span className="text-white/35">|</span>
        <span>
          Mesh peers: <strong className="text-cyan-200/90">{meshUsers.length}</strong>
        </span>
        {inMeshCall ? (
          <>
            <span className="text-white/35">|</span>
            <span className="text-fuchsia-200/90">Mesh call active — see Calls tab for video</span>
          </>
        ) : null}
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] text-white/65">
          <MapPin className="h-3.5 w-3.5 text-sky-400" />
          <input
            type="checkbox"
            checked={shareMeshLocation}
            onChange={(e) => setShareMeshLocation(e.target.checked)}
            className="rounded border-white/20"
          />
          Share position (mesh)
        </label>
      </div>

      {meshLocationLines.length > 0 ? (
        <pre className="mt-2 max-h-20 overflow-y-auto whitespace-pre-wrap font-mono text-[9px] text-white/45">
          {meshLocationLines.slice(-8).join("\n")}
        </pre>
      ) : null}

      <div className="mt-2 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => setExpandDm(!expandDm)}
          className="flex w-full items-center justify-between text-left text-[11px] font-medium text-violet-200/90"
        >
          Off-grid mesh messages — media & CAD fuse to encrypted presence when peer is online
          {expandDm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {expandDm && mesh ? (
          <div className="mt-2 space-y-2">
            <select
              value={meshSelectedPeer || ""}
              onChange={(e) => setMeshSelectedPeer(e.target.value || null)}
              className="w-full rounded-lg border border-white/15 bg-slate-900/80 px-2 py-1.5 text-xs text-white"
            >
              <option value="">Select mesh peer…</option>
              {meshUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.displayName} ({u.userId})
                </option>
              ))}
            </select>
            {meshSelectedPeer ? (
              <>
                <div className="max-h-32 overflow-y-auto rounded-lg border border-white/10 bg-black/35 p-2 text-[11px]">
                  {meshMessagesForPeer(meshSelectedPeer).map((m) => (
                    <div key={m.id} className="mb-1 border-b border-white/5 pb-1">
                      <span className="text-white/40">{new Date(m.ts).toLocaleTimeString()}</span>{" "}
                      {m.fromUserId === meshSelectedPeer ? peerLabel || m.fromUserId : "You"}: {m.text}
                    </div>
                  ))}
                </div>
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const t = String(fd.get("meshmsg") || "");
                    e.currentTarget.reset();
                    sendMeshMessage(t);
                  }}
                >
                  <input
                    ref={meshMediaRef}
                    type="file"
                    accept={COMMS_MEDIA_FILE_ACCEPT}
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void sendMeshMedia(file);
                    }}
                  />
                  <button
                    type="button"
                    disabled={meshUploading}
                    onClick={() => meshMediaRef.current?.click()}
                    className="rounded-lg border border-violet-500/30 px-2 py-1 text-violet-100/80 hover:bg-violet-500/10 disabled:opacity-40"
                    title="Share media or CAD via encrypted comms"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <input
                    name="meshmsg"
                    placeholder="Mesh-only message…"
                    className="min-w-0 flex-1 rounded-lg border border-white/15 bg-slate-900/70 px-2 py-1 text-xs text-white"
                  />
                  <button type="submit" className="rounded-lg bg-violet-600/40 px-2 py-1 text-xs text-violet-50">
                    Send
                  </button>
                </form>
              </>
            ) : (
              <p className="text-[11px] text-white/45">Pick a peer to load mesh DM history.</p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-2 border-t border-white/10 pt-2">
        <button
          type="button"
          onClick={() => setExpandLog(!expandLog)}
          className="flex w-full items-center justify-between text-left text-[11px] text-white/45"
        >
          Mesh debug log
          {expandLog ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {expandLog ? (
          <pre className="mt-1 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[9px] text-white/40">
            {linkLog.join("\n")}
          </pre>
        ) : null}
      </div>
    </div>
  );
}

/** Calls tab: mesh WebRTC tiles + hang up. */
export function CommsP2PCallDock() {
  const { inMeshCall, remoteMeshName, localMeshStream, remoteMeshStream, endMeshCall } = useCommsP2PLayer();
  const localRef = useRef<HTMLVideoElement>(null);
  const remoteRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    void attachMediaStreamToVideo(localRef.current, localMeshStream, { muted: true });
  }, [localMeshStream]);
  useEffect(() => {
    void attachMediaStreamToVideo(remoteRef.current, remoteMeshStream, { muted: true });
    void attachMediaStreamToAudio(
      remoteAudioRef.current,
      extractAudioOnlyStream(remoteMeshStream),
      { volume: 1 },
    );
  }, [remoteMeshStream]);

  if (!inMeshCall) {
    return (
      <div className="mb-4 rounded-xl border border-dashed border-violet-500/30 bg-violet-950/20 px-4 py-3 text-center text-sm text-white/50">
        No active <strong className="text-violet-200/80">mesh</strong> call. Start one from{" "}
        <strong className="text-white/70">People</strong> using the link buttons (next to voice/video).
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-xl border border-violet-500/35 bg-slate-950/60 p-3 sm:p-4">
      <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-violet-200/90">
        <Link2 className="h-4 w-4" />
        Active mesh call
        <span className="font-normal normal-case text-white/50">— {remoteMeshName}</span>
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video ref={localRef} className="h-full w-full object-cover [transform:translateZ(0)]" autoPlay playsInline muted />
          <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px]">You (mesh)</span>
        </div>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          <video ref={remoteRef} className="h-full w-full object-cover [transform:translateZ(0)]" autoPlay playsInline muted />
          <audio ref={remoteAudioRef} autoPlay playsInline className="sr-only" />
          <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px]">{remoteMeshName}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={() => endMeshCall(true)}
        className="mt-3 w-full rounded-lg border border-red-500/40 bg-red-600/25 py-2 text-sm font-medium text-red-100 hover:bg-red-600/40"
      >
        End mesh call
      </button>
    </div>
  );
}
