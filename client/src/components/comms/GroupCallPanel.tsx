import { useCallback, useMemo, useState } from "react";
import { Phone, Users, Video } from "lucide-react";
import type { CyrusSfuMode } from "@shared/comms/sfu-types";

type OnlinePeer = {
  id: string;
  displayName: string;
  inCall?: boolean;
};

const SFU_LABEL: Record<CyrusSfuMode, string> = {
  mediasoup: "SFU (mediasoup)",
  star: "Star relay",
  p2p: "Direct",
};

export function GroupCallPanel({
  myUserId,
  displayName,
  sfuMode,
  onlinePeers,
  onStartGroupCall,
  onJoinByRoomId,
}: {
  myUserId: string;
  displayName: string;
  sfuMode: CyrusSfuMode;
  onlinePeers: OnlinePeer[];
  onStartGroupCall: (peerIds: string[], callType: "audio" | "video") => void;
  onJoinByRoomId: (roomId: string) => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [joinRoomId, setJoinRoomId] = useState("");
  const [callType, setCallType] = useState<"audio" | "video">("video");

  const available = useMemo(
    () => onlinePeers.filter((p) => p.id !== myUserId && !p.inCall),
    [onlinePeers, myUserId],
  );

  const togglePeer = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const startCall = useCallback(() => {
    onStartGroupCall(Array.from(selected), callType);
    setSelected(new Set());
  }, [selected, callType, onStartGroupCall]);

  return (
    <div className="rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/25 via-cyan-950/15 to-[#021018]/80 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-violet-200/95">
          <Users className="h-4 w-4" />
          Group call
        </h3>
        <span className="rounded-full border border-cyan-400/30 bg-cyan-950/40 px-2 py-0.5 text-[10px] font-medium text-cyan-100/90">
          {SFU_LABEL[sfuMode]}
        </span>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-white/50">
        Multi-party calls use {sfuMode === "mediasoup" ? "an SFU" : "star relay through the host"} for
        stable audio/video across networks. Select peers or join with a room ID.
      </p>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setCallType("audio")}
          className={`rounded-lg px-2.5 py-1 text-[11px] ${
            callType === "audio"
              ? "bg-emerald-600/30 text-emerald-100"
              : "border border-white/10 text-white/60"
          }`}
        >
          Audio
        </button>
        <button
          type="button"
          onClick={() => setCallType("video")}
          className={`rounded-lg px-2.5 py-1 text-[11px] ${
            callType === "video"
              ? "bg-cyan-600/30 text-cyan-100"
              : "border border-white/10 text-white/60"
          }`}
        >
          Video
        </button>
      </div>

      {available.length === 0 ? (
        <p className="mb-3 text-xs text-white/45">No available peers online.</p>
      ) : (
        <div className="mb-3 max-h-36 space-y-1 overflow-y-auto">
          {available.map((peer) => (
            <label
              key={peer.id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-black/20 px-2 py-1.5 text-xs text-white/85 hover:border-cyan-500/25"
            >
              <input
                type="checkbox"
                checked={selected.has(peer.id)}
                onChange={() => togglePeer(peer.id)}
                className="accent-cyan-400"
              />
              {peer.displayName}
            </label>
          ))}
        </div>
      )}

      <button
        type="button"
        disabled={selected.size === 0}
        onClick={startCall}
        className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600/80 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500 disabled:opacity-40"
      >
        {callType === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
        Start {callType} call ({selected.size || 0} invited)
      </button>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="flex-1 text-[11px] text-white/60">
          Join by room ID
          <input
            value={joinRoomId}
            onChange={(e) => setJoinRoomId(e.target.value)}
            placeholder="Conference or group-call room ID"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-sm text-white"
          />
        </label>
        <button
          type="button"
          disabled={!joinRoomId.trim()}
          onClick={() => {
            onJoinByRoomId(joinRoomId.trim());
            setJoinRoomId("");
          }}
          className="rounded-lg border border-violet-400/45 px-3 py-2 text-xs font-medium text-violet-100 hover:bg-violet-500/10 disabled:opacity-50"
        >
          Join media
        </button>
      </div>
      <p className="mt-2 text-[10px] text-white/35">Host: {displayName || myUserId}</p>
    </div>
  );
}
