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
   NASA-GRADE SUPERNOVA DEEP SPACE OVERLAY
   - CSS 3D rotating textured star with multi-layer stellar corona
   - 900-star twinkling field with diffraction spikes
   - Hubble/Chandra composite colour science (X-ray, optical, infrared)
   - Expanding shock-wave rings (SN1987A / Cassiopeia A style)
   - Bipolar plasma jets + temperature-graded ejecta
   - Persistent nebula cloud with multi-spectral blobs
   - Continuous stellar wind from star surface
   - Proper 3D depth (z-scale) on orbital motion
══════════════════════════════════════════════════════════════════════ */
function DeepSpaceParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const starEl  = starRef.current;
    if (!canvas || !starEl) return;
    const ctx = canvas.getContext("2d")!;

    let W = window.innerWidth;
    let H = window.innerHeight;
    canvas.width  = W * devicePixelRatio;
    canvas.height = H * devicePixelRatio;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const onResize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      seedStars();
    };
    window.addEventListener("resize", onResize);

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;

    /* ═══ NASA COLOUR PALETTES (Chandra/Hubble composite) ═══ */
    /* Hot plasma:  blue-white X-ray core → optical orange → infrared red rim */
    const colHot  = ["#ffffff","#e8f4ff","#bbddff","#88c8ff","#ffeeaa","#ffdd66"];
    const colMid  = ["#ff9944","#ff7722","#ff5500","#ee3300","#dd4422","#cc3311"];
    const colCold = ["#cc1100","#aa0800","#991122","#771133","#660022","#550011"];
    const colJet  = ["#44eeff","#22ccff","#1188ff","#6655ff","#99aaff","#aaf0ff"];
    const colNeb  = [
      ["rgba(255,70,30,",  "rgba(255,140,30,"],
      ["rgba(30,200,255,", "rgba(30,140,255,"],
      ["rgba(200,30,255,", "rgba(240,100,255,"],
      ["rgba(30,255,150,", "rgba(30,200,100,"],
    ];

    /* ═══ STAR FIELD ═══ */
    interface Star { x:number; y:number; r:number; br:number; col:string; tw:number; ph:number }
    let stars: Star[] = [];
    const starPalette = ["#ffffff","#e8f2ff","#fff6e8","#ffeecc","#e8e8ff","#ffd8d8","#d8ffe8"];
    const seedStars = () => {
      stars = Array.from({length: 900}, () => ({
        x: rnd(0, W), y: rnd(0, H),
        r: Math.random() < 0.04 ? rnd(1.2, 2.6) : rnd(0.3, 1.1),
        br: rnd(0.25, 1),
        col: starPalette[Math.floor(Math.random() * starPalette.length)],
        tw: rnd(0.008, 0.05), ph: rnd(0, Math.PI * 2),
      }));
    };
    seedStars();

    /* ═══ ORBIT ═══ */
    const orb = { angle: 0, speed: 0.005, cx:0, cy:0, rx:0, ry:0 };
    const trail: {x:number;y:number}[] = [];
    const STAR_D = 120; /* CSS star diameter px */

    /* ═══ PARTICLE POOL ═══ */
    type PT = "ejecta"|"jet"|"wind"|"meteor"|"debris";
    interface Particle {
      x:number;y:number;vx:number;vy:number;
      size:number;alpha:number;decay:number;
      col:string;type:PT;tail:number;grav:number;
    }
    const pool: Particle[] = [];

    /* ═══ SHOCK WAVES ═══ */
    interface Shock { x:number;y:number;r:number;maxR:number;alpha:number;col:string;width:number }
    const shocks: Shock[] = [];

    /* ═══ NEBULA BLOBS ═══ */
    interface Nebula { x:number;y:number;r:number;maxR:number;alpha:number;cs:string[] }
    const nebulas: Nebula[] = [];

    /* ─── spawn helpers ─── */
    const spawnMeteor = () => {
      const side = Math.random() > 0.5;
      const ang  = rnd(0.18, 0.52);
      const spd  = rnd(6, 13);
      pool.push({
        x: side ? rnd(0, W*0.4) : rnd(W*0.6, W), y: rnd(-40,-5),
        vx: (side?1:-1)*Math.cos(ang)*spd*0.45,
        vy: Math.sin(ang)*spd,
        size: rnd(0.7,2.2), alpha: rnd(0.55,0.95), decay: rnd(0.003,0.008),
        col: colHot[Math.floor(Math.random()*colHot.length)],
        type:"meteor", tail: rnd(30,100), grav:0,
      });
    };

    const spawnExplosion = (cx:number, cy:number) => {
      /* 1. Shock wave rings — 3 concentric expanding rings */
      const ringCols = ["#aaddff","#ff9944","#ff4422"];
      for (let s=0;s<3;s++) shocks.push({
        x:cx, y:cy, r:10+s*18, maxR: 320+s*130+rnd(0,80),
        alpha:0.95-s*0.18,
        col: ringCols[s], width:8-s*2,
      });

      /* 2. Nebula blobs — 4 spectral channels like Hubble composite */
      for (let n=0;n<4;n++) nebulas.push({
        x:cx+rnd(-25,25), y:cy+rnd(-20,20),
        r:18, maxR:180+n*70+rnd(0,60),
        alpha:0.4, cs: colNeb[n],
      });

      /* 3. Ejecta — temperature-graded fragments */
      for (let i=0;i<55;i++) {
        const ang = Math.random()*Math.PI*2;
        const spd = rnd(1.2,9);
        const tmp = Math.random();
        const col = tmp>0.7 ? colHot[Math.floor(Math.random()*colHot.length)]
                  : tmp>0.3 ? colMid[Math.floor(Math.random()*colMid.length)]
                  :           colCold[Math.floor(Math.random()*colCold.length)];
        pool.push({
          x:cx, y:cy,
          vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd,
          size:rnd(1.5,5.5), alpha:0.92, decay:rnd(0.004,0.013),
          col, type:"ejecta", tail:rnd(18,85), grav:0.018,
        });
      }

      /* 4. Bipolar plasma jets (like Cas A / Crab Nebula) */
      for (let j=0;j<2;j++) {
        const base = j===0 ? -Math.PI/2 : Math.PI/2;
        for (let i=0;i<22;i++) {
          const spread = rnd(-0.28,0.28);
          const spd    = rnd(3,10);
          pool.push({
            x:cx, y:cy,
            vx:Math.cos(base+spread)*spd, vy:Math.sin(base+spread)*spd,
            size:rnd(2,4.5), alpha:0.85, decay:rnd(0.004,0.009),
            col:colJet[Math.floor(Math.random()*colJet.length)],
            type:"jet", tail:rnd(35,100), grav:0,
          });
        }
      }
    };

    const spawnWind = (cx:number, cy:number) => {
      const ang  = Math.random()*Math.PI*2;
      const r    = STAR_D/2 + rnd(-4,6);
      pool.push({
        x:cx+Math.cos(ang)*r, y:cy+Math.sin(ang)*r,
        vx:Math.cos(ang)*rnd(0.5,1.8), vy:Math.sin(ang)*rnd(0.5,1.8),
        size:rnd(0.5,1.8), alpha:rnd(0.35,0.65), decay:rnd(0.003,0.007),
        col:colHot[Math.floor(Math.random()*3)],
        type:"wind", tail:12, grav:0,
      });
    };

    /* seed initial debris (slow-drifting space dust) */
    for (let i=0;i<60;i++) pool.push({
      x:rnd(0,W), y:rnd(0,H),
      vx:rnd(-0.25,0.25), vy:rnd(0.06,0.3),
      size:rnd(0.6,2.8), alpha:rnd(0.1,0.3), decay:rnd(0.0002,0.0006),
      col:colMid[Math.floor(Math.random()*colMid.length)],
      type:"debris", tail:0, grav:0,
    });
    for (let i=0;i<7;i++) spawnMeteor();

    /* ─── render helpers ─── */
    const drawStarfield = (t:number) => {
      ctx.save();
      stars.forEach(s => {
        const b = s.br*(0.65+0.35*Math.sin(t*s.tw+s.ph));
        ctx.globalAlpha = b;
        ctx.fillStyle   = s.col;
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
        if (s.r>1.3) {
          const sp = s.r*5;
          ctx.globalAlpha = b*0.35;
          ctx.strokeStyle = s.col; ctx.lineWidth=0.5;
          ctx.beginPath();
          ctx.moveTo(s.x-sp,s.y); ctx.lineTo(s.x+sp,s.y);
          ctx.moveTo(s.x,s.y-sp); ctx.lineTo(s.x,s.y+sp);
          ctx.stroke();
        }
      });
      ctx.restore();
    };

    const drawStarCorona = (sx:number, sy:number, zScale:number) => {
      /* multi-layer corona — Chandra-style X-ray + optical glow */
      const layers = [
        {r:280, c:rgba(180,20,5, 0.04*zScale)},
        {r:180, c:rgba(220,60,15,0.07*zScale)},
        {r:110, c:rgba(255,100,30,0.11*zScale)},
        {r:72,  c:rgba(255,150,60,0.18*zScale)},
        {r:50,  c:rgba(255,200,100,0.28*zScale)},
        {r:STAR_D/2+10, c:rgba(255,240,180,0.40*zScale)},
      ];
      layers.forEach(({r,c})=>{
        const g=ctx.createRadialGradient(sx,sy,0,sx,sy,r);
        g.addColorStop(0,c); g.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(sx,sy,r,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill();
      });
      /* X-ray shimmer ring (pulse) */
      const shimR = STAR_D/2+4;
      ctx.save();
      ctx.strokeStyle=rgba(180,220,255,0.25*zScale*(0.6+0.4*Math.sin(Date.now()*0.003)));
      ctx.lineWidth=3; ctx.shadowColor="#88ccff"; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.arc(sx,sy,shimR,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    };

    const drawOrbitalPath = () => {
      ctx.save();
      ctx.strokeStyle="rgba(255,100,50,0.04)";
      ctx.lineWidth=1; ctx.setLineDash([3,10]);
      ctx.beginPath();
      ctx.ellipse(orb.cx,orb.cy,orb.rx,orb.ry,0,0,Math.PI*2);
      ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    };

    let frame=0, lastBlast=-400, animId=0;

    const tick = () => {
      frame++;
      const t = frame*0.016;

      /* dark space fade — keeps trails but clears old particles */
      ctx.fillStyle="rgba(2,2,14,0.13)";
      ctx.fillRect(0,0,W,H);

      drawStarfield(t);
      drawOrbitalPath();

      /* orbital position */
      orb.cx=W*0.51; orb.cy=H*0.37;
      orb.rx=W*0.25; orb.ry=H*0.095;
      orb.angle+=orb.speed;

      const sx = orb.cx+Math.cos(orb.angle)*orb.rx;
      const sy = orb.cy+Math.sin(orb.angle)*orb.ry;

      /* z-depth: star appears larger/brighter at front of orbit */
      const zScale = 0.78+0.22*((Math.sin(orb.angle)+1)/2);
      const starPx  = Math.round(STAR_D*zScale);

      /* update CSS star element */
      starEl.style.left    = `${Math.round(sx-starPx/2)}px`;
      starEl.style.top     = `${Math.round(sy-starPx/2)}px`;
      starEl.style.width   = `${starPx}px`;
      starEl.style.height  = `${starPx}px`;
      starEl.style.opacity = String(0.55+0.45*zScale);

      /* orbital glow trail on canvas */
      trail.push({x:sx,y:sy});
      if (trail.length>80) trail.shift();
      trail.forEach((pt,i)=>{
        const r=i/trail.length;
        ctx.beginPath(); ctx.arc(pt.x,pt.y,4*r,0,Math.PI*2);
        ctx.fillStyle=rgba(240,100,40,r*0.38);
        ctx.fill();
      });

      drawStarCorona(sx,sy,zScale);

      /* ── shock waves ── */
      for (let i=shocks.length-1;i>=0;i--) {
        const sh=shocks[i];
        const prog=sh.r/sh.maxR;
        sh.r+=3+prog*6; sh.alpha*=0.983;
        if (sh.r>sh.maxR||sh.alpha<0.008){shocks.splice(i,1);continue;}
        const rw=Math.max(1,sh.width*(1-prog));
        ctx.save();
        ctx.shadowColor=sh.col; ctx.shadowBlur=18;
        ctx.strokeStyle=sh.col.replace("#","#")||sh.col;
        /* convert hex to rgba for proper alpha */
        const hx=sh.col.replace("#","");
        const cr=parseInt(hx.slice(0,2),16);
        const cg=parseInt(hx.slice(2,4),16);
        const cb=parseInt(hx.slice(4,6),16);
        ctx.strokeStyle=rgba(cr,cg,cb,sh.alpha*0.9);
        ctx.lineWidth=rw+2;
        ctx.beginPath(); ctx.arc(sh.x,sh.y,sh.r,0,Math.PI*2); ctx.stroke();
        /* bright leading edge */
        ctx.strokeStyle=rgba(255,255,255,sh.alpha*0.5);
        ctx.lineWidth=rw*0.5;
        ctx.beginPath(); ctx.arc(sh.x,sh.y,sh.r+rw*0.5,0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }

      /* ── nebula blobs ── */
      for (let i=nebulas.length-1;i>=0;i--) {
        const nb=nebulas[i];
        nb.r+=1.1+(nb.r/nb.maxR)*2.5; nb.alpha*=0.993;
        if (nb.r>nb.maxR||nb.alpha<0.004){nebulas.splice(i,1);continue;}
        const g=ctx.createRadialGradient(nb.x,nb.y,0,nb.x,nb.y,nb.r);
        g.addColorStop(0,`${nb.cs[0]}${nb.alpha*1.3})`);
        g.addColorStop(0.5,`${nb.cs[1]}${nb.alpha*0.55})`);
        g.addColorStop(1,`${nb.cs[0]}0)`);
        ctx.beginPath(); ctx.arc(nb.x,nb.y,nb.r,0,Math.PI*2);
        ctx.fillStyle=g; ctx.fill();
      }

      /* ── particles ── */
      for (let i=pool.length-1;i>=0;i--) {
        const p=pool[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=p.grav; p.alpha-=p.decay;
        if (p.alpha<=0||p.x<-200||p.x>W+200||p.y>H+220||p.y<-200){pool.splice(i,1);continue;}

        ctx.save();
        ctx.globalAlpha=Math.max(0,Math.min(1,p.alpha));

        if (p.type==="meteor") {
          ctx.shadowColor=p.col; ctx.shadowBlur=12;
          /* gradient tail */
          const tx=p.x-p.vx*(p.tail/6), ty=p.y-p.vy*(p.tail/6);
          const tg=ctx.createLinearGradient(p.x,p.y,tx,ty);
          tg.addColorStop(0,p.col); tg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.strokeStyle=tg; ctx.lineWidth=p.size;
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tx,ty); ctx.stroke();
          /* head */
          ctx.fillStyle="#ffffff"; ctx.shadowBlur=18;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*1.6,0,Math.PI*2); ctx.fill();

        } else if (p.type==="ejecta"||p.type==="jet"||p.type==="wind") {
          ctx.shadowColor=p.col; ctx.shadowBlur=p.type==="jet"?16:8;
          if (p.tail>0) {
            const scale=p.type==="jet"?9:6;
            const tx=p.x-p.vx*(p.tail/scale), ty=p.y-p.vy*(p.tail/scale);
            const tg=ctx.createLinearGradient(p.x,p.y,tx,ty);
            tg.addColorStop(0,p.col); tg.addColorStop(1,"rgba(0,0,0,0)");
            ctx.strokeStyle=tg; ctx.lineWidth=p.size*0.85;
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tx,ty); ctx.stroke();
          }
          /* hot white head */
          ctx.fillStyle=p.type==="jet"?"#aaeeff":"#ffffff"; ctx.shadowBlur=14;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.7,0,Math.PI*2); ctx.fill();

        } else {
          /* debris/wind */
          ctx.fillStyle=p.col;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.55,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }

      /* spawn continuous stellar wind */
      if (frame%3===0) spawnWind(sx,sy);

      /* periodic supernova blast — every ~3.3 s at 60fps */
      if (frame-lastBlast>200){spawnExplosion(sx,sy);lastBlast=frame;}

      /* meteors & debris top-up */
      if (frame%40===0) spawnMeteor();
      if (frame%100===0 && pool.filter(p=>p.type==="debris").length<60) {
        pool.push({x:rnd(0,W),y:rnd(0,H),vx:rnd(-0.2,0.2),vy:rnd(0.05,0.28),
          size:rnd(0.5,2.5),alpha:rnd(0.08,0.28),decay:rnd(0.0002,0.0005),
          col:colCold[Math.floor(Math.random()*colCold.length)],type:"debris",tail:0,grav:0});
      }

      animId=requestAnimationFrame(tick);
    };
    tick();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",onResize); };
  }, []);

  return (
    <div style={{position:"fixed",inset:0,zIndex:2,pointerEvents:"none",overflow:"hidden"}}>

      {/* ── Canvas particle layer ── */}
      <canvas
        ref={canvasRef}
        style={{position:"absolute",inset:0,width:"100%",height:"100%",mixBlendMode:"screen"}}
      />

      {/* ── CSS 3D Rotating Star / Planet ──
            background-position animation simulates sphere spin on a
            wide equirectangular-mapped image — classic CSS sphere trick  */}
      <div
        ref={starRef}
        style={{
          position:"absolute",
          width:120, height:120,
          borderRadius:"50%",
          overflow:"hidden",
          backgroundImage:"url('/hero-space.jpg')",
          backgroundSize:"300% 100%",
          backgroundRepeat:"repeat-x",
          animation:"__starSpin 8s linear infinite",
          filter:"hue-rotate(-18deg) saturate(2.2) contrast(1.35) brightness(1.15)",
          boxShadow:[
            "0 0 0 2px rgba(255,190,90,0.45)",
            "0 0 18px 5px rgba(255,130,45,0.70)",
            "0 0 45px 14px rgba(255,80,20,0.50)",
            "0 0 90px 28px rgba(220,40,10,0.30)",
            "0 0 180px 55px rgba(180,15,5,0.14)",
            "0 0 320px 90px rgba(140,5,2,0.07)",
          ].join(", "),
          willChange:"transform,left,top,width,height",
          transition:"opacity 0.3s ease",
        }}
      />

      {/* ── Keyframe injected once ── */}
      <style>{`
        @keyframes __starSpin {
          from { background-position-x: 0%; }
          to   { background-position-x: 300%; }
        }
      `}</style>
    </div>
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
