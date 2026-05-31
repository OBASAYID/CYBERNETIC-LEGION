import { Link } from "wouter";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export const MODULE_SIDEBAR_ACTIVATE_PATHS = new Set(["/files", "/scan", "/document-builder"]);

const MODULE_ACTIVATE_COPY: Record<string, { cipher: string; standby: string }> = {
  "/files": {
    cipher: "Document intel · Operator ack",
    standby: "Ingest pipeline · armed",
  },
  "/scan": {
    cipher: "Vision uplink · Operator ack",
    standby: "Optical channel · armed",
  },
  "/document-builder": {
    cipher: "Draft forge · Operator ack",
    standby: "Builder queue · armed",
  },
};

/** Nested under intelligence modules — launches the workspace on click. */
export function ModuleSidebarActivate({
  path,
  label,
  Icon,
  collapsed,
  onNavigate,
}: {
  path: string;
  label: string;
  Icon: LucideIcon;
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const copy = MODULE_ACTIVATE_COPY[path] ?? {
    cipher: "Secure link · Operator ack",
    standby: "Standby // encrypted",
  };

  return (
    <div className={cn("my-1", collapsed ? "mx-2" : "mx-2 ml-4 border-l border-white/10 pl-2.5")}>
      <Link href={path} onClick={onNavigate}>
        <button
          type="button"
          aria-label={`Click to activate ${label}`}
          title={label}
          className={cn(
            "group w-full rounded-xl border border-transparent transition-all duration-200 touch-manipulation",
            "hover:border-cyan-500/25 hover:bg-white/[0.04] focus:outline-none focus-visible:border-cyan-500/35 focus-visible:ring-2 focus-visible:ring-cyan-500/20",
            collapsed ? "flex justify-center px-0 py-2.5" : "flex flex-col items-center gap-2.5 px-2 py-3",
          )}
        >
          <div
            className={cn(
              "relative flex shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/14 via-slate-900/80 to-slate-950/90 shadow-[0_0_16px_rgba(6,182,212,0.12)] transition group-hover:border-cyan-400/40 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]",
              collapsed ? "h-11 w-11" : "h-12 w-12",
            )}
          >
            <Icon className="h-5 w-5 text-cyan-200/90" strokeWidth={1.85} aria-hidden />
          </div>

          {!collapsed && (
            <div className="text-center">
              <p
                className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/85 transition-colors group-hover:text-cyan-100"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Click to activate AI
              </p>
              <p className="mt-1 text-[7px] font-mono uppercase tracking-[0.22em] text-white/32">{copy.cipher}</p>
              <p className="mt-0.5 text-[7px] font-mono uppercase tracking-[0.2em] text-[#e11d48]/40">
                {copy.standby}
              </p>
            </div>
          )}
        </button>
      </Link>
    </div>
  );
}
