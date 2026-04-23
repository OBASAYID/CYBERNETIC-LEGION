import { useState } from 'react';
import { useDrone } from '../hooks/useDrone';
import { useNavigation } from '../hooks/useNavigation';
import { CyrusHumanoid } from '../components/CyrusHumanoid';
import { Link } from 'wouter';
import {
  Plane,
  Wifi,
  WifiOff,
  Battery,
  Compass,
  MapPin,
  Gauge,
  Power,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  AlertOctagon,
  Target,
  Plus,
  Loader2,
  Navigation,
  Signal,
  Clock,
  AlertTriangle,
  Radio,
  Usb,
  ChevronDown,
  Route,
  Crosshair,
  Globe,
  Eye,
  Shield,
  Trash2,
  Send,
  Zap,
} from 'lucide-react';
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

type ConnectionType = 'udp' | 'tcp' | 'serial';
type DroneTab = 'control' | 'nav-ops' | 'flight-plan';

interface FlightWaypoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  holdTime: number;
  action: string;
  label: string;
}

export function DronePage() {
  const {
    state,
    simulationMode,
    missions,
    activeMission,
    connect,
    disconnect,
    arm,
    disarm,
    takeoff,
    land,
    returnToLaunch,
    emergencyStop,
    setMode,
    navGoTo,
    createFlightPlan,
    createMission,
    startMission,
    abortMission,
  } = useDrone();

  const { currentPosition } = useNavigation();

  const [connectionType, setConnectionType] = useState<ConnectionType>('udp');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('14550');
  const [takeoffAltitude, setTakeoffAltitude] = useState(10);
  const [activeTab, setActiveTab] = useState<DroneTab>('control');
  const [showConnectionGuide, setShowConnectionGuide] = useState(false);

  const [navTargetLat, setNavTargetLat] = useState('');
  const [navTargetLon, setNavTargetLon] = useState('');
  const [navTargetAlt, setNavTargetAlt] = useState('50');
  const [navTargetName, setNavTargetName] = useState('');

  const [flightPlanName, setFlightPlanName] = useState('');
  const [flightWaypoints, setFlightWaypoints] = useState<FlightWaypoint[]>([]);
  const [wpLat, setWpLat] = useState('');
  const [wpLon, setWpLon] = useState('');
  const [wpAlt, setWpAlt] = useState('50');
  const [wpSpeed, setWpSpeed] = useState('5');
  const [wpHold, setWpHold] = useState('0');
  const [wpAction, setWpAction] = useState('waypoint');
  const [aopRadius, setAopRadius] = useState('500');

  const formatFlightTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleConnect = () => {
    const backendType = connectionType === 'serial' ? 'serial' : 'wifi';
    connect.mutate({ 
      connectionType: backendType as 'serial' | 'wifi' | 'mavlink', 
      host, 
      port: parseInt(port) 
    });
  };

  const handleNavGoTo = () => {
    const lat = parseFloat(navTargetLat);
    const lon = parseFloat(navTargetLon);
    const alt = parseFloat(navTargetAlt);
    if (!isNaN(lat) && !isNaN(lon)) {
      navGoTo.mutate({ latitude: lat, longitude: lon, altitude: alt || 50, locationName: navTargetName });
    }
  };

  const handleUseCurrentPosition = () => {
    if (currentPosition) {
      setNavTargetLat(currentPosition.lat.toFixed(6));
      setNavTargetLon(currentPosition.lon.toFixed(6));
      setNavTargetName('Current GPS Position');
    }
  };

  const addWaypoint = () => {
    const lat = parseFloat(wpLat);
    const lon = parseFloat(wpLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      setFlightWaypoints(prev => [...prev, {
        id: `wp-${Date.now()}`,
        latitude: lat,
        longitude: lon,
        altitude: parseFloat(wpAlt) || 50,
        speed: parseFloat(wpSpeed) || 5,
        holdTime: parseFloat(wpHold) || 0,
        action: wpAction,
        label: `WP ${prev.length + 1}`,
      }]);
      setWpLat('');
      setWpLon('');
    }
  };

  const addCurrentPositionAsWaypoint = () => {
    if (currentPosition) {
      setFlightWaypoints(prev => [...prev, {
        id: `wp-${Date.now()}`,
        latitude: currentPosition.lat,
        longitude: currentPosition.lon,
        altitude: parseFloat(wpAlt) || 50,
        speed: parseFloat(wpSpeed) || 5,
        holdTime: parseFloat(wpHold) || 0,
        action: wpAction,
        label: `WP ${prev.length + 1} (GPS)`,
      }]);
    }
  };

  const removeWaypoint = (id: string) => {
    setFlightWaypoints(prev => prev.filter(w => w.id !== id));
  };

  const handleCreateFlightPlan = () => {
    if (!flightPlanName.trim() || flightWaypoints.length === 0) return;
    
    const areaOfOperation = currentPosition ? {
      center: { lat: currentPosition.lat, lng: currentPosition.lon },
      radiusMeters: parseInt(aopRadius) || 500,
    } : undefined;

    createFlightPlan.mutate({
      name: flightPlanName,
      waypoints: flightWaypoints.map(w => ({
        latitude: w.latitude,
        longitude: w.longitude,
        altitude: w.altitude,
        speed: w.speed,
        holdTime: w.holdTime,
        action: w.action,
      })),
      areaOfOperation,
    });
    
    setFlightPlanName('');
    setFlightWaypoints([]);
  };

  const droneContext = `User is in drone control module. Drone status: ${state?.connected ? 'connected' : 'disconnected'}, armed: ${state?.armed ? 'yes' : 'no'}, mode: ${state?.mode || 'N/A'}, battery: ${state?.battery?.toFixed(0) || 'N/A'}%, altitude: ${state?.altitude?.toFixed(1) || '0'}m. ${currentPosition ? `User GPS position: ${currentPosition.lat.toFixed(6)}, ${currentPosition.lon.toFixed(6)}` : 'No user GPS position'}. Active missions: ${missions.length}. ${activeMission ? `Active mission: ${activeMission.name}` : 'No active mission'}.`;

  return (
    <ModuleWorkspacePageShell
      title="CYRUS Drone Control"
      subtitle="MAVLink protocol · UAV operations"
      icon={Plane}
      headerEnd={
        <div className="flex flex-wrap items-center gap-2">
          {state?.connected && (
            <span className="flex items-center gap-1 rounded-full bg-green-500/20 px-1.5 py-0.5 text-[9px] font-bold text-green-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-green-400" />
              ONLINE
            </span>
          )}
          <Link href="/nav">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-600/20 px-3 py-1.5 text-[11px] text-green-400 transition-colors hover:bg-green-600/30"
            >
              <Navigation className="h-3.5 w-3.5" />
              NAV Module
            </button>
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-5xl p-4">

        {state?.connected && (
          <div className="flex border-b border-gray-800 mb-4">
            {[
              { id: 'control' as DroneTab, icon: Zap, label: 'Flight Control' },
              { id: 'nav-ops' as DroneTab, icon: Target, label: 'NAV Operations' },
              { id: 'flight-plan' as DroneTab, icon: Route, label: 'Flight Plans' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-3 text-[12px] font-medium transition-all border-b-2 ${
                  activeTab === id
                    ? 'text-cyan-400 border-cyan-400'
                    : 'text-gray-500 border-transparent hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        )}

        {!state?.connected ? (
          <>
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <Radio className="w-5 h-5 text-cyan-400" />
                <h2 className="text-base font-semibold">MAVLink Drone Connection</h2>
              </div>
              
              <div className="flex items-center gap-2 mb-4">
                <WifiOff className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-400">Disconnected</span>
              </div>

              <div className="flex gap-2 mb-4">
                {(['udp', 'tcp', 'serial'] as ConnectionType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setConnectionType(type)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      connectionType === type ? 'bg-gray-700 text-white' : 'bg-gray-800/50 text-gray-400 hover:text-white'
                    }`}
                  >
                    {type === 'serial' ? <Usb className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Host/IP</label>
                  <input type="text" value={host} onChange={(e) => setHost(e.target.value)}
                    className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono" placeholder="127.0.0.1" />
                </div>
                <div>
                  <label className="text-[11px] text-gray-400 mb-1 block">Port</label>
                  <input type="text" value={port} onChange={(e) => setPort(e.target.value)}
                    className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono" placeholder="14550" />
                </div>
              </div>

              <button onClick={handleConnect} disabled={connect.isPending}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50">
                {connect.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                Connect to Drone
              </button>
            </div>

            {currentPosition && (
              <div className="bg-gradient-to-r from-green-900/30 to-cyan-900/30 border border-green-500/30 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-semibold text-green-400">NAV Module Connected</span>
                </div>
                <p className="text-xs text-gray-400">
                  Your GPS position is available at {currentPosition.lat.toFixed(6)}, {currentPosition.lon.toFixed(6)}. 
                  Once drone is connected, you can use NAV-guided operations to send the drone to coordinates from the navigation module.
                </p>
              </div>
            )}

            <button onClick={() => setShowConnectionGuide(!showConnectionGuide)}
              className="w-full bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:bg-gray-800/40 transition-colors mb-4">
              <div className="flex items-center gap-2">
                <Signal className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold">Connection Guide</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showConnectionGuide ? 'rotate-180' : ''}`} />
            </button>
            
            {showConnectionGuide && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-4 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-cyan-400 mb-1">UDP (Recommended)</h4>
                  <p className="text-[11px] text-gray-400">Host: 127.0.0.1 | Port: 14550</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-cyan-400 mb-1">Serial</h4>
                  <p className="text-[11px] text-gray-400">Linux: /dev/ttyACM0 | Mac: /dev/tty.usbmodem*</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-cyan-400 mb-1">SITL Simulator</h4>
                  <code className="text-[11px] text-gray-300 font-mono">sim_vehicle.py -v ArduCopter --console --map</code>
                </div>
              </div>
            )}

            <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertOctagon className="w-4 h-4 text-red-400" />
                <span className="text-sm font-semibold text-red-400">Safety Notice</span>
              </div>
              <p className="text-xs text-gray-400">
                Always ensure proper safety procedures when operating drones. Maintain visual line of sight and check airspace regulations.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400 font-medium">Connected</span>
                  {simulationMode && (
                    <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-[10px] font-bold rounded">SIM</span>
                  )}
                </div>
                <button onClick={() => disconnect.mutate()}
                  className="px-3 py-1.5 bg-red-600/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-600/30 transition-colors">
                  Disconnect
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { icon: Battery, label: 'Battery', value: `${state.battery.toFixed(0)}%`, color: state.battery > 30 ? 'text-green-400' : 'text-red-400' },
                  { icon: ArrowUp, label: 'Altitude', value: `${state.altitude.toFixed(1)}m`, color: 'text-white' },
                  { icon: Gauge, label: 'Speed', value: `${state.speed.toFixed(1)} m/s`, color: 'text-white' },
                  { icon: Compass, label: 'Heading', value: `${state.heading}°`, color: 'text-white' },
                  { icon: MapPin, label: 'Latitude', value: state.latitude.toFixed(6), color: 'text-green-400' },
                  { icon: Navigation, label: 'Longitude', value: state.longitude.toFixed(6), color: 'text-blue-400' },
                  { icon: Signal, label: 'Satellites', value: `${state.satellites} GPS`, color: state.satellites >= 6 ? 'text-green-400' : 'text-yellow-400' },
                  { icon: Clock, label: 'Flight Time', value: formatFlightTime(state.flightTime), color: 'text-white' },
                ].map(({ icon: Icon, label, value, color }) => (
                  <div key={label} className="bg-gray-800/50 rounded-lg p-2.5">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Icon className="w-3 h-3 text-gray-500" />
                      <span className="text-[10px] text-gray-400">{label}</span>
                    </div>
                    <p className={`text-sm font-bold font-mono ${color}`}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {activeTab === 'control' && (
              <>
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-semibold mb-3">Flight Control</h3>
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <button onClick={() => state?.armed ? disarm.mutate() : arm.mutate()} disabled={!state?.connected}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors ${
                        state?.armed ? 'bg-green-600 text-white' : 'bg-gray-800/70 text-white hover:bg-gray-700'
                      } disabled:opacity-30`}>
                      <Power className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">{state?.armed ? 'Armed' : 'Arm'}</span>
                    </button>
                    <button onClick={() => takeoff.mutate(takeoffAltitude)} disabled={!state?.connected || !state?.armed}
                      className="flex flex-col items-center gap-1.5 py-3 bg-gray-800/70 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-30">
                      <ArrowUp className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Takeoff</span>
                    </button>
                    <button onClick={() => land.mutate()} disabled={!state?.connected}
                      className="flex flex-col items-center gap-1.5 py-3 bg-gray-800/70 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-30">
                      <ArrowDown className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">Land</span>
                    </button>
                    <button onClick={() => returnToLaunch.mutate()} disabled={!state?.connected}
                      className="flex flex-col items-center gap-1.5 py-3 bg-gray-800/70 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-30">
                      <RotateCcw className="w-5 h-5" />
                      <span className="text-[10px] font-semibold">RTL</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs text-gray-400">Takeoff Alt:</span>
                    <input type="number" value={takeoffAltitude} onChange={(e) => setTakeoffAltitude(Number(e.target.value))}
                      className="w-16 bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-center font-mono" min={5} max={100} />
                    <span className="text-xs text-gray-500">meters</span>
                  </div>

                  <button onClick={() => emergencyStop.mutate()} disabled={!state?.connected}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors disabled:opacity-30">
                    <AlertOctagon className="w-4 h-4" />
                    Emergency Stop
                  </button>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-4">
                  <h3 className="text-sm font-semibold mb-3">Flight Mode</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {['STABILIZE', 'LOITER', 'GUIDED', 'AUTO', 'RTL', 'LAND'].map((mode) => (
                      <button key={mode} onClick={() => setMode.mutate(mode as any)} disabled={!state?.connected}
                        className={`py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                          state?.mode === mode ? 'bg-cyan-600 text-white' : 'bg-gray-800/70 text-gray-300 hover:bg-gray-700 hover:text-white'
                        } disabled:opacity-30`}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Missions ({missions.length})</h3>
                  </div>
                  {activeMission && (
                    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3 mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-cyan-400">{activeMission.name}</span>
                        <span className="text-[10px] text-cyan-300 uppercase">{activeMission.status}</span>
                      </div>
                      <p className="text-[10px] text-gray-400">{activeMission.waypoints.length} waypoints</p>
                      <button onClick={() => abortMission.mutate()}
                        className="mt-2 w-full py-1.5 bg-red-600/20 text-red-400 text-xs rounded-lg hover:bg-red-600/30 transition-colors">
                        Abort Mission
                      </button>
                    </div>
                  )}
                  {missions.filter(m => m.status !== 'active').slice(0, 5).map((mission) => (
                    <div key={mission.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div>
                        <span className="text-xs font-medium">{mission.name}</span>
                        <span className="text-[10px] text-gray-500 ml-2">{mission.waypoints.length} WP</span>
                      </div>
                      <button onClick={() => startMission.mutate(mission.id)} disabled={!state?.armed}
                        className="px-3 py-1 bg-cyan-600/20 text-cyan-400 text-[10px] rounded-lg hover:bg-cyan-600/30 disabled:opacity-30">
                        Start
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === 'nav-ops' && (
              <>
                <div className="bg-gradient-to-br from-green-900/20 to-cyan-900/20 border border-green-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-green-400" />
                    <h3 className="text-sm font-semibold text-green-400">NAV-Guided Operations</h3>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-4">
                    Send the drone to coordinates from the Navigation Module. The drone will fly to the specified GPS location at the given altitude.
                  </p>

                  {currentPosition && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-green-400 font-semibold uppercase">Your GPS Position</p>
                          <p className="text-xs font-mono text-white mt-0.5">
                            {currentPosition.lat.toFixed(6)}, {currentPosition.lon.toFixed(6)}
                          </p>
                        </div>
                        <button onClick={handleUseCurrentPosition}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-600/30 text-green-400 text-[10px] font-semibold rounded-lg hover:bg-green-600/40 transition-colors">
                          <Crosshair className="w-3 h-3" />
                          Use Position
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 mb-0.5 block">Target Latitude</label>
                        <input type="text" value={navTargetLat} onChange={(e) => setNavTargetLat(e.target.value)}
                          placeholder="-24.6282" className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 mb-0.5 block">Target Longitude</label>
                        <input type="text" value={navTargetLon} onChange={(e) => setNavTargetLon(e.target.value)}
                          placeholder="25.9231" className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-400 mb-0.5 block">Flight Altitude (m)</label>
                        <input type="number" value={navTargetAlt} onChange={(e) => setNavTargetAlt(e.target.value)}
                          className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-green-500" />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-400 mb-0.5 block">Location Name</label>
                        <input type="text" value={navTargetName} onChange={(e) => setNavTargetName(e.target.value)}
                          placeholder="Target name..." className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-green-500" />
                      </div>
                    </div>
                    <button onClick={handleNavGoTo} disabled={!navTargetLat || !navTargetLon || !state?.armed || navGoTo.isPending}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-green-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-green-700 hover:to-cyan-700 transition-all disabled:opacity-50">
                      {navGoTo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      Navigate Drone to Target
                    </button>
                  </div>
                </div>

                {state && (
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Eye className="w-4 h-4 text-cyan-400" />
                      <h3 className="text-sm font-semibold">Drone Position vs Your Position</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3">
                        <p className="text-[9px] text-cyan-400 font-semibold uppercase mb-1">Drone Location</p>
                        <p className="text-xs font-mono text-white">{state.latitude.toFixed(6)}</p>
                        <p className="text-xs font-mono text-white">{state.longitude.toFixed(6)}</p>
                        <p className="text-[10px] text-gray-400 mt-1">ALT: {state.altitude.toFixed(1)}m | HDG: {state.heading}°</p>
                      </div>
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                        <p className="text-[9px] text-green-400 font-semibold uppercase mb-1">Your Location</p>
                        {currentPosition ? (
                          <>
                            <p className="text-xs font-mono text-white">{currentPosition.lat.toFixed(6)}</p>
                            <p className="text-xs font-mono text-white">{currentPosition.lon.toFixed(6)}</p>
                            <p className="text-[10px] text-gray-400 mt-1">ACC: {(currentPosition.accuracy || 0).toFixed(0)}m</p>
                          </>
                        ) : (
                          <p className="text-xs text-gray-500">No GPS data</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    <span className="text-xs font-semibold text-yellow-400">Area of Operation</span>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    The drone will operate within the coordinates provided. Ensure the area is clear and complies with local airspace regulations. 
                    {simulationMode && ' Currently in SIMULATION MODE - no physical drone movement.'}
                  </p>
                </div>
              </>
            )}

            {activeTab === 'flight-plan' && (
              <>
                <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Route className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-purple-400">Flight Plan Builder</h3>
                  </div>
                  <p className="text-[11px] text-gray-400 mb-4">
                    Build multi-waypoint flight plans using NAV coordinates. Add waypoints manually or from your current GPS position.
                  </p>

                  <div className="mb-4">
                    <label className="text-[10px] text-gray-400 mb-0.5 block">Mission Name</label>
                    <input type="text" value={flightPlanName} onChange={(e) => setFlightPlanName(e.target.value)}
                      placeholder="Recon Mission Alpha..." className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-purple-500" />
                  </div>

                  <div className="bg-gray-800/40 rounded-lg p-3 mb-3">
                    <p className="text-[10px] text-gray-400 font-semibold mb-2">Add Waypoint</p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input type="text" value={wpLat} onChange={(e) => setWpLat(e.target.value)}
                        placeholder="Latitude" className="bg-gray-800/70 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      <input type="text" value={wpLon} onChange={(e) => setWpLon(e.target.value)}
                        placeholder="Longitude" className="bg-gray-800/70 border border-gray-700 rounded-lg px-2.5 py-1.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className="text-[9px] text-gray-500">Alt (m)</label>
                        <input type="number" value={wpAlt} onChange={(e) => setWpAlt(e.target.value)}
                          className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500">Speed (m/s)</label>
                        <input type="number" value={wpSpeed} onChange={(e) => setWpSpeed(e.target.value)}
                          className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                      <div>
                        <label className="text-[9px] text-gray-500">Hold (sec)</label>
                        <input type="number" value={wpHold} onChange={(e) => setWpHold(e.target.value)}
                          className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] font-mono focus:outline-none focus:ring-1 focus:ring-purple-500" />
                      </div>
                    </div>
                    <div className="mb-2">
                      <label className="text-[9px] text-gray-500">Action</label>
                      <select value={wpAction} onChange={(e) => setWpAction(e.target.value)}
                        className="w-full bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-purple-500">
                        <option value="waypoint">Waypoint</option>
                        <option value="loiter">Loiter</option>
                        <option value="takeoff">Takeoff</option>
                        <option value="land">Land</option>
                        <option value="rtl">Return to Launch</option>
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={addWaypoint} disabled={!wpLat || !wpLon}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-purple-600/30 text-purple-400 text-[11px] font-semibold rounded-lg hover:bg-purple-600/40 disabled:opacity-30 transition-colors">
                        <Plus className="w-3 h-3" />
                        Add Manual
                      </button>
                      {currentPosition && (
                        <button onClick={addCurrentPositionAsWaypoint}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600/30 text-green-400 text-[11px] font-semibold rounded-lg hover:bg-green-600/40 transition-colors">
                          <Crosshair className="w-3 h-3" />
                          Add GPS Position
                        </button>
                      )}
                    </div>
                  </div>

                  {flightWaypoints.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[10px] text-gray-400 font-semibold mb-2">Waypoints ({flightWaypoints.length})</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {flightWaypoints.map((wp, index) => (
                          <div key={wp.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 bg-purple-600/30 rounded flex items-center justify-center text-[9px] font-bold text-purple-400">
                                {index + 1}
                              </span>
                              <div>
                                <p className="text-[10px] font-mono text-white">{wp.latitude.toFixed(6)}, {wp.longitude.toFixed(6)}</p>
                                <p className="text-[9px] text-gray-500">
                                  ALT: {wp.altitude}m | SPD: {wp.speed}m/s | {wp.action.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => removeWaypoint(wp.id)} className="p-1 text-red-400/50 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-gray-800/40 rounded-lg p-3 mb-3">
                    <p className="text-[10px] text-gray-400 font-semibold mb-2">Area of Operation (AOP)</p>
                    <div className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-[10px] text-gray-400">Radius from center:</span>
                      <input type="number" value={aopRadius} onChange={(e) => setAopRadius(e.target.value)}
                        className="w-20 bg-gray-800/70 border border-gray-700 rounded-lg px-2 py-1 text-[11px] font-mono text-center focus:outline-none focus:ring-1 focus:ring-yellow-500" />
                      <span className="text-[10px] text-gray-500">meters</span>
                    </div>
                    {currentPosition && (
                      <p className="text-[9px] text-gray-500 mt-1">Center: {currentPosition.lat.toFixed(6)}, {currentPosition.lon.toFixed(6)} (your position)</p>
                    )}
                  </div>

                  <button onClick={handleCreateFlightPlan} disabled={!flightPlanName.trim() || flightWaypoints.length === 0 || createFlightPlan.isPending}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50">
                    {createFlightPlan.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Route className="w-4 h-4" />}
                    Create Flight Plan ({flightWaypoints.length} waypoints)
                  </button>
                </div>

                {missions.length > 0 && (
                  <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                    <h3 className="text-sm font-semibold mb-3">Saved Flight Plans ({missions.length})</h3>
                    <div className="space-y-2">
                      {missions.map((mission) => (
                        <div key={mission.id} className="flex items-center justify-between bg-gray-800/50 rounded-lg p-3">
                          <div>
                            <p className="text-xs font-semibold">{mission.name}</p>
                            <p className="text-[10px] text-gray-400">{mission.waypoints.length} waypoints | {mission.status}</p>
                          </div>
                          <div className="flex gap-2">
                            {mission.status === 'pending' && (
                              <button onClick={() => startMission.mutate(mission.id)} disabled={!state?.armed}
                                className="px-3 py-1.5 bg-cyan-600/20 text-cyan-400 text-[10px] font-semibold rounded-lg hover:bg-cyan-600/30 disabled:opacity-30 transition-colors">
                                Execute
                              </button>
                            )}
                            {mission.status === 'active' && (
                              <button onClick={() => abortMission.mutate()}
                                className="px-3 py-1.5 bg-red-600/20 text-red-400 text-[10px] font-semibold rounded-lg hover:bg-red-600/30 transition-colors">
                                Abort
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <CyrusHumanoid
        module="aerospace"
        context={droneContext}
        compact={true}
      />
    </ModuleWorkspacePageShell>
  );
}
