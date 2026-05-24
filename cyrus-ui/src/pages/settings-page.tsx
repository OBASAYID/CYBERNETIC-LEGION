import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, KeyRound, Save, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/use-user-role";
import { systemFetch } from "@/lib/system-api";

interface AccessCodeStatus {
  adminCodeSource: "database" | "env" | "default";
  userCodeSource: "database" | "env" | "default";
  adminCodeMask: string;
  userCodeMask: string;
}

const SOURCE_LABEL: Record<string, string> = {
  database: "Database (custom)",
  env: "Environment variable",
  default: "System default",
};

const SOURCE_COLOR: Record<string, string> = {
  database: "text-cyan-400",
  env: "text-amber-400",
  default: "text-white/40",
};

function SourceBadge({ source }: { source: string }) {
  return (
    <span className={`font-mono text-[10px] tracking-widest uppercase ${SOURCE_COLOR[source] ?? "text-white/40"}`}>
      {SOURCE_LABEL[source] ?? source}
    </span>
  );
}

function CodeField({
  label,
  sublabel,
  value,
  onChange,
  mask,
  source,
}: {
  label: string;
  sublabel: string;
  value: string;
  onChange: (v: string) => void;
  mask: string;
  source: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="rounded-xl border border-white/10 bg-black/30 backdrop-blur-md p-5 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/90 tracking-wide" style={{ fontFamily: "'Orbitron', system-ui" }}>
            {label}
          </p>
          <p className="text-xs text-white/40 mt-0.5">{sublabel}</p>
        </div>
        <SourceBadge source={source} />
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50 pointer-events-none" />
          <Input
            type={visible ? "text" : "password"}
            placeholder={`Current: ${mask}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="pl-9 pr-10 bg-black/40 border-white/15 text-white placeholder:text-white/25 font-mono text-sm focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/40"
            autoComplete="new-password"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const queryClient = useQueryClient();

  const [adminCode, setAdminCode] = useState("");
  const [userCode, setUserCode] = useState("");
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: status, isLoading } = useQuery<AccessCodeStatus>({
    queryKey: ["/api/settings/access-codes"],
    queryFn: async () => {
      const r = await systemFetch("/api/settings/access-codes");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    enabled: isAdmin,
  });

  const mutation = useMutation({
    mutationFn: async (payload: { adminCode?: string; userCode?: string }) => {
      const r = await systemFetch("/api/settings/access-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error((j as any)?.error ?? "Update failed");
      }
      return r.json();
    },
    onSuccess: () => {
      setAdminCode("");
      setUserCode("");
      setConfirmOpen(false);
      setBanner({ type: "success", message: "Access codes updated successfully. New codes take effect immediately." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/access-codes"] });
      setTimeout(() => setBanner(null), 6000);
    },
    onError: (err: Error) => {
      setConfirmOpen(false);
      setBanner({ type: "error", message: err.message });
      setTimeout(() => setBanner(null), 8000);
    },
  });

  const handleSave = () => {
    const payload: { adminCode?: string; userCode?: string } = {};
    if (adminCode.trim()) payload.adminCode = adminCode.trim();
    if (userCode.trim()) payload.userCode = userCode.trim();
    if (!payload.adminCode && !payload.userCode) return;
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    const payload: { adminCode?: string; userCode?: string } = {};
    if (adminCode.trim()) payload.adminCode = adminCode.trim();
    if (userCode.trim()) payload.userCode = userCode.trim();
    mutation.mutate(payload);
  };

  const hasChanges = adminCode.trim().length > 0 || userCode.trim().length > 0;

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-white">
      <div className="pointer-events-none fixed inset-0 bg-slate-950/40" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-black/30" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-inner shadow-cyan-500/10">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1
                className="text-2xl font-black tracking-wider text-white"
                style={{ fontFamily: "'Orbitron', system-ui" }}
              >
                SYSTEM SETTINGS
              </h1>
              <p className="text-xs text-white/40 font-mono tracking-widest uppercase">
                Administration · Access Control
              </p>
            </div>
          </div>
          <div className="mt-4 h-px w-full bg-gradient-to-r from-cyan-500/30 via-transparent to-transparent" />
        </div>

        {!isAdmin ? (
          <div className="rounded-xl border border-orange-500/25 bg-orange-500/10 p-6 text-center text-orange-300/80 text-sm">
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-orange-400/70" />
            <p className="font-semibold tracking-wide">Admin access required</p>
            <p className="text-xs text-orange-300/50 mt-1">Log in with the admin code to access system settings.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {banner && (
              <div
                className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                  banner.type === "success"
                    ? "border-green-500/30 bg-green-500/10 text-green-300"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }`}
              >
                {banner.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />
                )}
                <p>{banner.message}</p>
              </div>
            )}

            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-white/8" />
                <h2
                  className="shrink-0 text-[11px] font-semibold tracking-[0.25em] uppercase text-white/50"
                  style={{ fontFamily: "'Orbitron', system-ui" }}
                >
                  Access Codes
                </h2>
                <div className="h-px flex-1 bg-white/8" />
              </div>

              <p className="text-xs text-white/40 leading-relaxed">
                Access codes gate entry to CYRUS. Leave a field blank to keep the current code unchanged.
                Minimum 4 characters. Changes take effect immediately — no restart required.
              </p>

              {isLoading ? (
                <div className="flex items-center gap-2 py-4 text-cyan-400/50 text-xs font-mono">
                  <div className="h-4 w-4 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
                  Loading current configuration…
                </div>
              ) : (
                <div className="space-y-3">
                  <CodeField
                    label="Admin Access Code"
                    sublabel="Full access — command console, settings, all modules"
                    value={adminCode}
                    onChange={setAdminCode}
                    mask={status?.adminCodeMask ?? "••••••••"}
                    source={status?.adminCodeSource ?? "default"}
                  />
                  <CodeField
                    label="User Access Code"
                    sublabel="Standard access — read and interact, no admin controls"
                    value={userCode}
                    onChange={setUserCode}
                    mask={status?.userCodeMask ?? "•••••"}
                    source={status?.userCodeSource ?? "default"}
                  />
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || mutation.isPending}
                  className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold tracking-wide px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-40"
                  style={{ fontFamily: "'Orbitron', system-ui" }}
                >
                  <Save className="h-4 w-4" />
                  {mutation.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </div>
            </section>
          </div>
        )}
      </div>

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-orange-500/30 bg-slate-950/95 p-6 shadow-2xl shadow-black/60">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-orange-500/30 bg-orange-500/10">
                <AlertTriangle className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <h3
                  className="text-base font-bold tracking-wide text-white"
                  style={{ fontFamily: "'Orbitron', system-ui" }}
                >
                  Confirm Code Change
                </h3>
                <p className="text-xs text-white/40">This cannot be undone without database access.</p>
              </div>
            </div>

            <div className="space-y-2 mb-5 text-sm text-white/70 bg-white/5 rounded-lg p-4 border border-white/8">
              {adminCode.trim() && (
                <p>
                  <span className="text-orange-300/80 font-mono text-xs">ADMIN CODE</span>
                  {" "}will be changed.
                </p>
              )}
              {userCode.trim() && (
                <p>
                  <span className="text-amber-300/80 font-mono text-xs">USER CODE</span>
                  {" "}will be changed.
                </p>
              )}
              <p className="text-xs text-white/40 pt-1">
                All currently logged-in sessions remain active until they expire.
                Anyone who does not know the new code will be locked out on next login.
              </p>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 border border-white/15 bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={mutation.isPending}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-semibold tracking-wide"
                style={{ fontFamily: "'Orbitron', system-ui" }}
              >
                {mutation.isPending ? "Saving…" : "Confirm"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
