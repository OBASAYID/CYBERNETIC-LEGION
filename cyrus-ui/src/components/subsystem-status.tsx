import { Cog, Navigation, Radio, Camera, Satellite } from "lucide-react";
import type { SubsystemStatus as SubsystemStatusType } from "@shared/schema";
import { cn } from "@/lib/utils";

interface SubsystemStatusProps {
  subsystems: {
    propulsion: SubsystemStatusType;
    navigation: SubsystemStatusType;
    sensors: SubsystemStatusType;
    communication: SubsystemStatusType;
    payload: SubsystemStatusType;
  };
}

const subsystemConfig = [
  { key: "propulsion" as const, label: "PROPULSION", icon: Cog },
  { key: "navigation" as const, label: "NAVIGATION", icon: Navigation },
  { key: "sensors" as const, label: "SENSORS", icon: Camera },
  { key: "communication" as const, label: "COMMS", icon: Radio },
  { key: "payload" as const, label: "PAYLOAD", icon: Satellite },
];

const statusColors: Record<SubsystemStatusType, { bg: string; text: string; dot: string }> = {
  nominal: { bg: "bg-status-online/10", text: "text-status-online", dot: "bg-status-online" },
  degraded: { bg: "bg-status-away/10", text: "text-status-away", dot: "bg-status-away" },
  critical: { bg: "bg-status-busy/10", text: "text-status-busy", dot: "bg-status-busy" },
  offline: { bg: "bg-status-offline/10", text: "text-status-offline", dot: "bg-status-offline" },
};

export function SubsystemStatus({ subsystems }: SubsystemStatusProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Subsystem Health
      </label>
      <div className="grid grid-cols-1 gap-1.5" data-testid="subsystem-status">
        {subsystemConfig.map(({ key, label, icon: Icon }) => {
          const status = subsystems[key];
          const colors = statusColors[status];
          return (
            <div
              key={key}
              className={cn("flex items-center justify-between px-2 py-1.5 rounded", colors.bg)}
              data-testid={`subsystem-${key}`}
            >
              <div className="flex items-center gap-2">
                <Icon className={cn("h-3 w-3", colors.text)} />
                <span className="text-[10px] font-medium">{label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full", colors.dot)} />
                <span className={cn("text-[10px] font-mono uppercase", colors.text)}>
                  {status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
