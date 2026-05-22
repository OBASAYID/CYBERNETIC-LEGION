import { useCallback, useState, type DragEvent, type ReactNode } from "react";
import { ImagePlus } from "lucide-react";

interface CommsMediaDropZoneProps {
  enabled?: boolean;
  onFile: (file: File) => void;
  holoSurface?: boolean;
  className?: string;
  children: ReactNode;
}

function pickFileFromDataTransfer(dt: DataTransfer): File | null {
  if (dt.files?.length) return dt.files[0];
  for (const item of Array.from(dt.items || [])) {
    if (item.kind === "file") {
      const f = item.getAsFile();
      if (f) return f;
    }
  }
  return null;
}

export function CommsMediaDropZone({
  enabled = true,
  onFile,
  holoSurface = false,
  className = "",
  children,
}: CommsMediaDropZoneProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(true);
    },
    [enabled],
  );

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      if (!enabled) return;
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      const file = pickFileFromDataTransfer(e.dataTransfer);
      if (file) onFile(file);
    },
    [enabled, onFile],
  );

  return (
    <div
      className={`relative ${className}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {enabled && dragOver ? (
        <div
          className={`pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed backdrop-blur-sm ${
            holoSurface
              ? "border-cyan-400/70 bg-cyan-950/55 text-cyan-100"
              : "border-amber-400/60 bg-amber-950/50 text-amber-100"
          }`}
        >
          <ImagePlus className="h-8 w-8 opacity-90" />
          <p className="text-sm font-medium">Drop to share media</p>
        </div>
      ) : null}
    </div>
  );
}
