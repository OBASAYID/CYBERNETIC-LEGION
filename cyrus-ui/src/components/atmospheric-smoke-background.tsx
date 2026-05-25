"use client";

/**
 * CYRUS OMEGA Gaming Background
 * Replaces the blue honeycomb smoke with a gaming-grade red/cyan nebula atmosphere.
 */
export function AtmosphericSmokeBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{ background: "#080810" }}
    >
      {/* Deep base */}
      <div className="absolute inset-0 bg-[#080810]" />

      {/* Dot grid */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(225,29,72,0.4) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      {/* Red nebula — top right */}
      <div
        className="absolute -top-[20%] -right-[10%] h-[70vh] w-[70vh] rounded-full opacity-[0.18]"
        style={{
          background:
            "radial-gradient(ellipse at center, #e11d48 0%, #7c0a24 35%, transparent 70%)",
          filter: "blur(80px)",
          animation: "cyrus-glow-pulse-a 12s ease-in-out infinite",
        }}
      />

      {/* Secondary red — left center */}
      <div
        className="absolute top-[30%] -left-[15%] h-[50vh] w-[50vh] rounded-full opacity-[0.10]"
        style={{
          background:
            "radial-gradient(ellipse at center, #e11d48 0%, #450a16 40%, transparent 72%)",
          filter: "blur(100px)",
          animation: "cyrus-glow-pulse-b 18s ease-in-out infinite",
        }}
      />

      {/* Cyan nebula — bottom left */}
      <div
        className="absolute -bottom-[20%] -left-[10%] h-[60vh] w-[60vh] rounded-full opacity-[0.12]"
        style={{
          background:
            "radial-gradient(ellipse at center, #06b6d4 0%, #0e4a58 40%, transparent 70%)",
          filter: "blur(90px)",
          animation: "cyrus-glow-pulse-c 15s ease-in-out infinite",
        }}
      />

      {/* Purple mid accent */}
      <div
        className="absolute top-[50%] right-[15%] h-[40vh] w-[40vh] rounded-full opacity-[0.08]"
        style={{
          background:
            "radial-gradient(ellipse at center, #7c3aed 0%, #2d1060 40%, transparent 70%)",
          filter: "blur(80px)",
          animation: "cyrus-glow-pulse-a 20s ease-in-out infinite reverse",
        }}
      />

      {/* Vignette frame */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,transparent_40%,rgba(0,0,0,0.85)_100%)]" />

      {/* Top border glow */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(225,29,72,0.6) 40%, rgba(6,182,212,0.4) 60%, transparent)",
        }}
      />

      {/* Bottom border glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(6,182,212,0.3) 40%, rgba(225,29,72,0.3) 60%, transparent)",
        }}
      />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 3px)",
        }}
      />
    </div>
  );
}
