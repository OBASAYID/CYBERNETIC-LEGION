import { useCallback, useRef, useState } from "react";
import { Upload, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  CYRUS_MEDIA_FILE_ACCEPT,
  CYRUS_MEDIA_FORMAT_LABELS,
  cyrusMaxUploadLabel,
  cyrusMediaCategoryLabel,
} from "@shared/cyrus-media-upload";

type MediaUploadZoneProps = {
  file: File | null;
  onFileSelected: (file: File | null) => void;
  uploading?: boolean;
  title?: string;
  hint?: string;
  variant?: "default" | "emerald" | "cyan";
  className?: string;
};

export function MediaUploadZone({
  file,
  onFileSelected,
  uploading = false,
  title = "Upload media or document",
  hint,
  variant = "default",
  className,
}: MediaUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const pickFile = useCallback(
    (picked: File | undefined) => {
      if (!picked) return;
      onFileSelected(picked);
    },
    [onFileSelected],
  );

  const borderClass =
    variant === "emerald"
      ? "border-emerald-400/30 hover:border-emerald-400/50"
      : variant === "cyan"
        ? "border-cyan-400/30 hover:border-cyan-400/50"
        : "border-white/20 hover:border-sky-400/40";

  return (
    <div className={cn("rounded-xl border border-dashed bg-slate-950/45 p-4", borderClass, className)}>
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={CYRUS_MEDIA_FILE_ACCEPT}
        onChange={(e) => {
          pickFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div
        className={cn(
          "rounded-lg border border-dashed p-4 text-center transition-colors",
          dragOver ? "border-sky-400/60 bg-sky-500/10" : "border-white/10 bg-black/20",
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
      >
        <p className="mb-2 text-xs font-mono uppercase tracking-widest text-white/70">{title}</p>
        <Button
          type="button"
          className="h-11 w-full border border-sky-500/40 bg-sky-500/15 px-4 text-base text-sky-50 hover:bg-sky-500/25"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="mr-2 h-5 w-5" />
              Browse or drop file
            </>
          )}
        </Button>
        <p className="mt-2 text-xs leading-relaxed text-white/45">
          {hint ?? CYRUS_MEDIA_FORMAT_LABELS}
        </p>
        <p className="mt-1 text-xs text-white/35">Max size {cyrusMaxUploadLabel()}</p>
      </div>
      {file && (
        <p className="mt-3 text-sm text-white/80">
          <FileText className="mr-1.5 inline h-4 w-4" />
          {file.name} · {cyrusMediaCategoryLabel(file.name, file.type)} · {(file.size / 1024 / 1024).toFixed(2)} MB
        </p>
      )}
    </div>
  );
}
