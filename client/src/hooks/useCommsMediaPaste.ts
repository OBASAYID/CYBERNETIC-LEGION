import { useEffect } from "react";

export function useCommsMediaPaste(onFile: (file: File) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.kind !== "file") continue;
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          onFile(file);
          return;
        }
      }
    };

    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enabled, onFile]);
}
