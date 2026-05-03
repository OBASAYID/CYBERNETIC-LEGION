import type { ComponentType } from "react";
import { isValidElement, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDateTimeHud } from "./field-datetime-hud";
import type { ModuleHandoffAttachment, ModuleHandoffLargeRef } from "@shared/module-handoff";
import { ModuleCommandConsole, ModuleCommandConsoleDock } from "./module-command-console";

/** Lucide icons — use wide component type to avoid dual node_modules @types/react ref identity issues. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModuleShellIcon = ComponentType<any>;

type LayoutMode = "workspace" | "page";

export type ModuleWorkspacePageShellProps = {
  children: React.ReactNode;
  /** `workspace` = module workspace frame + default header. `page` = shared backdrop + z-index wrap only (maps, comms, full-bleed UIs). */
  mode?: LayoutMode;
  kicker?: string;
  title?: string;
  subtitle?: string;
  icon?: ModuleShellIcon;
  backHref?: string;
  /** Right side of the header row (actions, status, tabs trigger area). */
  headerEnd?: React.ReactNode;
  contentClassName?: string;
  frameClassName?: string;
  containerClassName?: string;
  /**
   * CYRUS command bar under the main workspace, same width, compact height. `true` = default console.
   * `false` to hide. Pass a `ReactNode` to replace the default.
   */
  commandConsole?: boolean | React.ReactNode;
  /** Optional context string for the default command console (merged with page title). */
  commandContext?: string;
  /** Text to prefer for Pipeline (Share) when the bottom console has no chat yet. */
  commandHandoffText?: () => string | undefined;
  commandHandoffSource?: string;
  /** Optional small files to include in pipeline handoff (same limits as session handoff). */
  commandHandoffAttachments?: () => ModuleHandoffAttachment[] | undefined;
  commandHandoffLargeRefs?: () => ModuleHandoffLargeRef[] | undefined;
};

function ModuleWorkspaceBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none fixed inset-0 bg-center bg-cover bg-no-repeat"
        style={{ backgroundImage: 'url("/images/botswana-dashboard-wildlife.jpg")' }}
      />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-black/28 via-black/34 to-black/38" />
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-white/70 to-transparent" />
        <div className="absolute left-1/4 top-1/4 h-[min(100vw,500px)] w-[min(100vw,500px)] rounded-full bg-cyan-400/[0.08] blur-3xl" />
      </div>
      <div className="pointer-events-none fixed left-4 top-4 z-20 flex items-center gap-2 sm:left-5 sm:top-5">
        <div className="h-2 w-2 animate-pulse rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]" />
        <span className="text-[10px] font-mono tracking-wider text-green-500/90">SYSTEM ACTIVE</span>
      </div>
      <div className="pointer-events-none fixed right-4 top-4 z-20 sm:right-5 sm:top-5">
        <FieldDateTimeHud />
      </div>
    </>
  );
}

/**
 * Full-page treatment aligned with the home **Module workspace** block (dot grid, cyan–orange frame, Orbitron title).
 * Use `mode="page"` when the child provides its own full-bleed layout (e.g. maps, comms).
 */
export function ModuleWorkspacePageShell({
  children,
  mode = "workspace",
  kicker = "Field access",
  title,
  subtitle,
  icon: Icon,
  backHref = "/",
  headerEnd,
  contentClassName,
  frameClassName,
  containerClassName,
  commandConsole = true,
  commandContext,
  commandHandoffText,
  commandHandoffSource,
  commandHandoffAttachments,
  commandHandoffLargeRefs,
}: ModuleWorkspacePageShellProps) {
  const [commandConsoleMinimized, setCommandConsoleMinimized] = useState(false);

  if (mode === "page") {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden text-white">
        <ModuleWorkspaceBackdrop />
        <div className="relative z-10 min-h-0 w-full min-w-0">{children}</div>
      </div>
    );
  }

  if (!title?.trim() || !Icon) {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden text-white">
        <ModuleWorkspaceBackdrop />
        <div className="relative z-10 min-h-0 w-full min-w-0 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">{children}</div>
      </div>
    );
  }

  const commandBarNode =
    commandConsole === false
      ? null
      : isValidElement(commandConsole)
        ? commandConsole
        : commandConsole === true && title
          ? (
              <ModuleCommandConsole
                pageContext={commandContext?.trim() || [title, subtitle].filter(Boolean).join(" — ")}
                scope="module"
                onLayoutChange={setCommandConsoleMinimized}
                workspaceHandoffText={commandHandoffText}
                workspaceHandoffSource={commandHandoffSource}
                workspaceHandoffAttachments={commandHandoffAttachments}
                workspaceHandoffLargeRefs={commandHandoffLargeRefs}
              />
            )
          : null;
  const showCommandBar = commandBarNode != null;

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden text-white">
      <ModuleWorkspaceBackdrop />
      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-screen-2xl px-4 py-5 text-base sm:px-6 sm:py-6 lg:px-8",
          showCommandBar &&
            (commandConsole === true && commandConsoleMinimized
              ? "pb-24 sm:pb-28"
              : "pb-[28rem] sm:pb-[30rem]"),
          containerClassName,
        )}
      >
        <section
          className={cn(
            "relative overflow-hidden rounded-3xl bg-black/18 p-1 shadow-[0_0_48px_-22px_rgba(34,211,238,0.14),0_0_50px_-30px_rgba(255,255,255,0.05)] backdrop-blur-[2px]",
            frameClassName,
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.1]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(34, 211, 238, 0.38) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-300/8 via-white/4 to-transparent" />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(253,230,138,0.07),transparent_58%)]"
            aria-hidden
          />
          <div className="relative rounded-[1.4rem] bg-black/20 p-4 backdrop-blur-[1px] sm:p-5">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Link href={backHref}>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-white/12 bg-slate-950/55 p-2.5 text-white/80 transition hover:border-cyan-500/30 hover:text-white"
                    aria-label="Back to command center"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </Link>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.25)]">
                  <Icon className="h-5 w-5 text-cyan-300" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-cyan-200/60">{kicker}</p>
                  <h1
                    className="mt-0.5 bg-gradient-to-r from-cyan-100 via-white to-orange-200/90 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    {title}
                  </h1>
                  {subtitle ? <p className="mt-1 max-w-2xl text-sm text-white/70">{subtitle}</p> : null}
                </div>
              </div>
              {headerEnd ? (
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{headerEnd}</div>
              ) : null}
            </div>
            <div className={cn("min-w-0", contentClassName)}>{children}</div>
          </div>
        </section>
      </div>
      {showCommandBar ? <ModuleCommandConsoleDock>{commandBarNode}</ModuleCommandConsoleDock> : null}
    </div>
  );
}
