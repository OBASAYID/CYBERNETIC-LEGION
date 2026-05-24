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
import { GameSidebar } from "@/components/game-sidebar";

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

  const sidebarW = sidebarCollapsed ? 72 : 240;

  return (
    <ThemeProvider>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <div className="relative isolate min-h-screen overflow-x-hidden text-white" style={{ background: "#080810" }}>
            <AtmosphericSmokeBackground />
            {!isAuthenticated ? (
              <div className="relative z-10 min-h-screen">
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
              </div>
            ) : (
              <TooltipProvider>
                <Toaster />
                <AppErrorBoundary>
                  <CallProvider
                    webRTCOptions={{ userId: callUserId, userName: callDisplayName, isAuthenticated }}
                  >
                    {/* Sidebar */}
                    <GameSidebar
                      collapsed={sidebarCollapsed}
                      onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                      displayName={callDisplayName}
                    />
                    {/* Main content shifted right by sidebar width */}
                    <div
                      className="relative z-10 min-h-screen transition-all duration-300"
                      style={{ marginLeft: sidebarW }}
                    >
                      <AppRoutes />
                    </div>
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
