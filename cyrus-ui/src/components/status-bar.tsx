import { Wifi, Satellite, Battery, AlertTriangle, CheckCircle, Radio } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Drone, Alert } from "@shared/schema";

interface StatusBarProps {
  drones: Drone[];
  alerts: Alert[];
  systemStatus: "operational" | "degraded" | "critical";
}

export function StatusBar({ drones, alerts, systemStatus }: StatusBarProps) {
  const onlineDrones = drones.filter(d => d.status !== "offline" && d.status !== "maintenance");
  const criticalAlerts = alerts.filter(a => a.severity === "critical" && !a.acknowledged);
  const avgBattery = drones.length > 0 
    ? Math.round(drones.reduce((acc, d) => acc + d.batteryLevel, 0) / drones.length)
    : 0;
  const avgSignal = drones.length > 0
    ? Math.round(drones.reduce((acc, d) => acc + d.signalStrength, 0) / drones.length)
    : 0;

  const getSystemStatusColor = () => {
    switch (systemStatus) {
      case "operational": return "bg-status-online";
      case "degraded": return "bg-status-away";
      case "critical": return "bg-status-busy";
    }
  };

  const getSystemStatusIcon = () => {
    switch (systemStatus) {
      case "operational": return <CheckCircle className="h-3.5 w-3.5" />;
      case "degraded": return <AlertTriangle className="h-3.5 w-3.5" />;
      case "critical": return <AlertTriangle className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-card border-b border-card-border" data-testid="status-bar">
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${getSystemStatusColor()} animate-pulse`} />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          {getSystemStatusIcon()}
          System {systemStatus}
        </span>
      </div>

      <div className="h-4 w-px bg-border" />

      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5" data-testid="status-drones-online">
          <Radio className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-foreground">{onlineDrones.length}/{drones.length}</span>
          <span className="text-muted-foreground">DRONES</span>
        </div>

        <div className="flex items-center gap-1.5" data-testid="status-avg-signal">
          <Wifi className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-foreground">{avgSignal}%</span>
          <span className="text-muted-foreground">AVG SIGNAL</span>
        </div>

        <div className="flex items-center gap-1.5" data-testid="status-avg-battery">
          <Battery className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="font-mono text-foreground">{avgBattery}%</span>
          <span className="text-muted-foreground">AVG BATTERY</span>
        </div>

        <div className="flex items-center gap-1.5" data-testid="status-gps">
          <Satellite className="h-3.5 w-3.5 text-status-online" />
          <span className="font-mono text-foreground">{drones.filter(d => d.gpsLock).length}/{drones.length}</span>
          <span className="text-muted-foreground">GPS LOCK</span>
        </div>
      </div>

      <div className="flex-1" />

      {criticalAlerts.length > 0 && (
        <Badge variant="destructive" className="gap-1" data-testid="badge-critical-alerts">
          <AlertTriangle className="h-3 w-3" />
          {criticalAlerts.length} CRITICAL
        </Badge>
      )}

      <div className="text-xs font-mono text-muted-foreground" data-testid="text-timestamp">
        {new Date().toLocaleTimeString("en-US", { hour12: false })} UTC
      </div>
    </div>
  );
}
