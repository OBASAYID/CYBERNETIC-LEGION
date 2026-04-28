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
import { CallProvider } from "@/context/CallContext";
import { ArrowLeft } from "lucide-react";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { useApiKey } from "@/hooks/use-api-key";
import { CallProvider } from "@/contexts/CallContext";

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
  const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false);
  const { isConfigured: apiKeyConfigured } = useApiKey();

  useEffect(() => {
    console.log("[CYRUS] App mounted. isAuthenticated:", isAuthenticated);
    return () => {
      console.log("[CYRUS] App unmounted.");
    };
  }, []);

  useEffect(() => {
    console.log("[CYRUS] Auth state changed:", isAuthenticated);
  }, [isAuthenticated]);

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

  // Derive a stable userId from localStorage device ID (same key used by PresenceContext)
  const callUserId =
    (typeof localStorage !== "undefined" && localStorage.getItem("cyrus_device_id")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("cyrus-device-id")) ||
    `device_${Math.random().toString(36).substr(2, 9)}`;
  const callDisplayName = gateUsername || readStoredDisplayName() || "User";
  // Global keyboard shortcut: Ctrl+Shift+K / Cmd+Shift+K
  useEffect(() => {
    if (!isAuthenticated) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        setApiKeyModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
                  {/* CallProvider wraps all authenticated routes so incoming/active
                      call overlays are globally available regardless of current page. */}
                  <CallProvider userId={callUserId} displayName={callDisplayName}>
                  <AppRoutes
                    onOpenApiKeyModal={() => setApiKeyModalOpen(true)}
                    apiKeyConfigured={apiKeyConfigured}
                  />
                  <CallProvider
                    webRTCOptions={{
                      userId:
                        localStorage.getItem("cyrus_comm_user_id") ||
                        (() => {
                          const id = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                          localStorage.setItem("cyrus_comm_user_id", id);
                          return id;
                        })(),
                      displayName:
                        localStorage.getItem("cyrus-display-name") || "Operator",
                    }}
                  >
                    <AppRoutes />
                  </CallProvider>
                </AppErrorBoundary>
                <ApiKeyModal open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen} />
              </TooltipProvider>
            )}
          </div>
        </QueryClientProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
