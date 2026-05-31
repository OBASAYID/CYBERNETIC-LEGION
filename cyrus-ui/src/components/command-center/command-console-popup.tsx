import { useState } from "react";
import { Link } from "wouter";
import { Activity, Radio, Share2, Users } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CyrusSidebarBrand } from "@/components/cyrus-sidebar-brand";
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

/** CYRUS logo host — lower viewport placement; opens command console on click. */
export function CyrusCommandActivateHost({
  pageContext,
  className,
}: {
  pageContext: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex min-h-[min(52vh,28rem)] flex-col items-center justify-end pb-6 pt-10 sm:min-h-[min(58vh,32rem)] sm:pb-10",
          className,
        )}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Click to activate CYRUS AI command console"
          className="group flex flex-col items-center gap-5 rounded-3xl border border-transparent px-6 py-5 transition hover:border-cyan-500/20 hover:bg-black/20 focus:outline-none focus-visible:border-cyan-500/35 focus-visible:ring-2 focus-visible:ring-cyan-500/25"
        >
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 rounded-3xl blur-2xl transition-opacity group-hover:opacity-100 opacity-70"
              style={{
                background:
                  "radial-gradient(circle, rgba(6,182,212,0.22) 0%, rgba(225,29,72,0.12) 45%, transparent 72%)",
                transform: "scale(1.55)",
              }}
              aria-hidden
            />
            <div className="relative scale-[1.85] transition-transform duration-300 group-hover:scale-[1.95] group-active:scale-[1.78]">
              <CyrusSidebarBrand />
            </div>
          </div>

          <div className="text-center">
            <p
              className="text-[11px] font-black uppercase tracking-[0.38em] text-cyan-200/90 transition-colors group-hover:text-cyan-100"
              style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
            >
              Click to activate AI
            </p>
            <p className="mt-2 text-[9px] font-mono uppercase tracking-[0.32em] text-white/38">
              Secure neural link · Operator ack required
            </p>
            <p className="mt-1 text-[8px] font-mono uppercase tracking-[0.28em] text-[#e11d48]/45">
              Status: standby // channel encrypted
            </p>
          </div>
        </button>
      </div>

      <CommandConsolePopup open={open} onOpenChange={setOpen} pageContext={pageContext} />
    </>
  );
}

/** Fixed side rail: Pshare quick launch (CYRUS Command lives under System Settings). */
export function DashboardCommandSideRail({ className }: { className?: string }) {
  return (
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
        </div>
      </div>
    </aside>
  );
}
