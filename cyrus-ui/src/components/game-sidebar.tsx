import { useState } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, LogOut, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMAND_CENTER_NAV } from "@/config/command-center-nav";
import { clearAuthSessionStorage } from "@/lib/auth-storage";
import { useUserRole } from "@/hooks/use-user-role";

interface GameSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  displayName?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

const NAV_GROUPS = [
  { label: "CORE",        paths: ["/"] },
  { label: "INTELLIGENCE", paths: ["/intelligence", "/files", "/scan", "/document-builder", "/algorithms"] },
  { label: "COMMS & NAV", paths: ["/comms", "/nav"] },
  { label: "SYSTEMS",     paths: ["/modules", "/device", "/medical", "/security", "/biology", "/quantum", "/ops"] },
  { label: "ADMIN",       paths: ["/settings"] },
];

export function GameSidebar({ collapsed, onToggle, displayName, mobileOpen, onMobileClose }: GameSidebarProps) {
  const [location] = useLocation();
  const role = useUserRole();

  const handleLogout = () => {
    clearAuthSessionStorage();
    window.location.reload();
  };

  const navByPath = Object.fromEntries(COMMAND_CENTER_NAV.map((n) => [n.path, n]));

  return (
    <>
      {/* Mobile backdrop — tap to close */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[99] md:hidden"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(2px)" }}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

    <aside
      className={cn(
        "fixed left-0 top-0 h-screen z-[100] flex flex-col select-none",
        "transition-all duration-300 ease-in-out overflow-hidden",
        collapsed ? "w-[72px]" : "w-[240px]",
        /* Mobile: slide off-screen unless mobileOpen; desktop: always visible */
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
      )}
      style={{
        background: "linear-gradient(175deg, #111826 0%, #0d1522 45%, #0b121d 100%)",
        borderRight: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "4px 0 34px rgba(0,0,0,0.38), 1px 0 0 rgba(255,255,255,0.05)",
      }}
    >
      {/* ── Soft ambient glow ── */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 80% 50% at 0% 30%, rgba(148,163,184,0.12) 0%, transparent 65%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse 60% 40% at 100% 80%, rgba(30,64,175,0.08) 0%, transparent 70%)" }}
      />

      {/* ── Scanlines ── */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.014]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,1) 0px, rgba(255,255,255,1) 1px, transparent 1px, transparent 4px)" }}
      />

      {/* ── Right accent line ── */}
      <div
        className="pointer-events-none absolute top-0 right-0 bottom-0 w-[1.5px]"
        style={{ background: "linear-gradient(180deg, transparent 0%, rgba(147,197,253,0.45) 20%, rgba(148,163,184,0.28) 60%, transparent 100%)" }}
      />

      {/* ── Top accent bar ── */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2px]"
        style={{ background: "linear-gradient(90deg, rgba(148,163,184,0.65) 0%, rgba(125,211,252,0.35) 60%, transparent 100%)" }}
      />

      {/* ══ BRAND ════════════════════════════════════════════════════ */}
      <div
        className={cn(
          "relative flex items-center shrink-0 border-b",
          collapsed ? "px-4 py-5 justify-center" : "px-5 py-5 gap-3",
        )}
        style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }}
      >
        {/* Icon */}
        <div className="relative shrink-0 flex h-9 w-9 items-center justify-center rounded-xl"
          style={{
            background: "linear-gradient(135deg, rgba(148,163,184,0.22), rgba(30,41,59,0.42))",
            border: "1px solid rgba(226,232,240,0.35)",
            boxShadow: "0 0 16px rgba(148,163,184,0.22), inset 0 1px 0 rgba(255,255,255,0.07)",
          }}>
          <Zap className="h-4 w-4 text-slate-200" />
          <div className="absolute -top-px -left-px w-3 h-3 border-l border-t border-white/45 rounded-tl-lg" />
          <div className="absolute -bottom-px -right-px w-3 h-3 border-r border-b border-white/35 rounded-br-lg" />
        </div>

        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span
              className="block text-[18px] font-black tracking-[0.25em] text-white leading-none"
              style={{ fontFamily: "'Orbitron', system-ui", textShadow: "0 0 16px rgba(125,211,252,0.25)" }}
            >
              CYRUS
            </span>
            <div className="flex items-center gap-1.5 mt-1">
                <span className="h-1 w-1 rounded-full bg-sky-300 animate-pulse shadow-[0_0_6px_rgba(125,211,252,0.8)]" />
                <span className="text-[8px] text-slate-300/80 tracking-[0.4em] font-black font-mono uppercase">
                v3.0 OMEGA
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ══ NAV ══════════════════════════════════════════════════════ */}
      <nav className="relative flex-1 overflow-y-auto overflow-x-hidden py-2" style={{ scrollbarWidth: "none" }}>
        {NAV_GROUPS.map((group) => {
          const items = group.paths.map((p) => navByPath[p]).filter(Boolean);
          if (!items.length) return null;
          return (
            <div key={group.label} className="mb-0.5">
              {/* Group label */}
              {!collapsed ? (
                <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.14)" }} />
                  <p
                    className="text-[7.5px] font-black tracking-[0.45em] uppercase shrink-0"
                    style={{ color: "rgba(226,232,240,0.55)", fontFamily: "'Orbitron', system-ui" }}
                  >
                    {group.label}
                  </p>
                  <div className="h-px flex-1" style={{ background: "rgba(255,255,255,0.14)" }} />
                </div>
              ) : (
                <div className="mx-3 my-2 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
              )}

              {/* Nav items */}
              {items.map((item) => {
                const isActive = location === item.path;
                return (
                  <Link key={item.path} href={item.path} onClick={() => onMobileClose?.()}>
                    <div
                      className={cn(
                        "relative flex items-center cursor-pointer group transition-all duration-200 my-0.5",
                        collapsed
                          ? "mx-2 rounded-xl px-0 py-2.5 justify-center"
                          : "mx-2 rounded-xl px-3 py-2.5 gap-2.5",
                      )}
                      title={collapsed ? item.dashboardLabel : undefined}
                      style={isActive ? {
                        background: "linear-gradient(135deg, rgba(148,163,184,0.18) 0%, rgba(30,41,59,0.12) 100%)",
                        border: "1px solid rgba(226,232,240,0.25)",
                        boxShadow: "0 0 16px rgba(148,163,184,0.12), inset 0 1px 0 rgba(255,255,255,0.06)",
                      } : {
                        border: "1px solid transparent",
                      }}
                    >
                      {/* Active left bar */}
                      {isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full"
                          style={{ background: "#93c5fd", boxShadow: "0 0 10px rgba(147,197,253,0.9)" }}
                        />
                      )}

                      {/* Icon */}
                      <item.Icon
                        className={cn(
                          "shrink-0 transition-colors",
                          collapsed ? "h-5 w-5" : "h-[14px] w-[14px]",
                        )}
                        style={{ color: isActive ? "#e2e8f0" : "rgba(255,255,255,0.38)" }}
                      />

                      {/* Label */}
                      {!collapsed && (
                        <span
                          className="flex-1 truncate text-[11px] font-semibold tracking-[0.04em] transition-colors"
                          style={{
                            fontFamily: "'Orbitron', system-ui",
                            color: isActive ? "#ffffff" : "rgba(255,255,255,0.5)",
                            textShadow: isActive ? "0 0 12px rgba(148,163,184,0.35)" : "none",
                          }}
                        >
                          {item.dashboardLabel}
                        </span>
                      )}

                      {/* Active dot */}
                      {isActive && !collapsed && (
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full"
                          style={{ background: "#bfdbfe", boxShadow: "0 0 8px rgba(191,219,254,0.9)" }}
                        />
                      )}

                      {/* Hover accent line */}
                      {!isActive && (
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-[2px] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ background: "rgba(148,163,184,0.45)" }}
                        />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* ══ FOOTER ═══════════════════════════════════════════════════ */}
      <div
        className="relative shrink-0 border-t p-2 space-y-1"
        style={{ borderColor: "rgba(255,255,255,0.14)", background: "rgba(0,0,0,0.28)" }}
      >
        {/* User badge */}
        {!collapsed && displayName && (
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
            style={{
              background: "linear-gradient(135deg, rgba(148,163,184,0.08), rgba(0,0,0,0.3))",
              border: "1px solid rgba(255,255,255,0.16)",
            }}
          >
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: "linear-gradient(135deg, rgba(148,163,184,0.24), rgba(30,41,59,0.45))",
                border: "1px solid rgba(255,255,255,0.28)",
                boxShadow: "0 0 10px rgba(148,163,184,0.2)",
              }}
            >
              <span className="text-[10px] font-black text-slate-100" style={{ fontFamily: "'Orbitron', system-ui" }}>
                {displayName.slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-[10px] font-black uppercase tracking-wider text-white/80"
                style={{ fontFamily: "'Orbitron', system-ui" }}
              >
                {displayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Activity className="h-2 w-2 text-emerald-400" strokeWidth={2.5} />
                <span
                  className="text-[8px] font-black font-mono tracking-[0.3em] uppercase"
                  style={{ color: role === "admin" ? "#cbd5e1" : "#bae6fd" }}
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
            "flex w-full items-center rounded-xl px-3 py-2 transition-all duration-200 group",
            collapsed ? "justify-center" : "gap-3",
          )}
          style={{ border: "1px solid transparent" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = "rgba(148,163,184,0.12)";
            (e.currentTarget as HTMLElement).style.border = "1px solid rgba(255,255,255,0.2)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.border = "1px solid transparent";
          }}
          title="Logout"
        >
          <LogOut className="h-4 w-4 shrink-0 text-white/35 group-hover:text-white/80 transition-colors" />
          {!collapsed && (
            <span
              className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35 group-hover:text-white/80 transition-colors"
              style={{ fontFamily: "'Orbitron', system-ui" }}
            >
              LOGOUT
            </span>
          )}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="flex w-full items-center justify-center rounded-xl px-3 py-1.5 text-white/20 transition-all duration-200 hover:text-white/50"
          style={{ border: "1px solid rgba(255,255,255,0.05)" }}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>
    </aside>
    </>
  );
}
