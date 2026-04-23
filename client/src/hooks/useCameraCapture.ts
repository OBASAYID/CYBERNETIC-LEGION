import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "idle" | "preview" | "denied" | "error";

/**
 * Live device camera for document / text capture (prefers rear camera on mobile).
 * Returns a compressed JPEG data URL suitable for /api/scan/* (stays under typical JSON limits).
 */
export function useCameraCapture(options?: { maxEdge?: number; quality?: number }) {
  const maxEdge = options?.maxEdge ?? 1280;
  const quality = options?.quality ?? 0.82;
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
    setErrorMessage(null);
  }, []);

  const start = useCallback(async () => {
    setErrorMessage(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        await v.play();
      }
      setState("preview");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setState("denied");
        setErrorMessage("Camera permission denied. Allow camera access to scan text.");
      } else {
        setState("error");
        setErrorMessage(msg || "Could not open camera.");
      }
    }
  }, []);

  const captureDataUrl = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    let tw = w;
    let th = h;
    if (w > maxEdge || h > maxEdge) {
      if (w >= h) {
        tw = maxEdge;
        th = Math.round((h * maxEdge) / w);
      } else {
        th = maxEdge;
        tw = Math.round((w * maxEdge) / h);
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, tw, th);
    return canvas.toDataURL("image/jpeg", quality);
  }, [maxEdge, quality]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { videoRef, state, errorMessage, start, stop, captureDataUrl };
}
