import { useState } from "react";
import { Link } from "wouter";
import { Share2, Terminal } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { ModuleCommandConsole } from "./module-command-console";

const sideIconClass =
  "flex h-11 w-11 items-center justify-center rounded-2xl border border-white/16 bg-gradient-to-b from-slate-700/54 via-slate-900/76 to-slate-950/88 text-white/88 shadow-[0_12px_24px_rgba(0,0,0,0.34)] backdrop-blur-md transition hover:border-sky-300/35 hover:bg-slate-900/95 hover:text-sky-100 touch-manipulation";

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
          "fixed top-1/2 z-40 -translate-y-1/2 cyrus-rail-inset-right",
          className,
        )}
        aria-label="Quick launch"
      >
        <div className="relative overflow-hidden rounded-2xl border border-white/14 bg-gradient-to-b from-slate-700/58 via-slate-900/80 to-slate-950/90 px-2 py-2.5 shadow-[0_18px_36px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <div className="pointer-events-none absolute inset-0 cyrus-glyph-matrix opacity-[0.12]" aria-hidden />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" aria-hidden />
          <div className="relative flex flex-col items-center gap-2">
            <Link href="/comms?tab=pshare" title="Open Pshare timeline">
              <button type="button" className={cn(sideIconClass, "border-sky-200/25")} aria-label="Pshare">
                <Share2 className="h-5 w-5 text-sky-200" strokeWidth={1.75} />
              </button>
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className={cn(
                sideIconClass,
                "border-amber-200/30 bg-gradient-to-b from-amber-100/[0.22] via-slate-900/72 to-slate-950/90 text-amber-100 hover:border-amber-100/45",
              )}
              aria-label="Open CYRUS command console"
              title="CYRUS command"
            >
              <Terminal className="h-5 w-5 text-amber-100" strokeWidth={1.75} />
            </button>
          </div>
        </div>
      </aside>
      <CommandConsolePopup open={open} onOpenChange={setOpen} pageContext={pageContext} />
    </>
  );
}
