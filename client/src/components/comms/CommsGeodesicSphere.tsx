/**
 * Wireframe geodesic “hero” sphere — reference: Global Service Center hologram cage.
 */

type Props = { size?: number; className?: string };

export function CommsGeodesicSphere({ size = 260, className = "" }: Props) {
  const R = 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
      className={`pointer-events-none text-cyan-300/90 drop-shadow-[0_0_18px_rgba(0,229,255,0.35)] ${className}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="geo-cyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#geo-cyan)" strokeWidth="0.65">
        <circle cx="0" cy="0" r="92" opacity="0.95" />
        <circle cx="0" cy="0" r="72" opacity="0.55" strokeDasharray="4 5" />
        <circle cx="0" cy="0" r="48" opacity="0.65" />
        {[0, 36, 72, 108, 144].map((deg) => (
          <ellipse
            key={`e-${deg}`}
            cx="0"
            cy="0"
            rx="92"
            ry="28"
            opacity={0.45 + (deg % 72) / 200}
            transform={`rotate(${deg})`}
          />
        ))}
        {[15, 45, 75, 105, 135, 165].map((deg) => (
          <ellipse
            key={`m-${deg}`}
            cx="0"
            cy="0"
            rx="92"
            ry="92"
            opacity="0.22"
            strokeWidth="0.45"
            transform={`rotate(${deg}) scale(1,0.32)`}
          />
        ))}
      </g>
    </svg>
  );
}
