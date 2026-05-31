import { Link } from "wouter";
import { AlertTriangle, ChevronLeft, ShieldCheck, Terminal } from "lucide-react";
import { ModuleCommandConsole } from "@/components/command-center/module-command-console";
import { useUserRole } from "@/hooks/use-user-role";

export default function SettingsCommandPage() {
  const role = useUserRole();
  const isAdmin = role === "admin";

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-white">
      <div className="pointer-events-none fixed inset-0 bg-slate-950/40" aria-hidden />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-slate-900/30 via-transparent to-black/30" />

      <div className="relative z-10 mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-white/45 transition-colors hover:text-cyan-300/90"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          System Settings
        </Link>

        <div className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 shadow-inner">
              <Terminal className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h1
                className="text-2xl font-black tracking-wider text-white"
                style={{ fontFamily: "'Orbitron', system-ui" }}
              >
                CYRUS COMMAND
              </h1>
              <p className="text-xs font-mono uppercase tracking-widest text-white/40">
                System Settings · AI console
              </p>
            </div>
          </div>
          <div className="mt-4 h-px w-full bg-gradient-to-r from-cyan-500/30 via-transparent to-transparent" />
        </div>

        {!isAdmin ? (
          <div
            className="rounded-xl p-6 text-center text-sm"
            style={{ background: "rgba(225,29,72,0.08)", border: "1px solid rgba(225,29,72,0.2)" }}
          >
            <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#e11d48]/70" />
            <p className="font-semibold tracking-wide text-white/80">Admin access required</p>
            <p className="mt-1 text-xs text-white/35">Log in with the admin code to use the CYRUS command console.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-cyan-400/80" />
              <p className="text-xs text-white/55">
                Operator AI console for system guidance, pipeline handoff, and module routing.
              </p>
            </div>
            <ModuleCommandConsole
              pageContext="System Settings — CYRUS Command"
              className="min-h-[32rem] shadow-[0_20px_46px_rgba(0,0,0,0.42)]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
