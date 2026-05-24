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
      className={cn(
        "flex max-w-[min(100%,18rem)] flex-col items-end gap-0.5 text-right leading-tight",
        className,
      )}
    >
      <time
        dateTime={now.toISOString()}
        className="block max-w-full text-xs font-semibold tracking-tight sm:text-sm"
        style={orbitron}
      >
        <span className="bg-gradient-to-r from-white via-white to-[#e11d48]/80 bg-clip-text text-transparent">
          {dateLabel}
        </span>
      </time>
      <span
        className="block text-[11px] font-medium tabular-nums text-[#06b6d4]/90 sm:text-xs md:text-sm"
        style={orbitron}
        aria-label={`Current time ${timeLabel}`}
      >
        {timeLabel}
      </span>
    </div>
  );
}
