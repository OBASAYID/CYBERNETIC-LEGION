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
   TSODILO HILLS — AFRICAN ROCK ART OVERLAY
   Inspired by the World Heritage petroglyphs of Tsodilo, Botswana.
   San Bushmen hunters, eland, bull, giraffe, handprints & ancient
   glyphs are scattered across the entire dashboard as a warm-ochre
   silhouette print, blending with the dark aerospace aesthetic.
══════════════════════════════════════════════════════════════════════ */

function TsodiloRockArtOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    /* ── Seeded pseudo-random (LCG) for deterministic layout ── */
    let _s = 0xdeadbeef;
    const sr = () => { _s = (_s * 1664525 + 1013904223) & 0x7fffffff; return _s / 0x7fffffff; };

    /* ── Warm earth-tone helpers ── */
    const oc  = (a: number) => `rgba(218, 130, 42, ${a})`;
    const si  = (a: number) => `rgba(180,  78, 18, ${a})`;
    const amb = (a: number) => `rgba(245, 162, 58, ${a})`;

    /* ════════════════════════════════════════════════════
       MOTIF DRAWING FUNCTIONS
       All coordinates are relative, scale = 1 ≈ 80px tall
    ════════════════════════════════════════════════════ */

    /* Running hunter with spear — classic San style */
    const drawHunter = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = si(a);
      ctx.strokeStyle = si(a);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      /* head */
      ctx.beginPath();
      ctx.ellipse(0, -sz * 0.88, sz * 0.085, sz * 0.095, 0.15, 0, Math.PI * 2);
      ctx.fill();
      /* torso */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.065, -sz * 0.78);
      ctx.bezierCurveTo(-sz * 0.09, -sz * 0.62, -sz * 0.05, -sz * 0.50, 0, -sz * 0.44);
      ctx.bezierCurveTo(sz * 0.05, -sz * 0.50, sz * 0.09, -sz * 0.62, sz * 0.065, -sz * 0.78);
      ctx.closePath();
      ctx.fill();
      /* front leg — bent, leaping forward */
      ctx.lineWidth = Math.max(1, sz * 0.065);
      ctx.beginPath();
      ctx.moveTo(sz * 0.025, -sz * 0.44);
      ctx.lineTo(sz * 0.16, -sz * 0.20);
      ctx.lineTo(sz * 0.24, sz * 0.01);
      ctx.stroke();
      /* back leg — extended behind */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.025, -sz * 0.44);
      ctx.lineTo(-sz * 0.14, -sz * 0.26);
      ctx.lineTo(-sz * 0.06, -sz * 0.04);
      ctx.stroke();
      /* front arm — raised holding spear */
      ctx.beginPath();
      ctx.moveTo(sz * 0.06, -sz * 0.72);
      ctx.lineTo(sz * 0.28, -sz * 0.84);
      ctx.stroke();
      /* back arm */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.06, -sz * 0.72);
      ctx.lineTo(-sz * 0.22, -sz * 0.60);
      ctx.stroke();
      /* spear shaft */
      ctx.lineWidth = Math.max(0.8, sz * 0.038);
      ctx.beginPath();
      ctx.moveTo(-sz * 0.38, -sz * 0.52);
      ctx.lineTo(sz * 0.58, -sz * 0.96);
      ctx.stroke();
      /* spearhead */
      ctx.beginPath();
      ctx.moveTo(sz * 0.58, -sz * 0.96);
      ctx.lineTo(sz * 0.48, -sz * 0.88);
      ctx.lineTo(sz * 0.50, -sz * 0.98);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    /* Archer figure with bow drawn */
    const drawArcher = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = oc(a);
      ctx.strokeStyle = oc(a);
      ctx.lineCap = "round";
      /* head */
      ctx.beginPath();
      ctx.arc(0, -sz * 0.85, sz * 0.09, 0, Math.PI * 2);
      ctx.fill();
      /* torso — slightly crouched */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.07, -sz * 0.74);
      ctx.lineTo(-sz * 0.06, -sz * 0.44);
      ctx.lineTo(sz * 0.06, -sz * 0.44);
      ctx.lineTo(sz * 0.07, -sz * 0.74);
      ctx.closePath();
      ctx.fill();
      /* legs — wide stance */
      ctx.lineWidth = Math.max(1, sz * 0.065);
      ctx.beginPath();
      ctx.moveTo(-sz * 0.04, -sz * 0.44);
      ctx.lineTo(-sz * 0.18, -sz * 0.18);
      ctx.lineTo(-sz * 0.22, sz * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 0.04, -sz * 0.44);
      ctx.lineTo(sz * 0.14, -sz * 0.22);
      ctx.lineTo(sz * 0.10, sz * 0.02);
      ctx.stroke();
      /* drawing arm — extended forward */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.06, -sz * 0.68);
      ctx.lineTo(-sz * 0.38, -sz * 0.65);
      ctx.stroke();
      /* pulling arm — bent back */
      ctx.beginPath();
      ctx.moveTo(sz * 0.06, -sz * 0.68);
      ctx.lineTo(sz * 0.28, -sz * 0.60);
      ctx.stroke();
      /* bow — curved arc */
      ctx.lineWidth = Math.max(0.8, sz * 0.040);
      ctx.beginPath();
      ctx.arc(-sz * 0.38, -sz * 0.65, sz * 0.28, -Math.PI * 0.55, Math.PI * 0.55);
      ctx.stroke();
      /* bowstring */
      ctx.lineWidth = Math.max(0.5, sz * 0.020);
      ctx.beginPath();
      ctx.moveTo(-sz * 0.38 + sz * 0.28 * Math.cos(-Math.PI * 0.55), -sz * 0.65 + sz * 0.28 * Math.sin(-Math.PI * 0.55));
      ctx.lineTo(sz * 0.28, -sz * 0.60);
      ctx.lineTo(-sz * 0.38 + sz * 0.28 * Math.cos(Math.PI * 0.55), -sz * 0.65 + sz * 0.28 * Math.sin(Math.PI * 0.55));
      ctx.stroke();
      /* arrow */
      ctx.lineWidth = Math.max(0.5, sz * 0.025);
      ctx.beginPath();
      ctx.moveTo(sz * 0.28, -sz * 0.60);
      ctx.lineTo(-sz * 0.36, -sz * 0.65);
      ctx.stroke();
      ctx.restore();
    };

    /* Dancing ritual figure — arms raised, knees bent (San trance-dance) */
    const drawDancer = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = amb(a);
      ctx.strokeStyle = amb(a);
      ctx.lineCap = "round";
      /* head */
      ctx.beginPath();
      ctx.arc(0, -sz * 0.84, sz * 0.09, 0, Math.PI * 2);
      ctx.fill();
      /* torso */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.06, -sz * 0.74);
      ctx.lineTo(-sz * 0.055, -sz * 0.44);
      ctx.lineTo(sz * 0.055, -sz * 0.44);
      ctx.lineTo(sz * 0.06, -sz * 0.74);
      ctx.closePath();
      ctx.fill();
      /* arms raised up, bent outward */
      ctx.lineWidth = Math.max(1, sz * 0.060);
      ctx.beginPath();
      ctx.moveTo(-sz * 0.06, -sz * 0.68);
      ctx.bezierCurveTo(-sz * 0.28, -sz * 0.65, -sz * 0.40, -sz * 0.52, -sz * 0.32, -sz * 0.36);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 0.06, -sz * 0.68);
      ctx.bezierCurveTo(sz * 0.28, -sz * 0.65, sz * 0.40, -sz * 0.52, sz * 0.32, -sz * 0.36);
      ctx.stroke();
      /* legs — bent knees, leaping */
      ctx.beginPath();
      ctx.moveTo(-sz * 0.04, -sz * 0.44);
      ctx.lineTo(-sz * 0.20, -sz * 0.20);
      ctx.lineTo(-sz * 0.10, sz * 0.03);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 0.04, -sz * 0.44);
      ctx.lineTo(sz * 0.22, -sz * 0.16);
      ctx.lineTo(sz * 0.14, sz * 0.04);
      ctx.stroke();
      ctx.restore();
    };

    /* Eland/antelope — most sacred animal in San rock art */
    const drawEland = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = si(a);
      ctx.strokeStyle = si(a);
      ctx.lineCap = "round";
      /* body — large oval */
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 0.44, sz * 0.22, -0.08, 0, Math.PI * 2);
      ctx.fill();
      /* neck */
      ctx.lineWidth = Math.max(2, sz * 0.12);
      ctx.beginPath();
      ctx.moveTo(sz * 0.26, -sz * 0.17);
      ctx.bezierCurveTo(sz * 0.34, -sz * 0.32, sz * 0.38, -sz * 0.40, sz * 0.36, -sz * 0.48);
      ctx.stroke();
      /* head */
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sz * 0.38, -sz * 0.52, sz * 0.11, sz * 0.08, 0.25, 0, Math.PI * 2);
      ctx.fill();
      /* horns — straight, swept back (eland style) */
      ctx.lineWidth = Math.max(0.8, sz * 0.040);
      ctx.beginPath();
      ctx.moveTo(sz * 0.42, -sz * 0.58);
      ctx.lineTo(sz * 0.30, -sz * 0.80);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 0.36, -sz * 0.58);
      ctx.lineTo(sz * 0.26, -sz * 0.78);
      ctx.stroke();
      /* four legs */
      ctx.lineWidth = Math.max(1, sz * 0.052);
      [sz*0.24, sz*0.12, -sz*0.14, -sz*0.28].forEach(lx => {
        ctx.beginPath();
        ctx.moveTo(lx, sz * 0.20);
        ctx.lineTo(lx + sz * 0.02, sz * 0.50);
        ctx.stroke();
      });
      /* tail */
      ctx.lineWidth = Math.max(0.8, sz * 0.040);
      ctx.beginPath();
      ctx.moveTo(-sz * 0.44, -sz * 0.04);
      ctx.bezierCurveTo(-sz * 0.54, sz * 0.06, -sz * 0.50, sz * 0.18, -sz * 0.42, sz * 0.26);
      ctx.stroke();
      ctx.restore();
    };

    /* Bull / long-horned cattle */
    const drawBull = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = oc(a);
      ctx.strokeStyle = oc(a);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      /* body */
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 0.52, sz * 0.29, 0, 0, Math.PI * 2);
      ctx.fill();
      /* neck and head */
      ctx.beginPath();
      ctx.ellipse(sz * 0.52, -sz * 0.14, sz * 0.17, sz * 0.14, -0.18, 0, Math.PI * 2);
      ctx.fill();
      /* long sweeping horns */
      ctx.lineWidth = Math.max(1.5, sz * 0.072);
      ctx.beginPath();
      ctx.moveTo(sz * 0.58, -sz * 0.26);
      ctx.bezierCurveTo(sz * 0.76, -sz * 0.52, sz * 0.90, -sz * 0.52, sz * 0.78, -sz * 0.32);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 0.45, -sz * 0.26);
      ctx.bezierCurveTo(sz * 0.28, -sz * 0.52, sz * 0.14, -sz * 0.54, sz * 0.28, -sz * 0.34);
      ctx.stroke();
      /* four legs */
      ctx.lineWidth = Math.max(1.5, sz * 0.082);
      [sz*0.28, sz*0.14, -sz*0.18, -sz*0.34].forEach(lx => {
        ctx.beginPath();
        ctx.moveTo(lx, sz * 0.26);
        ctx.lineTo(lx - sz * 0.02, sz * 0.60);
        ctx.stroke();
      });
      /* tail */
      ctx.lineWidth = Math.max(1, sz * 0.050);
      ctx.beginPath();
      ctx.moveTo(-sz * 0.52, -sz * 0.08);
      ctx.bezierCurveTo(-sz * 0.64, sz * 0.08, -sz * 0.60, sz * 0.24, -sz * 0.52, sz * 0.32);
      ctx.stroke();
      ctx.restore();
    };

    /* Giraffe silhouette */
    const drawGiraffe = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = amb(a);
      ctx.strokeStyle = amb(a);
      ctx.lineCap = "round";
      /* body */
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 0.30, sz * 0.22, 0.12, 0, Math.PI * 2);
      ctx.fill();
      /* very long neck */
      ctx.lineWidth = Math.max(2, sz * 0.13);
      ctx.beginPath();
      ctx.moveTo(sz * 0.18, -sz * 0.18);
      ctx.bezierCurveTo(sz * 0.24, -sz * 0.50, sz * 0.16, -sz * 0.78, sz * 0.08, -sz * 0.96);
      ctx.stroke();
      /* small head */
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sz * 0.06, -sz * 1.01, sz * 0.09, sz * 0.06, 0.2, 0, Math.PI * 2);
      ctx.fill();
      /* ossicones */
      ctx.lineWidth = Math.max(0.8, sz * 0.042);
      ctx.beginPath();
      ctx.moveTo(sz * 0.10, -sz * 1.05);
      ctx.lineTo(sz * 0.08, -sz * 1.18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(sz * 0.02, -sz * 1.05);
      ctx.lineTo(sz * 0.00, -sz * 1.16);
      ctx.stroke();
      /* four legs */
      ctx.lineWidth = Math.max(1.5, sz * 0.068);
      [sz*0.18, sz*0.08, -sz*0.10, -sz*0.24].forEach(lx => {
        ctx.beginPath();
        ctx.moveTo(lx, sz * 0.20);
        ctx.lineTo(lx - sz * 0.01, sz * 0.58);
        ctx.stroke();
      });
      ctx.restore();
    };

    /* Handprint — iconic San cave art symbol */
    const drawHandprint = (x: number, y: number, sz: number, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = si(a * 1.1);
      /* palm */
      ctx.beginPath();
      ctx.ellipse(0, sz * 0.10, sz * 0.22, sz * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
      /* thumb */
      ctx.beginPath();
      ctx.ellipse(-sz * 0.26, sz * 0.06, sz * 0.09, sz * 0.16, -0.55, 0, Math.PI * 2);
      ctx.fill();
      /* four fingers */
      const fxs = [-sz * 0.17, -sz * 0.06, sz * 0.06, sz * 0.17];
      const frs = [0.08, 0.085, 0.085, 0.075];
      fxs.forEach((fx, i) => {
        ctx.beginPath();
        ctx.ellipse(fx + (fx / sz) * sz * 0.04, -sz * 0.20, sz * frs[i], sz * 0.175, (fx / sz) * 0.35, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    };

    /* Ancient glyph — 14 types inspired by Tsodilo script & African rock inscriptions */
    const drawGlyph = (x: number, y: number, sz: number, type: number, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = oc(a);
      ctx.fillStyle   = oc(a);
      ctx.lineWidth   = Math.max(0.8, sz * 0.11);
      ctx.lineCap     = "round";
      ctx.lineJoin    = "round";
      const t = ((type % 14) + 14) % 14;
      if (t === 0) { /* arrow right */
        ctx.beginPath(); ctx.moveTo(-sz*.50,0); ctx.lineTo(sz*.50,0);
        ctx.moveTo(sz*.22,-sz*.26); ctx.lineTo(sz*.50,0); ctx.lineTo(sz*.22,sz*.26);
        ctx.stroke();
      } else if (t === 1) { /* upward triangle */
        ctx.beginPath(); ctx.moveTo(0,-sz*.50); ctx.lineTo(sz*.40,sz*.32); ctx.lineTo(-sz*.40,sz*.32); ctx.closePath(); ctx.stroke();
      } else if (t === 2) { /* cross */
        ctx.beginPath(); ctx.moveTo(-sz*.50,0); ctx.lineTo(sz*.50,0); ctx.moveTo(0,-sz*.50); ctx.lineTo(0,sz*.50); ctx.stroke();
      } else if (t === 3) { /* zigzag / lightning */
        ctx.beginPath(); ctx.moveTo(-sz*.50,-sz*.30); ctx.lineTo(0,sz*.30); ctx.lineTo(sz*.50,-sz*.30); ctx.stroke();
      } else if (t === 4) { /* concentric circles */
        ctx.lineWidth = Math.max(0.6, sz * 0.075);
        [0.46, 0.30, 0.14].forEach(r => { ctx.beginPath(); ctx.arc(0,0,sz*r,0,Math.PI*2); ctx.stroke(); });
      } else if (t === 5) { /* chevron pointing up */
        ctx.beginPath(); ctx.moveTo(-sz*.44,-sz*.24); ctx.lineTo(0,sz*.28); ctx.lineTo(sz*.44,-sz*.24); ctx.stroke();
      } else if (t === 6) { /* tally marks */
        [-sz*.32,-sz*.11,sz*.11,sz*.32].forEach(ix => {
          ctx.beginPath(); ctx.moveTo(ix,-sz*.40); ctx.lineTo(ix,sz*.40); ctx.stroke();
        });
      } else if (t === 7) { /* sun / radial symbol */
        ctx.beginPath(); ctx.arc(0,0,sz*.20,0,Math.PI*2); ctx.fill();
        ctx.lineWidth = Math.max(0.6, sz * 0.060);
        for(let i=0;i<8;i++){
          const ang=(i/8)*Math.PI*2;
          ctx.beginPath(); ctx.moveTo(Math.cos(ang)*sz*.28,Math.sin(ang)*sz*.28); ctx.lineTo(Math.cos(ang)*sz*.50,Math.sin(ang)*sz*.50); ctx.stroke();
        }
      } else if (t === 8) { /* diamond */
        ctx.beginPath(); ctx.moveTo(0,-sz*.48); ctx.lineTo(sz*.32,0); ctx.lineTo(0,sz*.48); ctx.lineTo(-sz*.32,0); ctx.closePath(); ctx.stroke();
      } else if (t === 9) { /* angular "A"-like stele glyph */
        ctx.beginPath(); ctx.moveTo(-sz*.34,sz*.38); ctx.lineTo(0,-sz*.44); ctx.lineTo(sz*.34,sz*.38); ctx.moveTo(-sz*.18,sz*.04); ctx.lineTo(sz*.18,sz*.04); ctx.stroke();
      } else if (t === 10) { /* tree/branching symbol */
        ctx.beginPath(); ctx.moveTo(0,sz*.42); ctx.lineTo(0,-sz*.10); ctx.moveTo(-sz*.32,sz*.14); ctx.lineTo(sz*.32,sz*.14); ctx.moveTo(-sz*.22,-sz*.10); ctx.lineTo(sz*.22,-sz*.10); ctx.moveTo(-sz*.10,-sz*.32); ctx.lineTo(sz*.10,-sz*.32); ctx.stroke();
      } else if (t === 11) { /* T-bar (common rock inscription) */
        ctx.beginPath(); ctx.moveTo(-sz*.44,-sz*.36); ctx.lineTo(sz*.44,-sz*.36); ctx.moveTo(0,-sz*.36); ctx.lineTo(0,sz*.44); ctx.stroke();
      } else if (t === 12) { /* arrow up with serifs */
        ctx.beginPath(); ctx.moveTo(0,sz*.50); ctx.lineTo(0,-sz*.44); ctx.moveTo(-sz*.26,-sz*.18); ctx.lineTo(0,-sz*.44); ctx.lineTo(sz*.26,-sz*.18); ctx.stroke();
      } else { /* spiral / coil suggestion */
        ctx.beginPath(); ctx.arc(0,0,sz*.44,0,Math.PI*1.6); ctx.stroke();
        ctx.beginPath(); ctx.arc(0,0,sz*.24,0,Math.PI*1.4); ctx.stroke();
      }
      ctx.restore();
    };

    /* Running antelope / impala */
    const drawAntelope = (x: number, y: number, sz: number, flip: boolean, a: number) => {
      ctx.save();
      ctx.translate(x, y);
      if (flip) ctx.scale(-1, 1);
      ctx.fillStyle = amb(a);
      ctx.strokeStyle = amb(a);
      ctx.lineCap = "round";
      /* body — leaping pose */
      ctx.beginPath();
      ctx.ellipse(0, 0, sz * 0.34, sz * 0.16, 0.25, 0, Math.PI * 2);
      ctx.fill();
      /* head */
      ctx.beginPath();
      ctx.ellipse(sz * 0.34, -sz * 0.16, sz * 0.10, sz * 0.07, 0.3, 0, Math.PI * 2);
      ctx.fill();
      /* curved horns */
      ctx.lineWidth = Math.max(0.8, sz * 0.040);
      ctx.beginPath();
      ctx.moveTo(sz * 0.40, -sz * 0.22);
      ctx.bezierCurveTo(sz * 0.46, -sz * 0.42, sz * 0.38, -sz * 0.52, sz * 0.28, -sz * 0.44);
      ctx.stroke();
      /* extended legs — leaping */
      ctx.lineWidth = Math.max(1, sz * 0.048);
      ctx.beginPath(); ctx.moveTo(sz*0.20,sz*0.14); ctx.lineTo(sz*0.36,sz*0.40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sz*0.10,sz*0.14); ctx.lineTo(sz*0.22,sz*0.40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-sz*0.18,sz*0.12); ctx.lineTo(-sz*0.32,sz*0.38); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-sz*0.26,sz*0.10); ctx.lineTo(-sz*0.42,sz*0.34); ctx.stroke();
      ctx.restore();
    };

    /* ════════════════════════════════════════════════════
       SCENE PLACEMENT — scatter ~80 motifs across viewport
    ════════════════════════════════════════════════════ */
    const drawAll = (W: number, H: number) => {
      ctx.clearRect(0, 0, W, H);

      /* Reset seeder so layout is stable across resizes */
      _s = 0xdeadbeef;

      /* ── Background tint (stone texture feel, very dark) ── */
      const bg = ctx.createRadialGradient(W*0.5, H*0.42, 0, W*0.5, H*0.5, Math.max(W,H)*0.75);
      bg.addColorStop(0, "rgba(28, 14, 4, 0.04)");
      bg.addColorStop(0.6, "rgba(18, 8, 2, 0.06)");
      bg.addColorStop(1, "rgba(8, 4, 1, 0.08)");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* ── Grid-based scatter: 7 cols × 5 rows = 35 zones ── */
      const cols = 7, rows = 5;
      const cw = W / cols, ch = H / rows;

      /* motif schedule per zone — varies by position */
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const bx = col * cw;
          const by = row * ch;
          /* 1–3 motifs per zone */
          const count = 1 + Math.floor(sr() * 2.6);
          for (let k = 0; k < count; k++) {
            const mx = bx + cw * 0.10 + sr() * cw * 0.80;
            const my = by + ch * 0.10 + sr() * ch * 0.80;
            const motif = Math.floor(sr() * 10);   /* 0-9 */
            const sz    = 44 + sr() * 86;           /* 44–130 px */
            const flip  = sr() > 0.5;
            const alpha = 0.10 + sr() * 0.16;      /* 0.10–0.26 */
            const rot   = (sr() - 0.5) * 0.28;

            ctx.save();
            ctx.translate(mx, my);
            ctx.rotate(rot);
            ctx.translate(-mx, -my);

            switch (motif) {
              case 0: drawHunter(mx, my, sz, flip, alpha);    break;
              case 1: drawArcher(mx, my, sz, flip, alpha);    break;
              case 2: drawDancer(mx, my, sz, flip, alpha);    break;
              case 3: drawEland(mx, my, sz, flip, alpha);     break;
              case 4: drawBull(mx, my, sz, flip, alpha);      break;
              case 5: drawGiraffe(mx, my, sz, flip, alpha);   break;
              case 6: drawHandprint(mx, my, sz * 0.7, alpha * 1.2); break;
              case 7: drawGlyph(mx, my, sz * 0.55, Math.floor(sr() * 14), alpha * 1.3); break;
              case 8: drawAntelope(mx, my, sz, flip, alpha);  break;
              default: drawGlyph(mx, my, sz * 0.45, Math.floor(sr() * 14), alpha * 1.1); break;
            }
            ctx.restore();
          }
        }
      }

      /* ── Extra large anchor pieces at screen edges (dramatic) ── */
      const anchors = [
        { x: W*0.08, y: H*0.28, sz: 135, motif: "bull",     flip: false, a: 0.22 },
        { x: W*0.92, y: H*0.55, sz: 120, motif: "eland",    flip: true,  a: 0.20 },
        { x: W*0.50, y: H*0.12, sz: 110, motif: "giraffe",  flip: false, a: 0.17 },
        { x: W*0.22, y: H*0.78, sz: 118, motif: "hunt",     flip: true,  a: 0.21 },
        { x: W*0.78, y: H*0.20, sz: 112, motif: "archer",   flip: false, a: 0.19 },
        { x: W*0.65, y: H*0.88, sz:  98, motif: "antelope", flip: true,  a: 0.18 },
        { x: W*0.35, y: H*0.52, sz:  92, motif: "dancer",   flip: false, a: 0.16 },
        { x: W*0.88, y: H*0.84, sz: 108, motif: "bull",     flip: true,  a: 0.20 },
        { x: W*0.12, y: H*0.65, sz:  95, motif: "hand",     flip: false, a: 0.24 },
      ];
      anchors.forEach(({ x, y, sz, motif, flip, a }) => {
        switch(motif) {
          case "bull":     drawBull(x, y, sz, flip, a);     break;
          case "eland":    drawEland(x, y, sz, flip, a);    break;
          case "giraffe":  drawGiraffe(x, y, sz, flip, a);  break;
          case "hunt":     drawHunter(x, y, sz, flip, a);   break;
          case "archer":   drawArcher(x, y, sz, flip, a);   break;
          case "antelope": drawAntelope(x, y, sz, flip, a); break;
          case "dancer":   drawDancer(x, y, sz, flip, a);   break;
          case "hand":     drawHandprint(x, y, sz * 0.72, a * 1.15); break;
        }
      });

      /* ── Dense glyph band — mimics the Tsodilo stone inscription rows ── */
      const glyphRows = 3;
      for (let gr = 0; gr < glyphRows; gr++) {
        const gy = H * (0.18 + gr * 0.32) + (sr() - 0.5) * H * 0.08;
        const gCount = 8 + Math.floor(sr() * 6);
        for (let gi = 0; gi < gCount; gi++) {
          const gx = W * 0.06 + (W * 0.88 / gCount) * (gi + sr() * 0.5);
          const gsz = 18 + sr() * 26;
          const ga = 0.09 + sr() * 0.13;
          drawGlyph(gx, gy, gsz, Math.floor(sr() * 14), ga);
        }
      }
    };

    /* ── Sizing and resize — draw at 120% to allow drift bleed ── */
    const applySize = () => {
      const W = window.innerWidth  * 1.2;
      const H = window.innerHeight * 1.2;
      canvas.width  = W * devicePixelRatio;
      canvas.height = H * devicePixelRatio;
      canvas.style.width  = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
      drawAll(W, H);
    };
    applySize();
    window.addEventListener("resize", applySize);
    return () => window.removeEventListener("resize", applySize);
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", overflow: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          left: "-10%", top: "-10%",
          width: "120%", height: "120%",
          mixBlendMode: "screen",
          animation: "tsodilo-drift 55s ease-in-out infinite alternate, tsodilo-breathe 14s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes tsodilo-drift {
          0%   { transform: translate(0px, 0px) rotate(0deg); }
          20%  { transform: translate(-18px, -14px) rotate(0.12deg); }
          40%  { transform: translate(-8px, 20px) rotate(-0.08deg); }
          60%  { transform: translate(16px, 10px) rotate(0.10deg); }
          80%  { transform: translate(22px, -16px) rotate(-0.06deg); }
          100% { transform: translate(6px, -20px) rotate(0.05deg); }
        }
        @keyframes tsodilo-breathe {
          0%,100% { opacity: 0.72; }
          50%     { opacity: 1.00; }
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

      {/* ── Tsodilo Hills rock art — fixed full-screen canvas overlay ── */}
      <TsodiloRockArtOverlay />


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
