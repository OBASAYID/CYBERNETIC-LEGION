/**
 * Live viewer — WebRTC SFU (real-time) with segment-upload fallback.
 */
import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { pshareBroadcastSourceLabel } from "@shared/comms/pshare-engine";
import { usePresence } from "../../../../client/src/contexts/PresenceContext";
import { attachMediaStreamToVideo } from "../../../../client/src/lib/pshare-live-session";
import { startPshareLiveSfuViewer } from "../../../../client/src/lib/pshare-live-sfu";
import { resolvePshareMediaUrl } from "../../../../client/src/lib/pshare-utils";

type PshareLiveViewerVideoProps = {
  liveStreamId?: string | null;
  fileUrl?: string | null;
  broadcastSource?: string | null;
  polish?: string;
  isConsole?: boolean;
  className?: string;
  onNeedRefresh?: () => void;
};

export function PshareLiveViewerVideo({
  liveStreamId,
  fileUrl,
  broadcastSource,
  polish = "none",
  isConsole = false,
  className = "",
  onNeedRefresh,
}: PshareLiveViewerVideoProps) {
  const { wsRef, myUserId, isConnected } = usePresence();
  const videoRef = useRef<HTMLVideoElement>(null);
  const sfuStopRef = useRef<(() => void) | null>(null);
  const loadedSegmentRef = useRef<string | null>(null);
  const [mode, setMode] = useState<"connecting" | "sfu" | "segment">("connecting");
  const [status, setStatus] = useState("Connecting to live feed…");

  const segmentUrl = fileUrl ? resolvePshareMediaUrl(fileUrl) : "";

  useEffect(() => {
    if (!liveStreamId) {
      setMode("segment");
      setStatus("");
      return;
    }

    const socket = wsRef.current;
    if (!isConnected || !socket?.connected || !myUserId) {
      setMode("segment");
      setStatus("");
      return;
    }

    let cancelled = false;
    setMode("connecting");
    setStatus("Joining realtime live…");

    void startPshareLiveSfuViewer({
      socket,
      streamId: liveStreamId,
      displayName: myUserId.slice(0, 12),
      onRemoteStream: (stream) => {
        if (cancelled) return;
        attachMediaStreamToVideo(videoRef.current, stream);
        setMode("sfu");
        setStatus("");
      },
    })
      .then((session) => {
        if (cancelled) {
          session?.stop();
          return;
        }
        if (!session) {
          setMode("segment");
          setStatus("");
          return;
        }
        sfuStopRef.current = session.stop;
        setMode("sfu");
        setStatus("");
      })
      .catch(() => {
        if (!cancelled) {
          setMode("segment");
          setStatus("");
        }
      });

    return () => {
      cancelled = true;
      sfuStopRef.current?.();
      sfuStopRef.current = null;
    };
  }, [liveStreamId, isConnected, myUserId, wsRef]);

  useEffect(() => {
    if (mode === "sfu" || !segmentUrl) return;
    if (loadedSegmentRef.current === segmentUrl) return;
    const video = videoRef.current;
    if (!video) return;

    loadedSegmentRef.current = segmentUrl;
    const onReady = () => {
      void video.play().catch(() => undefined);
    };
    video.addEventListener("loadeddata", onReady, { once: true });
    video.src = segmentUrl;
    video.load();
    return () => {
      video.removeEventListener("loadeddata", onReady);
    };
  }, [mode, segmentUrl]);

  if (!liveStreamId && !segmentUrl) {
    return (
      <div
        className={`flex aspect-video items-center justify-center gap-2 rounded-lg bg-black/70 ${
          isConsole ? "min-h-[7.5rem]" : ""
        } ${className}`}
      >
        <Radio className="h-4 w-4 animate-pulse text-rose-300" />
        <p className="text-[10px] text-white/55">Connecting to live feed…</p>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black/50 ${
        isConsole ? "flex h-full min-h-[7.5rem] items-center justify-center" : ""
      } ${className}`}
    >
      <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-600/80 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
        <Radio className="h-3 w-3 animate-pulse" />
        Live
        {mode === "sfu" ? <span className="font-normal normal-case opacity-80"> · Realtime</span> : null}
        {broadcastSource ? (
          <span className="font-normal normal-case opacity-80">
            · {pshareBroadcastSourceLabel(broadcastSource)}
          </span>
        ) : null}
      </span>
      {status && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[9px] text-white/55">
          {status}
        </span>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => {
          if (mode === "segment") onNeedRefresh?.();
        }}
        className={
          isConsole
            ? "max-h-full max-w-full object-contain"
            : "max-h-[min(60vh,400px)] w-full object-contain"
        }
        style={{ filter: polish }}
      />
    </div>
  );
}
