import { Bell, Settings, User, Shield, Wifi, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Alert } from "@shared/schema";
import { cn } from "@/lib/utils";

interface CommandBarProps {
  activeMissions: number;
  alerts: Alert[];
  connectionStatus: "connected" | "degraded" | "disconnected";
  onAlertsClick: () => void;
}

export function CommandBar({ activeMissions, alerts, connectionStatus, onAlertsClick }: CommandBarProps) {
  const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged);
  const criticalCount = unacknowledgedAlerts.filter(a => a.severity === "critical").length;

  const connectionConfig = {
    connected: { color: "text-status-online", label: "CONNECTED", bg: "bg-status-online" },
    degraded: { color: "text-status-away", label: "DEGRADED", bg: "bg-status-away" },
    disconnected: { color: "text-status-busy", label: "DISCONNECTED", bg: "bg-status-busy" },
  }[connectionStatus];

  return (
    <header className="h-12 bg-card border-b border-card-border flex items-center justify-between px-4 gap-4" data-testid="command-bar">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm tracking-tight">DroneCommand</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 font-mono">
            AI
          </Badge>
        </div>

        <div className="h-5 w-px bg-border" />

        <div className="flex items-center gap-1.5">
          <div className={cn("h-1.5 w-1.5 rounded-full animate-pulse", connectionConfig.bg)} />
          <span className={cn("text-[10px] font-medium uppercase tracking-wide", connectionConfig.color)}>
            {connectionConfig.label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeMissions > 0 && (
          <Badge variant="secondary" className="gap-1.5" data-testid="badge-active-missions">
            <Activity className="h-3 w-3" />
            {activeMissions} Active Mission{activeMissions > 1 ? "s" : ""}
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          className="relative"
          onClick={onAlertsClick}
          data-testid="button-alerts"
        >
          <Bell className="h-4 w-4" />
          {unacknowledgedAlerts.length > 0 && (
            <span className={cn(
              "absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full text-[10px] font-bold flex items-center justify-center",
              criticalCount > 0 ? "bg-status-busy text-white animate-pulse" : "bg-primary text-primary-foreground"
            )}>
              {unacknowledgedAlerts.length}
            </span>
          )}
        </Button>

        <ThemeToggle />

        <Button variant="ghost" size="icon" data-testid="button-settings">
          <Settings className="h-4 w-4" />
        </Button>

        <div className="h-5 w-px bg-border" />

        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-user">
          <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
            <User className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="text-xs font-medium">Operator</span>
        </Button>
      </div>
    </header>
  );
}
