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
   GARGANTUA-CLASS FIRE & EXPLOSION OVERLAY
   Dark orbiting planet with blazing accretion disk + full-screen
   explosion debris: tumbling rock chunks, fire sparks, embers,
   flame clouds, and meteors scattered across the entire dashboard.
══════════════════════════════════════════════════════════════════════ */
const SPHERE_D = 130;

function DeepSpaceParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const starEl  = starRef.current;
    if (!canvas || !starEl) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = window.innerWidth;
    let H = window.innerHeight;

    const rnd = (a: number, b: number) => a + Math.random() * (b - a);
    const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r},${g},${b},${a})`;

    /* ═══ STAR FIELD — subtle, warm-tinted ═══ */
    interface Star { x:number;y:number;r:number;br:number;tw:number;ph:number }
    let stars: Star[] = [];
    const seedStars = () => {
      stars = Array.from({length:500}, () => ({
        x:rnd(0,W), y:rnd(0,H),
        r: Math.random()<0.04 ? rnd(0.9,2.0) : rnd(0.2,0.8),
        br:rnd(0.15,0.7), tw:rnd(0.01,0.05), ph:rnd(0,Math.PI*2),
      }));
    };

    const applySize = () => {
      W = window.innerWidth; H = window.innerHeight;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      seedStars();
    };
    applySize();

    const onResize = applySize;
    window.addEventListener("resize", onResize);

    /* ═══ ORBIT CONFIG ═══ */
    const orb = { angle: Math.PI*0.8, speed: 0.004 };

    /* ═══ PARTICLE POOL ═══ */
    type PT = "rock"|"spark"|"ember"|"flame"|"meteor";
    interface Particle {
      x:number; y:number; vx:number; vy:number;
      size:number; alpha:number; decay:number;
      cr:number; cg:number; cb:number;
      type:PT; tail:number; grav:number;
      rot:number; rotV:number; shapeN:number;
    }
    const pool: Particle[] = [];

    /* ═══ SHOCK WAVES ═══ */
    interface Shock { x:number;y:number;r:number;maxR:number;alpha:number }
    const shocks: Shock[] = [];

    /* ═══ FIRE CLOUDS ═══ */
    interface FireCloud { x:number;y:number;r:number;maxR:number;alpha:number;vx:number;vy:number }
    const fireClouds: FireCloud[] = [];

    /* ─── SPAWNERS ─── */
    const spawnRock = (ox:number, oy:number, ambient=false) => {
      const ang = Math.random()*Math.PI*2;
      const spd = ambient ? rnd(0.4,2.2) : rnd(2,9);
      pool.push({
        x: ambient ? rnd(0,W) : ox,
        y: ambient ? rnd(H*0.2,H*0.85) : oy,
        vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd,
        size: ambient ? rnd(5,16) : rnd(6,20),
        alpha: rnd(0.65,1), decay: rnd(0.003,0.009),
        cr:160+Math.floor(rnd(0,80)), cg:60+Math.floor(rnd(0,50)), cb:10+Math.floor(rnd(0,25)),
        type:"rock", tail:0, grav: ambient?0.07:0.04,
        rot:rnd(0,Math.PI*2), rotV:rnd(-0.09,0.09),
        shapeN: rnd(0,100),
      });
    };

    const spawnSpark = (ox:number, oy:number, ambient=false) => {
      const ang = Math.random()*Math.PI*2;
      const spd = ambient ? rnd(1.5,6) : rnd(4,14);
      const hot = Math.random()>0.4;
      pool.push({
        x: ambient ? rnd(0,W) : ox,
        y: ambient ? rnd(0,H) : oy,
        vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd,
        size: rnd(0.8,3.2),
        alpha: rnd(0.8,1), decay: rnd(0.007,0.022),
        cr:255, cg: hot?220:100, cb: hot?130:10,
        type:"spark", tail:rnd(18,65), grav: ambient?0.025:0.008,
        rot:0, rotV:0, shapeN:0,
      });
    };

    const spawnEmber = () => {
      const side = Math.random();
      pool.push({
        x: side<0.3 ? rnd(-10,W*0.3) : side<0.6 ? rnd(W*0.3,W*0.7) : rnd(W*0.7,W+10),
        y: rnd(-10, H*0.9),
        vx: rnd(-0.7,0.7), vy: rnd(0.2,1.4),
        size: rnd(0.8,3.2),
        alpha: rnd(0.35,0.85), decay: rnd(0.0018,0.006),
        cr:255, cg:Math.floor(rnd(70,210)), cb:0,
        type:"ember", tail:0, grav:0.022,
        rot:0, rotV:0, shapeN:0,
      });
    };

    const spawnFlame = (ox:number, oy:number, ambient=false) => {
      pool.push({
        x: ambient ? rnd(0,W) : ox+rnd(-25,25),
        y: ambient ? rnd(H*0.25,H) : oy+rnd(-15,15),
        vx: rnd(-0.5,0.5), vy: rnd(-1.0,-0.15),
        size: rnd(22,65),
        alpha: rnd(0.10,0.26), decay: rnd(0.003,0.007),
        cr:255, cg:Math.floor(rnd(75,155)), cb:8,
        type:"flame", tail:0, grav:-0.008,
        rot:0, rotV:0, shapeN:0,
      });
    };

    const spawnMeteor = () => {
      const fromLeft = Math.random()>0.5;
      const ang = rnd(0.15,0.58);
      const spd = rnd(7,15);
      pool.push({
        x: fromLeft ? rnd(-60,-5) : rnd(W+5,W+60),
        y: rnd(-30,H*0.65),
        vx: (fromLeft?1:-1)*Math.cos(ang)*spd,
        vy: Math.sin(ang)*spd,
        size: rnd(0.8,2.4),
        alpha: rnd(0.7,1), decay: rnd(0.003,0.009),
        cr:255,cg:200,cb:120,
        type:"meteor", tail:rnd(40,130), grav:0,
        rot:0, rotV:0, shapeN:0,
      });
    };

    const spawnExplosion = (cx:number, cy:number) => {
      /* shock rings */
      shocks.push({x:cx,y:cy,r:8,maxR:480,alpha:0.9});
      shocks.push({x:cx,y:cy,r:22,maxR:320,alpha:0.65});
      /* fire clouds */
      for(let i=0;i<8;i++) fireClouds.push({
        x:cx+rnd(-35,35), y:cy+rnd(-25,25),
        r:25, maxR:160+i*40, alpha:0.55,
        vx:rnd(-0.9,0.9), vy:rnd(-1.2,0.2),
      });
      /* rock blast */
      for(let i=0;i<30;i++) spawnRock(cx,cy);
      /* spark blast */
      for(let i=0;i<60;i++) spawnSpark(cx,cy);
      /* flame blobs */
      for(let i=0;i<14;i++) spawnFlame(cx,cy);
    };

    /* seed ambient fill */
    for(let i=0;i<45;i++) spawnRock(0,0,true);
    for(let i=0;i<100;i++) spawnSpark(0,0,true);
    for(let i=0;i<180;i++) spawnEmber();
    for(let i=0;i<25;i++) spawnFlame(0,0,true);
    for(let i=0;i<8;i++) spawnMeteor();

    /* ─── ACCRETION DISK DRAW ─── */
    const drawDisk = (sx:number, sy:number, zS:number) => {
      const rX = SPHERE_D * zS * 1.55;
      const rY = SPHERE_D * zS * 0.40;

      /* ── BACK HALF (π → 2π, rendered first so sphere CSS sits on top) ── */
      ctx.save();
      for(let L=4;L>=0;L--) {
        const alphas=[0.12,0.18,0.26,0.35,0.44];
        const cols = [[130,35,4],[185,65,8],[230,105,18],[255,160,45],[255,225,145]];
        const c = cols[L];
        ctx.strokeStyle = rgba(c[0],c[1],c[2],alphas[L]);
        ctx.lineWidth   = (2+L*1.1)*zS;
        ctx.shadowColor = rgba(c[0],c[1],c[2],0.7);
        ctx.shadowBlur  = 10*zS;
        ctx.beginPath();
        ctx.ellipse(sx,sy, rX*(1+L*0.025), rY, 0, Math.PI, Math.PI*2);
        ctx.stroke();
      }
      ctx.restore();

      /* sphere rim glow on canvas (complements CSS shadow) */
      const d2 = SPHERE_D*zS;
      const rimG = ctx.createRadialGradient(sx,sy, d2*0.38, sx,sy, d2*1.9);
      rimG.addColorStop(0, rgba(200,75,10, 0.18*zS));
      rimG.addColorStop(0.5, rgba(150,35,4, 0.08*zS));
      rimG.addColorStop(1, "rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(sx,sy, d2*1.9, 0, Math.PI*2);
      ctx.fillStyle=rimG; ctx.fill();

      /* ── FRONT HALF (0 → π, on top of sphere) ── */
      ctx.save();
      for(let L=4;L>=0;L--) {
        const alphas=[0.28,0.44,0.60,0.78,0.96];
        const cols = [[140,38,5],[200,75,10],[245,125,22],[255,185,65],[255,240,165]];
        const c = cols[L];
        ctx.strokeStyle = rgba(c[0],c[1],c[2],alphas[L]);
        ctx.lineWidth   = (2+L*1.1)*zS;
        ctx.shadowColor = rgba(c[0],c[1],c[2],0.95);
        ctx.shadowBlur  = 14*zS;
        ctx.beginPath();
        ctx.ellipse(sx,sy, rX*(1+L*0.025), rY, 0, 0, Math.PI);
        ctx.stroke();
      }
      ctx.restore();

      /* ── HOT BRIGHT SPOT (right ansae — maximum temperature point) ── */
      const hotX = sx + rX*0.87;
      const hotY = sy - rY*0.18;
      const hg = ctx.createRadialGradient(hotX,hotY,0, hotX,hotY, 52*zS);
      hg.addColorStop(0,"rgba(255,255,215,0.98)");
      hg.addColorStop(0.25,"rgba(255,210,90,0.55)");
      hg.addColorStop(0.6,"rgba(255,130,20,0.18)");
      hg.addColorStop(1,"rgba(0,0,0,0)");
      ctx.beginPath(); ctx.arc(hotX,hotY,52*zS,0,Math.PI*2);
      ctx.fillStyle=hg; ctx.fill();

      /* ── DISK FILAMENTS (4 bright streaks along ring) ── */
      ctx.save();
      ctx.shadowBlur=8*zS;
      for(let f=0;f<6;f++) {
        const fa = (f/6)*Math.PI;
        const fx = sx+Math.cos(fa)*rX*0.94;
        const fy = sy+Math.sin(fa)*rY*0.94;
        const fg = ctx.createRadialGradient(fx,fy,0,fx,fy,10*zS);
        fg.addColorStop(0,rgba(255,180+f*8,20,0.75));
        fg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.shadowColor=rgba(255,160,30,0.8);
        ctx.beginPath(); ctx.arc(fx,fy,10*zS,0,Math.PI*2);
        ctx.fillStyle=fg; ctx.fill();
      }
      ctx.restore();
    };

    /* ─── MAIN LOOP ─── */
    let frame=0, lastBlast=-400, animId=0;

    const tick = () => {
      frame++;
      const t = frame*0.016;

      /* dark fade — preserves motion trails */
      ctx.fillStyle = "rgba(2,2,10,0.14)";
      ctx.fillRect(0,0,W,H);

      /* ── star field ── */
      ctx.save();
      stars.forEach(s => {
        const b = s.br*(0.6+0.4*Math.sin(t*s.tw+s.ph));
        ctx.globalAlpha=b; ctx.fillStyle="#fff0e8";
        ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();

      /* ── orbital position ── */
      const cx = W*0.50, cy = H*0.38;
      const rx = W*0.23, ry = H*0.088;
      orb.angle += orb.speed;
      const sx = cx + Math.cos(orb.angle)*rx;
      const sy = cy + Math.sin(orb.angle)*ry;
      const zS  = 0.76 + 0.24*((Math.sin(orb.angle)+1)/2);
      const spD = Math.round(SPHERE_D*zS);

      /* draw disk back-half */
      drawDisk(sx, sy, zS);

      /* move CSS sphere (disk front-half drawn AFTER sphere update) */
      starEl.style.left    = `${Math.round(sx-spD/2)}px`;
      starEl.style.top     = `${Math.round(sy-spD/2)}px`;
      starEl.style.width   = `${spD}px`;
      starEl.style.height  = `${spD}px`;
      starEl.style.opacity = String(0.6+0.4*zS);

      /* ── shock waves ── */
      for(let i=shocks.length-1;i>=0;i--) {
        const sh=shocks[i];
        sh.r += 4+(sh.r/sh.maxR)*8; sh.alpha*=0.980;
        if(sh.r>sh.maxR||sh.alpha<0.01){shocks.splice(i,1);continue;}
        ctx.save();
        ctx.strokeStyle = rgba(255,170,50,sh.alpha*0.8);
        ctx.lineWidth   = Math.max(0.5, 3*(1-sh.r/sh.maxR));
        ctx.shadowColor = rgba(255,130,20,sh.alpha);
        ctx.shadowBlur  = 22;
        ctx.beginPath(); ctx.arc(sh.x,sh.y,sh.r,0,Math.PI*2); ctx.stroke();
        /* white leading edge */
        ctx.strokeStyle = rgba(255,255,255,sh.alpha*0.45);
        ctx.lineWidth   = 1;
        ctx.beginPath(); ctx.arc(sh.x,sh.y,sh.r+2,0,Math.PI*2); ctx.stroke();
        ctx.restore();
      }

      /* ── fire clouds ── */
      for(let i=fireClouds.length-1;i>=0;i--) {
        const fc=fireClouds[i];
        fc.r+=1.4+(fc.r/fc.maxR)*3; fc.alpha*=0.987;
        fc.x+=fc.vx; fc.y+=fc.vy;
        if(fc.r>fc.maxR||fc.alpha<0.006){fireClouds.splice(i,1);continue;}
        const fg=ctx.createRadialGradient(fc.x,fc.y,0,fc.x,fc.y,fc.r);
        fg.addColorStop(0, rgba(255,145,20,fc.alpha*1.3));
        fg.addColorStop(0.5,rgba(200,55,5,fc.alpha*0.55));
        fg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.beginPath(); ctx.arc(fc.x,fc.y,fc.r,0,Math.PI*2);
        ctx.fillStyle=fg; ctx.fill();
      }

      /* ── particles ── */
      for(let i=pool.length-1;i>=0;i--) {
        const p=pool[i];
        p.x+=p.vx; p.y+=p.vy; p.vy+=p.grav; p.rot+=p.rotV; p.alpha-=p.decay;
        if(p.alpha<=0||p.y>H+120||p.x<-250||p.x>W+250||p.y<-120){pool.splice(i,1);continue;}

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1,p.alpha));

        if(p.type==="rock") {
          ctx.shadowColor = rgba(p.cr,p.cg,p.cb,0.9);
          ctx.shadowBlur  = 10;
          ctx.fillStyle   = rgba(p.cr,p.cg,p.cb,1);
          ctx.save();
          ctx.translate(p.x,p.y); ctx.rotate(p.rot);
          ctx.beginPath();
          const sides = 5;
          for(let k=0;k<sides;k++) {
            const a=(k/sides)*Math.PI*2;
            /* shapeN is fixed per-particle → stable polygon each frame */
            const r=p.size*(0.55+0.45*Math.sin(k*2.4+p.shapeN));
            k===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
          }
          ctx.closePath(); ctx.fill();
          /* highlight facet */
          ctx.fillStyle = "rgba(255,210,140,0.22)";
          ctx.beginPath(); ctx.arc(-p.size*0.22,-p.size*0.28,p.size*0.28,0,Math.PI*2); ctx.fill();
          ctx.restore();

        } else if(p.type==="spark") {
          ctx.shadowColor = rgba(p.cr,p.cg,p.cb,1); ctx.shadowBlur=18;
          /* tail */
          if(p.tail>0){
            const tx=p.x-p.vx*(p.tail/8), ty=p.y-p.vy*(p.tail/8);
            const tg=ctx.createLinearGradient(p.x,p.y,tx,ty);
            tg.addColorStop(0,rgba(p.cr,p.cg,p.cb,p.alpha));
            tg.addColorStop(1,"rgba(0,0,0,0)");
            ctx.strokeStyle=tg; ctx.lineWidth=p.size*0.95;
            ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tx,ty); ctx.stroke();
          }
          /* white-hot head */
          ctx.fillStyle="#ffffff"; ctx.shadowBlur=22;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.85,0,Math.PI*2); ctx.fill();

        } else if(p.type==="ember") {
          ctx.shadowColor = rgba(p.cr,p.cg,p.cb,1); ctx.shadowBlur=12;
          ctx.fillStyle   = rgba(p.cr,p.cg,p.cb,1);
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
          /* bright core */
          ctx.fillStyle="rgba(255,255,190,0.65)";
          ctx.beginPath(); ctx.arc(p.x-p.size*0.18,p.y-p.size*0.2,p.size*0.35,0,Math.PI*2); ctx.fill();

        } else if(p.type==="flame") {
          const fg2=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
          fg2.addColorStop(0,rgba(p.cr,p.cg,p.cb,p.alpha*1.25));
          fg2.addColorStop(0.55,rgba(195,48,4,p.alpha*0.48));
          fg2.addColorStop(1,"rgba(0,0,0,0)");
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
          ctx.fillStyle=fg2; ctx.fill();

        } else { /* meteor */
          ctx.shadowColor=rgba(p.cr,p.cg,p.cb,1); ctx.shadowBlur=16;
          const tx=p.x-p.vx*(p.tail/8), ty=p.y-p.vy*(p.tail/8);
          const tg=ctx.createLinearGradient(p.x,p.y,tx,ty);
          tg.addColorStop(0,"rgba(255,255,200,1)");
          tg.addColorStop(0.35,rgba(p.cr,p.cg,p.cb,0.65));
          tg.addColorStop(1,"rgba(0,0,0,0)");
          ctx.strokeStyle=tg; ctx.lineWidth=p.size*1.3;
          ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(tx,ty); ctx.stroke();
          ctx.fillStyle="#fff"; ctx.shadowBlur=24;
          ctx.beginPath(); ctx.arc(p.x,p.y,p.size*1.5,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
      }

      /* ── continuous spawns ── */
      if(frame%2===0)  spawnEmber();
      if(frame%7===0)  spawnSpark(0,0,true);
      if(frame%14===0) spawnFlame(0,0,true);
      if(frame%38===0) spawnMeteor();
      if(frame%55===0 && pool.filter(p=>p.type==="rock").length<55) spawnRock(0,0,true);

      /* periodic explosion */
      if(frame-lastBlast>210){ spawnExplosion(sx,sy); lastBlast=frame; }

      animId=requestAnimationFrame(tick);
    };
    tick();

    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",onResize); };
  }, []);

  return (
    <div style={{position:"fixed",inset:0,zIndex:2,pointerEvents:"none",overflow:"hidden"}}>

      {/* Full-screen particle canvas */}
      <canvas
        ref={canvasRef}
        style={{position:"absolute",inset:0,width:"100%",height:"100%",mixBlendMode:"screen"}}
      />

      {/* Dark black-hole style sphere — pure CSS radial gradient */}
      <div
        ref={starRef}
        style={{
          position:"absolute",
          width:SPHERE_D, height:SPHERE_D,
          borderRadius:"50%",
          background:"radial-gradient(circle at 33% 28%, #1c0600 0%, #0a0100 55%, #000000 100%)",
          boxShadow:[
            "0 0 0 1px rgba(220,90,12,0.55)",
            "0 0 14px 4px rgba(240,110,14,0.75)",
            "0 0 38px 11px rgba(200,65,6,0.55)",
            "0 0 75px 22px rgba(160,32,3,0.32)",
            "0 0 150px 45px rgba(110,14,2,0.16)",
          ].join(", "),
          willChange:"left,top,width,height",
          transition:"opacity 0.25s ease",
        }}
      />
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
