import { Battery, Wifi, Satellite, Navigation, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Drone, DroneStatus, PilotMode } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DroneCardProps {
  drone: Drone;
  selected: boolean;
  onClick: () => void;
}

const statusConfig: Record<DroneStatus, { label: string; color: string; bgColor: string }> = {
  online: { label: "ONLINE", color: "text-status-online", bgColor: "bg-status-online/10" },
  offline: { label: "OFFLINE", color: "text-status-offline", bgColor: "bg-status-offline/10" },
  mission: { label: "ON MISSION", color: "text-status-online", bgColor: "bg-status-online/10" },
  returning: { label: "RTB", color: "text-status-away", bgColor: "bg-status-away/10" },
  maintenance: { label: "MAINT", color: "text-status-offline", bgColor: "bg-status-offline/10" },
  emergency: { label: "EMERGENCY", color: "text-status-busy", bgColor: "bg-status-busy/10" },
};

const modeLabels: Record<PilotMode, string> = {
  manual: "MAN",
  autonomous: "AUTO",
  "ai-assist": "AI",
};

export function DroneCard({ drone, selected, onClick }: DroneCardProps) {
  const status = statusConfig[drone.status];
  const isEmergency = drone.status === "emergency";
  const lowBattery = drone.batteryLevel < 20;
  const lowSignal = drone.signalStrength < 30;

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer transition-colors hover-elevate",
        selected && "ring-1 ring-primary bg-accent",
        isEmergency && "ring-1 ring-status-busy animate-pulse"
      )}
      onClick={onClick}
      data-testid={`card-drone-${drone.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-sm truncate" data-testid={`text-drone-name-${drone.id}`}>
              {drone.name}
            </h3>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
              {modeLabels[drone.pilotMode]}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono truncate">{drone.model}</p>
        </div>
        <div className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium", status.bgColor, status.color)}>
          <div className={cn("h-1.5 w-1.5 rounded-full", status.color.replace("text-", "bg-"))} />
          {status.label}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1" data-testid={`text-drone-battery-${drone.id}`}>
          <Battery className={cn("h-3 w-3", lowBattery ? "text-status-busy" : "text-muted-foreground")} />
          <span className={cn("font-mono", lowBattery && "text-status-busy")}>{drone.batteryLevel}%</span>
        </div>
        <div className="flex items-center gap-1" data-testid={`text-drone-signal-${drone.id}`}>
          <Wifi className={cn("h-3 w-3", lowSignal ? "text-status-away" : "text-muted-foreground")} />
          <span className={cn("font-mono", lowSignal && "text-status-away")}>{drone.signalStrength}%</span>
        </div>
        <div className="flex items-center gap-1" data-testid={`text-drone-gps-${drone.id}`}>
          <Satellite className={cn("h-3 w-3", drone.gpsLock ? "text-status-online" : "text-status-offline")} />
          <span className="font-mono">{drone.gpsLock ? "LOCK" : "NO"}</span>
        </div>
      </div>

      {(lowBattery || lowSignal || isEmergency) && (
        <div className="flex items-center gap-1 mt-2 text-[10px] text-status-busy">
          <AlertCircle className="h-3 w-3" />
          {isEmergency ? "EMERGENCY PROTOCOL ACTIVE" : lowBattery ? "LOW BATTERY WARNING" : "WEAK SIGNAL"}
        </div>
      )}
    </Card>
  );
}
