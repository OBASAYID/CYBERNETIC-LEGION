import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const orbitron = { fontFamily: "'Orbitron', system-ui, sans-serif" } as const;

type FieldDateTimeHudProps = {
  className?: string;
};

/**
 * Live date + time for the field HUD (dashboard + module workspace), Orbitron to match console titles.
 */
export function FieldDateTimeHud({ className }: FieldDateTimeHudProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={cn("pointer-events-none flex flex-col items-end gap-0.5 text-right leading-tight", className)}
    >
      <time dateTime={now.toISOString()} className="block text-sm font-semibold tracking-tight sm:text-base" style={orbitron}>
        <span className="bg-gradient-to-r from-cyan-100 via-white to-orange-200/95 bg-clip-text text-transparent">
          {dateLabel}
        </span>
      </time>
      <span
        className="block text-xs font-medium tabular-nums text-cyan-200/90 sm:text-sm"
        style={orbitron}
        aria-label={`Current time ${timeLabel}`}
      >
        {timeLabel}
      </span>
    </div>
  );
}
