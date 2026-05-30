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
import { isCommsCallRoute } from "@/lib/comms-route-utils";
import { ArrowLeft, Menu } from "lucide-react";
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { useApiKey } from "@/hooks/use-api-key";
import { AtmosphericSmokeBackground } from "@/components/atmospheric-smoke-background";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import { GameSidebar } from "@/components/game-sidebar";

function ReturnHomeButton() {
  const [location] = useLocation();
  if (location === "/" || isCommsCallRoute(location)) return null;

  return (
    <div className="fixed left-0 top-0 z-[100] cyrus-safe-left cyrus-safe-top">
      <Link href="/">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-black/85 touch-manipulation cyrus-xs-return-home"
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
  const [location] = useLocation();
  const callFocusMode = isCommsCallRoute(location);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < 768 : false,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", onResize, { passive: true });
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  const displayName = gateUsername || readStoredDisplayName() || "User";

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

  const sidebarW = callFocusMode || isMobile ? "0px" : sidebarCollapsed ? "72px" : "clamp(12.5rem, 16vw, 15rem)";

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <div className="relative isolate min-h-screen min-h-dvh overflow-x-hidden bg-black text-white cyrus-xs-shell">
            {!callFocusMode && <AtmosphericSmokeBackground />}
            <div className="relative z-10 min-h-screen min-h-dvh">
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
                    <div data-cyrus-call-stack={callFocusMode ? "call-only" : "presence-only"}>
                      {!callFocusMode && (
                        <GameSidebar
                          collapsed={sidebarCollapsed}
                          onToggle={() => setSidebarCollapsed((v) => !v)}
                          displayName={displayName}
                          mobileOpen={mobileSidebarOpen}
                          onMobileClose={() => setMobileSidebarOpen(false)}
                        />
                      )}

                      {!callFocusMode && isMobile && !mobileSidebarOpen && (
                        <button
                          type="button"
                          onClick={() => setMobileSidebarOpen(true)}
                          aria-label="Open navigation"
                          className="fixed left-2 top-2 z-[200] flex h-10 w-10 items-center justify-center rounded-xl border border-rose-500/45 bg-rose-500/15 text-rose-400 md:hidden cyrus-xs-mobile-nav"
                        >
                          <Menu className="h-4 w-4" />
                        </button>
                      )}

                      <div
                        className="relative z-10 min-h-screen transition-all duration-300"
                        style={{ marginLeft: sidebarW }}
                      >
                        <div
                          className={`relative min-h-dvh w-full max-w-cyrus-shell cyrus-xs-shell-inner ${
                            callFocusMode ? "pl-0 pr-0" : "pl-0 pr-1 sm:pr-2"
                          }`}
                        >
                          <AppRoutes
                            onOpenApiKeyModal={
                              callFocusMode ? undefined : () => setApiKeyModalOpen(true)
                            }
                            apiKeyConfigured={apiKeyConfigured}
                          />
                        </div>
                      </div>
                    </div>
                  </AppErrorBoundary>
                  {!callFocusMode && <PwaInstallPrompt />}
                  {!callFocusMode && (
                    <ApiKeyModal open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen} />
                  )}
                </TooltipProvider>
              )}
            </div>
          </div>
        </QueryClientProvider>
      </AppErrorBoundary>
    </ThemeProvider>
  );
}

export default App;
