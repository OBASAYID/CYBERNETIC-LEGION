import type { ComponentType } from "react";
import { isValidElement, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { FieldDateTimeHud } from "./field-datetime-hud";
import type { ModuleHandoffAttachment, ModuleHandoffLargeRef } from "@shared/module-handoff";
import { ModuleCommandConsole, ModuleCommandConsoleDock } from "./module-command-console";
import { MODULE_RIBBON_LIGHT_URL } from "@/lib/dashboard-backdrop";

/** Lucide icons — use wide component type to avoid dual node_modules @types/react ref identity issues. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ModuleShellIcon = ComponentType<any>;

type LayoutMode = "workspace" | "page";

export type ModuleWorkspacePageShellProps = {
  children: React.ReactNode;
  /** `workspace` = module workspace frame + default header. `page` = shared backdrop + z-index wrap only (maps, comms). */
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
  /** Text to prefer for Pipeline (Share) when the bottom console has no chat yet — e.g. document output. */
  commandHandoffText?: () => string | undefined;
  /** `sourceModule` label stored with that handoff (e.g. `documents-intelligence`). */
  commandHandoffSource?: string;
  /** Optional small files to include in pipeline handoff. */
  commandHandoffAttachments?: () => ModuleHandoffAttachment[] | undefined;
  /** Large pipeline handoff files (IndexedDB refs). */
  commandHandoffLargeRefs?: () => ModuleHandoffLargeRef[] | undefined;
  /** When `mode="page"`, skip the default field backdrop so the child can own the full scene (e.g. comms HUD). */
  hidePageBackdrop?: boolean;
};

function ModuleWorkspaceBackdrop() {
  return (
    <>
      {/* Global crack/smoke comes from App; warm ribbon-style lighting for modules. */}
      <div className="pointer-events-none fixed inset-0 bg-slate-950/28" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-amber-950/24 via-slate-900/24 to-black/28" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_70%_48%_at_50%_-8%,rgba(251,191,36,0.16),rgba(217,119,6,0.06)_42%,transparent_66%)]" />
      <div className="pointer-events-none fixed inset-0">
        <div
          className="cyrus-smoke-animated cyrus-ribbon-float absolute left-1/2 top-[42%] h-[72vh] w-[34vw] min-w-[260px] max-w-[560px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.2] mix-blend-screen"
          style={{ backgroundImage: `url(${MODULE_RIBBON_LIGHT_URL})`, filter: "blur(0.6px) saturate(1.05)" }}
        />
        <div
          className="cyrus-smoke-animated cyrus-ribbon-float-soft absolute left-1/2 top-[44%] h-[88vh] w-[42vw] min-w-[320px] max-w-[700px] -translate-x-1/2 -translate-y-1/2 bg-contain bg-center bg-no-repeat opacity-[0.12] mix-blend-soft-light"
          style={{ backgroundImage: `url(${MODULE_RIBBON_LIGHT_URL})`, filter: "blur(3px) brightness(0.95)" }}
        />
        <div className="absolute top-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-300/50 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-500/45 to-transparent" />
        <div className="absolute left-1/2 top-[6%] h-[min(96vw,560px)] w-[min(90vw,680px)] -translate-x-1/2 rounded-full bg-amber-300/[0.12] blur-3xl" />
        <div className="absolute left-[44%] top-[18%] h-[min(80vw,430px)] w-[min(48vw,260px)] -translate-x-1/2 rounded-[45%] bg-[radial-gradient(ellipse_at_50%_20%,rgba(251,191,36,0.24),rgba(120,53,15,0.08)_54%,transparent_76%)] blur-2xl" />
        <div className="absolute right-[18%] top-[32%] h-[min(72vw,360px)] w-[min(72vw,360px)] rounded-full bg-orange-300/[0.07] blur-3xl" />
        <div className="absolute left-[12%] bottom-[18%] h-[min(62vw,320px)] w-[min(62vw,320px)] rounded-full bg-amber-700/[0.09] blur-3xl" />
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
  hidePageBackdrop = false,
}: ModuleWorkspacePageShellProps) {
  const [commandConsoleMinimized, setCommandConsoleMinimized] = useState(false);

  if (mode === "page") {
    return (
      <div className="relative min-h-screen w-full overflow-x-hidden text-white">
        {!hidePageBackdrop ? <ModuleWorkspaceBackdrop /> : null}
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
            "relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/14 via-slate-950/20 to-amber-950/14 p-1 shadow-[0_0_54px_-24px_rgba(245,158,11,0.24),0_0_58px_-34px_rgba(251,191,36,0.1)] backdrop-blur-[2px]",
            frameClassName,
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(251, 191, 36, 0.34) 1px, transparent 0)",
              backgroundSize: "24px 24px",
            }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-300/8 via-white/[0.03] to-orange-500/8" />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_55%_at_50%_0%,rgba(251,191,36,0.1),rgba(120,53,15,0.03)_44%,transparent_60%)]"
            aria-hidden
          />
          <div className="relative rounded-[1.4rem] bg-gradient-to-b from-amber-950/10 via-slate-950/18 to-amber-950/8 p-4 backdrop-blur-[1px] sm:p-5">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Link href={backHref}>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-white/12 bg-slate-950/55 p-2.5 text-white/80 transition hover:border-amber-400/35 hover:text-white"
                    aria-label="Back to command center"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </Link>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-amber-500/35 bg-amber-500/12 shadow-[0_0_20px_rgba(251,191,36,0.25)]">
                  <Icon className="h-5 w-5 text-amber-200" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-amber-200/65">{kicker}</p>
                  <h1
                    className="mt-0.5 bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-200/90 bg-clip-text text-xl font-bold tracking-tight text-transparent sm:text-2xl"
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
