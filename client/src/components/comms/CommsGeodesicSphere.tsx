/**
 * Wireframe cage around the operator sphere — geodesic-style (VR reference).
 */

export function CommsGeodesicSphere({
  className = "",
  size = 176,
}: {
  className?: string;
  size?: number;
}) {
  const stroke = "rgba(0, 229, 255, 0.5)";

  return (
    <svg
      className={`pointer-events-none ${className}`}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden
    >
      <g transform="translate(50,50)">
        <circle r="42" stroke={stroke} strokeWidth="0.45" opacity="0.55" />
        <circle r="32" stroke={stroke} strokeWidth="0.28" opacity="0.35" strokeDasharray="1.5 2.5" />
        {/* Latitude stack */}
        {[0.2, 0.35, 0.5, 0.65, 0.8].map((t, i) => (
          <ellipse
            key={`lat-${i}`}
            cx="0"
            cy="0"
            rx={42 * Math.sin(Math.PI * t)}
            ry={42 * Math.sin(Math.PI * t) * 0.32}
            stroke={stroke}
            strokeWidth="0.32"
            opacity={0.25 + i * 0.08}
          />
        ))}
        {/* Meridians */}
        {Array.from({ length: 12 }).map((_, i) => (
          <ellipse
            key={`mer-${i}`}
            cx="0"
            cy="0"
            rx="7"
            ry="42"
            stroke={stroke}
            strokeWidth="0.38"
            opacity="0.42"
            transform={`rotate(${i * 30})`}
          />
        ))}
      </g>
    </svg>
  );
}
