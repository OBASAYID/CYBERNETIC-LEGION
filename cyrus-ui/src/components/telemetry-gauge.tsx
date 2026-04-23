import { cn } from "@/lib/utils";

interface TelemetryGaugeProps {
  label: string;
  value: number;
  unit: string;
  min?: number;
  max: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  inverse?: boolean;
  className?: string;
}

export function TelemetryGauge({
  label,
  value,
  unit,
  min = 0,
  max,
  warningThreshold,
  criticalThreshold,
  inverse = false,
  className,
}: TelemetryGaugeProps) {
  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));
  
  let status: "nominal" | "warning" | "critical" = "nominal";
  if (inverse) {
    if (criticalThreshold && value >= criticalThreshold) status = "critical";
    else if (warningThreshold && value >= warningThreshold) status = "warning";
  } else {
    if (criticalThreshold && value <= criticalThreshold) status = "critical";
    else if (warningThreshold && value <= warningThreshold) status = "warning";
  }

  const barColor = {
    nominal: "bg-primary",
    warning: "bg-status-away",
    critical: "bg-status-busy",
  }[status];

  const textColor = {
    nominal: "text-foreground",
    warning: "text-status-away",
    critical: "text-status-busy",
  }[status];

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("font-mono text-sm font-semibold", textColor)}>
          {value.toFixed(value % 1 === 0 ? 0 : 1)}
          <span className="text-[10px] text-muted-foreground ml-0.5">{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-300", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

interface CircularGaugeProps {
  value: number;
  max: number;
  label: string;
  unit: string;
  size?: "sm" | "md" | "lg";
  warningThreshold?: number;
  criticalThreshold?: number;
}

export function CircularGauge({
  value,
  max,
  label,
  unit,
  size = "md",
  warningThreshold,
  criticalThreshold,
}: CircularGaugeProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let status: "nominal" | "warning" | "critical" = "nominal";
  if (criticalThreshold && value <= criticalThreshold) status = "critical";
  else if (warningThreshold && value <= warningThreshold) status = "warning";

  const strokeColor = {
    nominal: "stroke-primary",
    warning: "stroke-status-away",
    critical: "stroke-status-busy",
  }[status];

  const textColor = {
    nominal: "text-foreground",
    warning: "text-status-away",
    critical: "text-status-busy",
  }[status];

  const sizeConfig = {
    sm: { container: "h-16 w-16", text: "text-sm", label: "text-[8px]" },
    md: { container: "h-20 w-20", text: "text-lg", label: "text-[10px]" },
    lg: { container: "h-24 w-24", text: "text-xl", label: "text-xs" },
  }[size];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn("relative", sizeConfig.container)}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn("transition-all duration-500", strokeColor)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("font-mono font-bold", sizeConfig.text, textColor)}>
            {value.toFixed(0)}
          </span>
          <span className={cn("text-muted-foreground uppercase", sizeConfig.label)}>
            {unit}
          </span>
        </div>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}
