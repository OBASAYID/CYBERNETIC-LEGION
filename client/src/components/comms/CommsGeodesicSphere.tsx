/**
 * Wireframe geodesic “hero” sphere — translucent globe + cyan lattice (reference HUD).
 */

import { useId } from "react";

type Props = { size?: number; className?: string };

export function CommsGeodesicSphere({ size = 260, className = "" }: Props) {
  const uid = useId().replace(/:/g, "");
  const gid = `geo-g-${uid}`;
  const fid = `geo-f-${uid}`;

  const R = 100;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`}
      className={`pointer-events-none text-cyan-200 ${className}`}
      aria-hidden
    >
      <defs>
        <radialGradient id={fid} cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="rgba(0,229,255,0.22)" />
          <stop offset="45%" stopColor="rgba(0,120,180,0.08)" />
          <stop offset="100%" stopColor="rgba(0,20,40,0)" />
        </radialGradient>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(0,245,255,0.95)" />
          <stop offset="50%" stopColor="rgba(0,229,255,0.55)" />
          <stop offset="100%" stopColor="rgba(0,180,220,0.25)" />
        </linearGradient>
        <filter id={`${uid}-bloom`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle cx="0" cy="0" r="88" fill={`url(#${fid})`} opacity="0.9" />
      <g
        fill="none"
        stroke={`url(#${gid})`}
        strokeWidth="0.85"
        filter={`url(#${uid}-bloom)`}
        style={{
          transformBox: "fill-box",
          transformOrigin: "50% 50%",
          animation: "kessSphereDrift 160s linear infinite",
        }}
      >
        <circle cx="0" cy="0" r="92" opacity="1" />
        <circle cx="0" cy="0" r="76" opacity="0.65" strokeDasharray="5 6" />
        <circle cx="0" cy="0" r="52" opacity="0.75" />
        {[0, 36, 72, 108, 144].map((deg) => (
          <ellipse
            key={`e-${deg}`}
            cx="0"
            cy="0"
            rx="92"
            ry="26"
            opacity={0.5 + (deg % 72) / 180}
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
            opacity="0.28"
            strokeWidth="0.5"
            transform={`rotate(${deg}) scale(1,0.3)`}
          />
        ))}
      </g>
    </svg>
  );
}
