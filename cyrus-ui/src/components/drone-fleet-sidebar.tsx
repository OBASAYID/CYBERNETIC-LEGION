import { useState } from "react";
import { Search, Plus, Filter, Radio, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DroneCard } from "@/components/drone-card";
import type { Drone } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DroneFleetSidebarProps {
  drones: Drone[];
  selectedDroneId: string | null;
  onDroneSelect: (droneId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function DroneFleetSidebar({
  drones,
  selectedDroneId,
  onDroneSelect,
  collapsed,
  onToggleCollapse,
}: DroneFleetSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const filteredDrones = drones.filter((drone) => {
    const matchesSearch = drone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      drone.model.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || drone.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const onlineDrones = drones.filter(d => d.status !== "offline" && d.status !== "maintenance");
  const missionDrones = drones.filter(d => d.status === "mission");

  if (collapsed) {
    return (
      <div className="w-16 h-full bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="sidebar-collapsed">
        <div className="p-2 border-b border-sidebar-border">
          <Button
            size="icon"
            variant="ghost"
            onClick={onToggleCollapse}
            className="w-full"
            data-testid="button-expand-sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {drones.slice(0, 10).map((drone) => {
              const isOnline = drone.status !== "offline" && drone.status !== "maintenance";
              const isSelected = selectedDroneId === drone.id;
              const isEmergency = drone.status === "emergency";
              return (
                <Button
                  key={drone.id}
                  size="icon"
                  variant={isSelected ? "secondary" : "ghost"}
                  className={cn(
                    "w-full relative",
                    isEmergency && "animate-pulse"
                  )}
                  onClick={() => onDroneSelect(drone.id)}
                  data-testid={`button-drone-${drone.id}`}
                >
                  <Radio className={cn(
                    "h-4 w-4",
                    isOnline ? "text-status-online" : "text-status-offline",
                    isEmergency && "text-status-busy"
                  )} />
                  {isSelected && (
                    <div className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
        <div className="p-2 border-t border-sidebar-border text-center">
          <span className="text-[10px] font-mono text-muted-foreground">
            {onlineDrones.length}/{drones.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-72 h-full bg-sidebar border-r border-sidebar-border flex flex-col" data-testid="sidebar-expanded">
      <div className="p-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Drone Fleet</h2>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={onToggleCollapse}
            data-testid="button-collapse-sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search drones..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-8 text-xs"
            data-testid="input-search-drones"
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md">
            <div className="h-1.5 w-1.5 rounded-full bg-status-online" />
            <span className="font-mono">{onlineDrones.length}</span>
            <span className="text-muted-foreground">online</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md">
            <div className="h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="font-mono">{missionDrones.length}</span>
            <span className="text-muted-foreground">active</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2" data-testid="drone-list">
          {filteredDrones.length === 0 ? (
            <div className="text-center py-8">
              <Radio className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground">No drones found</p>
            </div>
          ) : (
            filteredDrones.map((drone) => (
              <DroneCard
                key={drone.id}
                drone={drone}
                selected={selectedDroneId === drone.id}
                onClick={() => onDroneSelect(drone.id)}
              />
            ))
          )}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <Button variant="outline" className="w-full gap-1.5 text-xs" data-testid="button-add-drone">
          <Plus className="h-3.5 w-3.5" />
          Add Drone
        </Button>
      </div>
    </div>
  );
}
