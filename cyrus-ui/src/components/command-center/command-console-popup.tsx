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
  "flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-slate-950/75 text-white/85 shadow-lg backdrop-blur-md transition hover:border-cyan-400/40 hover:bg-slate-900/90 hover:text-cyan-100 touch-manipulation";

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
          "fixed top-1/2 z-40 flex -translate-y-1/2 flex-col items-center gap-2 cyrus-rail-inset-right py-2",
          className,
        )}
        aria-label="Quick launch"
      >
        <Link href="/comms?tab=pshare" title="Open Pshare timeline">
          <button type="button" className={sideIconClass} aria-label="Pshare">
            <Share2 className="h-5 w-5 text-violet-300" strokeWidth={1.75} />
          </button>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(sideIconClass, "border-orange-400/30 bg-gradient-to-br from-orange-950/80 to-sky-950/70")}
          aria-label="Open CYRUS command console"
          title="CYRUS command"
        >
          <Terminal className="h-5 w-5 text-orange-200" strokeWidth={1.75} />
        </button>
      </aside>
      <CommandConsolePopup open={open} onOpenChange={setOpen} pageContext={pageContext} />
    </>
  );
}
