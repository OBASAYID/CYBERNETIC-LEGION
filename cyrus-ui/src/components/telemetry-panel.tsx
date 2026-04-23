import { Activity, Thermometer, Wind, Compass, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TelemetryGauge, CircularGauge } from "@/components/telemetry-gauge";
import { SubsystemStatus } from "@/components/subsystem-status";
import { PilotModeSelector } from "@/components/pilot-mode-selector";
import type { Telemetry, PilotMode } from "@shared/schema";
import { cn } from "@/lib/utils";

interface TelemetryPanelProps {
  telemetry: Telemetry | null;
  droneName: string;
  pilotMode: PilotMode;
  onPilotModeChange: (mode: PilotMode) => void;
}

export function TelemetryPanel({ telemetry, droneName, pilotMode, onPilotModeChange }: TelemetryPanelProps) {
  if (!telemetry) {
    return (
      <div className="flex flex-col h-full bg-sidebar">
        <div className="px-4 py-3 border-b border-sidebar-border">
          <h2 className="text-sm font-semibold">Telemetry</h2>
          <p className="text-xs text-muted-foreground">No drone selected</p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm text-muted-foreground">Select a drone to view telemetry</p>
          </div>
        </div>
      </div>
    );
  }

  const formatCoord = (value: number, type: "lat" | "lon") => {
    const dir = type === "lat" ? (value >= 0 ? "N" : "S") : (value >= 0 ? "E" : "W");
    return `${Math.abs(value).toFixed(6)}° ${dir}`;
  };

  return (
    <div className="flex flex-col h-full bg-sidebar" data-testid="telemetry-panel">
      <div className="px-4 py-3 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Live Telemetry</h2>
            <p className="text-xs text-muted-foreground font-mono">{droneName}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-status-online animate-pulse" />
            <span className="text-[10px] font-medium text-status-online">LIVE</span>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="flex justify-around" data-testid="circular-gauges">
            <CircularGauge
              value={telemetry.altitude}
              max={500}
              label="Altitude"
              unit="m"
              size="md"
            />
            <CircularGauge
              value={telemetry.speed}
              max={100}
              label="Speed"
              unit="m/s"
              size="md"
            />
            <CircularGauge
              value={telemetry.batteryLevel}
              max={100}
              label="Battery"
              unit="%"
              size="md"
              warningThreshold={30}
              criticalThreshold={15}
            />
          </div>

          <Card className="p-3 space-y-3" data-testid="telemetry-gauges">
            <TelemetryGauge
              label="Signal Strength"
              value={telemetry.signalStrength}
              unit="%"
              max={100}
              warningThreshold={40}
              criticalThreshold={20}
            />
            <TelemetryGauge
              label="Battery Voltage"
              value={telemetry.batteryVoltage}
              unit="V"
              max={25.2}
              warningThreshold={21}
              criticalThreshold={19}
            />
            <TelemetryGauge
              label="GPS Accuracy"
              value={telemetry.gpsAccuracy}
              unit="m"
              max={10}
              warningThreshold={5}
              criticalThreshold={8}
              inverse
            />
          </Card>

          <Card className="p-3" data-testid="position-data">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Position Data
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted-foreground">Latitude</span>
                <p className="font-mono font-medium">{formatCoord(telemetry.latitude, "lat")}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Longitude</span>
                <p className="font-mono font-medium">{formatCoord(telemetry.longitude, "lon")}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <Compass className="h-3 w-3 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Heading</span>
                  <p className="font-mono font-medium">{telemetry.heading.toFixed(1)}°</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Altitude MSL</span>
                  <p className="font-mono font-medium">{telemetry.altitude.toFixed(1)}m</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-3" data-testid="environment-data">
            <div className="flex items-center gap-2 mb-3">
              <Thermometer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Environment
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-1.5">
                <Thermometer className="h-3 w-3 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Temp</span>
                  <p className="font-mono font-medium">{telemetry.temperature.toFixed(1)}°C</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Wind className="h-3 w-3 text-muted-foreground" />
                <div>
                  <span className="text-muted-foreground">Wind</span>
                  <p className="font-mono font-medium">{telemetry.windSpeed.toFixed(1)} m/s</p>
                </div>
              </div>
            </div>
          </Card>

          <SubsystemStatus subsystems={telemetry.subsystems} />

          <PilotModeSelector
            mode={pilotMode}
            onChange={onPilotModeChange}
          />
        </div>
      </ScrollArea>
    </div>
  );
}
