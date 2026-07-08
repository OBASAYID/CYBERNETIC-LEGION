"use client";
import { ROOSTER_SMOKE_TEXTURE_URL } from "@/lib/dashboard-backdrop";

/**
 * Global interface backdrop using the requested rooster + smoke artwork,
 * layered with subtle grading, vignette, and ceremonial sweeps so content stays legible.
 */
function resolveSafeBackdropUrl(sourceUrl: string): string {
  try {
    const parsed = new URL(sourceUrl);
    const allowedHosts = new Set(["github.com", "user-attachments.githubusercontent.com"]);
    if (parsed.protocol !== "https:" || !allowedHosts.has(parsed.hostname)) {
      return "/images/botswana-dashboard-wildlife.jpg";
    }
    return sourceUrl;
  } catch {
    return "/images/botswana-dashboard-wildlife.jpg";
  }
}

export function AtmosphericSmokeBackground() {
  const backdropUrl = resolveSafeBackdropUrl(ROOSTER_SMOKE_TEXTURE_URL);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
      style={{ backgroundColor: "#04070d" }}
    >
      <div
        className="absolute inset-0 bg-cover bg-right-center"
        style={{
          backgroundImage: `url("${backdropUrl}")`,
          filter: "saturate(0.95) contrast(1.02)",
          transform: "scale(1.015)",
          transformOrigin: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/28" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/62" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_45%,transparent_34%,rgba(0,0,0,0.88)_100%)]" />
      <div className="absolute inset-0 cyrus-ceremonial-sweep mix-blend-screen opacity-35" />
      <div className="absolute inset-0 cyrus-ceremonial-sweep-soft mix-blend-overlay opacity-45" />

      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(245,158,11,0.62) 40%, rgba(255,255,255,0.32) 60%, transparent)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.22) 40%, rgba(245,158,11,0.4) 60%, transparent)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 3px)",
        }}
      />
    </div>
  );
}
