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
      {/* Gaming dark backdrop with crimson/cyan tones */}
      <div className="pointer-events-none fixed inset-0" style={{ background: "rgba(8,8,16,0.5)" }} aria-hidden />
      <div className="pointer-events-none fixed inset-0" style={{ background: "linear-gradient(180deg, rgba(225,29,72,0.06) 0%, rgba(8,8,16,0.2) 40%, rgba(6,182,212,0.04) 100%)" }} />
      {/* Red glow top-right */}
      <div className="pointer-events-none fixed -top-[10%] -right-[5%] h-[50vh] w-[50vh] rounded-full opacity-[0.12]" style={{ background: "radial-gradient(ellipse at center, #e11d48, transparent 70%)", filter: "blur(80px)" }} />
      {/* Cyan glow bottom-left */}
      <div className="pointer-events-none fixed -bottom-[10%] -left-[5%] h-[40vh] w-[40vh] rounded-full opacity-[0.08]" style={{ background: "radial-gradient(ellipse at center, #06b6d4, transparent 70%)", filter: "blur(80px)" }} />

      {/* Status indicators */}
      <div className="pointer-events-none fixed left-4 top-4 z-20 flex items-center gap-2 sm:left-5 sm:top-5">
        <div className="h-2 w-2 animate-pulse rounded-full bg-[#e11d48] shadow-[0_0_8px_rgba(225,29,72,0.8)]" />
        <span className="text-[10px] font-mono tracking-wider text-[#e11d48]/80">MODULE ACTIVE</span>
      </div>
      <div className="pointer-events-none fixed right-4 top-4 z-20 sm:right-5 sm:top-5">
        <FieldDateTimeHud />
      </div>
    </>
  );
}

/**
 * Gaming-grade full-page module shell. Replaces the old amber/slate aesthetic with
 * CYRUS OMEGA dark crimson + cyan gaming theme.
 */
export function ModuleWorkspacePageShell({
  children,
  mode = "workspace",
  kicker = "Module Access",
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
      <div className="relative min-h-screen min-h-dvh w-full overflow-x-hidden text-white">
        {!hidePageBackdrop ? <ModuleWorkspaceBackdrop /> : null}
        <div className="relative z-10 min-h-0 w-full min-w-0">{children}</div>
      </div>
    );
  }

  if (!title?.trim() || !Icon) {
    return (
      <div className="relative min-h-screen min-h-dvh w-full overflow-x-hidden text-white">
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
    <div className="relative min-h-screen min-h-dvh w-full overflow-x-hidden text-white">
      <ModuleWorkspaceBackdrop />
      <div
        className={cn(
          "relative z-10 mx-auto w-full max-w-cyrus-shell px-4 py-5 text-base sm:px-6 sm:py-6 lg:px-8",
          showCommandBar &&
            (commandConsole === true && commandConsoleMinimized
              ? "pb-24 sm:pb-28"
              : "pb-[28rem] sm:pb-[30rem]"),
          containerClassName,
        )}
      >
        {/* Gaming module frame */}
        <section
          className={cn(
            "relative overflow-hidden rounded-2xl p-px",
            frameClassName,
          )}
          style={{
            background: "linear-gradient(135deg, rgba(225,29,72,0.3), rgba(6,182,212,0.15), rgba(225,29,72,0.1))",
            boxShadow: "0 0 60px rgba(225,29,72,0.08), 0 0 120px rgba(225,29,72,0.04)",
          }}
        >
          {/* Dot grid inside frame */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.5) 1px, transparent 0)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Inner surface */}
          <div
            className="relative rounded-2xl p-4 sm:p-5"
            style={{ background: "rgba(13,13,30,0.92)", backdropFilter: "blur(20px)" }}
          >
            {/* Header */}
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <Link href={backHref}>
                  <button
                    type="button"
                    className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-white/60 transition hover:border-[#e11d48]/40 hover:text-[#e11d48] hover:bg-[#e11d48]/10"
                    aria-label="Back"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                </Link>
                {/* Icon */}
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: "rgba(225,29,72,0.4)",
                    background: "rgba(225,29,72,0.12)",
                    boxShadow: "0 0 20px rgba(225,29,72,0.2)",
                  }}
                >
                  <Icon className="h-5 w-5 text-[#e11d48]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em]" style={{ color: "rgba(225,29,72,0.7)" }}>{kicker}</p>
                  <h1
                    className="mt-0.5 text-xl font-bold tracking-tight text-white sm:text-2xl"
                    style={{ fontFamily: "'Orbitron', system-ui, sans-serif" }}
                  >
                    {title}
                  </h1>
                  {subtitle ? <p className="mt-1 max-w-cyrus-prose text-sm text-white/70">{subtitle}</p> : null}
                  {subtitle ? <p className="mt-1 max-w-2xl text-sm text-white/55">{subtitle}</p> : null}
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
