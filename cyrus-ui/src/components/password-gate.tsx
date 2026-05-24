import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound, Shield, User, Zap } from "lucide-react";
import { postFusionHandshake } from "@/lib/advanced-fusion-client";
import { isSystemInitializingResponse, systemFetch } from "@/lib/system-api";
import { getApiFetchTimeoutMs } from "@/lib/api-timing";

export type GateProfile = { displayName: string; role: "admin" | "user" };

const LOGIN_503_MAX_ATTEMPTS = 8;
const LOGIN_503_RETRY_MS = 1000;

interface PasswordGateProps {
  onAuthenticated: (sessionToken: string, profile: GateProfile) => void;
  username: string;
  password: string;
  onUsernameChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
}

export function readStoredDisplayName(): string {
  try {
    return String(localStorage.getItem("cyrus-display-name") || "").trim();
  } catch {
    return "";
  }
}

export function PasswordGate({
  onAuthenticated,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
}: PasswordGateProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const usernameInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body) usernameInputRef.current?.focus();
  }, []);

  const handleUsernameInput = (value: string) => { if (error) setError(""); onUsernameChange(value); };
  const handleUsernamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleUsernameInput(e.clipboardData.getData("text").replace(/\s+/g, " ").trimStart());
  };
  const handleUsernameFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.currentTarget.value.trim().length > 0) e.currentTarget.select();
  };
  const handlePasswordInput = (value: string) => { if (error) setError(""); onPasswordChange(value); };
  const handlePasswordPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    handlePasswordInput(e.clipboardData.getData("text").trim());
  };
  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!password.trim()) { passwordInputRef.current?.focus(); return; }
    e.currentTarget.form?.requestSubmit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username.trim()) { setError("Username required"); return; }
    if (!password.trim()) { setError("Access code required"); return; }
    setIsLoading(true);
    try {
      const loginUsername = username.trim();
      const loginCode = password.trim();
      let loginRes: Response | null = null;
      type LoginJson = { message?: string; hint?: string; code?: string; status?: string; user?: { role?: string }; sessionToken?: string };
      let loginJson: LoginJson = {};

      for (let attempt = 0; attempt < LOGIN_503_MAX_ATTEMPTS; attempt++) {
        loginRes = await systemFetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: loginUsername, code: loginCode }),
        });
        const raw = await loginRes.text();
        try { loginJson = raw ? (JSON.parse(raw) as LoginJson) : {}; } catch { loginJson = {}; }
        if (loginRes.ok) break;
        if (loginRes.status === 503 && isSystemInitializingResponse(loginRes, loginJson)) {
          await new Promise((r) => setTimeout(r, LOGIN_503_RETRY_MS));
          continue;
        }
        break;
      }

      if (!loginRes) { setError("ACCESS DENIED"); return; }
      if (!loginRes.ok) {
        const primary = loginJson.message || (loginRes.status === 503 ? "System still starting — try again" : "ACCESS DENIED");
        const detail = loginJson.hint ? ` — ${loginJson.hint}` : "";
        setError(`${primary}${detail}`);
        return;
      }

      const role: "admin" | "user" = loginJson.user?.role === "admin" ? "admin" : "user";
      const issuedSessionToken =
        typeof loginJson.sessionToken === "string" && loginJson.sessionToken.trim().length > 0
          ? loginJson.sessionToken.trim()
          : `cyrus-session-${Date.now()}`;

      const hasSignedToken = !issuedSessionToken.startsWith("cyrus-session-");
      if (!hasSignedToken) {
        let sessionOk = false;
        for (let verifyAttempt = 0; verifyAttempt < 10; verifyAttempt++) {
          try {
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), getApiFetchTimeoutMs());
            const who = await systemFetch("/api/auth/user", {
              cache: "no-store", signal: ctrl.signal,
              headers: { "x-cyrus-session-token": issuedSessionToken, authorization: `Bearer ${issuedSessionToken}` },
            });
            window.clearTimeout(timer);
            if (who.ok) { sessionOk = true; break; }
          } catch { /* retry */ }
          await new Promise((r) => setTimeout(r, 180 * (verifyAttempt + 1)));
        }
        if (!sessionOk) { setError("Session verification failed. Refresh and retry."); return; }
      } else {
        void (async () => {
          try {
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), getApiFetchTimeoutMs());
            await systemFetch("/api/auth/user", { cache: "no-store", signal: ctrl.signal, headers: { "x-cyrus-session-token": issuedSessionToken, authorization: `Bearer ${issuedSessionToken}` } });
            window.clearTimeout(timer);
          } catch { /* non-blocking */ }
        })();
      }

      void postFusionHandshake({ displayName: loginUsername, role }).then((handshake) => {
        if (!handshake.ok) return;
        try { sessionStorage.setItem("cyrus_fusion_handshake", JSON.stringify(handshake.data)); } catch { /* ignore */ }
      });

      onAuthenticated(issuedSessionToken, { displayName: loginUsername, role });
    } catch {
      setError("ACCESS DENIED");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden" style={{ background: "#080810" }}>
      {/* Gaming background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: "radial-gradient(circle, rgba(225,29,72,0.5) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
        {/* Red nebula top-right */}
        <div className="absolute -top-[20%] -right-[10%] h-[60vh] w-[60vh] rounded-full opacity-20" style={{ background: "radial-gradient(ellipse at center, #e11d48, #7c0a24 40%, transparent 70%)", filter: "blur(80px)" }} />
        {/* Cyan nebula bottom-left */}
        <div className="absolute -bottom-[20%] -left-[10%] h-[50vh] w-[50vh] rounded-full opacity-15" style={{ background: "radial-gradient(ellipse at center, #06b6d4, #0e4a58 40%, transparent 70%)", filter: "blur(80px)" }} />
        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_30%,rgba(0,0,0,0.9)_100%)]" />
        {/* Top line */}
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,72,0.8) 50%, transparent)" }} />
        {/* Bottom line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.6) 50%, transparent)" }} />

        {/* Corner brackets */}
        <div className="absolute top-6 left-6 w-12 h-12 border-l-2 border-t-2 border-[#e11d48]/40" />
        <div className="absolute top-6 right-6 w-12 h-12 border-r-2 border-t-2 border-[#e11d48]/40" />
        <div className="absolute bottom-6 left-6 w-12 h-12 border-l-2 border-b-2 border-cyan-500/30" />
        <div className="absolute bottom-6 right-6 w-12 h-12 border-r-2 border-b-2 border-cyan-500/30" />

        {/* System active */}
        <div className="absolute top-5 left-16 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.8)" }} />
          <span className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/80 uppercase">System Active</span>
        </div>
        <div className="absolute top-5 right-16 text-[10px] font-mono text-white/20 tracking-wider">
          {new Date().toISOString().split("T")[0]}
        </div>
      </div>

      {/* Login panel */}
      <div className="relative z-20 w-full max-w-[420px]">
        {/* Logo section */}
        <div className="text-center mb-8">
          {/* Hexagon icon frame */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div className="absolute inset-0 rounded-full opacity-30" style={{ background: "radial-gradient(ellipse, #e11d48, transparent 70%)", filter: "blur(30px)", transform: "scale(2)" }} />
            <div className="relative h-20 w-20 rounded-2xl border-2 border-[#e11d48]/60 bg-[#e11d48]/10 flex items-center justify-center shadow-[0_0_40px_rgba(225,29,72,0.3)]">
              <div className="absolute -top-px -left-px w-4 h-4 border-l-2 border-t-2 border-[#e11d48] rounded-tl-xl" />
              <div className="absolute -bottom-px -right-px w-4 h-4 border-r-2 border-b-2 border-[#e11d48] rounded-br-xl" />
              <Zap className="h-9 w-9 text-[#e11d48]" />
            </div>
          </div>

          <h1 className="text-5xl font-black tracking-widest mb-2" style={{ fontFamily: "'Orbitron', system-ui", background: "linear-gradient(135deg, #fff 30%, #e11d48 70%, #f43f5e 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            CYRUS
          </h1>
          <p className="text-[11px] font-mono tracking-[0.4em] uppercase mb-1" style={{ color: "#06b6d4", opacity: 0.9 }}>
            OMEGA-TIER QUANTUM AI
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-12" style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,72,0.6))" }} />
            <span className="text-[9px] text-white/25 tracking-[0.4em] font-mono">MILITARY GRADE</span>
            <div className="h-px w-12" style={{ background: "linear-gradient(90deg, rgba(225,29,72,0.6), transparent)" }} />
          </div>
        </div>

        {/* Form card */}
        <div className="relative rounded-2xl overflow-hidden" style={{ background: "rgba(13,13,30,0.85)", border: "1px solid rgba(225,29,72,0.2)", boxShadow: "0 0 60px rgba(225,29,72,0.08), inset 0 1px 0 rgba(255,255,255,0.05)", backdropFilter: "blur(24px)" }}>
          {/* Inner glow */}
          <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(225,29,72,0.5), transparent)" }} />

          <form onSubmit={handleSubmit} className="p-7 space-y-4">
            {/* Username */}
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" style={{ background: "rgba(225,29,72,0.08)", boxShadow: "0 0 20px rgba(225,29,72,0.12)" }} />
              <div className="relative flex items-center rounded-xl border border-white/10 group-focus-within:border-[#e11d48]/50 bg-white/[0.04] transition-all duration-300 overflow-hidden">
                <div className="pl-4 pr-1 flex items-center">
                  <User className="h-4 w-4 text-[#e11d48]/60" />
                </div>
                <Input
                  type="text"
                  placeholder="ENTER CALLSIGN"
                  value={username}
                  onChange={(e) => handleUsernameInput(e.target.value)}
                  onKeyDown={handleUsernameKeyDown}
                  onFocus={handleUsernameFocus}
                  onPaste={handleUsernamePaste}
                  className="h-12 bg-transparent border-0 text-white text-sm placeholder:text-white/20 focus-visible:ring-0 font-mono tracking-wider flex-1"
                  data-testid="input-username"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  ref={usernameInputRef}
                />
              </div>
            </div>

            {/* Access code */}
            <div className="relative group">
              <div className="absolute inset-0 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" style={{ background: "rgba(6,182,212,0.06)", boxShadow: "0 0 20px rgba(6,182,212,0.10)" }} />
              <div className="relative flex items-center rounded-xl border border-white/10 group-focus-within:border-cyan-500/50 bg-white/[0.04] transition-all duration-300 overflow-hidden">
                <div className="pl-4 pr-1 flex items-center">
                  <KeyRound className="h-4 w-4 text-cyan-500/60" />
                </div>
                <Input
                  id="cyrus-access-code"
                  type={showPassword ? "text" : "password"}
                  placeholder="ENTER ACCESS CODE"
                  value={password}
                  onChange={(e) => handlePasswordInput(e.target.value)}
                  onPaste={handlePasswordPaste}
                  className={`h-12 bg-transparent border-0 text-sm placeholder:text-white/20 focus-visible:ring-0 font-mono tracking-wider flex-1 pr-12 ${error ? "text-[#e11d48]" : "text-white"}`}
                  data-testid="input-password"
                  autoComplete="current-password"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  ref={passwordInputRef}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-[#e11d48]/30 bg-[#e11d48]/10 px-4 py-2.5" data-testid="gate-error">
                <span className="h-2 w-2 shrink-0 rounded-full bg-[#e11d48]" style={{ boxShadow: "0 0 6px rgba(225,29,72,0.8)" }} />
                <p className="text-xs font-mono tracking-wider text-[#e11d48]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || isLoading}
              className="relative w-full h-12 rounded-xl font-black text-sm tracking-[0.2em] text-white overflow-hidden transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ fontFamily: "'Orbitron', system-ui", background: "linear-gradient(135deg, #be123c, #e11d48, #f43f5e)", boxShadow: "0 0 30px rgba(225,29,72,0.35)" }}
              data-testid="button-submit-password"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  AUTHENTICATING…
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <Shield className="h-4 w-4" />
                  INITIATE ACCESS
                </span>
              )}
            </button>
          </form>

          {/* Bottom decoration */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(6,182,212,0.4), transparent)" }} />
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-[9px] text-white/15 font-mono tracking-[0.35em]">
            TOP SECRET // SI // ORCON // NOFORN
          </p>
          <div className="flex justify-center gap-5">
            {[["#22c55e", "SECURE"], ["#06b6d4", "ENCRYPTED"], ["#e11d48", "CLASSIFIED"]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: color, boxShadow: `0 0 4px ${color}` }} />
                <span className="text-[9px] text-white/25 font-mono tracking-wider">{label}</span>
              </div>
            ))}
          </div>
          <p className="text-[9px] text-white/10 tracking-wide">Designed by Obakeng Kaelo · Botswana · CYRUS v3.0</p>
        </div>
      </div>
    </div>
  );
}
