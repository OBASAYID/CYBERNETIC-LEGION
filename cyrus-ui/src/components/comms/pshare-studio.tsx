/**
 * Pshare Studio — clip + photo/video story composer with smart polish advise.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Clapperboard,
  Film,
  Loader2,
  Music,
  Sparkles,
  Upload,
  Wand2,
} from "lucide-react";
import { systemFetch } from "@/lib/system-api";
import { getCommsDeviceId } from "../../../../client/src/lib/comms-device-id";
import { uploadCommsFileSmart } from "../../../../client/src/lib/comms-chunk-upload";
import {
  previewFilterStyle,
  renderStoryVideo,
  type StudioComposeProgress,
} from "../../../../client/src/lib/pshare-studio-composer";
import {
  adviseStudioProject,
  PSHARE_POLISH_PRESETS,
  type PsharePolishPreset,
  type PshareStudioAdvice,
  type PshareStudioManifest,
  type PshareStudioMode,
  type PshareStudioTransition,
} from "@shared/comms/pshare-studio";

const C = {
  crimson: "#E70011",
  border: "rgba(255,255,255,0.08)",
  sidebarInput: "#222222",
  sidebarDivider: "#2E2E2E",
} as const;

type PshareStudioProps = {
  myUserId: string;
  onPosted?: () => void;
};

type LocalScene = {
  id: string;
  file: File;
  kind: "image" | "video";
  previewUrl: string;
};

export function PshareStudio({ myUserId, onPosted }: PshareStudioProps) {
  const qc = useQueryClient();
  const sceneRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<PshareStudioMode>("story");
  const [scenes, setScenes] = useState<LocalScene[]>([]);
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipPreview, setClipPreview] = useState<string | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [preset, setPreset] = useState<PsharePolishPreset>("cyrus-bold");
  const [intensity, setIntensity] = useState(68);
  const [transition, setTransition] = useState<PshareStudioTransition>("crossfade");
  const [advice, setAdvice] = useState<PshareStudioAdvice | null>(null);
  const [renderProgress, setRenderProgress] = useState<StudioComposeProgress | null>(null);
  const [renderedPreview, setRenderedPreview] = useState<string | null>(null);
  const [renderedBlob, setRenderedBlob] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filterStyle = useMemo(() => previewFilterStyle(preset, intensity), [preset, intensity]);

  useEffect(() => {
    return () => {
      for (const s of scenes) URL.revokeObjectURL(s.previewUrl);
      if (clipPreview) URL.revokeObjectURL(clipPreview);
      if (audioPreview) URL.revokeObjectURL(audioPreview);
      if (renderedPreview) URL.revokeObjectURL(renderedPreview);
    };
  }, [scenes, clipPreview, audioPreview, renderedPreview]);

  const clearRendered = () => {
    if (renderedPreview) URL.revokeObjectURL(renderedPreview);
    setRenderedPreview(null);
    setRenderedBlob(null);
  };

  const addScenes = (files: FileList | null) => {
    if (!files?.length) return;
    const next: LocalScene[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) continue;
      next.push({
        id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`,
        file,
        kind: file.type.startsWith("video/") ? "video" : "image",
        previewUrl: URL.createObjectURL(file),
      });
    }
    setScenes((prev) => [...prev, ...next].slice(0, 16));
    clearRendered();
  };

  const runAdvise = useMutation({
    mutationFn: async () => {
      const imageCount = scenes.filter((s) => s.kind === "image").length;
      const videoCount = scenes.filter((s) => s.kind === "video").length + (clipFile ? 1 : 0);
      const slideCount = mode === "clip" ? (clipFile ? 1 : 0) : scenes.length;
      let audioDurationSec: number | undefined;
      if (audioFile) {
        audioDurationSec = await new Promise<number>((resolve) => {
          const a = document.createElement("audio");
          a.src = URL.createObjectURL(audioFile);
          a.onloadedmetadata = () => {
            URL.revokeObjectURL(a.src);
            resolve(a.duration || 0);
          };
        });
      }
      const res = await systemFetch("/api/comms/pshare/studio/advise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getCommsDeviceId(),
          "X-User-Id": myUserId,
        },
        body: JSON.stringify({
          mode,
          slideCount,
          imageCount,
          videoCount,
          audioDurationSec,
        }),
      });
      if (!res.ok) {
        const local = adviseStudioProject({
          mode,
          slideCount,
          imageCount,
          videoCount,
          audioDurationSec,
        });
        return local;
      }
      const data = await res.json();
      return (data.advice ?? adviseStudioProject({
        mode,
        slideCount,
        imageCount,
        videoCount,
        audioDurationSec,
      })) as PshareStudioAdvice;
    },
    onSuccess: (a) => {
      setAdvice(a);
      setPreset(a.recommendedPreset);
      setIntensity(a.recommendedIntensity);
      setTransition(a.recommendedTransition);
    },
  });

  const applyAdvice = () => {
    if (!advice) void runAdvise.mutate();
    else {
      setPreset(advice.recommendedPreset);
      setIntensity(advice.recommendedIntensity);
      setTransition(advice.recommendedTransition);
    }
  };

  const buildManifest = useCallback((): PshareStudioManifest => {
    return {
      mode,
      aspect: advice?.aspect ?? "9:16",
      slides: scenes.map((s) => ({
        localId: s.id,
        kind: s.kind,
        fileName: s.file.name,
        mimeType: s.file.type,
        durationSec: advice?.slideDurationSec ?? 3.5,
      })),
      polishPreset: preset,
      polishIntensity: intensity,
      transition,
      caption: caption.trim() || undefined,
    };
  }, [mode, scenes, advice, preset, intensity, transition, caption]);

  const renderStory = async () => {
    if (scenes.length === 0) {
      setError("Add photos or video clips for your story");
      return;
    }
    setBusy(true);
    setError(null);
    clearRendered();
    try {
      const manifest = buildManifest();
      const blob = await renderStoryVideo(
        manifest,
        scenes.map((s) => s.file),
        audioFile,
        setRenderProgress,
      );
      setRenderedBlob(blob);
      setRenderedPreview(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Story render failed");
    } finally {
      setBusy(false);
      setRenderProgress(null);
    }
  };

  const publish = useMutation({
    mutationFn: async () => {
      setError(null);
      let uploadBlob: Blob | File;
      let fileName: string;
      let mimeType: string;
      let postKind: string;
      let manifest = buildManifest();

      if (mode === "story") {
        if (!renderedBlob) throw new Error("Render your story first");
        uploadBlob = renderedBlob;
        fileName = `pshare-story-${Date.now()}.webm`;
        mimeType = "video/webm";
        postKind = "story";
        if (audioFile) {
          const audioUp = await uploadCommsFileSmart(audioFile, { userId: myUserId, fileName: audioFile.name });
          manifest = { ...manifest, audioUrl: audioUp.fileUrl, audioFileName: audioFile.name };
        }
      } else {
        if (!clipFile) throw new Error("Select a video clip");
        uploadBlob = clipFile;
        fileName = clipFile.name;
        mimeType = clipFile.type || "video/webm";
        postKind = "clip";
      }

      const uploaded = await uploadCommsFileSmart(uploadBlob, {
        userId: myUserId,
        fileName,
      });

      const res = await systemFetch("/api/comms/pshare/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": getCommsDeviceId(),
          "X-User-Id": myUserId,
        },
        body: JSON.stringify({
          body: caption.trim(),
          fileUrl: uploaded.fileUrl,
          fileName: uploaded.fileName || fileName,
          fileMimeType: uploaded.mimeType || mimeType,
          postKind,
          mediaManifest: manifest,
          audioUrl: manifest.audioUrl ?? null,
          polishPreset: preset,
          durationSec: manifest.renderedDurationSec ?? null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Post failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setScenes([]);
      setClipFile(null);
      setClipPreview(null);
      setAudioFile(null);
      setCaption("");
      clearRendered();
      void qc.invalidateQueries({ queryKey: ["/api/comms/pshare/posts"] });
      onPosted?.();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Publish failed"),
  });

  return (
    <div
      className="mx-4 mb-3 overflow-hidden rounded-xl border"
      style={{ borderColor: C.border, background: "rgba(255,255,255,0.03)" }}
    >
      <div className="flex items-center justify-between border-b px-3 py-2.5" style={{ borderColor: C.border }}>
        <div className="flex items-center gap-2">
          <Clapperboard className="h-4 w-4 text-rose-400" />
          <p className="text-[11px] font-bold text-white">Pshare Studio</p>
        </div>
        <div className="flex gap-1">
          {(["story", "clip"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); clearRendered(); }}
              className="rounded-lg px-2.5 py-1 text-[9px] font-bold uppercase tracking-wide"
              style={{
                background: mode === m ? `${C.crimson}28` : "transparent",
                color: mode === m ? "#fda4af" : "rgba(255,255,255,0.45)",
                border: `1px solid ${mode === m ? `${C.crimson}44` : "transparent"}`,
              }}
            >
              {m === "story" ? "Story" : "Clip"}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 p-3">
        {mode === "story" ? (
          <>
            <div className="flex flex-wrap gap-2">
              <input ref={sceneRef} type="file" accept="image/*,video/*" multiple className="hidden"
                onChange={(e) => { addScenes(e.target.files); e.target.value = ""; }} />
              <button type="button" onClick={() => sceneRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-white/75"
                style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}>
                <Upload className="h-3.5 w-3.5" /> Add scenes
              </button>
              <input ref={audioRef} type="file" accept="audio/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  if (audioPreview) URL.revokeObjectURL(audioPreview);
                  setAudioFile(f);
                  setAudioPreview(URL.createObjectURL(f));
                  clearRendered();
                }} />
              <button type="button" onClick={() => audioRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-white/75"
                style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}>
                <Music className="h-3.5 w-3.5" /> Soundtrack
              </button>
            </div>
            {scenes.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {scenes.map((s) => (
                  <div key={s.id} className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md border border-white/10">
                    {s.kind === "image" ? (
                      <img src={s.previewUrl} alt="" className="h-full w-full object-cover" style={{ filter: filterStyle }} />
                    ) : (
                      <video src={s.previewUrl} className="h-full w-full object-cover" muted playsInline style={{ filter: filterStyle }} />
                    )}
                  </div>
                ))}
              </div>
            )}
            {audioPreview && (
              <audio src={audioPreview} controls className="h-8 w-full" />
            )}
          </>
        ) : (
          <>
            <input ref={clipRef} type="file" accept="video/*" className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (!f) return;
                if (clipPreview) URL.revokeObjectURL(clipPreview);
                setClipFile(f);
                setClipPreview(URL.createObjectURL(f));
              }} />
            <button type="button" onClick={() => clipRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-white/75"
              style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}>
              <Film className="h-3.5 w-3.5" /> Upload clip
            </button>
            {clipPreview && (
              <video src={clipPreview} controls playsInline className="max-h-44 w-full rounded-lg" style={{ filter: filterStyle }} />
            )}
          </>
        )}

        <div>
          <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wider text-white/40">Polish grade</p>
          <div className="flex flex-wrap gap-1">
            {(Object.keys(PSHARE_POLISH_PRESETS) as PsharePolishPreset[]).map((p) => (
              <button key={p} type="button" onClick={() => setPreset(p)}
                className="rounded-md px-2 py-1 text-[9px] font-medium"
                style={{
                  background: preset === p ? `${C.crimson}22` : C.sidebarInput,
                  color: preset === p ? "#fda4af" : "rgba(255,255,255,0.55)",
                  border: `1px solid ${preset === p ? `${C.crimson}44` : C.sidebarDivider}`,
                }}>
                {PSHARE_POLISH_PRESETS[p].label}
              </button>
            ))}
          </div>
          <label className="mt-2 flex items-center gap-2 text-[10px] text-white/50">
            Intensity
            <input type="range" min={0} max={100} value={intensity}
              onChange={(e) => setIntensity(Number(e.target.value))} className="flex-1" />
            <span>{intensity}%</span>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={runAdvise.isPending}
            onClick={() => void runAdvise.mutate()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-sky-200/90"
            style={{ background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.25)" }}>
            <Sparkles className="h-3.5 w-3.5" /> Smart advise
          </button>
          <button type="button" onClick={applyAdvice}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-white/70"
            style={{ background: C.sidebarInput, border: `1px solid ${C.sidebarDivider}` }}>
            <Wand2 className="h-3.5 w-3.5" /> Apply polish
          </button>
          {mode === "story" && (
            <button type="button" disabled={busy || scenes.length === 0} onClick={() => void renderStory()}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] text-rose-200"
              style={{ background: `${C.crimson}22`, border: `1px solid ${C.crimson}44` }}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Film className="h-3.5 w-3.5" />}
              Render story
            </button>
          )}
        </div>

        {advice && (
          <div className="rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[10px] text-white/60">
            <p className="font-semibold text-white/80">{advice.summary}</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {advice.tips.slice(0, 3).map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {renderProgress && (
          <p className="text-[10px] text-white/50">{renderProgress.message} ({renderProgress.percent}%)</p>
        )}

        {renderedPreview && (
          <video src={renderedPreview} controls playsInline className="max-h-52 w-full rounded-lg border border-white/10" />
        )}

        <input value={caption} onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption (optional)"
          className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[11px] text-white outline-none placeholder:text-white/30" />

        <button type="button"
          disabled={publish.isPending || busy || (mode === "story" ? !renderedBlob : !clipFile)}
          onClick={() => publish.mutate()}
          className="w-full rounded-lg py-2 text-[11px] font-bold text-rose-100 disabled:opacity-40"
          style={{ background: `${C.crimson}33`, border: `1px solid ${C.crimson}55` }}>
          {publish.isPending ? "Publishing…" : mode === "story" ? "Post story to Pshare" : "Post clip to Pshare"}
        </button>

        {error && <p className="text-[10px] text-rose-300/90">{error}</p>}
      </div>
    </div>
  );
}
