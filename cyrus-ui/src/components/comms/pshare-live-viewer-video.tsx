/**
 * Live viewer — swaps segment URLs without remounting; keeps last frame while loading next clip.
 */
import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { pshareBroadcastSourceLabel } from "@shared/comms/pshare-engine";

type PshareLiveViewerVideoProps = {
  fileUrl: string;
  broadcastSource?: string | null;
  polish?: string;
  isConsole?: boolean;
  className?: string;
  onNeedRefresh?: () => void;
};

export function PshareLiveViewerVideo({
  fileUrl,
  broadcastSource,
  polish = "none",
  isConsole = false,
  className = "",
  onNeedRefresh,
}: PshareLiveViewerVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const loadedUrlRef = useRef<string | null>(null);
  const [waiting, setWaiting] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !fileUrl) return;
    if (loadedUrlRef.current === fileUrl) return;

    setWaiting(true);
    loadedUrlRef.current = fileUrl;

    const onReady = () => {
      setWaiting(false);
      void video.play().catch(() => undefined);
    };

    video.addEventListener("loadeddata", onReady, { once: true });
    video.addEventListener("canplay", onReady, { once: true });
    video.src = fileUrl;
    video.load();

    return () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("canplay", onReady);
    };
  }, [fileUrl]);

  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-black/50 ${
        isConsole ? "flex h-full min-h-[7.5rem] items-center justify-center" : ""
      } ${className}`}
    >
      <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full border border-rose-400/40 bg-rose-600/80 px-2 py-0.5 text-[9px] font-bold uppercase text-white">
        <Radio className="h-3 w-3 animate-pulse" />
        Live
        {broadcastSource ? (
          <span className="font-normal normal-case opacity-80">
            · {pshareBroadcastSourceLabel(broadcastSource)}
          </span>
        ) : null}
      </span>
      {waiting && (
        <span className="absolute right-2 top-2 z-10 rounded-full bg-black/60 px-2 py-0.5 text-[9px] text-white/55">
          Updating…
        </span>
      )}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => onNeedRefresh?.()}
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
