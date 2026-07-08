"use client";

/**
 * CYRUS Diamond Background — deep black with gold/amber bokeh atmosphere.
 * Replaces the red/cyan nebula with the diamond crystal aesthetic from v4 design.
 */
export function AtmosphericSmokeBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{ background: "#080808" }}
    >
      {/* Deep base */}
      <div className="absolute inset-0 bg-[#080808]" />

      {/* Subtle texture layers */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-soft-light"
        style={{ backgroundImage: "url(/tsodilo-rock-art-wall.png)", backgroundSize: "cover", backgroundPosition: "center" }}
      />

      {/* Gold sweep — ceremonial warmth */}
      <div className="absolute inset-0 cyrus-ceremonial-sweep mix-blend-screen" style={{ opacity: 0.45 }} />

      {/* Diamond bokeh — large gold orb top-right */}
      <div
        className="absolute -top-[18%] -right-[8%] h-[65vh] w-[65vh] rounded-full opacity-[0.14]"
        style={{
          background: "radial-gradient(ellipse at center, #D4B254 0%, #8B6914 35%, transparent 70%)",
          filter: "blur(90px)",
          animation: "cyrus-glow-pulse-a 14s ease-in-out infinite",
        }}
      />

      {/* Gold orb — bottom left */}
      <div
        className="absolute -bottom-[15%] -left-[8%] h-[55vh] w-[55vh] rounded-full opacity-[0.10]"
        style={{
          background: "radial-gradient(ellipse at center, #C9A55A 0%, #5C3D09 40%, transparent 72%)",
          filter: "blur(100px)",
          animation: "cyrus-glow-pulse-b 20s ease-in-out infinite",
        }}
      />

      {/* Warm amber mid — center right */}
      <div
        className="absolute top-[40%] right-[10%] h-[45vh] w-[45vh] rounded-full opacity-[0.08]"
        style={{
          background: "radial-gradient(ellipse at center, #F0A500 0%, #3D2200 45%, transparent 70%)",
          filter: "blur(80px)",
          animation: "cyrus-glow-pulse-c 18s ease-in-out infinite",
        }}
      />

      {/* Deep blue accent — top left — diamond refraction */}
      <div
        className="absolute -top-[10%] -left-[12%] h-[40vh] w-[40vh] rounded-full opacity-[0.07]"
        style={{
          background: "radial-gradient(ellipse at center, #4A6FA5 0%, #1A2840 40%, transparent 70%)",
          filter: "blur(80px)",
          animation: "cyrus-glow-pulse-a 22s ease-in-out infinite reverse",
        }}
      />

      {/* Dot grid — fine gold dots */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(201,165,90,0.5) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Vignette frame */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_38%,rgba(0,0,0,0.92)_100%)]" />

      {/* Top border glow — gold */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(201,165,90,0.55) 40%, rgba(212,178,84,0.35) 60%, transparent)",
        }}
      />

      {/* Bottom border glow — gold */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(201,165,90,0.3) 45%, transparent)",
        }}
      />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.06) 2px, rgba(255,255,255,0.06) 3px)",
        }}
      />
    </div>
  );
}
