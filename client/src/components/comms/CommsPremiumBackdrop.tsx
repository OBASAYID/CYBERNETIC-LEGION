/**
 * Vector aurora backdrop — resolution-independent (crisp at 4K/8K), no raster assets.
 */

export function CommsPremiumBackdrop({ darkMode }: { darkMode: boolean }) {
  if (!darkMode) {
    return (
      <div className="comms-premium-backdrop comms-premium-backdrop--light" aria-hidden>
        <div className="comms-premium-backdrop__aurora comms-premium-backdrop__aurora--sky" />
        <div className="comms-premium-backdrop__grid comms-premium-backdrop__grid--light" />
        <svg className="comms-premium-backdrop__rings" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="comms-ring-light" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(14,165,233,0)" />
              <stop offset="50%" stopColor="rgba(14,165,233,0.35)" />
              <stop offset="100%" stopColor="rgba(14,165,233,0)" />
            </linearGradient>
          </defs>
          <ellipse cx="600" cy="180" rx="520" ry="120" fill="none" stroke="url(#comms-ring-light)" strokeWidth="1.5" opacity="0.5" />
          <ellipse cx="600" cy="200" rx="380" ry="80" fill="none" stroke="rgba(56,189,248,0.2)" strokeWidth="1" />
        </svg>
      </div>
    );
  }

  return (
    <div className="comms-premium-backdrop" aria-hidden>
      <div className="comms-premium-backdrop__base" />
      <div className="comms-premium-backdrop__aurora comms-premium-backdrop__aurora--cyan" />
      <div className="comms-premium-backdrop__aurora comms-premium-backdrop__aurora--violet" />
      <div className="comms-premium-backdrop__grid" />
      <svg className="comms-premium-backdrop__rings" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="comms-ring-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="rgba(0,229,255,0)" />
            <stop offset="35%" stopColor="rgba(0,229,255,0.55)" />
            <stop offset="50%" stopColor="rgba(0,229,255,0.85)" />
            <stop offset="65%" stopColor="rgba(0,229,255,0.55)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </linearGradient>
          <radialGradient id="comms-glow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="rgba(0,229,255,0.18)" />
            <stop offset="100%" stopColor="rgba(0,229,255,0)" />
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#comms-glow)" />
        <ellipse cx="600" cy="160" rx="540" ry="130" fill="none" stroke="url(#comms-ring-cyan)" strokeWidth="1.5" />
        <ellipse cx="600" cy="185" rx="400" ry="90" fill="none" stroke="rgba(0,229,255,0.15)" strokeWidth="1" />
        <ellipse cx="600" cy="210" rx="260" ry="55" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="0.75" />
        {[...Array(12)].map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const x1 = 600 + Math.cos(angle) * 180;
          const y1 = 200 + Math.sin(angle) * 45;
          const x2 = 600 + Math.cos(angle) * 520;
          const y2 = 200 + Math.sin(angle) * 130;
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="rgba(0,229,255,0.06)"
              strokeWidth="0.5"
            />
          );
        })}
      </svg>
      <div className="comms-premium-backdrop__noise" />
    </div>
  );
}
