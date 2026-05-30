import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Eye, EyeOff, KeyRound, Save, ShieldCheck, AlertTriangle, CheckCircle2,
  Activity, Users, RefreshCw, LogOut, Ban, UserX, Unlock, Trash2, Clock,
  Monitor, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserRole } from "@/hooks/use-user-role";
import { systemFetch } from "@/lib/system-api";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AccessCodeStatus {
  adminCodeSource: "database" | "env" | "default";
  userCodeSource: "database" | "env" | "default";
  adminCodeMask: string;
  userCodeMask: string;
}

interface ActivityEntry {
  id: number;
  username: string | null;
  eventType: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface SessionEntry {
  tokenHash: string;
  username: string;
  role: string;
  loginAt: string;
  lastSeenAt: string;
  ipAddress: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  login_success: "text-green-400",
  login_failed: "text-red-400",
  login_blocked: "text-[#e11d48]",
  logout: "text-slate-400",
  session_revoked: "text-[#e11d48]/70",
  user_blocked: "text-red-400",
  user_unblocked: "text-cyan-400",
  user_removed: "text-red-500",
};

const EVENT_LABELS: Record<string, string> = {
  login_success: "Login",
  login_failed: "Failed Login",
  login_blocked: "Blocked",
  logout: "Logout",
  session_revoked: "Session Revoked",
  user_blocked: "User Blocked",
  user_unblocked: "User Unblocked",
  user_removed: "User Removed",
};

const SOURCE_LABEL: Record<string, string> = {
  database: "Database (custom)",
  env: "Environment variable",
  default: "System default",
};

const SOURCE_COLOR: Record<string, string> = {
  database: "text-cyan-400",
  env: "text-[#e11d48]/80",
  default: "text-white/40",
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function shortHash(hash: string) {
  return hash.slice(0, 8) + "…";
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Banner({ banner }: { banner: { type: "success" | "error"; message: string } | null }) {
  if (!banner) return null;
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
      banner.type === "success"
        ? "border-green-500/30 bg-green-500/10 text-green-300"
        : "border-red-500/30 bg-red-500/10 text-red-300"
    }`}>
      {banner.type === "success"
        ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-green-400" />
        : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-red-400" />}
      <p>{banner.message}</p>
    </div>
  );
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-px flex-1 bg-white/8" />
      <h2 className="shrink-0 text-[11px] font-semibold tracking-[0.25em] uppercase text-white/50"
        style={{ fontFamily: "'Orbitron', system-ui" }}>
        {label}
      </h2>
      <div className="h-px flex-1 bg-white/8" />
    </div>
  );
}

function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel, danger,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel: string; danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl p-6 shadow-2xl" style={{ background: "rgba(8,8,16,0.98)", border: "1px solid rgba(225,29,72,0.25)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ background: danger ? "rgba(239,68,68,0.1)" : "rgba(225,29,72,0.1)", border: danger ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(225,29,72,0.3)" }}>
            <AlertTriangle className="h-5 w-5 text-[#e11d48]" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-wide text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>
              {title}
            </h3>
          </div>
        </div>
        <p className="text-sm text-white/55 rounded-xl p-4 mb-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>{description}</p>
        <div className="flex gap-3">
          <Button onClick={onClose} className="flex-1 border border-white/15 bg-white/[0.07] text-white/70 hover:bg-white/[0.12] hover:text-white">
            Cancel
          </Button>
          <Button onClick={onConfirm} className="flex-1 font-semibold tracking-wide text-white"
            style={{ background: danger ? "rgba(239,68,68,0.8)" : "rgba(225,29,72,0.85)", fontFamily: "'Orbitron', system-ui" }}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab: Access Codes ────────────────────────────────────────────────────────

function CodeField({ label, sublabel, value, onChange, mask, source }: {
  label: string; sublabel: string; value: string; onChange: (v: string) => void;
  mask: string; source: string;
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
        <span className={`font-mono text-[10px] tracking-widest uppercase mt-1 ${SOURCE_COLOR[source] ?? "text-white/40"}`}>
          {SOURCE_LABEL[source] ?? source}
        </span>
      </div>
      <div className="relative flex-1">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400/50 pointer-events-none" />
        <Input
          type={visible ? "text" : "password"}
          placeholder={`Current: ${mask}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-9 pr-10 bg-black/40 border-white/15 text-white placeholder:text-white/25 font-mono text-sm focus-visible:ring-cyan-500/30 focus-visible:border-cyan-500/40"
          autoComplete="new-password" autoCorrect="off" autoCapitalize="none" spellCheck={false}
        />
        <button type="button" onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function AccessCodesTab() {
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
  });

  const mutation = useMutation({
    mutationFn: async (payload: { adminCode?: string; userCode?: string }) => {
      const r = await systemFetch("/api/settings/access-codes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j as any)?.error ?? "Update failed"); }
      return r.json();
    },
    onSuccess: () => {
      setAdminCode(""); setUserCode(""); setConfirmOpen(false);
      setBanner({ type: "success", message: "Access codes updated. New codes take effect immediately." });
      queryClient.invalidateQueries({ queryKey: ["/api/settings/access-codes"] });
      setTimeout(() => setBanner(null), 6000);
    },
    onError: (err: Error) => {
      setConfirmOpen(false);
      setBanner({ type: "error", message: err.message });
      setTimeout(() => setBanner(null), 8000);
    },
  });

  const hasChanges = adminCode.trim().length > 0 || userCode.trim().length > 0;

  const handleSave = () => { if (hasChanges) setConfirmOpen(true); };
  const handleConfirm = () => {
    const payload: { adminCode?: string; userCode?: string } = {};
    if (adminCode.trim()) payload.adminCode = adminCode.trim();
    if (userCode.trim()) payload.userCode = userCode.trim();
    mutation.mutate(payload);
  };

  return (
    <div className="space-y-6">
      <Banner banner={banner} />
      <SectionDivider label="Access Codes" />
      <p className="text-xs text-white/40 leading-relaxed">
        Access codes gate entry to CYRUS. Leave a field blank to keep the current code unchanged. Minimum 4 characters. Changes take effect immediately.
      </p>
      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-cyan-400/50 text-xs font-mono">
          <div className="h-4 w-4 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" />
          Loading…
        </div>
      ) : (
        <div className="space-y-3">
          <CodeField label="Admin Access Code" sublabel="Full access — settings, command console, all modules"
            value={adminCode} onChange={setAdminCode} mask={status?.adminCodeMask ?? "••••••••"} source={status?.adminCodeSource ?? "default"} />
          <CodeField label="User Access Code" sublabel="Standard access — interact without admin controls"
            value={userCode} onChange={setUserCode} mask={status?.userCodeMask ?? "•••••"} source={status?.userCodeSource ?? "default"} />
        </div>
      )}
      <div className="flex justify-end pt-2">
        <Button onClick={handleSave} disabled={!hasChanges || mutation.isPending}
          className="inline-flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold tracking-wide px-6 py-2.5 rounded-lg transition-colors shadow-lg shadow-cyan-500/20 disabled:opacity-40"
          style={{ fontFamily: "'Orbitron', system-ui" }}>
          <Save className="h-4 w-4" />
          {mutation.isPending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
      <ConfirmDialog
        open={confirmOpen} onClose={() => setConfirmOpen(false)} onConfirm={handleConfirm}
        title="Confirm Code Change" confirmLabel="Confirm"
        description={`${adminCode.trim() ? "Admin code " : ""}${adminCode.trim() && userCode.trim() ? "and " : ""}${userCode.trim() ? "User code " : ""}will be changed. Anyone without the new code will be locked out on next login.`}
      />
    </div>
  );
}

// ─── Tab: Activity Log ────────────────────────────────────────────────────────

function ActivityLogTab() {
  const { data, isLoading, refetch, isFetching } = useQuery<{ entries: ActivityEntry[] }>({
    queryKey: ["/api/settings/activity-log"],
    queryFn: async () => {
      const r = await systemFetch("/api/settings/activity-log?limit=100");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
    refetchInterval: 15000,
  });

  const entries = data?.entries ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SectionDivider label="Activity Log" />
        <button onClick={() => refetch()} disabled={isFetching}
          className="ml-4 shrink-0 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 py-4 text-cyan-400/50 text-xs font-mono">
          <div className="h-4 w-4 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" /> Loading…
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-xs text-white/30 font-mono tracking-wider">NO EVENTS RECORDED YET</p>
      ) : (
        <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
          <div className="max-h-[480px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-sm border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-2.5 text-white/40 font-mono tracking-wider font-normal">TIME</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-mono tracking-wider font-normal">USER</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-mono tracking-wider font-normal">EVENT</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-mono tracking-wider font-normal hidden sm:table-cell">DETAILS</th>
                  <th className="text-left px-4 py-2.5 text-white/40 font-mono tracking-wider font-normal hidden md:table-cell">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((e) => (
                  <tr key={e.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="px-4 py-2.5 text-white/40 font-mono whitespace-nowrap">
                      <span title={new Date(e.createdAt).toLocaleString()}>{relativeTime(e.createdAt)}</span>
                    </td>
                    <td className="px-4 py-2.5 text-white/80 font-mono">{e.username ?? "—"}</td>
                    <td className={`px-4 py-2.5 font-semibold font-mono ${EVENT_COLORS[e.eventType] ?? "text-white/60"}`}>
                      {EVENT_LABELS[e.eventType] ?? e.eventType}
                    </td>
                    <td className="px-4 py-2.5 text-white/40 hidden sm:table-cell">{e.details ?? "—"}</td>
                    <td className="px-4 py-2.5 text-white/30 font-mono hidden md:table-cell">{e.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Users & Sessions ────────────────────────────────────────────────────

function UsersTab() {
  const queryClient = useQueryClient();
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirm, setConfirm] = useState<{ action: string; username: string; tokenHash?: string } | null>(null);
  const [blockInput, setBlockInput] = useState("");

  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions, isFetching: sessionsFetching } =
    useQuery<{ sessions: SessionEntry[] }>({
      queryKey: ["/api/settings/sessions"],
      queryFn: async () => {
        const r = await systemFetch("/api/settings/sessions");
        if (!r.ok) throw new Error();
        return r.json();
      },
      refetchInterval: 20000,
    });

  const { data: blockedData, isLoading: blockedLoading, refetch: refetchBlocked } =
    useQuery<{ blocked: string[] }>({
      queryKey: ["/api/settings/blocked-users"],
      queryFn: async () => {
        const r = await systemFetch("/api/settings/blocked-users");
        if (!r.ok) throw new Error();
        return r.json();
      },
    });

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/settings/sessions"] });
    queryClient.invalidateQueries({ queryKey: ["/api/settings/blocked-users"] });
    queryClient.invalidateQueries({ queryKey: ["/api/settings/activity-log"] });
  }

  async function apiAction(url: string, method: string = "POST") {
    const r = await systemFetch(url, { method });
    if (!r.ok) { const j = await r.json().catch(() => ({})); throw new Error((j as any)?.error ?? "Action failed"); }
    return r.json();
  }

  function flash(type: "success" | "error", message: string) {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 6000);
  }

  const handleConfirm = async () => {
    if (!confirm) return;
    try {
      if (confirm.action === "logout-session" && confirm.tokenHash) {
        await apiAction(`/api/settings/sessions/${confirm.tokenHash}`, "DELETE");
        flash("success", `Session for ${confirm.username} revoked.`);
      } else if (confirm.action === "logout-user") {
        const r = await apiAction(`/api/settings/users/${encodeURIComponent(confirm.username)}/logout`);
        flash("success", `${confirm.username} logged out (${r.sessionsRevoked} sessions revoked).`);
      } else if (confirm.action === "block") {
        await apiAction(`/api/settings/users/${encodeURIComponent(confirm.username)}/block`);
        flash("success", `${confirm.username} blocked and sessions revoked.`);
      } else if (confirm.action === "unblock") {
        await apiAction(`/api/settings/users/${encodeURIComponent(confirm.username)}/unblock`);
        flash("success", `${confirm.username} unblocked.`);
      } else if (confirm.action === "remove") {
        await apiAction(`/api/settings/users/${encodeURIComponent(confirm.username)}`, "DELETE");
        flash("success", `${confirm.username} removed — sessions revoked, history cleared, account blocked.`);
      }
      invalidate();
    } catch (err: any) {
      flash("error", err.message);
    }
    setConfirm(null);
  };

  const sessions = sessionsData?.sessions ?? [];
  const blocked = blockedData?.blocked ?? [];

  const DIALOGS: Record<string, { title: string; description: string; confirmLabel: string; danger?: boolean }> = {
    "logout-session": {
      title: "Revoke Session", confirmLabel: "Revoke",
      description: `Immediately invalidate this session token for ${confirm?.username}. They will be logged out on their next request.`,
    },
    "logout-user": {
      title: "Force Logout", confirmLabel: "Force Logout",
      description: `Revoke all active sessions for ${confirm?.username}. They will be logged out immediately on next request.`,
    },
    "block": {
      title: "Block User", confirmLabel: "Block", danger: true,
      description: `Block ${confirm?.username} from logging in and revoke all their sessions. You can unblock them later.`,
    },
    "unblock": {
      title: "Unblock User", confirmLabel: "Unblock",
      description: `Allow ${confirm?.username} to log in again.`,
    },
    "remove": {
      title: "Remove User", confirmLabel: "Remove", danger: true,
      description: `Permanently remove ${confirm?.username}: block the account, revoke all sessions, and wipe their conversation history. This cannot be fully undone.`,
    },
  };

  const dlg = confirm ? DIALOGS[confirm.action] : null;

  return (
    <div className="space-y-8">
      <Banner banner={banner} />

      {/* Active Sessions */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <SectionDivider label="Active Sessions" />
          <button onClick={() => refetchSessions()} disabled={sessionsFetching}
            className="ml-4 shrink-0 flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors">
            <RefreshCw className={`h-3.5 w-3.5 ${sessionsFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
        {sessionsLoading ? (
          <div className="flex items-center gap-2 py-3 text-cyan-400/50 text-xs font-mono">
            <div className="h-4 w-4 rounded-full border border-cyan-500/30 border-t-cyan-400 animate-spin" /> Loading…
          </div>
        ) : sessions.length === 0 ? (
          <p className="py-4 text-center text-xs text-white/30 font-mono tracking-wider">NO ACTIVE SESSIONS</p>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            <div className="max-h-64 overflow-y-auto">
              {sessions.map((s) => (
                <div key={s.tokenHash} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <Monitor className="h-4 w-4 text-white/40" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/90">{s.username}</span>
                      <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: s.role === "admin" ? "rgba(225,29,72,0.15)" : "rgba(6,182,212,0.12)", color: s.role === "admin" ? "#e11d48" : "#06b6d4" }}>
                        {s.role}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[10px] text-white/35 font-mono">
                      <span title={new Date(s.loginAt).toLocaleString()}>
                        <Clock className="h-2.5 w-2.5 inline mr-1" />Login {relativeTime(s.loginAt)}
                      </span>
                      <span>Active {relativeTime(s.lastSeenAt)}</span>
                      {s.ipAddress && <span>{s.ipAddress}</span>}
                      <span className="text-white/20">#{shortHash(s.tokenHash)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setConfirm({ action: "logout-session", username: s.username, tokenHash: s.tokenHash })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 text-xs hover:border-[#e11d48]/30 hover:text-[#e11d48]/80 transition-colors"
                      title="Revoke this session">
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirm({ action: "block", username: s.username })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 text-xs hover:border-red-500/30 hover:text-red-300 transition-colors"
                      title="Block user">
                      <Ban className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirm({ action: "remove", username: s.username })}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 text-xs hover:border-red-600/40 hover:text-red-400 transition-colors"
                      title="Remove user">
                      <UserX className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Block a user manually */}
      <div className="space-y-3">
        <SectionDivider label="Block User by Name" />
        <p className="text-xs text-white/40">Block a specific username even if they have no active session.</p>
        <div className="flex gap-2">
          <Input
            value={blockInput} onChange={(e) => setBlockInput(e.target.value)}
            placeholder="Enter username…"
            className="flex-1 bg-black/40 border-white/15 text-white placeholder:text-white/25 font-mono text-sm"
            autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onKeyDown={(e) => { if (e.key === "Enter" && blockInput.trim()) setConfirm({ action: "block", username: blockInput.trim() }); }}
          />
          <Button
            onClick={() => { if (blockInput.trim()) setConfirm({ action: "block", username: blockInput.trim() }); }}
            disabled={!blockInput.trim()}
            className="bg-red-700/70 hover:bg-red-600 text-white border border-red-500/30 px-4">
            <Ban className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Blocked Users */}
      {!blockedLoading && blocked.length > 0 && (
        <div className="space-y-3">
          <SectionDivider label="Blocked Accounts" />
          <div className="rounded-xl border border-white/10 bg-black/20 overflow-hidden">
            {blocked.map((u) => (
              <div key={u} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10">
                  <Shield className="h-4 w-4 text-red-400/70" />
                </div>
                <span className="flex-1 font-mono text-sm text-white/70">{u}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setConfirm({ action: "unblock", username: u })}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 text-xs hover:border-cyan-500/30 hover:text-cyan-300 transition-colors">
                    <Unlock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Unblock</span>
                  </button>
                  <button
                    onClick={() => setConfirm({ action: "remove", username: u })}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/50 text-xs hover:border-red-600/40 hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Remove</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {dlg && confirm && (
        <ConfirmDialog
          open={true} onClose={() => setConfirm(null)} onConfirm={handleConfirm}
          title={dlg.title} description={dlg.description} confirmLabel={dlg.confirmLabel} danger={dlg.danger}
        />
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "codes" | "activity" | "users";

const TABS: { id: Tab; label: string; Icon: typeof ShieldCheck }[] = [
  { id: "codes", label: "Access Codes", Icon: KeyRound },
  { id: "activity", label: "Activity Log", Icon: Activity },
  { id: "users", label: "Users & Sessions", Icon: Users },
];

export default function SettingsPage() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const [tab, setTab] = useState<Tab>("codes");

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-white">
      <div className="pointer-events-none fixed inset-0 bg-slate-950/40" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-black/30" />

      <div className="relative z-10 mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-inner">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>
                SYSTEM SETTINGS
              </h1>
              <p className="text-xs text-white/40 font-mono tracking-widest uppercase">Administration · Access Control</p>
            </div>
          </div>
          <div className="mt-4 h-px w-full bg-gradient-to-r from-cyan-500/30 via-transparent to-transparent" />
        </div>

        {!isAdmin ? (
          <div className="rounded-xl p-6 text-center text-sm" style={{ background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)" }}>
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#e11d48]/70" />
            <p className="font-semibold tracking-wide text-white/80">Admin access required</p>
            <p className="text-xs text-white/35 mt-1">Log in with the admin code to access system settings.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 mb-6 rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm p-1">
              {TABS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setTab(id)}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold tracking-wide transition-all ${
                    tab === id
                      ? "bg-cyan-600/30 border border-cyan-500/40 text-cyan-100 shadow-inner shadow-cyan-500/10"
                      : "text-white/50 hover:text-white/80 hover:bg-white/5"
                  }`}
                  style={{ fontFamily: "'Orbitron', system-ui" }}>
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            {tab === "codes" && <AccessCodesTab />}
            {tab === "activity" && <ActivityLogTab />}
            {tab === "users" && <UsersTab />}
          </>
        )}
      </div>
    </div>
  );
}
