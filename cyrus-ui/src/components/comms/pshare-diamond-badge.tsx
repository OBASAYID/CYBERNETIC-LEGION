import type { PshareDiamondGrade } from "@shared/comms/pshare-engagement";

const TIER_STYLES: Record<
  PshareDiamondGrade,
  { fill: string; stroke: string; glow?: string; label?: string }
> = {
  0: { fill: "transparent", stroke: "transparent" },
  1: { fill: "#CD7F32", stroke: "#8B5A2B", label: "Bronze" },
  2: { fill: "#C0C0C0", stroke: "#808890", label: "Silver" },
  3: { fill: "#FFD700", stroke: "#B8860B", label: "Gold" },
  4: { fill: "#E70011", stroke: "#B8000E", glow: "rgba(231,0,17,0.55)", label: "Elite" },
  5: {
    fill: "#E8EEF5",
    stroke: "#A8B4C4",
    glow: "rgba(200,220,255,0.75)",
    label: "Platinum",
  },
};

function DiamondIcon({
  fill,
  stroke,
  glow,
  size = 10,
}: {
  fill: string;
  stroke: string;
  glow?: string;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      aria-hidden
      className="shrink-0"
      style={glow ? { filter: `drop-shadow(0 0 4px ${glow})` } : undefined}
    >
      <path
        d="M8 1 L14 6 L8 15 L2 6 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M2 6 H14" stroke={stroke} strokeWidth="0.6" opacity="0.5" />
    </svg>
  );
}

type PshareDiamondBadgeProps = {
  grade: PshareDiamondGrade;
  /** compact = icons only; full = tier label on platinum/elite */
  variant?: "compact" | "full";
  className?: string;
};

export function PshareDiamondBadge({
  grade,
  variant = "compact",
  className = "",
}: PshareDiamondBadgeProps) {
  if (grade <= 0) return null;
  const style = TIER_STYLES[grade];
  const count = grade;
  const showLabel = variant === "full" && style.label && grade >= 4;

  return (
    <span
      className={`inline-flex items-center gap-1 ${className}`}
      title={`${style.label} · ${count} diamond${count > 1 ? "s" : ""}`}
      aria-label={`Grade ${count} ${style.label}`}
    >
      <span className="inline-flex items-center -space-x-0.5">
        {Array.from({ length: count }, (_, i) => (
          <DiamondIcon
            key={i}
            fill={style.fill}
            stroke={style.stroke}
            glow={style.glow}
            size={grade >= 5 ? 11 : 10}
          />
        ))}
      </span>
      {showLabel && (
        <span
          className="text-[8px] font-bold uppercase tracking-wider"
          style={{
            color: grade === 5 ? "#E8EEF5" : "#E70011",
            textShadow: grade === 5 ? "0 0 8px rgba(200,220,255,0.5)" : undefined,
          }}
        >
          {style.label}
        </span>
      )}
    </span>
  );
}
