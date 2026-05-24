import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, LogOut, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMAND_CENTER_NAV } from "@/config/command-center-nav";
import { clearAuthSessionStorage } from "@/lib/auth-storage";
import { useUserRole } from "@/hooks/use-user-role";

interface GameSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  displayName?: string;
}

const NAV_GROUPS = [
  {
    label: "CORE",
    paths: ["/"],
  },
  {
    label: "INTELLIGENCE",
    paths: ["/intelligence", "/files", "/scan", "/document-builder", "/algorithms"],
  },
  {
    label: "COMMS & NAV",
    paths: ["/comms", "/nav"],
  },
  {
    label: "SYSTEMS",
    paths: ["/modules", "/device", "/medical", "/security", "/biology", "/quantum", "/ops"],
  },
  {
    label: "ADMIN",
    paths: ["/settings"],
  },
];

export function GameSidebar({ collapsed, onToggle, displayName }: GameSidebarProps) {
  const [location] = useLocation();
  const role = useUserRole();

  const handleLogout = () => {
    clearAuthSessionStorage();
    window.location.reload();
  };

  const navByPath = Object.fromEntries(COMMAND_CENTER_NAV.map((n) => [n.path, n]));

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen z-[100] flex flex-col select-none",
        "transition-all duration-300 ease-in-out overflow-hidden",
        "border-r border-[#e11d48]/15",
        collapsed ? "w-[72px]" : "w-[240px]",
      )}
      style={{
        background: "linear-gradient(180deg, #0d0d1e 0%, #090910 100%)",
        boxShadow: "4px 0 24px rgba(225,29,72,0.06)",
      }}
    >
      {/* Brand */}
      <div
        className={cn(
          "flex items-center py-5 border-b border-white/[0.07]",
          collapsed ? "px-4 justify-center" : "px-5 gap-3",
        )}
      >
        <div className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-xl border border-[#e11d48]/50 bg-[#e11d48]/10 shadow-[0_0_16px_rgba(225,29,72,0.25)]">
          <Zap className="h-4 w-4 text-[#e11d48]" />
          <div className="absolute -top-px -left-px w-3 h-3 border-l border-t border-[#e11d48]/60 rounded-tl-lg" />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-r border-b border-[#e11d48]/60 rounded-br-lg" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <span
              className="block text-[17px] font-black tracking-widest text-white leading-none"
              style={{ fontFamily: "'Orbitron', system-ui" }}
            >
              CYRUS
            </span>
            <span className="text-[9px] text-[#e11d48]/80 tracking-[0.3em] font-mono uppercase">
              v3.0 OMEGA
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3" style={{ scrollbarWidth: "none" }}>
        {NAV_GROUPS.map((group) => {
          const items = group.paths.map((p) => navByPath[p]).filter(Boolean);
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-1">
              {!collapsed && (
                <p className="px-5 pb-1.5 pt-2 text-[9px] font-mono tracking-[0.3em] text-white/20 uppercase">
                  {group.label}
                </p>
              )}
              {collapsed && <div className="mx-3 my-1.5 h-px bg-white/[0.06]" />}
              {items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path}>
                    <div
                      className={cn(
                        "relative flex items-center cursor-pointer group transition-all duration-200 my-0.5",
                        collapsed
                          ? "mx-2 rounded-xl px-0 py-2.5 justify-center"
                          : "mx-2 rounded-xl px-3 py-2.5 gap-3",
                        isActive
                          ? "bg-[#e11d48]/12 text-white"
                          : "text-white/45 hover:text-white/80 hover:bg-white/[0.05]",
                      )}
                      title={collapsed ? item.dashboardLabel : undefined}
                    >
                      {isActive && !collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] bg-[#e11d48] rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                      )}
                      {isActive && collapsed && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] bg-[#e11d48] rounded-full shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
                      )}
                      <item.Icon
                        className={cn(
                          "shrink-0 transition-colors",
                          collapsed ? "h-5 w-5" : "h-4 w-4",
                          isActive
                            ? "text-[#e11d48]"
                            : "text-white/35 group-hover:text-white/65",
                        )}
                      />
                      {!collapsed && (
                        <span className="flex-1 truncate text-xs font-semibold tracking-wide">
                          {item.dashboardLabel}
                        </span>
                      )}
                      {isActive && !collapsed && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#e11d48] shadow-[0_0_6px_rgba(225,29,72,0.9)]" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-white/[0.07] p-2 space-y-1">
        {/* User badge */}
        {!collapsed && displayName && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.04] border border-white/[0.06] mb-1">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#e11d48]/20 border border-[#e11d48]/30">
              <span className="text-[10px] font-bold text-[#e11d48]">
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold text-white/80">{displayName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_rgba(52,211,153,0.8)]" />
                <span
                  className={cn(
                    "text-[9px] font-mono tracking-widest uppercase",
                    role === "admin" ? "text-[#e11d48]/80" : "text-cyan-400/70",
                  )}
                >
                  {role}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center rounded-xl px-3 py-2 text-white/35 transition-all duration-200 hover:bg-red-500/10 hover:text-red-400",
            collapsed ? "justify-center gap-0" : "gap-3",
          )}
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="text-xs font-semibold">Logout</span>}
        </button>

        {/* Collapse */}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-xl px-3 py-2 text-white/20 transition-all duration-200 hover:bg-white/[0.05] hover:text-white/50"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
    </aside>
  );
}
