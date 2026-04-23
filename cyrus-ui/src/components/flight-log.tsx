import { Terminal, ChevronDown, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { FlightLog } from "@shared/schema";
import { cn } from "@/lib/utils";

interface FlightLogPanelProps {
  logs: FlightLog[];
  expanded: boolean;
  onToggle: () => void;
}

const severityColors: Record<FlightLog["severity"], string> = {
  debug: "text-muted-foreground",
  info: "text-foreground",
  warning: "text-status-away",
  error: "text-status-busy",
};

export function FlightLogPanel({ logs, expanded, onToggle }: FlightLogPanelProps) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit",
      fractionalSecondDigits: 3,
    });
  };

  return (
    <div 
      className={cn(
        "bg-card border-t border-border transition-all duration-300",
        expanded ? "h-48" : "h-10"
      )}
      data-testid="flight-log-panel"
    >
      <div 
        className="flex items-center justify-between px-4 h-10 cursor-pointer hover-elevate"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Flight Log</span>
          {logs.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              ({logs.length} events)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-6 w-6" data-testid="button-filter-logs">
            <Filter className="h-3 w-3" />
          </Button>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )} />
        </div>
      </div>

      {expanded && (
        <ScrollArea className="h-[calc(100%-2.5rem)]">
          <div className="px-4 pb-2 font-mono text-[11px]" data-testid="log-entries">
            {logs.length === 0 ? (
              <div className="text-muted-foreground py-4 text-center">
                No flight log entries
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="flex gap-2 py-0.5 hover:bg-muted/50 rounded px-1 -mx-1">
                  <span className="text-muted-foreground shrink-0">
                    {formatTime(log.timestamp)}
                  </span>
                  <span className={cn(
                    "shrink-0 uppercase w-12",
                    severityColors[log.severity]
                  )}>
                    [{log.severity.slice(0, 4)}]
                  </span>
                  <span className="text-foreground">{log.event}</span>
                  {log.details && (
                    <span className="text-muted-foreground">- {log.details}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
