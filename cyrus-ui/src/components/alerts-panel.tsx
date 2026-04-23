import { AlertTriangle, Info, XCircle, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Alert, AlertSeverity } from "@shared/schema";
import { cn } from "@/lib/utils";

interface AlertsPanelProps {
  alerts: Alert[];
  onAcknowledge: (alertId: string) => void;
  onDismiss: (alertId: string) => void;
}

const severityConfig: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string; border: string }> = {
  critical: { icon: XCircle, color: "text-status-busy", bg: "bg-status-busy/10", border: "border-status-busy/30" },
  warning: { icon: AlertTriangle, color: "text-status-away", bg: "bg-status-away/10", border: "border-status-away/30" },
  info: { icon: Info, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
};

export function AlertsPanel({ alerts, onAcknowledge, onDismiss }: AlertsPanelProps) {
  const activeAlerts = alerts.filter(a => !a.acknowledged);
  const acknowledgedAlerts = alerts.filter(a => a.acknowledged);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Alerts</h2>
          {activeAlerts.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-status-busy/20 text-status-busy rounded">
              {activeAlerts.length}
            </span>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2" data-testid="alerts-list">
          {activeAlerts.length === 0 && acknowledgedAlerts.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
                <Check className="h-5 w-5 text-status-online" />
              </div>
              <p className="text-sm text-muted-foreground">All systems nominal</p>
              <p className="text-xs text-muted-foreground">No active alerts</p>
            </div>
          )}

          {activeAlerts.map((alert) => {
            const config = severityConfig[alert.severity];
            const Icon = config.icon;
            return (
              <Card
                key={alert.id}
                className={cn(
                  "p-3 border",
                  config.bg,
                  config.border,
                  alert.severity === "critical" && "animate-pulse"
                )}
                data-testid={`alert-${alert.id}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.color)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-xs font-semibold truncate">{alert.title}</h3>
                      <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                        {formatTime(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={() => onAcknowledge(alert.id)}
                        data-testid={`button-ack-${alert.id}`}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        ACK
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[10px] px-2"
                        onClick={() => onDismiss(alert.id)}
                        data-testid={`button-dismiss-${alert.id}`}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}

          {acknowledgedAlerts.length > 0 && (
            <>
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground pt-3">
                Acknowledged ({acknowledgedAlerts.length})
              </div>
              {acknowledgedAlerts.slice(0, 5).map((alert) => {
                const config = severityConfig[alert.severity];
                const Icon = config.icon;
                return (
                  <div
                    key={alert.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 opacity-60"
                    data-testid={`alert-acked-${alert.id}`}
                  >
                    <Icon className={cn("h-3 w-3", config.color)} />
                    <span className="text-[11px] truncate flex-1">{alert.title}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
