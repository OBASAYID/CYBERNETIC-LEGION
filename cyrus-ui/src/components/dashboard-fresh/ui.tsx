import {
  CheckCircle2,
  CircleDot,
  Cpu,
  Network,
  ShieldCheck,
  Sparkles,
  XCircle,
} from "lucide-react";
import type { DashboardModuleStatus } from "./types";

export function statusTone(status: DashboardModuleStatus["status"]): string {
  if (status === "operational") return "text-emerald-200 border-emerald-400/30 bg-emerald-500/10";
  if (status === "degraded") return "text-amber-200 border-amber-400/30 bg-amber-500/10";
  return "text-red-200 border-red-400/30 bg-red-500/10";
}

export function StatusIcon({ status }: { status: DashboardModuleStatus["status"] }) {
  if (status === "operational") return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />;
  if (status === "degraded") return <CircleDot className="h-3.5 w-3.5 text-amber-300" />;
  return <XCircle className="h-3.5 w-3.5 text-red-300" />;
}

export const metricIcons = {
  fused: Network,
  ai: ShieldCheck,
  engine: Cpu,
  status: Sparkles,
};

const statAccents: Record<
  "cyan" | "amber" | "violet" | "emerald" | "orange",
  { ring: string; icon: string; sheen: string }
> = {
  cyan: { ring: "border-cyan-500/30", icon: "text-cyan-300", sheen: "from-cyan-500/10" },
  amber: { ring: "border-amber-500/30", icon: "text-amber-300", sheen: "from-amber-500/10" },
  violet: { ring: "border-violet-500/30", icon: "text-violet-300", sheen: "from-violet-500/10" },
  emerald: { ring: "border-emerald-500/30", icon: "text-emerald-300", sheen: "from-emerald-500/10" },
  orange: { ring: "border-orange-500/30", icon: "text-orange-300", sheen: "from-orange-500/10" },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  accent = "cyan",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  helper: string;
  accent?: keyof typeof statAccents;
}) {
  const a = statAccents[accent];
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border ${a.ring} bg-gradient-to-b from-white/[0.11] to-slate-950/55 p-4 shadow-lg shadow-black/20 transition hover:shadow-cyan-500/5`}
    >
      <div
        className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br ${a.sheen} to-transparent opacity-60 blur-2xl transition group-hover:opacity-100`}
      />
      <div className="relative">
        <div className="mb-2 flex items-center gap-2">
          <Icon className={`h-4 w-4 ${a.icon}`} />
          <p className="text-[11px] uppercase tracking-wider text-white/70">{label}</p>
        </div>
        <p className="line-clamp-2 text-xl font-semibold text-white">{value}</p>
        <p className="mt-1 line-clamp-2 text-xs text-white/70">{helper}</p>
      </div>
    </div>
  );
}
