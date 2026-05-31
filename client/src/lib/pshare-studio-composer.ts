import {
  polishCssFilter,
  type PsharePolishPreset,
  type PshareStudioManifest,
  type PshareStudioTransition,
} from "@shared/comms/pshare-studio";

export type StudioComposeProgress = {
  phase: "loading" | "rendering" | "encoding" | "done";
  percent: number;
  message: string;
};

type SlideSource = {
  localId: string;
  kind: "image" | "video";
  file: File;
  objectUrl: string;
};

function aspectSize(aspect: PshareStudioManifest["aspect"]): { w: number; h: number } {
  if (aspect === "1:1") return { w: 1080, h: 1080 };
  if (aspect === "16:9") return { w: 1280, h: 720 };
  return { w: 720, h: 1280 };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });
}

function loadVideoMeta(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.onloadedmetadata = () => resolve(v);
    v.onerror = () => reject(new Error("Failed to load video"));
    v.src = url;
  });
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  sw: number,
  sh: number,
  w: number,
  h: number,
  zoom = 1,
  panX = 0,
  panY = 0,
) {
  const scale = Math.max(w / sw, h / sh) * zoom;
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (w - dw) / 2 + panX;
  const dy = (h - dh) / 2 + panY;
  ctx.drawImage(source, 0, 0, sw, sh, dx, dy, dw, dh);
}

function applyVignette(ctx: CanvasRenderingContext2D, w: number, h: number, intensity: number) {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.72);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${0.35 * (intensity / 100)})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function applyGradeOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  preset: PsharePolishPreset,
  intensity: number,
) {
  const t = intensity / 100;
  if (preset === "cyrus-bold") {
    ctx.fillStyle = `rgba(231,0,17,${0.06 * t})`;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "cinematic") {
    ctx.fillStyle = `rgba(10,20,40,${0.08 * t})`;
    ctx.fillRect(0, 0, w, h);
  } else if (preset === "vibrant") {
    ctx.fillStyle = `rgba(255,120,40,${0.04 * t})`;
    ctx.fillRect(0, 0, w, h);
  }
}

async function buildSlideSources(files: File[]): Promise<SlideSource[]> {
  const out: SlideSource[] = [];
  for (const file of files) {
    const kind = file.type.startsWith("video/") ? "video" : "image";
    out.push({
      localId: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
      kind,
      file,
      objectUrl: URL.createObjectURL(file),
    });
  }
  return out;
}

export function revokeSlideSources(sources: SlideSource[]) {
  for (const s of sources) URL.revokeObjectURL(s.objectUrl);
}

export async function renderStoryVideo(
  manifest: PshareStudioManifest,
  slideFiles: File[],
  audioFile: File | null,
  onProgress?: (p: StudioComposeProgress) => void,
): Promise<Blob> {
  if (slideFiles.length === 0) throw new Error("Add at least one photo or video clip");

  const sources = await buildSlideSources(slideFiles);
  try {
    onProgress?.({ phase: "loading", percent: 8, message: "Loading scenes…" });

    const { w, h } = aspectSize(manifest.aspect);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    const filter = polishCssFilter(manifest.polishPreset, manifest.polishIntensity);

    let audioEl: HTMLAudioElement | null = null;
    let audioCtx: AudioContext | null = null;
    if (audioFile) {
      audioEl = document.createElement("audio");
      audioEl.src = URL.createObjectURL(audioFile);
      audioEl.crossOrigin = "anonymous";
      await new Promise<void>((res, rej) => {
        audioEl!.onloadedmetadata = () => res();
        audioEl!.onerror = () => rej(new Error("Could not load soundtrack"));
      });
    }

    const slideDur =
      audioEl && audioEl.duration > 0
        ? Math.max(2, Math.min(6, audioEl.duration / sources.length))
        : manifest.slides[0]?.durationSec ?? 3.5;
    const totalSec = slideDur * sources.length;
    const fps = 24;
    const totalFrames = Math.ceil(totalSec * fps);

    const canvasStream = canvas.captureStream(fps);
    const tracks: MediaStreamTrack[] = [...canvasStream.getVideoTracks()];

    if (audioEl) {
      audioCtx = new AudioContext();
      const src = audioCtx.createMediaElementSource(audioEl);
      const dest = audioCtx.createMediaStreamDestination();
      src.connect(dest);
      src.connect(audioCtx.destination);
      tracks.push(...dest.stream.getAudioTracks());
    }

    const mime =
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
    const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: mime });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };

    const done = new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mime.split(";")[0] }));
      recorder.onerror = () => reject(new Error("Story encoding failed"));
    });

    recorder.start(200);
    if (audioEl) {
      audioEl.currentTime = 0;
      void audioEl.play().catch(() => undefined);
    }

    onProgress?.({ phase: "rendering", percent: 15, message: "Blending scenes…" });

    for (let frame = 0; frame < totalFrames; frame++) {
      const t = frame / fps;
      const slideIdx = Math.min(sources.length - 1, Math.floor(t / slideDur));
      const localT = (t - slideIdx * slideDur) / slideDur;
      const src = sources[slideIdx]!;

      ctx.filter = filter;
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, w, h);

      const zoom = manifest.transition === "zoom" ? 1 + localT * 0.08 : 1.02;
      const panX =
        manifest.transition === "slide" ? (localT - 0.5) * w * 0.08 : Math.sin(localT * Math.PI) * 8;

      if (src.kind === "image") {
        const img = await loadImage(src.objectUrl);
        drawCover(ctx, img, img.naturalWidth, img.naturalHeight, w, h, zoom, panX, 0);
      } else {
        const vid = await loadVideoMeta(src.objectUrl);
        const seek = Math.min(vid.duration || slideDur, localT * (vid.duration || slideDur));
        await new Promise<void>((res) => {
          vid.currentTime = seek;
          vid.onseeked = () => res();
        });
        drawCover(ctx, vid, vid.videoWidth, vid.videoHeight, w, h, zoom, panX, 0);
      }

      ctx.filter = "none";
      applyGradeOverlay(ctx, w, h, manifest.polishPreset, manifest.polishIntensity);
      applyVignette(ctx, w, h, manifest.polishIntensity);

      if (manifest.caption?.trim()) {
        ctx.font = "600 42px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(w * 0.08, h - 120, w * 0.84, 64);
        ctx.fillStyle = "#fff";
        ctx.fillText(manifest.caption.trim().slice(0, 80), w / 2, h - 72);
      }

      if (frame % 6 === 0) {
        onProgress?.({
          phase: "encoding",
          percent: 15 + Math.round((frame / totalFrames) * 80),
          message: "Polishing story…",
        });
      }

      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
    }

    recorder.stop();
    audioEl?.pause();
    if (audioEl?.src.startsWith("blob:")) URL.revokeObjectURL(audioEl.src);
    await audioCtx?.close();

    onProgress?.({ phase: "done", percent: 100, message: "Story ready" });
    return done;
  } finally {
    revokeSlideSources(sources);
  }
}

export function previewFilterStyle(preset: PsharePolishPreset, intensity: number): string {
  return polishCssFilter(preset, intensity);
}

export type { PshareStudioTransition };
