import { DASHBOARD_CRACK_TEXTURE_URL } from "@/lib/dashboard-backdrop";

/**
 * Full-viewport cracked texture + ambient smoke (blue / black / white wisps).
 * Sits behind all UI; pointer-events none. Respects prefers-reduced-motion.
 */
export function AtmosphericSmokeBackground() {
  return (
    <div
      className="cyrus-smoke-bg pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      {/* Base void + cool floor (matches ember below the glass) */}
      <div className="absolute inset-0 bg-black" />
      {/* High-res cracked surface — cover only; smoke/gradients above blend the “fire behind glass” look */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.82] contrast-[1.02]"
        style={{
          backgroundImage: `url(${DASHBOARD_CRACK_TEXTURE_URL})`,
          imageRendering: "auto",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-950/35 via-slate-950/20 to-black/85" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/50 via-transparent to-black opacity-75" />

      {/* Heat bloom along bottom — subtle “fire behind the glass” */}
      <div className="cyrus-smoke-animated cyrus-smoke-ember absolute inset-x-[-20%] bottom-0 h-[42vh] bg-gradient-to-t from-sky-700/35 via-blue-900/25 to-transparent blur-3xl" />
      <div className="cyrus-smoke-animated cyrus-smoke-ember-soft absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-blue-400/20 via-sky-300/10 to-transparent blur-xl" />

      {/* Pale white / silver smoke — rises and shears */}
      <div className="cyrus-smoke-animated cyrus-smoke-drift-a absolute -left-[25%] top-[-15%] h-[95vh] w-[85vw] max-w-[1100px] rounded-[50%] bg-[radial-gradient(ellipse_at_30%_40%,rgba(255,255,255,0.22)_0%,rgba(226,232,240,0.08)_45%,transparent_72%)] blur-[90px]" />
      <div className="cyrus-smoke-animated cyrus-smoke-drift-b absolute -right-[20%] top-[10%] h-[80vh] w-[70vw] max-w-[900px] rounded-[45%] bg-[radial-gradient(ellipse_at_70%_30%,rgba(248,250,252,0.18)_0%,rgba(148,163,184,0.06)_50%,transparent_70%)] blur-[100px]" />

      {/* Blue‑black depth / ink smoke */}
      <div className="cyrus-smoke-animated cyrus-smoke-drift-c absolute left-[5%] bottom-[-10%] h-[70vh] w-[55vw] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_80%,rgba(30,58,138,0.45)_0%,rgba(15,23,42,0.5)_55%,transparent_75%)] opacity-80 mix-blend-screen blur-[85px]" />
      <div className="cyrus-smoke-animated cyrus-smoke-drift-d absolute -left-[10%] bottom-0 h-[50vh] w-[45vw] rounded-[50%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(0,0,0,0.85)_0%,rgba(15,23,42,0.35)_50%,transparent_72%)] blur-[70px]" />

      {/* Soft vignette so smoke reads as behind panels */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_0%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
