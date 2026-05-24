import type { CommsUploadProgress } from "../../lib/comms-media-upload";
import { formatCommsFileSize } from "@shared/comms/media-formats";

type CommsUploadProgressProps = {
  fileName?: string;
  progress: CommsUploadProgress | null;
  error?: string | null;
};

export function CommsUploadProgressBar({ fileName, progress, error }: CommsUploadProgressProps) {
  if (!progress && !error) return null;

  const percent = progress?.percent ?? 0;
  const phaseLabel =
    progress?.phase === "init"
      ? "Preparing…"
      : progress?.phase === "completing"
        ? "Finalizing…"
        : progress?.phase === "done"
          ? "Complete"
          : "Uploading…";

  return (
    <div className="mx-3 mb-2 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate text-cyan-100/90">{fileName || "Uploading file"}</span>
        <span className="shrink-0 text-cyan-200/70">
          {error ? "Failed" : `${percent}% · ${phaseLabel}`}
        </span>
      </div>
      {!error && progress && (
        <>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          {progress.total > 0 && (
            <p className="mt-1 text-[10px] text-cyan-200/50">
              {formatCommsFileSize(progress.loaded)} / {formatCommsFileSize(progress.total)}
            </p>
          )}
        </>
      )}
      {error && <p className="text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
