import { lazy, Suspense, useState } from "react";
import { Box, Download, Expand, ExternalLink, Layers3, X } from "lucide-react";
import {
  getCommsCadFormatLabel,
  getCommsCadPreviewFormat,
  isCommsCad3dFile,
} from "../../lib/comms-cad-formats";

const CommsCad3dViewer = lazy(() =>
  import("./CommsCad3dViewer").then((m) => ({ default: m.CommsCad3dViewer })),
);

export interface CommsCad3dAttachmentProps {
  url: string;
  downloadUrl: string;
  fileName?: string;
  mimeType?: string;
  caption?: string;
  holoSurface?: boolean;
  compact?: boolean;
}

export function CommsCad3dAttachment({
  url,
  downloadUrl,
  fileName,
  mimeType,
  caption,
  holoSurface = false,
  compact = false,
}: CommsCad3dAttachmentProps) {
  const [expanded, setExpanded] = useState(false);
  const formatLabel = getCommsCadFormatLabel(fileName);
  const previewFormat = getCommsCadPreviewFormat(fileName, mimeType);
  const canPreview = Boolean(previewFormat && url);

  if (!isCommsCad3dFile(fileName, mimeType)) return null;

  const card = (
    <div
      className={`max-w-[min(100%,360px)] space-y-2 rounded-xl border p-2.5 ${
        holoSurface
          ? "border-cyan-400/30 bg-gradient-to-br from-cyan-950/35 via-slate-950/60 to-violet-950/25 shadow-[0_0_24px_-8px_rgba(34,211,238,0.35)]"
          : "border-amber-500/25 bg-gradient-to-br from-amber-950/25 via-slate-950/60 to-cyan-950/20"
      }`}
    >
      <div className="flex items-start gap-2">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            holoSurface ? "bg-cyan-500/15 text-cyan-200" : "bg-amber-500/15 text-amber-200"
          }`}
        >
          {canPreview ? <Layers3 className="h-4 w-4" /> : <Box className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{fileName || "3D model"}</p>
          <p className={`text-[10px] ${holoSurface ? "text-cyan-200/60" : "text-amber-200/60"}`}>
            {formatLabel}
            {canPreview ? " · interactive preview" : " · download to open in CAD"}
          </p>
        </div>
        {canPreview ? (
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="rounded-lg p-1.5 text-cyan-200/70 transition hover:bg-cyan-500/10 hover:text-cyan-50"
            title="Expand 3D viewer"
          >
            <Expand className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {canPreview && previewFormat ? (
        <Suspense
          fallback={
            <div className={`flex items-center justify-center rounded-lg bg-black/30 text-xs text-cyan-200/60 ${compact ? "h-40" : "h-56"}`}>
              Preparing 3D viewer…
            </div>
          }
        >
          <CommsCad3dViewer url={url} format={previewFormat} compact={compact} />
        </Suspense>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/10 bg-black/25 px-4 py-8 text-center">
          <Box className={`h-10 w-10 ${holoSurface ? "text-cyan-400/70" : "text-amber-400/70"}`} />
          <p className="text-xs text-white/75">Exchange format — open in SolidWorks, Fusion, or your CAD tool</p>
          <p className="text-[10px] text-white/45">STEP, IGES, Parasolid, and native CAD files are shared for team review</p>
        </div>
      )}

      <div className="flex flex-wrap gap-2 text-[11px]">
        <a
          href={downloadUrl}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 ${
            holoSurface
              ? "border-cyan-400/35 bg-cyan-500/10 text-cyan-50 hover:bg-cyan-500/18"
              : "border-amber-500/30 bg-amber-500/10 text-amber-100 hover:bg-amber-500/18"
          }`}
        >
          <Download className="h-3 w-3" />
          Download
        </a>
        {canPreview ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-cyan-300 underline"
          >
            <ExternalLink className="h-3 w-3" />
            Open model
          </a>
        ) : null}
      </div>

      {caption?.trim() ? (
        <p className="whitespace-pre-wrap break-words border-t border-white/5 pt-2 text-sm text-white/85">
          {caption}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      {card}
      {expanded && canPreview && previewFormat ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative flex h-[min(88vh,720px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-cyan-400/35 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-cyan-500/20 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white">{fileName || "3D model"}</p>
                <p className="text-[10px] text-cyan-200/60">{formatLabel} · team 3D review</p>
              </div>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="rounded-lg p-2 text-white/60 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 p-3">
              <Suspense fallback={<div className="flex h-full items-center justify-center text-cyan-200/60">Loading…</div>}>
                <CommsCad3dViewer url={url} format={previewFormat} className="!h-full min-h-[420px]" />
              </Suspense>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
