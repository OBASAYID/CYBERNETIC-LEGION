import { Link } from "wouter";
import { ArrowLeft, Radio, Plane, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MAVLinkControlPanel } from "@/components/mavlink-control-panel";
import cyrusEmblem from "@/assets/generated/cyrus_military_eagle_emblem.svg";

export default function DroneControl() {
  return (
    <div className="min-h-screen bg-transparent text-white">
      <header className="border-b border-cyan-500/20 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <div className="h-6 w-px bg-cyan-500/20" />
            <div className="flex items-center gap-2">
              <img src={cyrusEmblem} alt="CYRUS" className="h-8 w-8" />
              <div>
                <h1 className="text-sm font-bold text-cyan-400">CYRUS Drone Control</h1>
                <p className="text-xs text-muted-foreground">Real MAVLink Interface</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-cyan-400" />
            <span className="text-xs text-muted-foreground">MAVLink Protocol</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <MAVLinkControlPanel />
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Connection Guide
              </h3>
              <div className="space-y-4 text-sm text-muted-foreground">
                <div>
                  <h4 className="font-medium text-foreground mb-1">UDP Connection (Recommended)</h4>
                  <p>For telemetry radios (SiK, RFD) or SITL simulator:</p>
                  <code className="block mt-1 bg-slate-900 p-2 rounded text-xs font-mono">
                    Host: 127.0.0.1 | Port: 14550
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">Serial Connection</h4>
                  <p>Direct USB connection to flight controller:</p>
                  <code className="block mt-1 bg-slate-900 p-2 rounded text-xs font-mono">
                    Linux: /dev/ttyACM0 or /dev/ttyUSB0<br />
                    Mac: /dev/tty.usbmodem* or /dev/tty.usbserial*<br />
                    Windows: COM3, COM4, etc.
                  </code>
                </div>

                <div>
                  <h4 className="font-medium text-foreground mb-1">TCP Connection</h4>
                  <p>For WiFi modules or network-connected drones:</p>
                  <code className="block mt-1 bg-slate-900 p-2 rounded text-xs font-mono">
                    Host: 192.168.4.1 | Port: 5760
                  </code>
                </div>

                <div className="pt-2 border-t border-cyan-500/10">
                  <h4 className="font-medium text-foreground mb-1">Testing with Simulator</h4>
                  <p>Use ArduPilot SITL for testing without hardware:</p>
                  <code className="block mt-1 bg-slate-900 p-2 rounded text-xs font-mono overflow-x-auto">
                    sim_vehicle.py -v ArduCopter --console --map
                  </code>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-cyan-500/20 rounded-lg p-4">
              <h3 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                <Plane className="h-4 w-4" />
                Supported Hardware
              </h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <h4 className="font-medium text-foreground mb-1">Flight Controllers</h4>
                  <ul className="text-muted-foreground text-xs space-y-0.5">
                    <li>Pixhawk (all versions)</li>
                    <li>Cube Orange/Black/Purple</li>
                    <li>Matek F405/F765</li>
                    <li>Holybro Durandal/Kakute</li>
                    <li>CUAV V5+/X7/Nora</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-1">Autopilot Firmware</h4>
                  <ul className="text-muted-foreground text-xs space-y-0.5">
                    <li>ArduPilot (ArduCopter)</li>
                    <li>ArduPilot (ArduPlane)</li>
                    <li>ArduPilot (ArduRover)</li>
                    <li>PX4 Autopilot</li>
                    <li>iNAV (partial)</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h3 className="text-sm font-medium text-amber-400 mb-2">Safety Notice</h3>
              <p className="text-xs text-muted-foreground">
                Always ensure proper safety procedures when operating real drones.
                Maintain visual line of sight, check airspace regulations, and have
                a spotter present. Test all commands in simulator first.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
