import { useEffect, useRef, useState } from "react";
import {
  Check,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  EyeOff,
  ExternalLink,
  KeyRound,
  Loader2,
  ShieldAlert,
  Trash2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { isValidApiKeyFormat, useApiKey } from "@/hooks/use-api-key";

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SaveState = "idle" | "validating" | "success" | "error";

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const { apiKey, maskedKey, isConfigured, setApiKey, clearApiKey } = useApiKey();

  const [inputValue, setInputValue] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Reset local state whenever the modal opens
  useEffect(() => {
    if (open) {
      setInputValue("");
      setShowKey(false);
      setSaveState("idle");
      setErrorMessage("");
      setCopied(false);
      setConfirmClear(false);
      // Small delay so the dialog animation completes before focusing
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [open]);

  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (saveState === "error") {
      setSaveState("idle");
      setErrorMessage("");
    }
  };

  const handleSave = async () => {
    const trimmed = inputValue.trim();

    if (!trimmed) {
      setErrorMessage("Please enter an API key.");
      setSaveState("error");
      return;
    }

    if (!isValidApiKeyFormat(trimmed)) {
      setErrorMessage(
        'Invalid key format. OpenAI API keys start with "sk-" and are at least 20 characters long.',
      );
      setSaveState("error");
      return;
    }

    setSaveState("validating");
    setErrorMessage("");

    // Brief simulated validation delay for UX feedback
    await new Promise((r) => setTimeout(r, 600));

    setApiKey(trimmed);
    setSaveState("success");

    // Auto-close after showing success
    setTimeout(() => {
      onOpenChange(false);
    }, 1200);
  };

  const handleClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearApiKey();
    setConfirmClear(false);
    setSaveState("idle");
    setErrorMessage("");
    setInputValue("");
  };

  const handleCopy = async () => {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard not available */
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && saveState !== "validating" && saveState !== "success") {
      void handleSave();
    }
  };

  const isLoading = saveState === "validating";
  const isSuccess = saveState === "success";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-full max-w-lg border-0 bg-transparent p-0 shadow-none",
          "[&>button]:text-white/50 [&>button]:hover:text-white/90",
        )}
      >
        {/* Outer glow frame */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-950/95 via-slate-900/95 to-slate-950/95 shadow-[0_0_60px_-15px_rgba(34,211,238,0.25),0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl">
          {/* Dot-grid texture */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, rgba(34,211,238,0.5) 1px, transparent 0)",
              backgroundSize: "22px 22px",
            }}
            aria-hidden
          />
          {/* Ambient glow blobs */}
          <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />
          <div className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full blur-3xl" style={{ background: "rgba(225,29,72,0.08)" }} aria-hidden />
          {/* Top accent line */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" aria-hidden />

          <div className="relative p-6 sm:p-7">
            <DialogHeader className="mb-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/35 bg-cyan-500/12 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                  <KeyRound className="h-5 w-5 text-cyan-300" />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-200/60">
                    Configuration
                  </p>
                  <DialogTitle
                    className="mt-0.5 bg-gradient-to-r from-cyan-100 via-white to-[#e11d48]/80 bg-clip-text text-xl font-bold tracking-tight text-transparent"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    OpenAI API Key
                  </DialogTitle>
                </div>
              </div>
              <DialogDescription className="text-sm leading-relaxed text-white/65">
                Enter your OpenAI API key to enable AI-powered features. Keys are stored locally in
                your browser.{" "}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-cyan-400/90 underline-offset-2 hover:text-cyan-300 hover:underline"
                >
                  Get a key
                  <ExternalLink className="h-3 w-3" />
                </a>
              </DialogDescription>
            </DialogHeader>

            {/* Current status */}
            <div
              className={cn(
                "mb-5 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                isConfigured
                  ? "border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-200"
                  : "border-[#e11d48]/25 bg-[#e11d48]/[0.08] text-[#e11d48]/90",
              )}
            >
              {isConfigured ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-[#e11d48]" />
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium">
                  {isConfigured ? "API key configured" : "No API key configured"}
                </span>
                {isConfigured && maskedKey && (
                  <span className="ml-2 font-mono text-xs text-white/50">{maskedKey}</span>
                )}
              </div>
              {isConfigured && (
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopy}
                    title="Copy API key to clipboard"
                    className="rounded-lg p-1.5 text-white/40 transition hover:bg-white/10 hover:text-white/80"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <ClipboardCopy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    title={confirmClear ? "Click again to confirm" : "Clear API key"}
                    className={cn(
                      "rounded-lg p-1.5 transition hover:bg-white/10",
                      confirmClear
                        ? "text-red-400 hover:text-red-300"
                        : "text-white/40 hover:text-white/80",
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {confirmClear && (
                    <span className="text-xs text-red-400/80">Click again to confirm</span>
                  )}
                </div>
              )}
            </div>

            {/* Input section */}
            <div className="space-y-2">
              <Label
                htmlFor="api-key-input"
                className="text-xs font-mono uppercase tracking-widest text-white/50"
              >
                {isConfigured ? "Replace API Key" : "Enter API Key"}
              </Label>
              <div className="relative group">
                {/* Focus glow */}
                <div className="pointer-events-none absolute -inset-px rounded-xl bg-gradient-to-r from-cyan-500/30 via-transparent to-[#e11d48]/20 opacity-0 blur-sm transition-all duration-500 group-focus-within:opacity-100" />
                <div className="pointer-events-none absolute inset-0 rounded-xl border border-white/10 transition-colors group-focus-within:border-cyan-500/40" />
                <div className="relative flex items-center rounded-xl bg-black/40 backdrop-blur-sm">
                  <KeyRound className="ml-3.5 h-4 w-4 shrink-0 text-cyan-400/50" aria-hidden />
                  <Input
                    id="api-key-input"
                    ref={inputRef}
                    type={showKey ? "text" : "password"}
                    placeholder="sk-..."
                    value={inputValue}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || isSuccess}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="h-12 flex-1 border-0 bg-transparent font-mono text-sm text-white placeholder:text-white/20 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    disabled={isLoading || isSuccess}
                    className="mr-3 rounded-md p-1.5 text-white/30 transition hover:text-white/70 disabled:pointer-events-none"
                    aria-label={showKey ? "Hide API key" : "Show API key"}
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Validation feedback */}
              {saveState === "error" && errorMessage && (
                <div className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/[0.08] px-3 py-2.5 text-xs text-red-300">
                  <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}
              {isSuccess && (
                <div className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.08] px-3 py-2.5 text-xs text-emerald-300">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  <span>API key saved successfully.</span>
                </div>
              )}

              {/* Real-time format hint */}
              {inputValue && !isSuccess && saveState !== "error" && (
                <p
                  className={cn(
                    "text-xs",
                    isValidApiKeyFormat(inputValue) ? "text-emerald-400/70" : "text-white/35",
                  )}
                >
                  {isValidApiKeyFormat(inputValue)
                    ? "✓ Key format looks valid"
                    : 'Key must start with "sk-" and be at least 20 characters'}
                </p>
              )}
            </div>

            {/* Security warning */}
            <div className="mt-5 flex items-start gap-2.5 rounded-xl px-4 py-3" style={{ background: "rgba(225,29,72,0.05)", border: "1px solid rgba(225,29,72,0.15)" }}>
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#e11d48]/70" />
              <div className="space-y-1 text-xs text-white/50">
                <p className="font-semibold text-white/70">Security notice</p>
                <p>
                  Your key is stored in browser <code className="font-mono text-[#06b6d4]/70">localStorage</code> and
                  is accessible to JavaScript on this page. For production use, configure the key
                  via a server-side environment variable instead.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-6 flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="border border-white/12 text-white/70 hover:border-white/25 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void handleSave()}
                disabled={!inputValue.trim() || isLoading || isSuccess}
                className={cn(
                  "min-w-[120px] border font-semibold tracking-wide transition-all",
                  isSuccess
                    ? "border-emerald-500/40 bg-emerald-600/30 text-emerald-200"
                    : "border-cyan-500/40 bg-gradient-to-r from-cyan-600/40 to-cyan-700/40 text-cyan-50 hover:from-cyan-500/50 hover:to-cyan-600/50 shadow-lg shadow-cyan-500/10",
                )}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving…
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Saved
                  </span>
                ) : (
                  "Save Key"
                )}
              </Button>
            </div>

            {/* Footer note */}
            <p className="mt-4 text-center text-[10px] font-mono tracking-widest text-white/20">
              CYRUS · AI CONFIGURATION · SECURE CONTEXT
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Standalone trigger button that shows the API key status indicator.
 * Renders a gear/key icon with a coloured dot reflecting configuration state.
 */
export function ApiKeyTriggerButton({
  onClick,
  isConfigured,
}: {
  onClick: () => void;
  isConfigured: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={isConfigured ? "OpenAI API key configured — click to manage" : "Configure OpenAI API key"}
      className="relative inline-flex items-center gap-2 rounded-lg border border-white/18 bg-white/[0.08] px-3 py-1.5 text-xs text-white/92 shadow-inner transition hover:border-cyan-500/30 hover:bg-white/[0.12]"
      style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
    >
      <KeyRound className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">API Key</span>
      {/* Status dot */}
      <span
        className={cn(
          "absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-slate-950",
          isConfigured
            ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
            : "bg-[#e11d48] shadow-[0_0_6px_rgba(225,29,72,0.8)] animate-pulse",
        )}
        aria-label={isConfigured ? "API key configured" : "API key not configured"}
      />
    </button>
  );
}
