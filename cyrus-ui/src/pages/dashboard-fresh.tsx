import { useState, useRef, useEffect } from "react";
import {
  LayoutGrid,
  TerminalSquare,
  Camera,
  FileText,
  Video,
  Phone,
  MessageSquare,
  Mic,
  Film,
} from "lucide-react";
import { Link } from "wouter";
import { FieldDateTimeHud } from "@/components/command-center/field-datetime-hud";
import {
  BottomPanels,
  EngineMatrixSection,
  HeaderBadge,
  HeaderTitle,
  HealthRail,
  HeroSection,
  MetricsSection,
} from "@/components/dashboard-fresh/sections";
import {
  PSharePanel,
  CommsBentoGrid,
} from "@/components/dashboard-fresh/comms-hub";
import { useDashboardFreshData } from "@/hooks/use-dashboard-fresh-data";
import { useUserRole } from "@/hooks/use-user-role";

type AdminTab = "modules" | "console";

/* ══════════════════════════════════════════════════════════════════════
   DEEP SPACE PARTICLE OVERLAY
   Fixed full-screen canvas — orbital body + rock explosions + meteor shower
   pointer-events: none so it never blocks interaction
══════════════════════════════════════════════════════════════════════ */
function DeepSpaceParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W;
    canvas.height = H;

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener("resize", onResize);

    /* ── orbit config ── */
    const orbit = {
      angle: 0, speed: 0.006,
      cx: W * 0.52, cy: H * 0.34,
      rx: W * 0.24, ry: H * 0.09,
    };
    const trail: { x: number; y: number }[] = [];

    /* ── particle types ── */
    type PType = "spark" | "rock" | "meteor" | "debris";
    interface Particle {
      x: number; y: number; vx: number; vy: number;
      size: number; alpha: number; decay: number;
      color: string; type: PType; tailLen: number;
    }
    const pool: Particle[] = [];

    const rnd  = (a: number, b: number) => a + Math.random() * (b - a);
    const _hsl = (h: number, s: number, l: number, a = 1) => `hsla(${h},${s}%,${l}%,${a})`; void _hsl;
    const fireColors = ["#ff9a4a","#ff6b1a","#ffcc55","#ff4a0a","#e05030","#ffaa33"];
    const rockColors = ["#c8734a","#a05530","#8b4513","#e07040","#ffa060"];

    const spawnMeteor = () => {
      const ang  = rnd(0.15, 0.55);
      const spd  = rnd(7, 14);
      const side = Math.random() > 0.5;
      pool.push({
        x: side ? rnd(0, W * 0.5) : rnd(W * 0.5, W),
        y: rnd(-30, -10),
        vx: (side ? 1 : -1) * Math.cos(ang) * spd * 0.5,
        vy: Math.sin(ang) * spd,
        size: rnd(0.8, 2.2),
        alpha: rnd(0.5, 0.95),
        decay: rnd(0.003, 0.007),
        color: fireColors[Math.floor(Math.random() * fireColors.length)],
        type: "meteor", tailLen: rnd(25, 80),
      });
    };

    const spawnExplosion = (x: number, y: number) => {
      const count = 28 + Math.floor(Math.random() * 20);
      for (let i = 0; i < count; i++) {
        const ang  = Math.random() * Math.PI * 2;
        const spd  = rnd(0.8, 6.5);
        const isSp = Math.random() > 0.45;
        pool.push({
          x, y,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          size: isSp ? rnd(1, 2.5) : rnd(2.5, 6),
          alpha: rnd(0.7, 1),
          decay: rnd(0.006, 0.02),
          color: isSp
            ? fireColors[Math.floor(Math.random() * fireColors.length)]
            : rockColors[Math.floor(Math.random() * rockColors.length)],
          type: isSp ? "spark" : "rock",
          tailLen: 0,
        });
      }
    };

    const spawnDebris = () => {
      pool.push({
        x: rnd(0, W), y: rnd(0, H),
        vx: rnd(-0.3, 0.3), vy: rnd(0.05, 0.35),
        size: rnd(0.8, 3),
        alpha: rnd(0.12, 0.35),
        decay: rnd(0.0003, 0.0008),
        color: rockColors[Math.floor(Math.random() * rockColors.length)],
        type: "debris", tailLen: 0,
      });
    };

    /* seed */
    for (let i = 0; i < 50; i++) spawnDebris();
    for (let i = 0; i < 6;  i++) spawnMeteor();

    const drawBody = (x: number, y: number) => {
      /* glow rings */
      for (let r = 3; r >= 1; r--) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 22 * r);
        g.addColorStop(0,   `rgba(255,120,50,${0.18 / r})`);
        g.addColorStop(0.5, `rgba(200,60,20,${0.08 / r})`);
        g.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(x, y, 22 * r, 0, Math.PI * 2);
        ctx.fillStyle = g; ctx.fill();
      }
      /* planet */
      const pg = ctx.createRadialGradient(x - 5, y - 5, 2, x, y, 15);
      pg.addColorStop(0,   "#ff8040");
      pg.addColorStop(0.4, "#c03820");
      pg.addColorStop(0.8, "#701010");
      pg.addColorStop(1,   "#350808");
      ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2);
      ctx.fillStyle = pg; ctx.fill();
      /* highlight */
      ctx.beginPath(); ctx.arc(x - 5, y - 5, 5, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,200,160,0.28)"; ctx.fill();
    };

    let frame = 0;
    let lastBlast = 0;
    let animId: number;

    const tick = () => {
      frame++;

      /* faint fade trail on canvas — creates motion blur */
      ctx.fillStyle = "rgba(0,0,0,0.07)";
      ctx.fillRect(0, 0, W, H);

      /* ── orbital motion ── */
      orbit.cx = W * 0.52; orbit.cy = H * 0.34;
      orbit.rx = W * 0.24; orbit.ry = H * 0.09;
      orbit.angle += orbit.speed;
      const ox = orbit.cx + Math.cos(orbit.angle) * orbit.rx;
      const oy = orbit.cy + Math.sin(orbit.angle) * orbit.ry;

      /* draw orbital ellipse guide (very faint) */
      ctx.save();
      ctx.strokeStyle = "rgba(225,80,40,0.06)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.ellipse(orbit.cx, orbit.cy, orbit.rx, orbit.ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      /* trail */
      trail.push({ x: ox, y: oy });
      if (trail.length > 70) trail.shift();
      trail.forEach((pt, i) => {
        const ratio = i / trail.length;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 3.5 * ratio, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230,90,40,${ratio * 0.45})`;
        ctx.fill();
      });

      drawBody(ox, oy);

      /* ── periodic rock explosions every ~3 s ── */
      if (frame - lastBlast > 185) {
        spawnExplosion(ox, oy);
        lastBlast = frame;
      }

      /* ── spawn meteors & debris periodically ── */
      if (frame % 42  === 0) spawnMeteor();
      if (frame % 110 === 0) spawnDebris();

      /* ── update + draw particles ── */
      for (let i = pool.length - 1; i >= 0; i--) {
        const p = pool[i];
        p.x     += p.vx;
        p.y     += p.vy;
        p.alpha -= p.decay;
        if (p.type === "rock") p.vy += 0.06; /* gravity */

        if (p.alpha <= 0 || p.x < -150 || p.x > W + 150 || p.y > H + 150) {
          pool.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.alpha));

        if (p.type === "meteor") {
          ctx.shadowColor = p.color; ctx.shadowBlur = 10;
          ctx.strokeStyle = p.color; ctx.lineWidth   = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * (p.tailLen / 6), p.y - p.vy * (p.tailLen / 6));
          ctx.stroke();
          /* head glow */
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 1.4, 0, Math.PI * 2);
          ctx.fillStyle = "#fff"; ctx.fill();
        } else if (p.type === "spark") {
          ctx.shadowColor = p.color; ctx.shadowBlur = 8;
          ctx.fillStyle   = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.type === "rock") {
          ctx.shadowColor = p.color; ctx.shadowBlur = 5;
          ctx.fillStyle   = p.color;
          /* slightly irregular polygon */
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (k / 6) * Math.PI * 2;
            const r = p.size * (0.7 + 0.3 * Math.sin(k * 1.7 + frame * 0.05));
            k === 0 ? ctx.moveTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r)
                    : ctx.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
          }
          ctx.closePath(); ctx.fill();
        } else {
          /* debris — tiny slow-drifting shard */
          ctx.fillStyle = p.color;
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      "fixed",
        top: 0, left: 0,
        width:  "100vw",
        height: "100vh",
        zIndex: 2,
        pointerEvents: "none",
        mixBlendMode:  "screen",
      }}
    />
  );
}

/* ══════════════════════════════════════════════════════════════════════
   QUICK ACTION STRIP — 7 instant-access features
══════════════════════════════════════════════════════════════════════ */
const QUICK_ACTIONS = [
  { label: "Vision Scan", icon: Camera,       href: "/scan",             color: "#06b6d4" },
  { label: "Build Docs",  icon: FileText,      href: "/document-builder", color: "#7c3aed" },
  { label: "Video Call",  icon: Video,         href: "/comms?tab=video",  color: "#e11d48" },
  { label: "Voice Call",  icon: Phone,         href: "/comms?tab=voice",  color: "#22c55e" },
  { label: "Text",        icon: MessageSquare, href: "/comms?tab=text",   color: "#f97316" },
  { label: "Voice Note",  icon: Mic,           href: "/comms?tab=vnote",  color: "#eab308" },
  { label: "Video Note",  icon: Film,          href: "/comms?tab=vidnote",color: "#f43f5e" },
];

function QuickActionStrip() {
  return (
    <div
      className="flex items-center gap-2 px-4 shrink-0"
      style={{
        height: 46,
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(35,35,42,0.9)",
      }}
    >
      <span
        className="text-[7px] font-bold tracking-[0.35em] text-white/30 uppercase shrink-0 mr-1"
      >
        QUICK
      </span>
      {QUICK_ACTIONS.map(({ label, icon: Icon, href, color }) => (
        <Link key={label} href={href}>
          <div
            className="group flex items-center gap-1.5 rounded-xl px-3 h-[30px] cursor-pointer transition-all duration-150 hover:scale-[1.04] shrink-0"
            style={{
              background: `rgba(255,255,255,0.06)`,
              border: `1px solid rgba(255,255,255,0.1)`,
            }}
          >
            <Icon
              className="h-3 w-3 shrink-0"
              style={{ color }}
              strokeWidth={1.8}
            />
            <span className="text-[8px] font-semibold text-white/60 group-hover:text-white/90 transition-colors whitespace-nowrap">
              {label}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}


/* ══════════════════════════════════════════════════════════════════════
   PAGE — h-screen, no scroll, everything flex-fitted
══════════════════════════════════════════════════════════════════════ */
export default function DashboardFresh() {
  const role        = useUserRole();
  const isAdmin     = role === "admin";
  const displayName =
    (typeof window !== "undefined" && localStorage.getItem("cyrus-display-name")) || "OPERATOR";

  const [adminTab, setAdminTab]   = useState<AdminTab>("modules");
  const adminConsole              = isAdmin && adminTab === "console";

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
    enableStackSummary:    true,
    enableOrchestratorData: true,
  });

  const showHub = !adminConsole;
  const sharedPanelProps = { healthPercent, onlineEngines, totalEngines, degradedEngines, offlineEngines };

  return (
    /* Root: fills the whole viewport, NO page scroll */
    <div className="flex flex-col text-white overflow-hidden" style={{ height: "100vh", background: "#0c0c14", position: "relative" }}>

      {/* ── Deep-space particle system — fixed full-screen canvas overlay ── */}
      <DeepSpaceParticleOverlay />


      {/* ══ HEADER — 52px fixed row ════════════════════════════════════ */}
      <header
        className="shrink-0 z-30"
        style={{
          height: 52,
          background: "rgba(8,8,14,0.99)",
          borderBottom: "1px solid rgba(225,29,72,0.2)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 2px 32px rgba(0,0,0,0.8)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-5 h-full">
          {/* Left */}
          <div className="flex items-center gap-3 min-w-0">
            <HeaderTitle variant={showHub ? "operator" : "default"} />
            {isAdmin && (
              <div
                className="flex items-center gap-1 rounded-xl p-1 ml-2"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                {([
                  { id: "modules" as AdminTab, label: "Hub",     icon: LayoutGrid,    color: "#e11d48" },
                  { id: "console" as AdminTab, label: "Console", icon: TerminalSquare, color: "#06b6d4" },
                ] as const).map(({ id, label, icon: Icon, color }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setAdminTab(id)}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1 text-[10px] font-semibold tracking-wide transition-all duration-200"
                    style={{
                      background:  adminTab === id ? `${color}18` : "transparent",
                      border:      adminTab === id ? `1px solid ${color}35` : "1px solid transparent",
                      color:       adminTab === id ? "#fff" : "rgba(255,255,255,0.35)",
                      boxShadow:   adminTab === id ? `0 0 12px ${color}20` : "none",
                      fontFamily: "'Orbitron', system-ui",
                    }}
                  >
                    <Icon className="h-3 w-3" style={{ color: adminTab === id ? color : undefined }} strokeWidth={2} />
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Centre status pills */}
          <div className="hidden md:flex items-center gap-2">
            {[
              { label: "SYSTEM",  value: "ACTIVE",                           color: "#22c55e", pulse: true  },
              { label: "ENGINES", value: `${onlineEngines}/${totalEngines}`,  color: "#06b6d4", pulse: false },
              { label: "COMMS",   value: "READY",                            color: "#7c3aed", pulse: false },
            ].map(({ label, value, color, pulse }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-full px-3 py-1"
                style={{ background: `${color}10`, border: `1px solid ${color}22` }}
              >
                <span
                  className={`h-[5px] w-[5px] rounded-full ${pulse ? "animate-pulse" : ""}`}
                  style={{ background: color, boxShadow: `0 0 5px ${color}` }}
                />
                <span className="text-[9px] font-mono tracking-[0.25em] text-white/40 uppercase">{label}</span>
                <span className="text-[10px] font-mono font-bold tabular-nums" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && <HeaderBadge livePort={(stackSummary as any)?.stack?.fused?.livePort} />}
            <FieldDateTimeHud />
          </div>
        </div>
      </header>

      {/* ══ BODY — fills remaining height, no overflow ═════════════════ */}
      <div className="flex flex-1 min-h-0 overflow-hidden relative z-10">

        {/* ── CENTER — hub or admin console ────────────────────────────── */}
        {showHub ? (
          <main className="flex-1 min-w-0 flex flex-col overflow-hidden">

            {/* Quick-action strip */}
            <QuickActionStrip />

            {/* Comms bento — fills remaining height, no scroll */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <CommsBentoGrid displayName={displayName} />
            </div>
          </main>
        ) : (
          /* Admin console — own internal scroll */
          <main className="flex-1 min-w-0 overflow-y-auto">
            <div className="mx-auto w-full max-w-[1400px] px-5 py-6 space-y-5 lg:px-8">
              <section
                className="relative overflow-hidden rounded-2xl p-5"
                style={{ background: "rgba(42,42,52,0.88)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.13)" }}
                  >
                    <TerminalSquare className="h-5 w-5 text-white/60" />
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold tracking-widest text-white/35 uppercase mb-1">Command & Diagnostics</p>
                    <h2 className="text-lg font-black text-white" style={{ fontFamily: "'Orbitron', system-ui" }}>Mission Console</h2>
                    <p className="text-xs text-white/40 mt-1">Stack health, engine matrix, and operational hints.</p>
                  </div>
                </div>
              </section>
              <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <HeroSection />
                <HealthRail {...sharedPanelProps} />
              </section>
              <MetricsSection
                stackSummary={stackSummary}
                onlineEngines={onlineEngines}
                totalEngines={totalEngines}
                degradedEngines={degradedEngines}
              />
              <EngineMatrixSection
                modules={orchestratorModules?.modules ?? []}
                navLabelByRoute={navLabelByRoute}
              />
              <BottomPanels hints={(stackSummary as any)?.stack?.hints ?? ["Waiting for stack hints…"]} />
            </div>
          </main>
        )}

        {/* ── RIGHT sidebar ────────────────────────────────────────────── */}
        <aside
          className="hidden xl:flex flex-col shrink-0 overflow-y-auto"
          style={{
            width: 280,
            borderLeft: "1px solid rgba(225,29,72,0.18)",
            background: "rgba(8,8,14,0.88)",
            backdropFilter: "blur(20px)",
            scrollbarWidth: "none",
          }}
        >
          <PSharePanel />
        </aside>
      </div>
    </div>
  );
}
