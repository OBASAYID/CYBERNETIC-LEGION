import { useState } from "react";
import { Link } from "wouter";
import { Activity, Radio, Share2, Users, X } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Dialog, DialogClose, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { CyrusSidebarBrand } from "@/components/cyrus-sidebar-brand";
import { cn } from "@/lib/utils";
import { ModuleCommandConsole } from "./module-command-console";

const sideIconClass =
  "group relative w-full overflow-hidden rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/50 via-slate-900/72 to-slate-950/82 px-3 py-2.5 text-slate-100 shadow-[0_12px_26px_rgba(0,0,0,0.34)] backdrop-blur-sm transition hover:border-white/22 hover:bg-gradient-to-b hover:from-slate-700/62 hover:via-slate-900/78 hover:to-slate-950/88 touch-manipulation";

/** Same width/centering as the dashboard + module workspace command console dock. */
const COMMAND_CONSOLE_SHELL =
  "relative z-20 mx-auto w-full max-w-cyrus-console cyrus-safe-x px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 sm:px-6 sm:pb-1.5 sm:pt-1.5 lg:px-8";

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
      <DialogPortal>
        <DialogOverlay className="z-[110] bg-black/55 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 top-auto z-[120] mx-auto w-full max-w-none translate-x-0 translate-y-0",
            "border-0 bg-transparent p-0 shadow-none outline-none",
            "duration-300 data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
          )}
          aria-describedby={undefined}
        >
          <div className={COMMAND_CONSOLE_SHELL}>
            <DialogClose
              className="absolute right-5 top-3 z-40 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-black/70 text-white/70 backdrop-blur transition hover:border-white/25 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/30 sm:right-6 lg:right-8"
              aria-label="Close command console"
            >
              <X className="h-4 w-4" />
            </DialogClose>
            <ModuleCommandConsole
              pageContext={pageContext}
              className="max-h-[min(88vh,42rem)] min-h-[24rem] shadow-none sm:min-h-[26rem]"
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

/** Nested under System Settings in the module sidebar — logo tap opens command console. */
export function CyrusCommandSidebarActivate({
  collapsed,
  className,
  pageContext = "System Settings — CYRUS Command",
}: {
  collapsed?: boolean;
  className?: string;
  pageContext?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className={cn("my-1", collapsed ? "mx-2" : "mx-2 ml-4 border-l border-white/10 pl-2.5", className)}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Click to activate CYRUS AI command console"
          title="CYRUS Command"
          className={cn(
            "group w-full rounded-xl border border-transparent transition-all duration-200 touch-manipulation",
            "hover:border-cyan-500/25 hover:bg-white/[0.04] focus:outline-none focus-visible:border-cyan-500/35 focus-visible:ring-2 focus-visible:ring-cyan-500/20",
            collapsed ? "flex justify-center px-0 py-2.5" : "flex flex-col items-center gap-2.5 px-2 py-3",
          )}
        >
          <div className={cn("relative shrink-0", collapsed ? "scale-100" : "scale-110")}>
            <CyrusSidebarBrand collapsed />
          </div>

          {!collapsed && (
            <div className="text-center">
              <p
                className="text-[9px] font-black uppercase tracking-[0.28em] text-cyan-200/85 transition-colors group-hover:text-cyan-100"
                style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
              >
                Click to activate AI
              </p>
              <p className="mt-1 text-[7px] font-mono uppercase tracking-[0.22em] text-white/32">
                Secure link · Operator ack
              </p>
              <p className="mt-0.5 text-[7px] font-mono uppercase tracking-[0.2em] text-[#e11d48]/40">
                Standby // encrypted
              </p>
            </div>
          )}
        </button>
      </div>

      <CommandConsolePopup open={open} onOpenChange={setOpen} pageContext={pageContext} />
    </>
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
