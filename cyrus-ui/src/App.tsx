import { useState, useEffect, useRef } from "react";
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
import { ApiKeyModal } from "@/components/ApiKeyModal";
import { useApiKey } from "@/hooks/use-api-key";
import { CallProvider } from "@/contexts/CallContext";
import { AtmosphericSmokeBackground } from "@/components/atmospheric-smoke-background";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";

function ReturnHomeButton() {
  const [location] = useLocation();
  if (location === "/") return null;

  return (
    <div className="fixed left-0 top-0 z-[100] cyrus-safe-left cyrus-safe-top">
      <Link href="/">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-black/85 touch-manipulation"
          data-testid="button-return-home"
        >
          <ArrowLeft className="h-4 w-4" />
          Return Home
        </button>
      </Link>
    </div>
  );
}
import { GameSidebar } from "@/components/game-sidebar";
import { Menu } from "lucide-react";

function App() {
  const { isAuthenticated, onAuthenticated } = useAuthSession();
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
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize, { passive: true });
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    console.log("[CYRUS] App mounted. isAuthenticated:", isAuthenticated);
    return () => { console.log("[CYRUS] App unmounted."); };
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

  const callUserId =
    (typeof localStorage !== "undefined" && localStorage.getItem("cyrus_device_id")) ||
    (typeof localStorage !== "undefined" && localStorage.getItem("cyrus-device-id")) ||
    `device_${Math.random().toString(36).substr(2, 9)}`;
  const callDisplayName = gateUsername || readStoredDisplayName() || "User";

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

  const sidebarW = isMobile ? 0 : (sidebarCollapsed ? 72 : 240);

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <div className="relative isolate min-h-screen min-h-dvh overflow-x-hidden bg-black text-white">
            <AtmosphericSmokeBackground />
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
                    <CallProvider
                      webRTCOptions={{ userId: callUserId, userName: callDisplayName, isAuthenticated }}
                    >
                      {/* Sidebar — overlay on mobile, push on desktop */}
                      <GameSidebar
                        collapsed={sidebarCollapsed}
                        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        displayName={callDisplayName}
                        mobileOpen={mobileSidebarOpen}
                        onMobileClose={() => setMobileSidebarOpen(false)}
                      />

                      {/* Mobile hamburger — only visible when sidebar is closed on mobile */}
                      {isMobile && !mobileSidebarOpen && (
                        <button
                          onClick={() => setMobileSidebarOpen(true)}
                          aria-label="Open navigation"
                          style={{
                            position: "fixed", top: 10, left: 10, zIndex: 200,
                            width: 38, height: 38, borderRadius: 10,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            background: "rgba(225,29,72,0.14)",
                            border: "1px solid rgba(225,29,72,0.45)",
                            cursor: "pointer", WebkitTapHighlightColor: "transparent",
                          }}
                        >
                          <Menu style={{ width: 18, height: 18, color: "#e11d48" }} />
                        </button>
                      )}

                      {/* Main content — pushed right on desktop, full-width on mobile */}
                      <div
                        className="relative z-10 min-h-screen transition-all duration-300"
                        style={{ marginLeft: sidebarW }}
                      >
                        <div className="relative mx-auto min-h-dvh w-full max-w-cyrus-shell">
                          <AppRoutes />
                        </div>
                      </div>
                    </CallProvider>
                  </AppErrorBoundary>
                  <PwaInstallPrompt />
                  <ApiKeyModal open={apiKeyModalOpen} onOpenChange={setApiKeyModalOpen} />
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
