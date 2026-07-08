import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  Globe,
  Shield,
  Zap,
  MapPin,
  Crosshair,
  ClipboardList,
  Cpu,
  LayoutGrid,
  TerminalSquare,
  LogOut,
} from "lucide-react";
import { clearAuthSessionStorage, readStoredDisplayName } from "@/lib/auth-storage";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";
import { FieldDateTimeHud } from "@/components/command-center/field-datetime-hud";
import { ModuleCommandConsole, ModuleCommandConsoleDock } from "@/components/command-center/module-command-console";
import { HeaderBadge } from "@/components/dashboard-fresh/sections";
import { CYRUS_MINING_DIAMOND_URL } from "@/lib/dashboard-backdrop";

const GOLD = "#C9A55A";
const GOLD_GLOW = "rgba(201,165,90,0.45)";
const GOLD_BORDER = "rgba(201,165,90,0.18)";
const ORBITRON = { fontFamily: "'Orbitron', system-ui, sans-serif" } as const;

// WMO weather code descriptions
const WMO_DESC: Record<number, { label: string; emoji: string }> = {
  0:  { label: "CLEAR SKY",     emoji: "☀️" },
  1:  { label: "MAINLY CLEAR",  emoji: "🌤️" },
  2:  { label: "PARTLY CLOUDY", emoji: "⛅" },
  3:  { label: "OVERCAST",      emoji: "☁️" },
  45: { label: "FOGGY",         emoji: "🌫️" },
  48: { label: "ICE FOG",       emoji: "🌫️" },
  51: { label: "LIGHT DRIZZLE", emoji: "🌦️" },
  53: { label: "DRIZZLE",       emoji: "🌦️" },
  55: { label: "HEAVY DRIZZLE", emoji: "🌧️" },
  61: { label: "LIGHT RAIN",    emoji: "🌧️" },
  63: { label: "RAIN",          emoji: "🌧️" },
  65: { label: "HEAVY RAIN",    emoji: "⛈️" },
  71: { label: "LIGHT SNOW",    emoji: "🌨️" },
  73: { label: "SNOW",          emoji: "❄️" },
  75: { label: "HEAVY SNOW",    emoji: "❄️" },
  80: { label: "SHOWERS",       emoji: "🌦️" },
  81: { label: "SHOWERS",       emoji: "🌧️" },
  82: { label: "HEAVY SHOWERS", emoji: "⛈️" },
  95: { label: "THUNDERSTORM",  emoji: "⛈️" },
  96: { label: "THUNDERSTORM",  emoji: "⛈️" },
  99: { label: "THUNDERSTORM",  emoji: "⛈️" },
};

function useGaboroneWeather() {
  return useQuery({
    queryKey: ["weather-gaborone"],
    queryFn: async () => {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=-24.6282&longitude=25.9231&current_weather=true&temperature_unit=celsius",
      );
      if (!res.ok) throw new Error("weather fetch failed");
      return res.json() as Promise<{ current_weather: { temperature: number; weathercode: number; windspeed: number } }>;
    },
    staleTime: 15 * 60 * 1000,
    retry: 1,
  });
}

function useGreeting(name: string) {
  const [greeting, setGreeting] = useState("");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(
      h < 12 ? "GOOD MORNING" : h < 17 ? "GOOD AFTERNOON" : h < 21 ? "GOOD EVENING" : "GOOD NIGHT",
    );
  }, []);
  return greeting;
}

/** Glassmorphism card with gold border */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{
        background: "linear-gradient(135deg, rgba(18,14,8,0.92) 0%, rgba(10,8,6,0.88) 100%)",
        border: `1px solid ${GOLD_BORDER}`,
        boxShadow: `0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(201,165,90,0.06)`,
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Top shimmer */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, rgba(201,165,90,0.35), transparent)` }}
      />
      {children}
    </div>
  );
}

/** Circular SVG gauge */
function CircularGauge({ percent }: { percent: number }) {
  const R = 40;
  const CIRC = 2 * Math.PI * R; // 251.2
  const offset = CIRC * (1 - Math.min(percent, 100) / 100);

  return (
    <div className="relative flex h-[90px] w-[90px] shrink-0 items-center justify-center">
      <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90" aria-hidden>
        {/* Track */}
        <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(201,165,90,0.12)" strokeWidth="7" />
        {/* Fill */}
        <circle
          cx="50"
          cy="50"
          r={R}
          fill="none"
          stroke={GOLD}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1.2s ease-out", filter: `drop-shadow(0 0 6px ${GOLD_GLOW})` }}
        />
      </svg>
      <span
        className="relative text-[20px] font-black tabular-nums"
        style={{ color: GOLD, ...ORBITRON }}
      >
        {percent}%
      </span>
    </div>
  );
}

/** Weather widget top-right */
function WeatherWidget() {
  const { data, isLoading } = useGaboroneWeather();
  const weather = data?.current_weather;
  const wmo = weather ? (WMO_DESC[weather.weathercode] ?? { label: "UNKNOWN", emoji: "🌡️" }) : null;

  return (
    <GlassCard className="flex flex-col items-center justify-center gap-1 p-3 min-w-[130px]">
      {isLoading || !weather ? (
        <>
          <span className="text-[28px]">🌡️</span>
          <span className="text-[10px] text-white/40" style={ORBITRON}>LOADING...</span>
        </>
      ) : (
        <>
          <span className="text-[28px]">{wmo?.emoji}</span>
          <span
            className="text-[22px] font-black tabular-nums leading-none"
            style={{ color: "#fff", ...ORBITRON }}
          >
            {Math.round(weather.temperature)}°
          </span>
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" style={{ color: GOLD }} />
            <span className="text-[9px] font-bold tracking-[0.18em]" style={{ color: GOLD, ...ORBITRON }}>
              GABORONE
            </span>
          </div>
          <span className="text-[8px] font-semibold tracking-[0.12em] text-white/55" style={ORBITRON}>
            {wmo?.label}
          </span>
        </>
      )}
    </GlassCard>
  );
}

/** TODAY'S SCHEDULE card */
function ScheduleCard() {
  const now = new Date();
  const scheduleItems = [
    { time: "18:30", label: "MISSION BRIEFING", tag: "TODAY" },
    { time: "20:00", label: "SYSTEM CHECK",     tag: null   },
  ];

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
          <span className="text-[11px] font-black tracking-[0.24em] uppercase" style={{ color: GOLD, ...ORBITRON }}>
            TODAY'S SCHEDULE
          </span>
        </div>
        <div className="h-px mb-3" style={{ background: GOLD_BORDER }} />
        <div className="space-y-3">
          {scheduleItems.map((item) => (
            <div key={item.time} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold tabular-nums text-white/55" style={ORBITRON}>
                  {item.time}
                </p>
                <p className="text-[12px] font-semibold tracking-wide text-white/90" style={ORBITRON}>
                  {item.label}
                </p>
              </div>
              {item.tag && (
                <span
                  className="shrink-0 rounded-md px-2 py-0.5 text-[9px] font-bold tracking-[0.18em]"
                  style={{
                    background: "rgba(201,165,90,0.15)",
                    border: `1px solid rgba(201,165,90,0.3)`,
                    color: GOLD,
                    ...ORBITRON,
                  }}
                >
                  {item.tag}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

/** SYSTEM STATUS card */
function SystemStatusCard({
  healthPercent,
  onlineEngines,
  totalEngines,
}: {
  healthPercent: number;
  onlineEngines: number;
  totalEngines: number;
}) {
  const statusItems = [
    { label: "COMMS ONLINE",   ok: onlineEngines > 0 },
    { label: "SENSORS ACTIVE", ok: healthPercent >= 50 },
    { label: "SYSTEMS OK",     ok: healthPercent >= 70 },
  ];

  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
          <span className="text-[11px] font-black tracking-[0.24em] uppercase" style={{ color: GOLD, ...ORBITRON }}>
            SYSTEM STATUS
          </span>
        </div>
        <div className="h-px mb-3" style={{ background: GOLD_BORDER }} />
        <div className="flex items-center gap-4">
          <CircularGauge percent={healthPercent || 92} />
          <div className="flex flex-col gap-2">
            {statusItems.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{
                    background: item.ok ? GOLD : "rgba(201,165,90,0.3)",
                    boxShadow: item.ok ? `0 0 6px ${GOLD_GLOW}` : "none",
                  }}
                />
                <span
                  className="text-[9px] font-semibold tracking-[0.14em]"
                  style={{ color: item.ok ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.35)", ...ORBITRON }}
                >
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

/** QUICK ACCESS grid */
const QUICK_TILES = [
  { label: "MAPS",      Icon: Globe,         href: "/intelligence", desc: "Intelligence"  },
  { label: "DRONES",    Icon: Cpu,           href: "/device",       desc: "Device Control" },
  { label: "MISSIONS",  Icon: Crosshair,     href: "/ops",          desc: "Operations"     },
  { label: "REGISTERS", Icon: ClipboardList, href: "/files",        desc: "Documents"      },
] as const;

function QuickAccessSection() {
  return (
    <GlassCard>
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 shrink-0" style={{ color: GOLD }} />
          <span className="text-[11px] font-black tracking-[0.24em] uppercase" style={{ color: GOLD, ...ORBITRON }}>
            QUICK ACCESS
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {QUICK_TILES.map(({ label, Icon, href }) => (
            <Link key={label} href={href}>
              <button
                type="button"
                className="group flex flex-col items-center justify-center gap-2 rounded-xl p-3 w-full transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, rgba(18,14,8,0.85) 0%, rgba(12,10,6,0.90) 100%)",
                  border: `1px solid rgba(201,165,90,0.15)`,
                  minHeight: "80px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid rgba(201,165,90,0.4)`;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 18px rgba(201,165,90,0.15)`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.border = `1px solid rgba(201,165,90,0.15)`;
                  (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                }}
                aria-label={`Quick access to ${label}`}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200"
                  style={{
                    background: "rgba(201,165,90,0.10)",
                    border: `1px solid rgba(201,165,90,0.18)`,
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: GOLD }} strokeWidth={1.6} />
                </div>
                <span
                  className="text-[8px] font-bold tracking-[0.22em] uppercase text-center leading-tight"
                  style={{ color: "rgba(255,255,255,0.70)", ...ORBITRON }}
                >
                  {label}
                </span>
              </button>
            </Link>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}

type AdminTab = "modules" | "console";

/** Main Diamond Home page */
export default function DiamondHome() {
  const role = useUserRole();
  const isAdmin = role === "admin";
  const [adminTab, setAdminTab] = useState<AdminTab>("modules");
  const adminConsole = isAdmin && adminTab === "console";
  const showDiamond = !isAdmin || adminTab === "modules";

  const {
    stackSummary,
    orchestratorModules,
    navLabelByRoute,
    onlineEngines,
    degradedEngines,
    offlineEngines,
    totalEngines,
    healthPercent,
  } = useDashboardFreshData("all", {
    enableStackSummary: isAdmin,
    enableOrchestratorData: true,
  });

  // Get display name from auth session
  const displayName = (readStoredDisplayName() || "OPERATOR").toUpperCase();

  const greeting = useGreeting(displayName);

  const handleLogout = () => {
    clearAuthSessionStorage();
    window.location.reload();
  };

  return (
    <div className="relative min-h-screen min-h-dvh overflow-x-hidden cyrus-diamond-home-content" style={{ background: "#080808" }}>

      {/* ── HERO SECTION — diamond crystal background ── */}
      <section className="relative h-[42vh] min-h-[260px] max-h-[420px] overflow-hidden">
        {/* Diamond hero image */}
        <img
          src={CYRUS_MINING_DIAMOND_URL}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          style={{ opacity: 0.55 }}
          aria-hidden
        />
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.08) 40%, rgba(8,8,8,0.88) 100%)" }}
        />
        {/* Top-right admin controls + logout */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3">
          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAdminTab("modules")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold tracking-wide transition ${
                  adminTab === "modules"
                    ? "border-amber-400/45 bg-amber-500/15 text-amber-100"
                    : "border-white/10 bg-black/30 text-white/60 hover:bg-white/[0.08]"
                }`}
                style={ORBITRON}
              >
                <LayoutGrid className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setAdminTab("console")}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[10px] font-semibold tracking-wide transition ${
                  adminTab === "console"
                    ? "border-sky-400/42 bg-sky-500/15 text-sky-50"
                    : "border-white/10 bg-black/30 text-white/60 hover:bg-white/[0.08]"
                }`}
                style={ORBITRON}
              >
                <TerminalSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="hidden sm:inline">Console</span>
              </button>
            </div>
          )}
          <div className="ml-auto flex items-center gap-2">
            {isAdmin && (
              <HeaderBadge livePort={stackSummary?.stack?.fused?.livePort} />
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-black/40 px-2.5 py-1.5 text-[10px] text-white/75 hover:bg-black/60 hover:text-white transition"
              style={ORBITRON}
            >
              <LogOut className="h-3 w-3 shrink-0" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>

        {/* Greeting + weather */}
        <div className="absolute bottom-0 left-0 right-0 z-10 flex items-end justify-between gap-4 px-4 pb-5">
          <div>
            <div
              className="text-[11px] font-medium tracking-[0.14em] text-white/50 mb-1"
              style={ORBITRON}
            >
              Stay focused. Stay in control.
            </div>
            <h1
              className="text-[1.65rem] sm:text-[2rem] font-black uppercase leading-tight tracking-wide"
              style={ORBITRON}
            >
              <span className="text-white">{greeting},</span>
              <br />
              <span style={{ color: GOLD, textShadow: `0 0 30px ${GOLD_GLOW}` }}>{displayName}</span>
            </h1>
          </div>
          <WeatherWidget />
        </div>
      </section>

      {/* ── MAIN CONTENT ── */}
      {showDiamond && (
        <div className="relative z-10 px-4 py-4 space-y-3">
          {/* Schedule + Status row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ScheduleCard />
            <SystemStatusCard
              healthPercent={healthPercent || 92}
              onlineEngines={onlineEngines}
              totalEngines={totalEngines}
            />
          </div>

          {/* Quick Access */}
          <QuickAccessSection />
        </div>
      )}

      {/* ── ADMIN CONSOLE VIEW ── */}
      {adminConsole && (
        <div className="relative z-10 px-4 py-4">
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-slate-950/60 p-1 shadow-[0_0_48px_-22px_rgba(245,158,11,0.18)]">
            <div className="pointer-events-none absolute inset-0 z-0 rounded-3xl bg-slate-950" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 z-[1] opacity-[0.10]"
              style={{
                backgroundImage: `radial-gradient(circle at 1px 1px, rgba(201,165,90,0.5) 1px, transparent 0)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="relative z-10 space-y-5 rounded-[1.4rem] bg-slate-950/45 p-4 shadow-inner shadow-black/20 sm:p-5">
              <div className="mb-1 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                  <TerminalSquare className="h-5 w-5 text-amber-200" aria-hidden />
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/60">
                    Command & diagnostics
                  </p>
                  <h2
                    className="mt-0.5 bg-gradient-to-r from-amber-100 via-white to-cyan-200/90 bg-clip-text text-lg font-bold tracking-tight text-transparent"
                    style={ORBITRON}
                  >
                    Mission console
                  </h2>
                </div>
              </div>
              {/* Re-use existing sections for admin console */}
              <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                {/* Engine health summary */}
                <div className="rounded-2xl border border-amber-500/20 bg-slate-900/80 p-4 lg:col-span-3">
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-emerald-400" />
                      <span className="text-sm text-emerald-300">{onlineEngines} Online</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="text-sm text-amber-300">{degradedEngines} Degraded</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-red-400" />
                      <span className="text-sm text-red-300">{offlineEngines} Offline</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-white/60">Total: {totalEngines}</span>
                    </div>
                    <div className="ml-auto">
                      <span className="text-lg font-bold" style={{ color: GOLD, ...ORBITRON }}>
                        {healthPercent}% health
                      </span>
                    </div>
                  </div>
                </div>
              </section>
              {/* Module matrix */}
              {orchestratorModules?.modules?.length ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {orchestratorModules.modules.map((mod) => (
                    <Link key={mod.route} href={navLabelByRoute.get(mod.route) ? mod.route : mod.route}>
                      <div
                        className="rounded-xl border p-3 cursor-pointer transition-all hover:scale-[1.02]"
                        style={{
                          border: `1px solid ${mod.status === "operational" ? "rgba(34,197,94,0.3)" : mod.status === "degraded" ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
                          background: "rgba(8,8,8,0.7)",
                        }}
                      >
                        <p className="text-[9px] font-bold uppercase tracking-wider text-white/70" style={ORBITRON}>
                          {navLabelByRoute.get(mod.route) ?? mod.route.replace("/", "")}
                        </p>
                        <p
                          className="text-[8px] mt-0.5 capitalize"
                          style={{
                            color: mod.status === "operational" ? "#22c55e" : mod.status === "degraded" ? "#f59e0b" : "#ef4444",
                          }}
                        >
                          {mod.status}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : null}
              {/* Stack hints */}
              {stackSummary?.stack?.hints?.length ? (
                <div className="rounded-xl border border-white/10 bg-black/30 p-3">
                  <p className="text-[9px] uppercase tracking-[0.28em] text-white/40 mb-2" style={ORBITRON}>Stack hints</p>
                  <ul className="space-y-1">
                    {stackSummary.stack.hints.slice(0, 4).map((hint, i) => (
                      <li key={i} className="text-[10px] text-white/60">{hint}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Module command console dock (admin) */}
      <ModuleCommandConsoleDock>
        <ModuleCommandConsole scope="dashboard" pageContext="Diamond Home — command center" />
      </ModuleCommandConsoleDock>
    </div>
  );
}
