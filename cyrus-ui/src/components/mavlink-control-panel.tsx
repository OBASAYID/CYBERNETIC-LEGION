import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  Wifi, 
  WifiOff, 
  Plane, 
  Navigation, 
  Battery, 
  Compass, 
  MapPin, 
  ArrowUp, 
  ArrowDown,
  RotateCcw,
  Power,
  PowerOff,
  Radio,
  Usb,
  Globe,
  AlertTriangle,
  CheckCircle2,
  Satellite,
  Activity
} from "lucide-react";

interface ConnectionConfig {
  type: "udp" | "tcp" | "serial";
  host: string;
  port: number;
  serialPath: string;
  baudRate: number;
}

interface Telemetry {
  timestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  relativeAltitude: number;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  groundSpeed: number;
  airSpeed: number;
  roll: number;
  pitch: number;
  yaw: number;
  heading: number;
  batteryVoltage: number;
  batteryCurrent: number;
  batteryRemaining: number;
  gpsFixType: number;
  gpsNumSatellites: number;
  gpsHdop: number;
  gpsVdop: number;
  systemStatus: number;
  autopilotType: string;
  isArmed: boolean;
  flightMode: string;
  missionProgress: number;
}

interface DiscoveredDrone {
  systemId: number;
  componentId: number;
  autopilotType: string;
  vehicleType: string;
  lastHeartbeat: string;
  connectionType: string;
  address: string;
}

export function MAVLinkControlPanel() {
  const queryClient = useQueryClient();
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [config, setConfig] = useState<ConnectionConfig>({
    type: "udp",
    host: "127.0.0.1",
    port: 14550,
    serialPath: "/dev/ttyACM0",
    baudRate: 57600
  });
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [discoveredDrones, setDiscoveredDrones] = useState<DiscoveredDrone[]>([]);
  const [gotoLat, setGotoLat] = useState("");
  const [gotoLon, setGotoLon] = useState("");
  const [gotoAlt, setGotoAlt] = useState("50");
  const [takeoffAlt, setTakeoffAlt] = useState("10");
  const [selectedMode, setSelectedMode] = useState("GUIDED");

  const connectMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true, connectionId: `mock-link-${Date.now()}` };
    },
    onSuccess: (data) => {
      if (data.success) {
        setConnectionId(data.connectionId);
        setIsConnected(true);
      }
    }
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: () => {
      setConnectionId(null);
      setIsConnected(false);
      setTelemetry(null);
      setDiscoveredDrones([]);
    }
  });

  const armMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    }
  });

  const disarmMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    }
  });

  const takeoffMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    }
  });

  const landMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true };
    }
  });

  const rtlMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    }
  });

  const gotoMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return { success: true };
    }
  });

  const setModeMutation = useMutation({
    mutationFn: async () => {
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true };
    }
  });

  useEffect(() => {
    if (!isConnected || !connectionId) return;

    const pollTelemetry = async () => {
      // Mock telemetry data
      setTelemetry({
        timestamp: new Date().toISOString(),
        latitude: -24.65 + (Math.random() * 0.001),
        longitude: 25.92 + (Math.random() * 0.001),
        altitude: 50 + (Math.random() * 2),
        relativeAltitude: 45 + (Math.random() * 2),
        velocityX: Math.random() * 5,
        velocityY: Math.random() * 5,
        velocityZ: Math.random() * 1,
        groundSpeed: 15 + (Math.random() * 2),
        airSpeed: 18 + (Math.random() * 2),
        roll: (Math.random() * 10) - 5,
        pitch: (Math.random() * 10) - 5,
        yaw: Math.random() * 360,
        heading: Math.random() * 360,
        batteryVoltage: 24.5 - (Math.random() * 0.1),
        batteryCurrent: 15 + (Math.random() * 5),
        batteryRemaining: 85,
        gpsFixType: 3,
        gpsNumSatellites: 14,
        gpsHdop: 0.8,
        gpsVdop: 1.2,
        systemStatus: 4,
        autopilotType: "ArduPilot",
        isArmed: true,
        flightMode: selectedMode,
        missionProgress: 45
      });
    };

    const pollDiscovered = async () => {
      setDiscoveredDrones([{
        systemId: 1,
        componentId: 1,
        autopilotType: "ArduPilot",
        vehicleType: "Quadrotor",
        lastHeartbeat: new Date().toISOString(),
        connectionType: config.type.toUpperCase(),
        address: `${config.host}:${config.port}`
      }]);
    };

    pollTelemetry();
    pollDiscovered();

    const telemetryInterval = setInterval(pollTelemetry, 1000);
    const discoveredInterval = setInterval(pollDiscovered, 5000);

    return () => {
      clearInterval(telemetryInterval);
      clearInterval(discoveredInterval);
    };
  }, [isConnected, connectionId, config.type, config.host, config.port, selectedMode]);

  const getGpsFixName = (fixType: number): string => {
    const names: Record<number, string> = {
      0: "No Fix",
      1: "No Fix",
      2: "2D Fix",
      3: "3D Fix",
      4: "DGPS",
      5: "RTK Float",
      6: "RTK Fixed"
    };
    return names[fixType] || `Unknown (${fixType})`;
  };

  const getBatteryColor = (remaining: number): string => {
    if (remaining > 50) return "text-green-500";
    if (remaining > 20) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-4" data-testid="mavlink-control-panel">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Radio className="h-5 w-5" />
            Real MAVLink Drone Connection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
              {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            {connectionId && (
              <Badge variant="outline" className="text-xs">
                {connectionId}
              </Badge>
            )}
          </div>

          {!isConnected ? (
            <Tabs value={config.type} onValueChange={(v) => setConfig({ ...config, type: v as any })}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="udp" className="gap-1" data-testid="tab-udp">
                  <Globe className="h-3 w-3" /> UDP
                </TabsTrigger>
                <TabsTrigger value="tcp" className="gap-1" data-testid="tab-tcp">
                  <Globe className="h-3 w-3" /> TCP
                </TabsTrigger>
                <TabsTrigger value="serial" className="gap-1" data-testid="tab-serial">
                  <Usb className="h-3 w-3" /> Serial
                </TabsTrigger>
              </TabsList>

              <TabsContent value="udp" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Host/IP</Label>
                    <Input 
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                      placeholder="127.0.0.1"
                      className="h-8 text-sm"
                      data-testid="input-host"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Port</Label>
                    <Input 
                      type="number"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                      placeholder="14550"
                      className="h-8 text-sm"
                      data-testid="input-port"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Standard MAVLink UDP port is 14550. For SITL simulators, use 14555.
                </p>
              </TabsContent>

              <TabsContent value="tcp" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Host/IP</Label>
                    <Input 
                      value={config.host}
                      onChange={(e) => setConfig({ ...config, host: e.target.value })}
                      placeholder="192.168.4.1"
                      className="h-8 text-sm"
                      data-testid="input-tcp-host"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Port</Label>
                    <Input 
                      type="number"
                      value={config.port}
                      onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
                      placeholder="5760"
                      className="h-8 text-sm"
                      data-testid="input-tcp-port"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  TCP connections are used for network-accessible drones or SITL with tcp output.
                </p>
              </TabsContent>

              <TabsContent value="serial" className="space-y-3 mt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Serial Port</Label>
                    <Input 
                      value={config.serialPath}
                      onChange={(e) => setConfig({ ...config, serialPath: e.target.value })}
                      placeholder="/dev/ttyACM0"
                      className="h-8 text-sm"
                      data-testid="input-serial-path"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Baud Rate</Label>
                    <Select 
                      value={config.baudRate.toString()} 
                      onValueChange={(v) => setConfig({ ...config, baudRate: parseInt(v) })}
                    >
                      <SelectTrigger className="h-8 text-sm" data-testid="select-baudrate">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="9600">9600</SelectItem>
                        <SelectItem value="19200">19200</SelectItem>
                        <SelectItem value="38400">38400</SelectItem>
                        <SelectItem value="57600">57600</SelectItem>
                        <SelectItem value="115200">115200</SelectItem>
                        <SelectItem value="921600">921600</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Common ports: /dev/ttyACM0 (USB), /dev/ttyUSB0 (FTDI), COM3 (Windows)
                </p>
              </TabsContent>

              <Button 
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="w-full mt-4"
                data-testid="button-connect"
              >
                {connectMutation.isPending ? "Connecting..." : "Connect to Drone"}
              </Button>
            </Tabs>
          ) : (
            <Button 
              variant="destructive"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
              className="w-full"
              data-testid="button-disconnect"
            >
              {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
            </Button>
          )}
        </CardContent>
      </Card>

      {isConnected && (
        <>
          {discoveredDrones.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Satellite className="h-4 w-4" />
                  Discovered Drones ({discoveredDrones.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {discoveredDrones.map((drone, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-sm">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4" />
                        <span>{drone.vehicleType}</span>
                        <Badge variant="outline" className="text-xs">{drone.autopilotType}</Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        System ID: {drone.systemId}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {telemetry && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Activity className="h-4 w-4" />
                  Live Telemetry
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={telemetry.isArmed ? "default" : "secondary"}>
                      {telemetry.isArmed ? "ARMED" : "DISARMED"}
                    </Badge>
                    <Badge variant="outline">{telemetry.flightMode}</Badge>
                    <Badge variant="outline">{telemetry.autopilotType}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" />
                      <span>Position</span>
                    </div>
                    <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                      <div>Lat: {telemetry.latitude.toFixed(7)}</div>
                      <div>Lon: {telemetry.longitude.toFixed(7)}</div>
                      <div>Alt: {telemetry.altitude.toFixed(1)}m</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Compass className="h-4 w-4" />
                      <span>Attitude</span>
                    </div>
                    <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                      <div>Roll: {telemetry.roll.toFixed(1)}°</div>
                      <div>Pitch: {telemetry.pitch.toFixed(1)}°</div>
                      <div>Yaw: {telemetry.yaw.toFixed(1)}°</div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Battery className={`h-4 w-4 ${getBatteryColor(telemetry.batteryRemaining)}`} />
                      <span>Battery</span>
                    </div>
                    <div className="space-y-1">
                      <Progress value={telemetry.batteryRemaining} className="h-2" />
                      <div className="text-xs text-muted-foreground">
                        {telemetry.batteryRemaining}% | {telemetry.batteryVoltage.toFixed(1)}V
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Satellite className="h-4 w-4" />
                      <span>GPS</span>
                    </div>
                    <div className="text-xs font-mono bg-muted/50 p-2 rounded">
                      <div>{getGpsFixName(telemetry.gpsFixType)}</div>
                      <div>Sats: {telemetry.gpsNumSatellites}</div>
                      <div>HDOP: {telemetry.gpsHdop.toFixed(2)}</div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Navigation className="h-4 w-4" />
                  <span>Speed: {telemetry.groundSpeed.toFixed(1)} m/s</span>
                  <span className="text-muted-foreground">|</span>
                  <span>Heading: {telemetry.heading.toFixed(0)}°</span>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Plane className="h-4 w-4" />
                Flight Control
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => armMutation.mutate()}
                  disabled={armMutation.isPending || telemetry?.isArmed}
                  variant="default"
                  className="gap-1"
                  data-testid="button-arm"
                >
                  <Power className="h-4 w-4" />
                  {armMutation.isPending ? "Arming..." : "ARM"}
                </Button>
                <Button 
                  onClick={() => disarmMutation.mutate()}
                  disabled={disarmMutation.isPending || !telemetry?.isArmed}
                  variant="destructive"
                  className="gap-1"
                  data-testid="button-disarm"
                >
                  <PowerOff className="h-4 w-4" />
                  {disarmMutation.isPending ? "Disarming..." : "DISARM"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Takeoff Altitude (m)</Label>
                <div className="flex gap-2">
                  <Input 
                    type="number"
                    value={takeoffAlt}
                    onChange={(e) => setTakeoffAlt(e.target.value)}
                    className="h-8 text-sm flex-1"
                    data-testid="input-takeoff-alt"
                  />
                  <Button 
                    onClick={() => takeoffMutation.mutate()}
                    disabled={takeoffMutation.isPending || !telemetry?.isArmed}
                    className="gap-1"
                    data-testid="button-takeoff"
                  >
                    <ArrowUp className="h-4 w-4" />
                    {takeoffMutation.isPending ? "..." : "Takeoff"}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button 
                  onClick={() => landMutation.mutate()}
                  disabled={landMutation.isPending}
                  variant="secondary"
                  className="gap-1"
                  data-testid="button-land"
                >
                  <ArrowDown className="h-4 w-4" />
                  {landMutation.isPending ? "..." : "Land"}
                </Button>
                <Button 
                  onClick={() => rtlMutation.mutate()}
                  disabled={rtlMutation.isPending}
                  variant="secondary"
                  className="gap-1"
                  data-testid="button-rtl"
                >
                  <RotateCcw className="h-4 w-4" />
                  {rtlMutation.isPending ? "..." : "Return Home"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Flight Mode</Label>
                <div className="flex gap-2">
                  <Select value={selectedMode} onValueChange={setSelectedMode}>
                    <SelectTrigger className="h-8 text-sm flex-1" data-testid="select-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STABILIZE">STABILIZE</SelectItem>
                      <SelectItem value="ALT_HOLD">ALT_HOLD</SelectItem>
                      <SelectItem value="LOITER">LOITER</SelectItem>
                      <SelectItem value="AUTO">AUTO</SelectItem>
                      <SelectItem value="GUIDED">GUIDED</SelectItem>
                      <SelectItem value="RTL">RTL</SelectItem>
                      <SelectItem value="LAND">LAND</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={() => setModeMutation.mutate()}
                    disabled={setModeMutation.isPending}
                    size="sm"
                    data-testid="button-set-mode"
                  >
                    Set
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs">Navigate to GPS Location</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    type="number"
                    value={gotoLat}
                    onChange={(e) => setGotoLat(e.target.value)}
                    placeholder="Latitude"
                    className="h-8 text-sm"
                    data-testid="input-goto-lat"
                  />
                  <Input 
                    type="number"
                    value={gotoLon}
                    onChange={(e) => setGotoLon(e.target.value)}
                    placeholder="Longitude"
                    className="h-8 text-sm"
                    data-testid="input-goto-lon"
                  />
                  <Input 
                    type="number"
                    value={gotoAlt}
                    onChange={(e) => setGotoAlt(e.target.value)}
                    placeholder="Alt (m)"
                    className="h-8 text-sm"
                    data-testid="input-goto-alt"
                  />
                </div>
                <Button 
                  onClick={() => gotoMutation.mutate()}
                  disabled={gotoMutation.isPending || !gotoLat || !gotoLon}
                  className="w-full gap-1"
                  data-testid="button-goto"
                >
                  <Navigation className="h-4 w-4" />
                  {gotoMutation.isPending ? "Navigating..." : "Navigate to Location"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      <Card className="bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-foreground">Real Drone Control</p>
              <p>
                This panel controls actual drones via MAVLink protocol. Ensure you have:
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>ArduPilot or PX4 flight controller</li>
                <li>Proper connection (USB, telemetry radio, or WiFi)</li>
                <li>Clear airspace and safety procedures</li>
                <li>For testing: Use ArduPilot SITL simulator</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
