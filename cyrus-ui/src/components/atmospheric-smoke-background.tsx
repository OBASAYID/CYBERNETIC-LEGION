import { SMOKE_VORTEX_TEXTURE_URL } from "@/lib/dashboard-backdrop";

/**
 * Full-viewport layered honeycomb + ambient smoke (blue / black / white wisps).
 * Sits behind all UI; pointer-events none. Respects prefers-reduced-motion.
 */
export function AtmosphericSmokeBackground() {
  return (
    <div
      className="cyrus-smoke-bg pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Base void + cool floor */}
      <div className="absolute inset-0 bg-black" />
      {/* Layered honeycomb plates (stacked/offset on top of each other). */}
      <div className="cyrus-smoke-animated cyrus-honeycomb-layer-a absolute inset-[-8%] opacity-[0.66]" />
      <div className="cyrus-smoke-animated cyrus-honeycomb-layer-b absolute inset-[-10%] opacity-[0.4]" />
      <div className="cyrus-smoke-animated cyrus-honeycomb-layer-c absolute inset-[-12%] opacity-[0.28]" />
      {/* Depth + top specular to make cells feel embossed. */}
      <div className="absolute inset-0 bg-[radial-gradient(130%_90%_at_50%_-8%,rgba(255,255,255,0.18),rgba(226,232,240,0.04)_38%,transparent_68%)] mix-blend-soft-light" />
      <div className="absolute inset-0 bg-[radial-gradient(140%_110%_at_50%_108%,rgba(2,6,23,0.95),rgba(2,6,23,0.45)_46%,transparent_80%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-900/34 via-slate-950/20 to-black/88" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/24 via-transparent to-black/72" />

      {/* Aggressive cell-interior glow from beneath surface. */}
      <div className="cyrus-smoke-animated cyrus-smoke-ember absolute inset-x-[-26%] bottom-[-4%] h-[48vh] bg-gradient-to-t from-blue-500/30 via-sky-700/28 to-transparent blur-3xl" />
      <div className="cyrus-smoke-animated cyrus-smoke-ember-soft absolute inset-x-[-8%] bottom-[-3%] h-32 bg-gradient-to-t from-slate-100/16 via-blue-300/18 to-transparent blur-2xl" />
      <div className="cyrus-smoke-animated cyrus-fissure-flicker absolute inset-x-[-12%] bottom-0 h-[18vh] bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,255,255,0.18),rgba(96,165,250,0.24)_36%,rgba(30,58,138,0.2)_56%,transparent_78%)] blur-2xl" />

      {/* Vortex smoke matching the provided reference image style. */}
      <div
        className="cyrus-smoke-animated cyrus-vortex-spin absolute left-1/2 top-1/2 h-[72vh] w-[72vh] max-h-[980px] max-w-[980px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.32] mix-blend-screen"
        style={{ backgroundImage: `url(${SMOKE_VORTEX_TEXTURE_URL})`, filter: "blur(0.5px) contrast(1.08) saturate(0.9)" }}
      />
      <div
        className="cyrus-smoke-animated cyrus-vortex-spin-reverse absolute left-1/2 top-1/2 h-[84vh] w-[84vh] max-h-[1140px] max-w-[1140px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.15] mix-blend-screen"
        style={{ backgroundImage: `url(${SMOKE_VORTEX_TEXTURE_URL})`, filter: "blur(2.5px) brightness(0.9) saturate(0.86)" }}
      />
      <div className="cyrus-smoke-animated cyrus-smoke-drift-a absolute left-1/2 top-1/2 h-[54vh] w-[54vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(254,243,199,0.22)_0%,rgba(251,191,36,0.16)_24%,rgba(180,83,9,0.1)_48%,transparent_72%)] blur-[52px]" />
      <div className="cyrus-smoke-animated cyrus-smoke-drift-b absolute left-1/2 top-1/2 h-[34vh] w-[34vh] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(ellipse_at_50%_50%,rgba(2,6,23,0.62)_0%,rgba(2,6,23,0.28)_38%,transparent_70%)] blur-[26px]" />
      {/* Warm color cast over the vortex to align with module ribbon lighting. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_52%_38%_at_50%_48%,rgba(251,191,36,0.2),rgba(217,119,6,0.12)_38%,transparent_66%)] mix-blend-soft-light" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_66%_44%_at_52%_46%,rgba(255,237,213,0.18),rgba(251,191,36,0.08)_34%,transparent_68%)] mix-blend-screen opacity-75" />

      {/* Blue‑black depth / ink smoke */}
      <div className="cyrus-smoke-animated cyrus-smoke-drift-c absolute left-[2%] bottom-[-14%] h-[74vh] w-[62vw] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_82%,rgba(180,83,9,0.42)_0%,rgba(15,23,42,0.62)_56%,transparent_76%)] opacity-[0.85] mix-blend-screen blur-[80px]" />
      <div className="cyrus-smoke-animated cyrus-smoke-drift-d absolute -left-[14%] bottom-[-2%] h-[54vh] w-[50vw] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.92)_0%,rgba(120,53,15,0.32)_52%,transparent_74%)] blur-[66px]" />

      {/* Fine grain + hard vignette for realistic depth falloff. */}
      <div className="absolute inset-0 opacity-[0.14] mix-blend-overlay bg-[radial-gradient(circle_at_20%_24%,rgba(255,255,255,0.22)_0%,transparent_22%),radial-gradient(circle_at_78%_60%,rgba(255,255,255,0.16)_0%,transparent_20%),radial-gradient(circle_at_48%_88%,rgba(255,255,255,0.15)_0%,transparent_18%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_0%,rgba(0,0,0,0.7)_100%)]" />
    </div>
  );
}
