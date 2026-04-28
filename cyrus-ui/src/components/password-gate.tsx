import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, KeyRound, User } from "lucide-react";
import { postFusionHandshake } from "@/lib/advanced-fusion-client";
import { isSystemInitializingResponse, systemFetch } from "@/lib/system-api";
import { getApiFetchTimeoutMs } from "@/lib/api-timing";

export type GateProfile = { displayName: string; role: "admin" | "user" };

/** Max attempts and delay between attempts when `/api/login` returns 503 (system initializing). */
const LOGIN_503_MAX_ATTEMPTS = 8;
const LOGIN_503_RETRY_MS = 1000;

interface PasswordGateProps {
  onAuthenticated: (sessionToken: string, profile: GateProfile) => void;
  /** Owned by `App` so Vite/React remounts of this screen do not wipe in-progress typing. */
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
    if (!active || active === document.body) {
      usernameInputRef.current?.focus();
    }
  }, []);

  const handleUsernameInput = (value: string) => {
    if (error) setError("");
    onUsernameChange(value);
  };

  const handleUsernamePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    handleUsernameInput(pasted.replace(/\s+/g, " ").trimStart());
  };

  const handleUsernameFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.currentTarget.value.trim().length > 0) {
      e.currentTarget.select();
    }
  };

  const handlePasswordInput = (value: string) => {
    if (error) setError("");
    onPasswordChange(value);
  };

  const handlePasswordPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text");
    // Access codes copied from chats/docs often include trailing spaces/newlines.
    handlePasswordInput(pasted.trim());
  };

  const handleUsernameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (!password.trim()) {
      passwordInputRef.current?.focus();
      return;
    }
    const form = e.currentTarget.form;
    form?.requestSubmit();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Username required");
      return;
    }
    if (!password.trim()) {
      setError("Access code required");
      return;
    }

    setIsLoading(true);

    try {
      const loginUsername = username.trim();
      const loginCode = password.trim();
      let loginRes: Response | null = null;
      type LoginJson = {
        message?: string;
        hint?: string;
        code?: string;
        status?: string;
        user?: { role?: string };
        sessionToken?: string;
      };
      let loginJson: LoginJson = {};

      for (let attempt = 0; attempt < LOGIN_503_MAX_ATTEMPTS; attempt++) {
        loginRes = await systemFetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: loginUsername, code: loginCode }),
        });
        const raw = await loginRes.text();
        let parsed: LoginJson = {};
        try {
          parsed = raw ? (JSON.parse(raw) as LoginJson) : {};
        } catch {
          parsed = {};
        }
        loginJson = parsed;

        if (loginRes.ok) break;
        if (loginRes.status === 503 && isSystemInitializingResponse(loginRes, parsed)) {
          await new Promise((r) => setTimeout(r, LOGIN_503_RETRY_MS));
          continue;
        }
        break;
      }

      if (!loginRes) {
        setError("ACCESS DENIED");
        return;
      }

      if (!loginRes.ok) {
        const primary =
          loginJson.message ||
          (loginRes.status === 503 ? "System still starting — try again" : "ACCESS DENIED");
        const detail = loginJson.hint ? ` — ${loginJson.hint}` : "";
        setError(`${primary}${detail}`);
        return;
      }

      const role: "admin" | "user" = loginJson.user?.role === "admin" ? "admin" : "user";
      const issuedSessionToken =
        typeof loginJson.sessionToken === "string" && loginJson.sessionToken.trim().length > 0
          ? loginJson.sessionToken.trim()
          : `cyrus-session-${Date.now()}`;

      // Do not gate successful login on cookie propagation. If the server issued a signed session
      // token, proceed immediately and verify session in the background.
      const hasSignedToken = !issuedSessionToken.startsWith("cyrus-session-");
      if (!hasSignedToken) {
        let sessionOk = false;
        const SESSION_VERIFY_ATTEMPTS = 10;
        const sessionFetchMs = getApiFetchTimeoutMs();
        for (let verifyAttempt = 0; verifyAttempt < SESSION_VERIFY_ATTEMPTS; verifyAttempt++) {
          try {
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), sessionFetchMs);
            const who = await systemFetch("/api/auth/user", {
              cache: "no-store",
              signal: ctrl.signal,
              headers: {
                "x-cyrus-session-token": issuedSessionToken,
                authorization: `Bearer ${issuedSessionToken}`,
              },
            });
            window.clearTimeout(timer);
            if (who.ok) {
              sessionOk = true;
              break;
            }
          } catch {
            /* retry */
          }
          await new Promise((r) => setTimeout(r, 180 * (verifyAttempt + 1)));
        }
        if (!sessionOk) {
          setError(
            "Signed in, but session verification failed in this browser context. Refresh and retry; if it continues, clear site data and disable strict cookie/privacy blocking for this site.",
          );
          return;
        }
      } else {
        // Best-effort verification only; never block sign-in when token is already valid.
        void (async () => {
          try {
            const ctrl = new AbortController();
            const timer = window.setTimeout(() => ctrl.abort(), getApiFetchTimeoutMs());
            await systemFetch("/api/auth/user", {
              cache: "no-store",
              signal: ctrl.signal,
              headers: {
                "x-cyrus-session-token": issuedSessionToken,
                authorization: `Bearer ${issuedSessionToken}`,
              },
            });
            window.clearTimeout(timer);
          } catch {
            /* non-blocking */
          }
        })();
      }

      void postFusionHandshake({
        displayName: loginUsername,
        role,
      }).then((handshake) => {
        if (!handshake.ok) return;
        try {
          sessionStorage.setItem("cyrus_fusion_handshake", JSON.stringify(handshake.data));
        } catch {
          /* ignore */
        }
      });

      onAuthenticated(issuedSessionToken, {
        displayName: loginUsername,
        role,
      });
    } catch {
      setError("ACCESS DENIED");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80 pointer-events-none" />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
        <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-orange-500/5 rounded-full blur-3xl" />

        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-green-500/80 font-mono tracking-wider">SYSTEM ACTIVE</span>
        </div>
        <div className="absolute top-4 right-4 text-xs text-white/30 font-mono">
          {new Date().toISOString().split("T")[0]}
        </div>
      </div>

      <div className="relative z-20 w-full max-w-md isolate">
        <div className="text-center mb-10">
          <div className="relative inline-block mb-8 isolate">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-transparent to-orange-500/20 rounded-full blur-2xl animate-pulse pointer-events-none" />
            <div className="absolute -inset-8 border border-cyan-500/10 rounded-full pointer-events-none" />
            <div className="absolute -inset-12 border border-orange-500/5 rounded-full pointer-events-none" />
            <div className="relative w-52 h-52 mx-auto">
              <img
                src="/images/cyrus-logo.png"
                alt="CYRUS"
                className="w-full h-full object-cover drop-shadow-[0_0_30px_rgba(34,211,238,0.7)] scale-125"
                style={{ clipPath: "circle(42% at center)" }}
              />
              <div className="absolute -left-8 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-12 h-14 border-l-2 border-t-2 border-b-2 border-cyan-500/70 rounded-l-lg" />
              </div>
              <div className="absolute -right-8 top-1/2 -translate-y-1/2 pointer-events-none">
                <div className="w-12 h-14 border-r-2 border-t-2 border-b-2 border-cyan-500/70 rounded-r-lg" />
              </div>
            </div>
          </div>

          <h1
            className="text-5xl font-black mb-3 tracking-wider"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              CYRUS
            </span>
            <span className="text-white/60 text-lg ml-1 align-super">™</span>
          </h1>
          <p className="text-cyan-400/90 text-sm font-semibold tracking-[0.3em] uppercase mb-1">
            Command Your Responsive Unified System
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-cyan-500/50" />
            <span className="text-white/30 text-xs tracking-widest font-mono">MILITARY GRADE AI</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-orange-500/40 via-transparent to-orange-500/40 rounded-lg opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-500 pointer-events-none" />
            <div className="absolute inset-0 border border-white/10 rounded-lg group-focus-within:border-orange-500/30 transition-colors pointer-events-none" />
            <div className="relative z-[1] bg-black/40 backdrop-blur-xl rounded-lg flex items-center pl-4">
              <User className="h-5 w-5 text-orange-400/60 shrink-0" />
              <Input
                type="text"
                placeholder="ENTER USERNAME"
                value={username}
                onChange={(e) => handleUsernameInput(e.target.value)}
                onKeyDown={handleUsernameKeyDown}
                onFocus={handleUsernameFocus}
                onPaste={handleUsernamePaste}
                className="h-14 bg-transparent border-0 text-white text-center text-sm placeholder:text-white/25 focus-visible:ring-0 font-mono flex-1"
                data-testid="input-username"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                ref={usernameInputRef}
              />
            </div>
          </div>

          <div className="relative group">
            <div className="absolute -inset-px bg-gradient-to-r from-cyan-500/50 via-transparent to-orange-500/50 rounded-lg opacity-0 group-focus-within:opacity-100 blur-sm transition-all duration-500 pointer-events-none" />
            <div className="absolute inset-0 border border-white/10 rounded-lg group-focus-within:border-cyan-500/30 transition-colors pointer-events-none" />
            <div className="relative z-[1] bg-black/40 backdrop-blur-xl rounded-lg flex items-center pl-4">
              <KeyRound className="h-5 w-5 text-cyan-400/60 shrink-0" aria-hidden />
              <Input
                id="cyrus-access-code"
                type={showPassword ? "text" : "password"}
                placeholder="ENTER ACCESS CODE"
                value={password}
                onChange={(e) => handlePasswordInput(e.target.value)}
                onPaste={handlePasswordPaste}
                aria-label="Access code"
                className={`h-14 bg-transparent border-0 text-white text-center text-sm placeholder:text-white/25 focus-visible:ring-0 font-mono flex-1 pr-12 ${error ? "text-red-400" : ""}`}
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
                className="absolute right-5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 transition-colors"
                data-testid="button-toggle-password"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="flex items-center justify-center gap-2 text-red-400"
              data-testid="gate-error"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <p className="text-sm font-mono tracking-wider text-center">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-16 bg-gradient-to-r from-cyan-600 via-cyan-500 to-cyan-600 hover:from-cyan-500 hover:via-cyan-400 hover:to-cyan-500 text-white font-bold text-lg tracking-[0.2em] rounded-lg shadow-lg shadow-cyan-500/25 transition-colors duration-300 hover:shadow-cyan-500/40 border border-cyan-400/20"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
            disabled={!username.trim() || !password.trim() || isLoading}
            data-testid="button-submit-password"
          >
            {isLoading ? (
              <span className="flex items-center gap-3">
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <div className="mt-12 text-center space-y-3">
          <p className="text-xs text-white/20 tracking-[0.3em] font-mono">
            TOP SECRET // SI // ORCON // NOFORN
          </p>
          <div className="flex justify-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <span className="text-[10px] text-white/30 tracking-wider">SECURE</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-white/30 tracking-wider">ENCRYPTED</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
              <span className="text-[10px] text-white/30 tracking-wider">MILITARY</span>
            </div>
          </div>
          <p className="text-[10px] text-white/15 tracking-wide mt-4">
            Designed by Obakeng Kaelo · Botswana
          </p>
        </div>
      </div>
    </div>
  );
}
