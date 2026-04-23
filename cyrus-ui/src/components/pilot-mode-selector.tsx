import { User, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PilotMode } from "@shared/schema";
import { cn } from "@/lib/utils";

interface PilotModeSelectorProps {
  mode: PilotMode;
  onChange: (mode: PilotMode) => void;
  disabled?: boolean;
}

const modes: { value: PilotMode; label: string; icon: typeof User; description: string }[] = [
  { value: "manual", label: "MANUAL", icon: User, description: "Full operator control" },
  { value: "autonomous", label: "AUTO", icon: Bot, description: "Waypoint navigation" },
  { value: "ai-assist", label: "AI PILOT", icon: Sparkles, description: "AI-assisted flight" },
];

export function PilotModeSelector({ mode, onChange, disabled }: PilotModeSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        Pilot Mode
      </label>
      <div className="flex gap-1 p-1 bg-muted rounded-md" data-testid="pilot-mode-selector">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          return (
            <Button
              key={m.value}
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={() => onChange(m.value)}
              className={cn(
                "flex-1 gap-1.5 h-8 text-xs toggle-elevate",
                isActive && "toggle-elevated bg-background shadow-sm"
              )}
              data-testid={`button-mode-${m.value}`}
            >
              <Icon className={cn("h-3.5 w-3.5", isActive && "text-primary")} />
              <span className={cn(isActive && "font-medium")}>{m.label}</span>
            </Button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        {modes.find((m) => m.value === mode)?.description}
      </p>
    </div>
  );
}
