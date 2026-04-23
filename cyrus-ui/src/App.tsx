import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme-provider";
import { AppErrorBoundary } from "@/components/app-error-boundary";
import { PasswordGate, type GateProfile, readStoredDisplayName } from "@/components/password-gate";
import { useAuthSession } from "@/hooks/use-auth-session";
import { clearGateDraft, readGateDraft, writeGateDraft } from "@/lib/auth-storage";
import { AppRoutes } from "./app-routes";
import { ArrowLeft } from "lucide-react";

function ReturnHomeButton() {
  const [location] = useLocation();
  if (location === "/") return null;

  return (
    <div className="fixed left-4 top-4 z-[100]">
      <Link href="/">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-black/85 transition-colors"
          data-testid="button-return-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Return Home
        </button>
      </Link>
    </div>
  );
}

function App() {
  const { isAuthenticated, onAuthenticated } = useAuthSession();
  /** Lifted from `PasswordGate`; `sessionStorage` survives full `App` remounts (HMR) in the same tab. */
  const [gateUsername, setGateUsername] = useState(
    () => readGateDraft(readStoredDisplayName()).username,
  );
  const [gatePassword, setGatePassword] = useState(
    () => readGateDraft(readStoredDisplayName()).password,
  );
  const prevAuthenticatedRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (isAuthenticated) return;
    writeGateDraft(gateUsername, gatePassword);
  }, [isAuthenticated, gateUsername, gatePassword]);

  useEffect(() => {
    const prev = prevAuthenticatedRef.current;
    if (prev === true && !isAuthenticated) {
      setGatePassword("");
      setGateUsername(readStoredDisplayName());
      clearGateDraft();
    }
    prevAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <div className="min-h-screen bg-black text-white">
            <ReturnHomeButton />
            {!isAuthenticated ? (
              <PasswordGate
                key="cyrus-password-gate"
                username={gateUsername}
                password={gatePassword}
                onUsernameChange={setGateUsername}
                onPasswordChange={setGatePassword}
                onAuthenticated={(sessionToken: string, profile: GateProfile) => {
                  setGatePassword("");
                  clearGateDraft();
                  onAuthenticated(sessionToken, profile);
                }}
              />
            ) : (
              <TooltipProvider>
                <Toaster />
                <AppErrorBoundary>
                  <AppRoutes />
                </AppErrorBoundary>
              </TooltipProvider>
            )}
          </div>
        </QueryClientProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
