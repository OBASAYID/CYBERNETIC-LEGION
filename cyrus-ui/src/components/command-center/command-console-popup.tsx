import { useState } from "react";
import { Link } from "wouter";
import { Activity, Radio, Share2, Terminal, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ModuleCommandConsole } from "./module-command-console";

const sideIconClass =
  "group relative w-full overflow-hidden rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/50 via-slate-900/72 to-slate-950/82 px-3 py-2.5 text-slate-100 shadow-[0_12px_26px_rgba(0,0,0,0.34)] backdrop-blur-sm transition hover:border-white/22 hover:bg-gradient-to-b hover:from-slate-700/62 hover:via-slate-900/78 hover:to-slate-950/88 touch-manipulation";

export function CommandConsolePopup({
  open,
  onOpenChange,
  pageContext,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageContext: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-h-[min(92vh,calc(44rem*var(--cyrus-ui-width-scale)))] w-full max-w-cyrus-console gap-0 overflow-hidden border-white/12 bg-slate-950/95 p-2 sm:p-3",
          "[&>button:last-of-type]:right-3 [&>button:last-of-type]:top-3 [&>button:last-of-type]:text-white/70 [&>button:last-of-type]:hover:text-white",
        )}
        aria-describedby={undefined}
      >
        <ModuleCommandConsole
          pageContext={pageContext}
          className="max-h-[min(85vh,40rem)] min-h-[20rem] shadow-none"
        />
      </DialogContent>
    </Dialog>
  );
}

/** Fixed side rail: Pshare link, then CYRUS command popup trigger below. */
export function DashboardCommandSideRail({
  pageContext,
  className,
}: {
  pageContext: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside
        className={cn(
          "fixed top-1/2 z-40 w-[15rem] -translate-y-1/2 cyrus-rail-inset-right",
          className,
        )}
        aria-label="Quick launch"
      >
        <div className="relative overflow-hidden rounded-3xl border border-white/14 bg-gradient-to-b from-slate-700/62 via-slate-900/78 to-slate-950/86 p-3.5 shadow-[0_20px_46px_rgba(0,0,0,0.42)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.12]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200/35 to-transparent" />
          <div className="mb-2.5 flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-sky-400/30 bg-sky-500/12">
                <Users className="h-4 w-4 text-sky-300" aria-hidden />
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-[0.28em] text-sky-200/60">Live panel</p>
                <h3 className="text-sm font-semibold text-white/95">Activity</h3>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-200/85">
              <Radio className="h-3 w-3 animate-pulse" />
              2
            </span>
          </div>

          <div className="relative flex flex-col gap-2">
            <Link href="/comms?tab=pshare" title="Open Pshare timeline">
              <button type="button" className={sideIconClass} aria-label="Pshare">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-slate-100 text-slate-900">
                    <Share2 className="h-4 w-4" strokeWidth={1.85} />
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="truncate text-xs font-semibold text-white/95">Pshare</p>
                    <p className="text-[10px] text-slate-200/78">Open live timeline</p>
                    <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-300/55">Reply</p>
                  </div>
                  <Activity className="h-3.5 w-3.5 text-slate-300/65" aria-hidden />
                </div>
              </button>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={sideIconClass}
              aria-label="Open CYRUS command console"
              title="CYRUS command"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-slate-100 text-slate-900">
                  <Terminal className="h-4 w-4" strokeWidth={1.85} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-semibold text-white/95">CYRUS Command</p>
                  <p className="text-[10px] text-slate-200/78">Launch AI console</p>
                  <p className="mt-0.5 text-[9px] font-mono uppercase tracking-wide text-slate-300/55">Standby</p>
                </div>
                <Activity className="h-3.5 w-3.5 text-slate-300/65" aria-hidden />
              </div>
            </button>
          </div>
        </div>
      </aside>
      <CommandConsolePopup open={open} onOpenChange={setOpen} pageContext={pageContext} />
    </>
  );
}
