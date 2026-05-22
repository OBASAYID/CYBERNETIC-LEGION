import type { ReactNode } from "react";

/**
 * Shared glass well inside the NEXUS carousel so every module reads as one fused HUD
 * (top hairline “beam” ties the sector strip to the active layer).
 */
export function NexusModuleSurface({
  children,
  variant = "inset",
  className = "",
}: {
  children: ReactNode;
  /** flush: no outer chrome (e.g. chat already has multi-column glass). */
  variant?: "inset" | "flush";
  className?: string;
}) {
  const beam = (
    <div
      className="pointer-events-none absolute inset-x-[10%] top-0 z-10 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      aria-hidden
    />
  );

  if (variant === "flush") {
    return (
      <div className={`relative flex h-full min-h-0 flex-col ${className}`}>
        {beam}
        {children}
      </div>
    );
  }

  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-cyan-500/18 bg-black/18 shadow-[inset_0_0_56px_-14px_rgba(0,229,255,0.06)] backdrop-blur-[12px] sm:rounded-2xl ${className}`}
    >
      {beam}
      <div className="relative min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
