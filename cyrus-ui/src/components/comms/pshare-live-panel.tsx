/**
 * Pshare Live — mobile camera + linked drone broadcasts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Plane, Radio, Square, Video } from "lucide-react";
import {
  startPshareDroneLive,
  stopPshareLivePost,
} from "../../../../client/src/lib/pshare-live-broadcast";
import {
  attachMediaStreamToVideo,
  getPshareLiveBroadcaster,
  isPshareLiveBroadcasting,
} from "../../../../client/src/lib/pshare-live-session";
import { adviseLiveBroadcast, pshareBroadcastSourceLabel } from "@shared/comms/pshare-engine";

const C = {
  crimson: "#E70011",
  border: "rgba(255,255,255,0.08)",
  sidebarInput: "#222222",
  sidebarDivider: "#2E2E2E",
} as const;

type PshareLivePanelProps = {
  myUserId: string;
  onLiveStarted?: () => void;
  onLiveStopped?: () => void;
};

export function PshareLivePanel({ myUserId, onLiveStarted, onLiveStopped }: PshareLivePanelProps) {
  const qc = useQueryClient();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  const [mode, setMode] = useState<"mobile" | "drone">("mobile");
  const [caption, setCaption] = useState("");
  const [droneUrl, setDroneUrl] = useState("");
  const [previewReady, setPreviewReady] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [livePostId, setLivePostId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [cameraPending, setCameraPending] = useState(false);

  const syncFromBroadcaster = useCallback(() => {
    const broadcaster = getPshareLiveBroadcaster(myUserId);
    const session = broadcaster.getSession();
    const stream = broadcaster.getPreviewStream();
    if (stream) {
      previewStreamRef.current = stream;
      setPreviewReady(true);
      attachMediaStreamToVideo(videoRef.current, stream);
    }
    if (session) {
      setIsLive(true);
      setLivePostId(session.postId);
    }
  }, [myUserId]);

  useEffect(() => {
    syncFromBroadcaster();
    return () => {
      // Keep camera + recording alive while broadcasting if user switches Pshare tabs.
      if (!isPshareLiveBroadcasting()) {
        getPshareLiveBroadcaster(myUserId).stopTracks();
      }
    };
  }, [myUserId, syncFromBroadcaster]);

  const attachPreview = useCallback((stream: MediaStream) => {
    previewStreamRef.current = stream;
    setPreviewReady(true);
    attachMediaStreamToVideo(videoRef.current, stream);
  }, []);

  const bindPreviewVideo = useCallback(
    (el: HTMLVideoElement | null) => {
      videoRef.current = el;
      attachMediaStreamToVideo(el, previewStreamRef.current ?? getPshareLiveBroadcaster(myUserId).getPreviewStream());
    },
    [myUserId],
  );

  const ensureCamera = useCallback(async () => {
    const broadcaster = getPshareLiveBroadcaster(myUserId);
    if (broadcaster.getPreviewStream()) {
      attachPreview(broadcaster.getPreviewStream()!);
      return broadcaster.getPreviewStream()!;
    }
    setCameraPending(true);
    try {
      const stream = await broadcaster.preparePreview();
      attachPreview(stream);
      const advice = adviseLiveBroadcast({ source: "mobile_camera" });
      setTips(advice.tips);
      return stream;
    } finally {
      setCameraPending(false);
    }
  }, [attachPreview, myUserId]);

  const requestCamera = useMutation({
    mutationFn: async () => {
      setError(null);
      await ensureCamera();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Camera permission denied"),
  });

  const goLiveMobile = useMutation({
    mutationFn: async () => {
      setError(null);
      const broadcaster = getPshareLiveBroadcaster(myUserId);
      await ensureCamera();
      const session = await broadcaster.goLive(caption, {
        onPreview: attachPreview,
        onError: (msg) => setError(msg),
      });
      setLivePostId(session.postId);
      setIsLive(true);
      attachPreview(broadcaster.getPreviewStream()!);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
      onLiveStarted?.();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Go live failed"),
  });

  const goLiveDrone = useMutation({
    mutationFn: async () => {
      setError(null);
      const data = await startPshareDroneLive(myUserId, {
        caption,
        droneUrl,
        streamName: caption || "Drone live",
      });
      setLivePostId(data.post.id);
      setIsLive(true);
      const advice = adviseLiveBroadcast({ source: "drone" });
      setTips(advice.tips);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
      onLiveStarted?.();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Drone broadcast failed"),
  });

  const stopLive = useMutation({
    mutationFn: async () => {
      if (mode === "mobile") {
        await getPshareLiveBroadcaster(myUserId).stopLive();
      } else if (livePostId) {
        await stopPshareLivePost(myUserId, livePostId);
      }
    },
    onSuccess: () => {
      setIsLive(false);
      setLivePostId(null);
      setPreviewReady(false);
      previewStreamRef.current = null;
      if (videoRef.current) videoRef.current.srcObject = null;
      void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
      onLiveStopped?.();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Stop failed"),
  });

  const busy =
    requestCamera.isPending ||
    goLiveMobile.isPending ||
    goLiveDrone.isPending ||
    stopLive.isPending ||
    cameraPending;

  return (
    <div
      className="mx-4 mb-3 overflow-hidden rounded-xl border"
      style={{ borderColor: C.border, background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-rose-400" />
          <p className="text-[11px] font-bold text-white">Pshare Live</p>
          {isLive && (
            <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-500/15 px-2 py-0.5 text-[9px] font-bold uppercase text-rose-200">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-rose-400" />
              On air
            </span>
          )}
        </div>
        <div className="flex gap-1">
          {(["mobile", "drone"] as const).map((m) => (
            <button
              key={m}
              type="button"
              disabled={isLive}
              onClick={() => setMode(m)}
              className="rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide disabled:opacity-40"
              style={{
                background: mode === m ? `${C.crimson}28` : "transparent",
                color: mode === m ? "#fda4af" : "rgba(255,255,255,0.45)",
                border: `1px solid ${mode === m ? `${C.crimson}44` : "transparent"}`,
              }}
            >
              {m === "mobile" ? "Mobile" : "Drone"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-3">
        <p className="text-[10px] text-white/50">
          Live posts stay on Pshare until you delete them. {pshareBroadcastSourceLabel(mode === "mobile" ? "mobile_camera" : "drone")} mode.
          {isLive ? " Stay on this tab or switch tabs — your broadcast keeps running until you end it." : null}
        </p>

        {mode === "mobile" ? (
          <>
            <div className="relative aspect-video overflow-hidden rounded-lg border border-white/10 bg-black">
              <video ref={bindPreviewVideo} autoPlay playsInline muted className="h-full w-full object-cover" />
              {!previewReady && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/45">
                  <Camera className="h-8 w-8" />
                  <p className="text-[10px]">Tap below to turn on camera &amp; go live</p>
                </div>
              )}
            </div>
            {!isLive && (
              <button
                type="button"
                disabled={busy || previewReady}
                onClick={() => requestCamera.mutate()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-semibold text-white/85 disabled:opacity-40"
                style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}
              >
                {requestCamera.isPending || cameraPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {previewReady ? "Camera on" : "Turn on camera (preview)"}
              </button>
            )}
          </>
        ) : (
          <div className="space-y-2">
            <label className="block text-[9px] font-semibold uppercase tracking-wider text-white/40">
              Linked drone feed URL (HLS / RTSP relay)
            </label>
            <input
              value={droneUrl}
              onChange={(e) => setDroneUrl(e.target.value)}
              placeholder="https://…/stream.m3u8 or rtsp://…"
              disabled={isLive}
              className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/30"
            />
            <p className="text-[10px] text-white/45">
              Register a drone linked to CYRUS — HLS (.m3u8) plays in-browser; RTSP may need a relay URL.
            </p>
          </div>
        )}

        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={isLive}
          placeholder="Live caption (optional)"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/30"
        />

        {tips.length > 0 && (
          <ul className="list-disc space-y-0.5 pl-4 text-[10px] text-white/55">
            {tips.slice(0, 3).map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          {!isLive ? (
            <button
              type="button"
              disabled={busy || (mode === "drone" && !droneUrl.trim())}
              onClick={() => (mode === "mobile" ? goLiveMobile.mutate() : goLiveDrone.mutate())}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-bold text-rose-100 disabled:opacity-40"
              style={{ background: `${C.crimson}33`, border: `1px solid ${C.crimson}55` }}
            >
              {goLiveMobile.isPending || goLiveDrone.isPending || cameraPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "mobile" ? (
                <Video className="h-4 w-4" />
              ) : (
                <Plane className="h-4 w-4" />
              )}
              {mode === "mobile" ? "Turn on camera & go live" : "Go live"}
            </button>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => stopLive.mutate()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-[11px] font-bold text-white disabled:opacity-40"
              style={{ background: "rgba(127,29,29,0.45)", border: "1px solid rgba(248,113,113,0.35)" }}
            >
              {stopLive.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 fill-current" />}
              End broadcast
            </button>
          )}
        </div>

        {error && <p className="text-[10px] text-rose-300/90">{error}</p>}
      </div>
    </div>
  );
}
