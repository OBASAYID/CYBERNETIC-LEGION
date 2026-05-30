import React, { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Switch, Route, Link, useLocation } from "wouter";
import {
  Menu,
  X,
  MessageSquare,
  Scan,
  FileText,
  Phone,
  Monitor,
  ChevronRight,
  Cpu,
  Activity,
  Zap,
  LogIn,
  LogOut,
  User,
  Users,
} from "lucide-react";

import { systemFetch } from "@shared/cyrus-api-client";
import { AccessGate } from "./components/AccessGate";
import { PresenceProvider, usePresence } from "./contexts/PresenceContext";
import { IntroSequence } from "./components/IntroSequence";
import { Dashboard } from "./components/Dashboard";
import { ScanPage } from "./pages/ScanPage";
import { FileAnalysisPage } from "./pages/FileAnalysisPage";
const CommsHubPage = lazy(() =>
  import("../../cyrus-ui/src/pages/comms-hub-page").then((m) => ({ default: m.default })),
);
import { DeviceControlPage } from "./pages/DeviceControlPage";
import { ModulesPage } from "./pages/ModulesPage";
import { MedicalPage } from "./pages/MedicalPage";
import { QuantumPage } from "./pages/QuantumPage";

const navItems = [
  { path: "/", label: "Command", sublabel: "Primary Interface", icon: MessageSquare },
  { path: "/modules", label: "Modules", sublabel: "AI Orchestrator", icon: Cpu },
  { path: "/scan", label: "Vision", sublabel: "Optical Analysis", icon: Scan },
  { path: "/files", label: "Documents", sublabel: "File Processing", icon: FileText },
  { path: "/comms", label: "Communications", sublabel: "Secure Channels", icon: Phone },
  { path: "/device", label: "Systems", sublabel: "Hardware Control", icon: Monitor },
];

const moduleItems = [
  { path: "/medical", label: "Medical", sublabel: "Diagnostics", icon: Activity },
  { path: "/quantum", label: "Quantum", sublabel: "Neural Net", icon: Zap },
];

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introComplete, setIntroComplete] = useState(false);
  const [replitUser, setReplitUser] = useState<{ id: string; username: string; profileImage?: string } | null>(null);
  const [location] = useLocation();

  useEffect(() => {
    const authenticated = localStorage.getItem("cyrus_authenticated");
    const introWatched = sessionStorage.getItem("cyrus_intro_watched");
    if (authenticated === "true") {
      setIsAuthenticated(true);
      if (introWatched === "true") {
        setIntroComplete(true);
      }
    }
  }, []);

  useEffect(() => {
    systemFetch("/api/auth/user")
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (user) setReplitUser(user);
      })
      .catch(() => { });
  }, []);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const handleLocalLogout = () => {
    localStorage.removeItem("cyrus_authenticated");
    localStorage.removeItem("cyrus-display-name");
    localStorage.removeItem("cyrus-user-role");
    sessionStorage.removeItem("cyrus_intro_watched");
    setIsAuthenticated(false);
    setIntroComplete(false);
  };

  const handleAuthenticated = () => {
    setIsAuthenticated(true);
    setShowIntro(true);
  };

  const handleIntroComplete = () => {
    sessionStorage.setItem("cyrus_intro_watched", "true");
    setShowIntro(false);
    setIntroComplete(true);
  };

  const localUsername = localStorage.getItem("cyrus-display-name") || "OPERATOR";
  const userRole = localStorage.getItem("cyrus-user-role") || "user";
  console.log("[App] User role:", userRole);

  if (!isAuthenticated) {
    return <AccessGate onAuthenticated={handleAuthenticated} />;
  }

  if (showIntro) {
    return <IntroSequence onComplete={handleIntroComplete} />;
  }

  if (!introComplete) {
    return <IntroSequence onComplete={handleIntroComplete} />;
  }

  return (
    <PresenceProvider>
      <AppContent
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        location={location}
        localUsername={localUsername}
        userRole={userRole}
        handleLocalLogout={handleLocalLogout}
      />
    </PresenceProvider>
  );
}

function AppContent({
  menuOpen,
  setMenuOpen,
  location,
  localUsername,
  userRole,
  handleLocalLogout,
}: {
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  location: string;
  localUsername: string;
  userRole: string;
  handleLocalLogout: () => void;
}) {
  const { isConnected, onlineUsers, connectPresence, disconnectPresence } = usePresence();
  const hasConnectedRef = useRef(false);
  const connectTimerRef = useRef<number | null>(null);
  const allNavItems = [...navItems, ...moduleItems];
  const activeItem = allNavItems.find((item) => item.path === location) || navItems[0];
  const ActiveIcon = activeItem.icon;

  useEffect(() => {
    const savedName = localStorage.getItem("cyrus-display-name") || localUsername;
    if (savedName && savedName !== "OPERATOR" && !hasConnectedRef.current) {
      hasConnectedRef.current = true;
      localStorage.setItem("cyrus-display-name", savedName);
      connectTimerRef.current = window.setTimeout(() => {
        connectPresence(savedName);
      }, 500);
    }

    return () => {
      if (connectTimerRef.current !== null) {
        window.clearTimeout(connectTimerRef.current);
        connectTimerRef.current = null;
      }
      hasConnectedRef.current = false;
      disconnectPresence();
    };
  }, [connectPresence, disconnectPresence, localUsername]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location, setMenuOpen]);

  useEffect(() => {
    const handleEscapeClose = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscapeClose);
    return () => window.removeEventListener("keydown", handleEscapeClose);
  }, [setMenuOpen]);

  const handleReconnect = () => {
    hasConnectedRef.current = false;
    const name = localStorage.getItem("cyrus-display-name") || localUsername;
    if (name) connectPresence(name);
  };

  return (
    <div className="app-shell h-screen text-white flex overflow-hidden relative">
      <div className="app-shell-bg" aria-hidden="true" />
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[rgba(12,17,24,0.92)] border-r border-cyan-500/20 backdrop-blur-xl transform transition-transform duration-200 lg:relative lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-5 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden border border-cyan-500/30 shadow-lg shadow-cyan-500/20">
                  <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight">CYRUS</h1>
                  <p className="text-xs text-[rgba(235,235,245,0.5)]">Quantum AI System</p>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Close navigation menu"
                className="lg:hidden p-2 text-[rgba(235,235,245,0.5)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Status */}
            <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-[rgba(16,185,129,0.15)] rounded-lg border border-emerald-400/20">
              <div className="w-2 h-2 rounded-full bg-[#30d158]" />
              <span className="text-xs font-semibold text-[#30d158]">CORE OPERATIONAL</span>
            </div>

            <div className="mt-3 px-3 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
              <div className="flex items-center gap-2">
                <ActiveIcon className="w-4 h-4 text-cyan-300" />
                <div>
                  <p className="text-xs text-cyan-200 font-semibold tracking-wide">Now Viewing</p>
                  <p className="text-[11px] text-cyan-100/80">{activeItem.label} · {activeItem.sublabel}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 overflow-y-auto space-y-6 py-4">
            <div>
              <p className="px-3 text-[10px] font-bold text-[rgba(235,235,245,0.3)] uppercase tracking-widest mb-2">Main</p>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                        ? "bg-[#0a84ff] text-white"
                        : "text-[rgba(235,235,245,0.8)] hover:bg-[rgba(120,120,128,0.2)]"
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-white/20" : "bg-[rgba(120,120,128,0.2)]"
                        }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className={`text-[10px] ${isActive ? "text-white/60" : "text-[rgba(235,235,245,0.4)]"}`}>
                          {item.sublabel}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="px-3 text-[10px] font-bold text-[rgba(235,235,245,0.3)] uppercase tracking-widest mb-2">Advanced Modules</p>
              <div className="space-y-1">
                {moduleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                        ? "bg-[#0a84ff] text-white"
                        : "text-[rgba(235,235,245,0.8)] hover:bg-[rgba(120,120,128,0.2)]"
                        }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isActive ? "bg-white/20" : "bg-[rgba(120,120,128,0.2)]"
                        }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{item.label}</p>
                        <p className={`text-[10px] ${isActive ? "text-white/60" : "text-[rgba(235,235,245,0.4)]"}`}>
                          {item.sublabel}
                        </p>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-60" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          </nav>

          {/* User Account & Footer */}
          <div className="p-4 border-t border-[rgba(84,84,88,0.65)] space-y-3">
            <div className="bg-gradient-to-br from-[#2c2c2e] to-[#1c1c1e] rounded-xl p-3 border border-cyan-500/20">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${userRole === "admin"
                  ? "bg-gradient-to-br from-orange-500 to-red-600 ring-2 ring-orange-500/50"
                  : "bg-gradient-to-br from-cyan-500 to-purple-600"
                  }`}>
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate text-white">{localUsername}</p>
                  <p className={`text-[10px] font-semibold ${userRole === "admin" ? "text-orange-400" : "text-[#30d158]"}`}>
                    {userRole === "admin" ? "ADMIN" : "OPERATOR"}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLocalLogout}
                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold transition-all"
              >
                <LogOut className="w-4 h-4" />
                LOG OUT
              </button>
            </div>

            {/* Online Users Indicator */}
            <div className="bg-gradient-to-r from-cyan-500/10 to-orange-500/10 rounded-xl p-3 border border-cyan-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-300" />
                  <span className="text-xs font-medium text-white">Online Users</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
                  <span className={`text-sm font-bold ${isConnected ? "text-green-400" : "text-gray-400"}`}>
                    {onlineUsers.length}
                  </span>
                </div>
              </div>
              {onlineUsers.length > 0 && (
                <div className="mt-2 space-y-1">
                  {onlineUsers.slice(0, 3).map((user) => (
                    <div key={user.id} className="flex items-center gap-2 text-xs text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      <span className="truncate">{user.displayName}</span>
                    </div>
                  ))}
                  {onlineUsers.length > 3 && (
                    <p className="text-[10px] text-gray-500">+{onlineUsers.length - 3} more</p>
                  )}
                </div>
              )}
              {!isConnected && (
                <button
                  onClick={handleReconnect}
                  className="mt-1 text-[10px] text-yellow-400 hover:text-yellow-300 underline"
                >
                  Click to reconnect
                </button>
              )}
            </div>

            <div className="bg-[#2c2c2e] rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[rgba(235,235,245,0.5)]">Core Status</span>
                <span className="text-[10px] font-semibold text-[#30d158]">ACTIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-sm font-semibold">86</p>
                  <p className="text-[10px] text-[rgba(235,235,245,0.4)]">Branches</p>
                </div>
                <div>
                  <p className="text-sm font-semibold">3.6K</p>
                  <p className="text-[10px] text-[rgba(235,235,245,0.4)]">Paths</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#30d158]">99%</p>
                  <p className="text-[10px] text-[rgba(235,235,245,0.4)]">Uptime</p>
                </div>
              </div>
            </div>
            <p className="text-center text-[10px] text-[rgba(235,235,245,0.3)]">
              Architect: Obakeng Kaelo
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          aria-label="Close navigation overlay"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        <header className="hidden lg:flex h-16 px-6 border-b border-cyan-500/15 bg-[rgba(7,10,14,0.7)] backdrop-blur-xl items-center">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
              <ActiveIcon className="w-4 h-4 text-cyan-200" />
            </div>
            <div>
              <p className="text-sm font-semibold tracking-wide text-cyan-100">{activeItem.label}</p>
              <p className="text-xs text-cyan-200/60">{activeItem.sublabel}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4 text-xs">
            <span className="px-2.5 py-1 rounded-full border border-cyan-400/30 bg-cyan-500/10 text-cyan-100/90">
              {isConnected ? "Live Presence Connected" : "Presence Offline"}
            </span>
            <span className="px-2.5 py-1 rounded-full border border-orange-300/30 bg-orange-500/10 text-orange-200">
              Role: {userRole === "admin" ? "ADMIN" : "OPERATOR"}
            </span>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="lg:hidden bg-[rgba(7,10,14,0.92)] border-b border-cyan-500/20 px-4 py-3 flex items-center gap-3 backdrop-blur-xl">
          <button onClick={() => setMenuOpen(true)} aria-label="Open navigation menu" className="p-2 -ml-2">
            <Menu className="w-5 h-5 text-[rgba(235,235,245,0.6)]" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg overflow-hidden border border-cyan-500/30 shadow-sm shadow-cyan-500/20">
              <img src="/images/cyrus-logo.png" alt="CYRUS" className="w-full h-full object-cover" />
            </div>
            <span className="font-semibold">CYRUS</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#30d158]" />
            <span className="text-xs text-[rgba(235,235,245,0.5)]">Online</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-transparent">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/modules" component={ModulesPage} />
            <Route path="/scan" component={ScanPage} />
            <Route path="/files" component={FileAnalysisPage} />
            <Route path="/comms">
              <Suspense fallback={<div className="p-8 text-sm text-cyan-200/70">Loading comms…</div>}>
                <CommsHubPage />
              </Suspense>
            </Route>
            <Route path="/device" component={DeviceControlPage} />
            <Route path="/medical" component={MedicalPage} />
            <Route path="/quantum" component={QuantumPage} />
          </Switch>
        </main>
      </div>
    </div>
  );
}
