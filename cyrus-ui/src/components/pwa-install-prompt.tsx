import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "cyrus-pwa-install-dismissed";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream;
}

/**
 * Optional install banner for PWA (Chromium `beforeinstallprompt`) and iOS Add to Home Screen hint.
 */
export function PwaInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandaloneDisplay()) return;

    if (isIosSafari()) {
      setIosHint(true);
      return;
    }

    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  if (dismissed || isStandaloneDisplay()) return null;

  if (deferred) {
    return (
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-[120] border-t border-cyan-500/25 bg-slate-950/95 px-4 py-3 shadow-lg backdrop-blur-md",
          "pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]",
        )}
        role="region"
        aria-label="Install CYRUS app"
      >
        <div className="mx-auto flex max-w-lg items-start gap-3">
          <Download className="mt-0.5 h-5 w-5 shrink-0 text-cyan-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white">Install CYRUS</p>
            <p className="mt-0.5 text-xs text-white/70">
              Add to your home screen for a full-screen app experience with faster launch.
            </p>
          </div>
          <button
            type="button"
            onClick={install}
            className="min-h-11 shrink-0 rounded-lg border border-cyan-400/40 bg-cyan-500/20 px-3 text-xs font-semibold text-cyan-50 touch-manipulation"
          >
            Install
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-white/60 touch-manipulation hover:text-white"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!iosHint) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[120] border-t border-amber-500/20 bg-slate-950/92 px-4 py-2.5 backdrop-blur-md",
        "pb-[max(0.5rem,env(safe-area-inset-bottom))]",
      )}
      role="region"
      aria-label="Add CYRUS to Home Screen"
    >
      <div className="mx-auto flex max-w-lg items-center gap-2 text-xs text-white/75">
        <Share className="h-4 w-4 shrink-0 text-amber-300/90" aria-hidden />
        <p className="min-w-0 flex-1">
          On iPhone/iPad: tap <strong className="text-white/90">Share</strong>, then{" "}
          <strong className="text-white/90">Add to Home Screen</strong> to install CYRUS.
        </p>
        <button
          type="button"
          onClick={dismiss}
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-white/50 touch-manipulation hover:text-white"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
