import { useState } from "react";
import { Play, Pause, RotateCcw, Home, AlertTriangle, Target, Clock, Route, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { Mission, Drone, MissionStatus } from "@shared/schema";
import { cn } from "@/lib/utils";

interface MissionControlProps {
  mission: Mission | null;
  drone: Drone | null;
  onStartMission: () => void;
  onPauseMission: () => void;
  onAbortMission: () => void;
  onReturnToBase: () => void;
}

const statusConfig: Record<MissionStatus, { label: string; color: string; bgColor: string }> = {
  planning: { label: "PLANNING", color: "text-muted-foreground", bgColor: "bg-muted" },
  active: { label: "ACTIVE", color: "text-status-online", bgColor: "bg-status-online/10" },
  completed: { label: "COMPLETED", color: "text-primary", bgColor: "bg-primary/10" },
  aborted: { label: "ABORTED", color: "text-status-busy", bgColor: "bg-status-busy/10" },
};

export function MissionControl({
  mission,
  drone,
  onStartMission,
  onPauseMission,
  onAbortMission,
  onReturnToBase,
}: MissionControlProps) {
  const [isPaused, setIsPaused] = useState(false);

  const handlePauseToggle = () => {
    setIsPaused(!isPaused);
    onPauseMission();
  };

  if (!drone) {
    return (
      <Card className="p-4" data-testid="mission-control-empty">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Target className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
          <h3 className="text-sm font-medium mb-1">No Drone Selected</h3>
          <p className="text-xs text-muted-foreground">Select a drone to view mission controls</p>
        </div>
      </Card>
    );
  }

  const missionProgress = mission?.status === "active" ? 65 : 0;
  const elapsedTime = mission?.startTime ? 
    Math.floor((Date.now() - new Date(mission.startTime).getTime()) / 1000) : 0;
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card className="p-4" data-testid="mission-control">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold">Mission Control</h3>
          <p className="text-xs text-muted-foreground font-mono">{drone.name}</p>
        </div>
        {mission && (
          <Badge variant="outline" className={cn("gap-1", statusConfig[mission.status].bgColor, statusConfig[mission.status].color)}>
            <div className={cn("h-1.5 w-1.5 rounded-full", mission.status === "active" && "animate-pulse", statusConfig[mission.status].color.replace("text-", "bg-"))} />
            {statusConfig[mission.status].label}
          </Badge>
        )}
      </div>

      {mission ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Mission: {mission.name}</span>
              <span className="font-mono">{missionProgress}%</span>
            </div>
            <Progress value={missionProgress} className="h-1.5" />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Elapsed</span>
                <span className="font-mono font-medium">{formatTime(elapsedTime)}</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Route className="h-3 w-3 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Distance</span>
                <span className="font-mono font-medium">{mission.distance.toFixed(1)} km</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-muted-foreground" />
              <div>
                <span className="text-muted-foreground block text-[10px]">Waypoints</span>
                <span className="font-mono font-medium">{mission.waypoints.length}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {mission.status === "planning" && (
              <Button className="flex-1 gap-1.5" onClick={onStartMission} data-testid="button-start-mission">
                <Play className="h-3.5 w-3.5" />
                Start Mission
              </Button>
            )}
            {mission.status === "active" && (
              <>
                <Button
                  variant={isPaused ? "default" : "secondary"}
                  className="flex-1 gap-1.5"
                  onClick={handlePauseToggle}
                  data-testid="button-pause-mission"
                >
                  {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
                  {isPaused ? "Resume" : "Pause"}
                </Button>
                <Button
                  variant="destructive"
                  className="gap-1.5"
                  onClick={onAbortMission}
                  data-testid="button-abort-mission"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Abort
                </Button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-3">No active mission</p>
            <Button variant="outline" className="gap-1.5" data-testid="button-plan-mission">
              <Target className="h-3.5 w-3.5" />
              Plan New Mission
            </Button>
          </div>
        </div>
      )}

      <div className="border-t border-border mt-4 pt-4">
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            onClick={onReturnToBase}
            data-testid="button-rtb"
          >
            <Home className="h-3 w-3" />
            RTB
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-1.5 text-xs"
            data-testid="button-hover"
          >
            <RotateCcw className="h-3 w-3" />
            Hover
          </Button>
        </div>
      </div>
    </Card>
  );
}
