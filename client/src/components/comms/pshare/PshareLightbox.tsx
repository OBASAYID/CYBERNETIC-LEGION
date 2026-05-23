import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

export function PshareLightbox({
  images,
  index,
  onClose,
  onIndexChange,
}: {
  images: { url: string; alt: string; downloadUrl?: string }[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  if (images.length === 0) return null;
  const current = images[index] ?? images[0];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, hasPrev, hasNext, onClose, onIndexChange]);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <div className="flex shrink-0 items-center justify-between px-4 py-3">
        <p className="truncate text-sm text-white/70">
          {current.alt}
          {images.length > 1 && (
            <span className="text-white/40"> · {index + 1} / {images.length}</span>
          )}
        </p>
        <div className="flex items-center gap-2">
          {current.downloadUrl && (
            <a
              href={current.downloadUrl}
              download
              className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Download"
            >
              <Download className="h-5 w-5" />
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6">
        {hasPrev && (
          <button
            type="button"
            onClick={() => onIndexChange(index - 1)}
            className="absolute left-2 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70 sm:left-4"
            aria-label="Previous"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}
        <img
          src={current.url}
          alt={current.alt}
          className="max-h-full max-w-full object-contain"
          draggable={false}
        />
        {hasNext && (
          <button
            type="button"
            onClick={() => onIndexChange(index + 1)}
            className="absolute right-2 z-10 rounded-full bg-black/50 p-2 text-white/80 hover:bg-black/70 sm:right-4"
            aria-label="Next"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>
    </div>
  );
}
