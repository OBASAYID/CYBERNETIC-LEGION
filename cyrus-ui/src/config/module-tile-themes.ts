/**
 * Per-tile look for the module workspace: distinct accent families, gate-adjacent palette (cyan / orange / military HUD).
 * Index cycles; href salt keeps the same path stable across reorders of `COMMAND_CENTER_NAV`.
 */
export type ModuleTileTheme = {
  border: string;
  background: string;
  icon: string;
  label: string;
  sub: string;
  glow: string;
  corner: string;
  /** CSS `filter` for the shared folder tile artwork so accents stay on-brand per tile. */
  folderTint: string;
  /** Center color for the top hairline on folder tiles (avoids dynamic Tailwind `via-*`). */
  hairline: string;
};

const THEMES: ModuleTileTheme[] = [
  {
    border: "border-cyan-400/45",
    background: "bg-gradient-to-br from-cyan-500/[0.22] via-slate-900/30 to-cyan-950/20",
    icon: "text-cyan-300",
    label: "text-cyan-50",
    sub: "text-cyan-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(34,211,238,0.45)]",
    corner: "from-cyan-500/25",
    folderTint: "hue-rotate(168deg) saturate(0.82) brightness(1.04) contrast(1.06)",
    hairline: "rgba(34, 211, 238, 0.55)",
  },
  {
    border: "border-orange-400/40",
    background: "bg-gradient-to-br from-orange-500/[0.20] via-slate-900/30 to-amber-950/18",
    icon: "text-orange-300",
    label: "text-amber-50",
    sub: "text-orange-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(251,146,60,0.4)]",
    corner: "from-orange-500/25",
    folderTint: "saturate(1.12) contrast(1.06) brightness(1.02)",
    hairline: "rgba(251, 146, 60, 0.55)",
  },
  {
    border: "border-violet-400/45",
    background: "bg-gradient-to-br from-violet-500/[0.20] via-slate-900/30 to-fuchsia-950/18",
    icon: "text-violet-300",
    label: "text-violet-50",
    sub: "text-violet-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(167,139,250,0.45)]",
    corner: "from-violet-500/25",
    folderTint: "hue-rotate(268deg) saturate(0.88) brightness(1.03) contrast(1.05)",
    hairline: "rgba(167, 139, 250, 0.55)",
  },
  {
    border: "border-emerald-400/40",
    background: "bg-gradient-to-br from-emerald-500/[0.20] via-slate-900/30 to-emerald-950/20",
    icon: "text-emerald-300",
    label: "text-emerald-50",
    sub: "text-emerald-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(52,211,153,0.4)]",
    corner: "from-emerald-500/25",
    folderTint: "hue-rotate(82deg) saturate(0.9) brightness(1.02) contrast(1.05)",
    hairline: "rgba(52, 211, 153, 0.55)",
  },
  {
    border: "border-sky-400/45",
    background: "bg-gradient-to-br from-sky-500/[0.20] via-slate-900/30 to-sky-950/18",
    icon: "text-sky-300",
    label: "text-sky-50",
    sub: "text-sky-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(56,189,248,0.4)]",
    corner: "from-sky-500/25",
    folderTint: "hue-rotate(188deg) saturate(0.85) brightness(1.05) contrast(1.04)",
    hairline: "rgba(56, 189, 248, 0.55)",
  },
  {
    border: "border-rose-400/40",
    background: "bg-gradient-to-br from-rose-500/[0.20] via-slate-900/30 to-rose-950/18",
    icon: "text-rose-300",
    label: "text-rose-50",
    sub: "text-rose-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(251,113,133,0.4)]",
    corner: "from-rose-500/25",
    folderTint: "hue-rotate(310deg) saturate(0.95) brightness(1.03) contrast(1.05)",
    hairline: "rgba(251, 113, 133, 0.55)",
  },
  {
    border: "border-amber-400/45",
    background: "bg-gradient-to-br from-amber-500/[0.20] via-slate-900/30 to-amber-950/20",
    icon: "text-amber-300",
    label: "text-amber-50",
    sub: "text-amber-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(251,191,36,0.45)]",
    corner: "from-amber-500/25",
    folderTint: "hue-rotate(-8deg) saturate(1.15) contrast(1.05) brightness(1.03)",
    hairline: "rgba(251, 191, 36, 0.55)",
  },
  {
    border: "border-fuchsia-400/35",
    background: "bg-gradient-to-br from-fuchsia-500/[0.20] via-slate-900/30 to-fuchsia-950/18",
    icon: "text-fuchsia-300",
    label: "text-fuchsia-50",
    sub: "text-fuchsia-100/80",
    glow: "shadow-[0_0_28px_-8px_rgba(232,121,249,0.4)]",
    corner: "from-fuchsia-500/25",
    folderTint: "hue-rotate(285deg) saturate(0.92) brightness(1.02) contrast(1.05)",
    hairline: "rgba(232, 121, 249, 0.55)",
  },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function getModuleTheme(href: string, index: number): ModuleTileTheme {
  return THEMES[(hashString(href) + index) % THEMES.length];
}
