import { type CSSProperties, Fragment, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  Home,
  Info,
  LogOut,
  Radio,
  Settings2,
  SlidersHorizontal,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { clearAuthSessionStorage } from "@/lib/auth-storage";
import { useUserRole } from "@/hooks/use-user-role";
import { CyrusSidebarBrand } from "@/components/cyrus-sidebar-brand";
import { CyrusCommandSidebarActivate } from "@/components/command-center/command-console-popup";

interface GameSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  displayName?: string;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

/** Diamond / Gold palette — CYRUS v4 design system. */
const G = {
  gold: "#C9A55A",
  goldDim: "#8B6914",
  goldLight: "#D4B254",
  goldBright: "#F0CF7A",
  goldGlow: "rgba(201,165,90,0.45)",
  goldGlowSoft: "rgba(201,165,90,0.18)",
  text: "#F4F6F8",
  textMuted: "rgba(212,218,226,0.65)",
  border: "rgba(201,165,90,0.14)",
  borderDark: "rgba(0,0,0,0.50)",
  bg: "#09090b",
} as const;

const DIAMOND_SIDEBAR: CSSProperties = {
  backgroundColor: G.bg,
  backgroundImage: [
    "linear-gradient(168deg, rgba(201,165,90,0.04) 0%, rgba(201,165,90,0) 40%)",
    "linear-gradient(195deg, #111009 0%, #0a0908 46%, #050403 100%)",
    "repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(201,165,90,0.015) 3px, rgba(0,0,0,0.06) 4px)",
    "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E\")",
  ].join(", "),
};

/** Curated nav items matching the v4 diamond design image. */
const DIAMOND_NAV = [
  { path: "/",           label: "HOME",                    Icon: Home,             shortLabel: "Home"   },
  { path: "/comms",      label: "COMMUNICATION",           Icon: Radio,            shortLabel: "Comms"  },
  { path: "/files",      label: "DOCUMENT INTELLIGENCE",   Icon: FileText,         shortLabel: "Docs"   },
  { path: "/scan",       label: "VISION & OPTIC ANALYSIS", Icon: Eye,              shortLabel: "Vision" },
  { path: "/modules",    label: "SYSTEM SETTINGS",         Icon: Settings2,        shortLabel: "System" },
  { path: "/settings",   label: "SETTINGS",                Icon: SlidersHorizontal,shortLabel: "Config" },
  { path: "/algorithms", label: "ABOUT",                   Icon: Info,             shortLabel: "About"  },
] as const;

const VIDEO_SHORTCUT = {
  path: "/comms",
  label: "VIDEO CALL SHORTCUT",
  Icon: Video,
  shortLabel: "Video",
  query: "?mode=video",
} as const;

/** Live clock — sidebar header widget */
function SidebarClock({ collapsed }: { collapsed: boolean }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const timeStr = `${hh}:${mm}`;

  const day = now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase().replace(/ /g, "-");
  const weekday = now.toLocaleDateString("en-GB", { weekday: "long" }).toUpperCase();

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-3 gap-0.5">
        <span
          className="text-[13px] font-black tabular-nums cyrus-sidebar-clock"
          style={{ color: G.gold, fontFamily: "'Orbitron', system-ui, sans-serif" }}
        >
          {hh}:{mm}
        </span>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center py-3.5 px-3 gap-1"
      style={{ borderBottom: `1px solid ${G.border}` }}
    >
      <span
        className="text-[28px] font-black tabular-nums leading-none cyrus-sidebar-clock"
        style={{ color: G.gold, fontFamily: "'Orbitron', system-ui, sans-serif", letterSpacing: "0.06em" }}
      >
        {timeStr}
      </span>
      <span
        className="text-[9px] font-semibold tracking-[0.18em]"
        style={{ color: G.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
      >
        {day}
      </span>
      <span
        className="text-[8px] font-bold tracking-[0.32em]"
        style={{ color: G.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
      >
        {weekday}
      </span>
    </div>
  );
}

export function GameSidebar({ collapsed, onToggle, displayName, mobileOpen, onMobileClose }: GameSidebarProps) {
  const [location] = useLocation();
  const role = useUserRole();

  const handleLogout = () => {
    clearAuthSessionStorage();
    window.location.reload();
  };

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[99] md:hidden"
          style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-[100] flex h-screen flex-col overflow-hidden select-none",
          "transition-all duration-300 ease-in-out",
          collapsed ? "w-[70px]" : "w-[200px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
        style={{
          ...DIAMOND_SIDEBAR,
          borderRight: `1px solid ${G.border}`,
          boxShadow: `4px 0 40px rgba(0,0,0,0.65), inset -1px 0 0 rgba(201,165,90,0.06)`,
        }}
      >
        {/* Brushed gold highlight sweep */}
        <div
          className="pointer-events-none absolute inset-0 opacity-25"
          style={{
            background: "linear-gradient(105deg, transparent 0%, rgba(201,165,90,0.06) 22%, transparent 44%)",
          }}
          aria-hidden
        />

        {/* Right edge bevel — gold */}
        <div
          className="pointer-events-none absolute bottom-0 right-0 top-0 w-px"
          style={{ background: `linear-gradient(180deg, ${G.gold}88, rgba(0,0,0,0.08))` }}
          aria-hidden
        />

        {/* Top gold accent stripe */}
        <div
          className="pointer-events-none absolute left-0 right-0 top-0 h-[3px]"
          style={{
            background: `linear-gradient(90deg, ${G.gold} 0%, ${G.goldDim} 55%, transparent 100%)`,
            boxShadow: `0 0 14px ${G.goldGlow}`,
          }}
          aria-hidden
        />

        {/* ══ CLOCK ══ */}
        <SidebarClock collapsed={collapsed} />

        {/* ══ BRAND ══ */}
        <div
          className={cn(
            "relative flex shrink-0 items-center border-b",
            collapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3",
          )}
          style={{
            borderColor: G.border,
            background: "linear-gradient(180deg, rgba(201,165,90,0.04) 0%, rgba(12,10,8,0.72) 100%)",
          }}
        >
          <CyrusSidebarBrand collapsed={collapsed} />

          {!collapsed && (
            <div className="min-w-0 flex-1">
              <span
                className="block text-[15px] font-black leading-none tracking-[0.22em]"
                style={{
                  fontFamily: "'Orbitron', system-ui, sans-serif",
                  color: G.text,
                  textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                }}
              >
                CYRUS
              </span>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: G.gold, boxShadow: `0 0 8px ${G.goldGlow}` }}
                />
                <span
                  className="text-[8px] font-bold uppercase tracking-[0.32em]"
                  style={{ color: G.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  Command v4.0
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ══ NAV ══ */}
        <nav className="relative flex-1 overflow-x-hidden overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>
          {!collapsed && displayName && (
            <div
              className="mx-2 mb-1.5 rounded-xl border px-3 py-2.5"
              style={{
                borderColor: G.border,
                background:
                  "linear-gradient(148deg, rgba(201,165,90,0.10) 0%, rgba(12,10,8,0.78) 48%, rgba(201,165,90,0.03) 100%)",
                boxShadow: `inset 0 1px 0 rgba(201,165,90,0.08), 0 8px 20px rgba(0,0,0,0.35)`,
              }}
            >
              <p
                className="text-[9px] font-black uppercase tracking-[0.26em]"
                style={{ color: G.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Welcome,
              </p>
              <p
                className="mt-1 truncate text-sm font-black uppercase tracking-[0.08em]"
                style={{ color: G.text, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                title={displayName}
              >
                {displayName}
              </p>
            </div>
          )}

          {DIAMOND_NAV.map((item) => {
            const isActive = location === item.path;
            return (
              <Fragment key={item.path}>
                <Link href={item.path} onClick={() => onMobileClose?.()}>
                  <div
                    className={cn(
                      "group relative my-0.5 flex cursor-pointer items-center transition-all duration-200",
                      collapsed
                        ? "mx-2 justify-center rounded-xl px-0 py-2.5"
                        : "mx-2 gap-2.5 rounded-xl px-3 py-2.5",
                    )}
                    title={collapsed ? item.label : undefined}
                    style={
                      isActive
                        ? {
                            background: "linear-gradient(135deg, rgba(201,165,90,0.14) 0%, rgba(30,24,14,0.65) 100%)",
                            border: `1px solid rgba(201,165,90,0.22)`,
                            boxShadow: `inset 0 1px 0 rgba(201,165,90,0.10), 0 0 16px ${G.goldGlowSoft}`,
                          }
                        : { border: "1px solid transparent" }
                    }
                  >
                    {isActive && (
                      <div
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                        style={{ background: G.gold, boxShadow: `0 0 10px ${G.goldGlow}` }}
                      />
                    )}

                    <item.Icon
                      className={cn("shrink-0 transition-colors", collapsed ? "h-5 w-5" : "h-[15px] w-[15px]")}
                      style={{ color: isActive ? G.gold : G.textMuted }}
                      strokeWidth={isActive ? 2.2 : 1.8}
                    />

                    {!collapsed && (
                      <span
                        className="flex-1 text-[10px] font-semibold leading-snug tracking-[0.04em] transition-colors"
                        style={{
                          fontFamily: "'Orbitron', system-ui, sans-serif",
                          color: isActive ? G.text : G.textMuted,
                          textShadow: isActive ? "0 1px 2px rgba(0,0,0,0.35)" : "none",
                        }}
                      >
                        {item.label}
                      </span>
                    )}

                    {isActive && !collapsed && (
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: G.gold, boxShadow: `0 0 8px ${G.goldGlow}` }}
                      />
                    )}

                    {!isActive && (
                      <div
                        className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                        style={{ background: `rgba(201,165,90,0.35)` }}
                      />
                    )}
                  </div>
                </Link>
                {item.path === "/settings" && role === "admin" ? (
                  <CyrusCommandSidebarActivate collapsed={collapsed} />
                ) : null}
              </Fragment>
            );
          })}

          {/* Separator */}
          <div className="mx-3 my-2 h-px" style={{ background: G.border }} />

          {/* VIDEO CALL SHORTCUT — always shown with gold highlight, always routes to /comms */}
          {(() => {
            return (
              <Link href={VIDEO_SHORTCUT.path} onClick={() => onMobileClose?.()}>
                <div
                  className={cn(
                    "group relative my-0.5 flex cursor-pointer items-center transition-all duration-200",
                    collapsed
                      ? "mx-2 justify-center rounded-xl px-0 py-2.5"
                      : "mx-2 gap-2.5 rounded-xl px-3 py-2.5",
                  )}
                  title={collapsed ? VIDEO_SHORTCUT.label : undefined}
                  style={{
                    background: "linear-gradient(135deg, rgba(201,165,90,0.10) 0%, rgba(20,16,8,0.60) 100%)",
                    border: `1px solid rgba(201,165,90,0.18)`,
                    boxShadow: `0 0 12px rgba(201,165,90,0.10)`,
                  }}
                >
                  <VIDEO_SHORTCUT.Icon
                    className={cn("shrink-0 transition-colors", collapsed ? "h-5 w-5" : "h-[15px] w-[15px]")}
                    style={{ color: G.gold }}
                    strokeWidth={1.8}
                  />
                  {!collapsed && (
                    <span
                      className="flex-1 text-[10px] font-semibold leading-snug tracking-[0.04em]"
                      style={{
                        fontFamily: "'Orbitron', system-ui, sans-serif",
                        color: G.gold,
                      }}
                    >
                      {VIDEO_SHORTCUT.label}
                    </span>
                  )}
                </div>
              </Link>
            );
          })()}
        </nav>

        {/* ══ FOOTER ══ */}
        <div
          className="relative shrink-0 space-y-1 border-t p-2"
          style={{
            borderColor: G.border,
            background: "linear-gradient(180deg, rgba(18,14,8,0.92) 0%, rgba(6,4,2,0.98) 100%)",
          }}
        >
          {!collapsed && displayName && (
            <div
              className="mb-1 flex items-center gap-2 rounded-xl px-3 py-2"
              style={{
                background: "linear-gradient(135deg, rgba(201,165,90,0.08), rgba(24,18,8,0.55))",
                border: `1px solid ${G.border}`,
              }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{
                  background: "linear-gradient(145deg, #2a2010, #12100a)",
                  border: `1px solid rgba(201,165,90,0.25)`,
                  boxShadow: `0 0 10px rgba(201,165,90,0.18)`,
                }}
              >
                <span
                  className="text-[10px] font-black"
                  style={{ color: G.gold, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: G.text, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                >
                  {displayName}
                </p>
                <div className="mt-0.5 flex items-center gap-1.5">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: "#22c55e", boxShadow: "0 0 6px rgba(34,197,94,0.5)" }}
                  />
                  <span
                    className="text-[8px] font-bold uppercase tracking-[0.28em]"
                    style={{ color: G.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    online
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
              e.currentTarget.style.background = "rgba(201,165,90,0.08)";
              e.currentTarget.style.border = `1px solid ${G.border}`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.border = "1px solid transparent";
            }}
            title="Logout"
          >
            <LogOut className="h-4 w-4 shrink-0 transition-colors" style={{ color: G.textMuted }} strokeWidth={1.8} />
            {!collapsed && (
              <span
                className="text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors"
                style={{ color: G.textMuted, fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Logout
              </span>
            )}
          </button>

          <button
            onClick={onToggle}
            className="flex w-full items-center justify-center rounded-xl px-3 py-1.5 transition-all duration-200"
            style={{ border: `1px solid ${G.border}`, color: G.textMuted }}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        </div>
      </aside>
    </>
  );
}
