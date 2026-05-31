import { type CSSProperties } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, ChevronRight, LogOut, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { COMMAND_CENTER_NAV } from "@/config/command-center-nav";
import { clearAuthSessionStorage } from "@/lib/auth-storage";
import { useUserRole } from "@/hooks/use-user-role";
import { CyrusSidebarBrand } from "@/components/cyrus-sidebar-brand";

interface GameSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  displayName?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/** Deep console module rail — aligned with System Spotlight / Pshare stack. */
const P = {
  red: "#E70011",
  redDim: "#B8000E",
  redGlow: "rgba(231,0,17,0.42)",
  platinumLight: "#9CA3AF",
  platinumMid: "#2A3038",
  platinumDark: "#080b10",
  charcoal: "#ECEFF3",
  text: "#F4F6F8",
  textMuted: "rgba(212,218,226,0.72)",
  border: "rgba(255,255,255,0.12)",
  borderDark: "rgba(0,0,0,0.45)",
} as const;

const PLATINUM_SIDEBAR: CSSProperties = {
  backgroundColor: "#030508",
  backgroundImage: [
    "linear-gradient(168deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0) 38%)",
    "linear-gradient(195deg, #12161c 0%, #0a0e14 46%, #030508 100%)",
    "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(255,255,255,0.02) 3px, rgba(0,0,0,0.06) 4px)",
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")",
  ].join(", "),
};

const NAV_GROUPS = [
  { label: "CORE", paths: ["/"] },
  { label: "INTELLIGENCE", paths: ["/intelligence", "/files", "/scan", "/document-builder", "/algorithms"] },
  { label: "COMMS", paths: ["/comms"] },
  { label: "SYSTEMS", paths: ["/modules", "/device", "/medical", "/quantum", "/ops"] },
  { label: "ADMIN", paths: ["/settings"] },
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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[99] md:hidden"
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-[100] flex h-screen flex-col overflow-hidden select-none",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-[76px]" : "w-[272px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          ...PLATINUM_SIDEBAR,
          borderRight: `1px solid ${P.borderDark}`,
          boxShadow: "4px 0 40px rgba(0,0,0,0.55), inset -1px 0 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Brushed highlight sweep */}
        <div
          className="pointer-events-none absolute inset-0 opacity-35"
          style={{
            background:
              "linear-gradient(105deg, transparent 0%, rgba(255,255,255,0.06) 22%, transparent 44%)",
          }}
          aria-hidden
        />

        {/* Right edge bevel */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-px"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55), rgba(0,0,0,0.08))" }}
          aria-hidden
        />

        {/* Top crimson accent */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${P.red} 0%, ${P.redDim} 55%, transparent 100%)`,
            boxShadow: `0 0 14px ${P.redGlow}`,
          }}
          aria-hidden
        />

        {/* ══ BRAND ══ */}
        <div
          className={cn(
            "relative flex shrink-0 items-center border-b",
            collapsed ? "justify-center px-3 py-4" : "gap-3 px-4 py-4",
          )}
          style={{
            borderColor: P.borderDark,
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(12,16,22,0.72) 100%)",
          }}
        >
          <CyrusSidebarBrand collapsed={collapsed} />

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span
                className="block text-[17px] font-black leading-none tracking-[0.22em] text-[#ECEFF3]"
                style={{
                  fontFamily: "'Orbitron', system-ui, sans-serif",
                  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}
              >
                CYRUS
              </span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: P.red, boxShadow: `0 0 8px ${P.redGlow}` }}
                />
                <span
                  className="text-[8px] font-bold uppercase tracking-[0.32em]"
                  style={{ color: P.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  Command v3.0
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ══ NAV ══ */}
        <nav className="relative flex-1 overflow-x-hidden overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
          {NAV_GROUPS.map((group) => {
            const items = group.paths.map((p) => navByPath[p]).filter(Boolean);
            if (!items.length) return null;
            return (
              <div key={group.label} className="mb-0.5">
                {!collapsed ? (
                  <div className="flex items-center gap-2 px-4 pb-1.5 pt-3">
                    <div className="h-px flex-1" style={{ background: P.borderDark }} />
                    <p
                      className="shrink-0 text-[7px] font-black uppercase tracking-[0.42em]"
                      style={{ color: P.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                    >
                      {group.label}
                    </p>
                    <div className="h-px flex-1" style={{ background: P.borderDark }} />
                  </div>
                ) : (
                  <div className="mx-3 my-2 h-px" style={{ background: P.borderDark }} />
                )}

                {items.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <Link key={item.path} href={item.path} onClick={() => onMobileClose?.()}>
                      <div
                        className={cn(
                          "group relative my-0.5 flex cursor-pointer items-center transition-all duration-200",
                          collapsed
                            ? "mx-2 justify-center rounded-xl px-0 py-2.5"
                            : "mx-2 gap-2.5 rounded-xl px-3 py-2.5",
                        )}
                        title={collapsed ? item.sidebarLabel : undefined}
                        style={
                          isActive
                            ? {
                                background:
                                  "linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(30,36,44,0.65) 100%)",
                                border: `1px solid rgba(255,255,255,0.14)`,
                                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.1), 0 0 16px ${P.redGlow}`,
                              }
                            : { border: "1px solid transparent" }
                        }
                      >
                        {isActive && (
                          <div
                            className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                            style={{ background: P.red, boxShadow: `0 0 10px ${P.redGlow}` }}
                          />
                        )}

                        <item.Icon
                          className={cn("shrink-0 transition-colors", collapsed ? "h-5 w-5" : "h-[15px] w-[15px]")}
                          style={{ color: isActive ? P.red : P.textMuted }}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />

                        {!collapsed && (
                          <span
                            className="flex-1 text-[11px] font-semibold leading-snug tracking-[0.02em] transition-colors"
                            style={{
                              fontFamily: "'Orbitron', system-ui, sans-serif",
                              color: isActive ? P.text : P.textMuted,
                              textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
                            }}
                          >
                            {item.sidebarLabel}
                          </span>
                        )}

                        {isActive && !collapsed && (
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: P.red, boxShadow: `0 0 8px ${P.redGlow}` }}
                          />
                        )}

                        {!isActive && (
                          <div
                            className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                            style={{ background: "rgba(231,0,17,0.35)" }}
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

        {/* ══ FOOTER ══ */}
        <div
          className="relative shrink-0 space-y-1 border-t p-2"
          style={{
            borderColor: P.borderDark,
            background: "linear-gradient(180deg, rgba(18,22,28,0.92) 0%, rgba(6,8,12,0.98) 100%)",
          }}
        >
          {!collapsed && displayName && (
            <div
              className="mb-1 flex items-center gap-2.5 rounded-xl px-3 py-2"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.06), rgba(24,28,34,0.55))",
                border: `1px solid ${P.border}`,
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(145deg, #2a3038, #12161c)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  boxShadow: `0 0 10px ${P.redGlow}`,
                }}
              >
                <span
                  className="text-[10px] font-black text-white"
                  style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: P.charcoal, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  {displayName}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <Activity className="h-2 w-2 text-emerald-600" strokeWidth={2.5} />
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.28em]"
                    style={{ color: P.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    {role}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className={cn(
              "group flex w-full items-center rounded-xl px-3 py-2 transition-all duration-200",
              collapsed ? "justify-center" : "gap-3",
            )}
            style={{ border: "1px solid transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
              e.currentTarget.style.border = `1px solid ${P.border}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.border = "1px solid transparent";
            }}
            title="Logout"
          >
            <LogOut
              className="h-4 w-4 shrink-0 transition-colors"
              style={{ color: P.textMuted }}
              strokeWidth={1.8}
            />
            {!collapsed && (
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors"
                style={{ color: P.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Logout
              </span>
            )}
          </button>

          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-xl px-3 py-1.5 transition-all duration-200"
            style={{ border: `1px solid ${P.borderDark}`, color: P.textMuted }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>
    </>
  );
}
