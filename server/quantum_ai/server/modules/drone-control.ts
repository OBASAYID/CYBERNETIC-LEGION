import { EventEmitter } from 'events';

export interface DroneState {
  connected: boolean;
  armed: boolean;
  mode: 'STABILIZE' | 'LOITER' | 'AUTO' | 'GUIDED' | 'RTL' | 'LAND';
  battery: number;
  altitude: number;
  speed: number;
  heading: number;
  latitude: number;
  longitude: number;
  satellites: number;
  signalStrength: number;
  flightTime: number;
  lastUpdate: Date;
}

export interface Waypoint {
  id: string;
  latitude: number;
  longitude: number;
  altitude: number;
  speed?: number;
  holdTime?: number;
  action?: 'waypoint' | 'takeoff' | 'land' | 'rtl' | 'loiter';
}

export interface Mission {
  id: string;
  name: string;
  waypoints: Waypoint[];
  status: 'pending' | 'active' | 'paused' | 'completed' | 'aborted';
  createdAt: Date;
}

export interface DroneCommand {
  type: 'arm' | 'disarm' | 'takeoff' | 'land' | 'rtl' | 'goto' | 'set_mode' | 'emergency_stop';
  params?: Record<string, any>;
}

class DroneController extends EventEmitter {
  private state: DroneState;
  private missions: Mission[] = [];
  private activeMission: Mission | null = null;
  private connectionType: 'wifi' | 'serial' | 'mavlink' | null = null;
  private simulationMode: boolean = true;
  private simulationInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.state = this.getDefaultState();
    console.log('[Drone Control] Module initialized - Simulation mode active');
  }

  private getDefaultState(): DroneState {
    return {
      connected: false,
      armed: false,
      mode: 'STABILIZE',
      battery: 100,
      altitude: 0,
      speed: 0,
      heading: 0,
      latitude: -24.6282,
      longitude: 25.9231,
      satellites: 0,
      signalStrength: 0,
      flightTime: 0,
      lastUpdate: new Date(),
    };
  }

  async connect(connectionType: 'wifi' | 'serial' | 'mavlink', params?: { host?: string; port?: number; baudRate?: number }): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`[Drone Control] Attempting ${connectionType} connection...`);
      
      if (this.simulationMode) {
        await this.delay(1000);
        this.connectionType = connectionType;
        this.state.connected = true;
        this.state.satellites = 12;
        this.state.signalStrength = 85;
        this.state.lastUpdate = new Date();
        
        this.startSimulation();
        this.emit('connected', { type: connectionType });
        
        return {
          success: true,
          message: `Connected to drone via ${connectionType} (Simulation Mode)`
        };
      }

      return {
        success: false,
        message: 'Real drone connection requires MAVLink hardware interface'
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Connection failed: ${error.message}`
      };
    }
  }

  async disconnect(): Promise<{ success: boolean; message: string }> {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    this.state = this.getDefaultState();
    this.connectionType = null;
    this.emit('disconnected');
    
    return {
      success: true,
      message: 'Disconnected from drone'
    };
  }

  private startSimulation() {
    if (this.simulationInterval) return;
    
    this.simulationInterval = setInterval(() => {
      if (!this.state.connected) return;

      if (this.state.armed && this.state.altitude > 0) {
        this.state.flightTime += 1;
        this.state.battery = Math.max(0, this.state.battery - 0.01);
        
        if (this.state.mode === 'AUTO' && this.activeMission) {
          this.state.heading = (this.state.heading + 1) % 360;
          this.state.latitude += (Math.random() - 0.5) * 0.0001;
          this.state.longitude += (Math.random() - 0.5) * 0.0001;
        }
      }
      
      this.state.signalStrength = 80 + Math.random() * 15;
      this.state.satellites = 10 + Math.floor(Math.random() * 4);
      this.state.lastUpdate = new Date();
      
      this.emit('telemetry', this.state);
    }, 1000);
  }

  async executeCommand(command: DroneCommand): Promise<{ success: boolean; message: string; data?: any }> {
    if (!this.state.connected) {
      return { success: false, message: 'Drone not connected' };
    }

    console.log(`[Drone Control] Executing command: ${command.type}`);

    switch (command.type) {
      case 'arm':
        if (this.state.battery < 20) {
          return { success: false, message: 'Battery too low to arm (< 20%)' };
        }
        await this.delay(500);
        this.state.armed = true;
        this.emit('armed');
        return { success: true, message: 'Drone armed successfully' };

      case 'disarm':
        if (this.state.altitude > 1) {
          return { success: false, message: 'Cannot disarm while in flight. Land first.' };
        }
        await this.delay(500);
        this.state.armed = false;
        this.emit('disarmed');
        return { success: true, message: 'Drone disarmed' };

      case 'takeoff':
        if (!this.state.armed) {
          return { success: false, message: 'Drone must be armed first' };
        }
        const targetAltitude = command.params?.altitude || 10;
        this.state.mode = 'GUIDED';
        
        const takeoffInterval = setInterval(() => {
          if (this.state.altitude < targetAltitude) {
            this.state.altitude += 0.5;
            this.state.speed = 2;
          } else {
            clearInterval(takeoffInterval);
            this.state.speed = 0;
            this.state.mode = 'LOITER';
            this.emit('takeoff_complete', { altitude: this.state.altitude });
          }
        }, 100);
        
        return { success: true, message: `Taking off to ${targetAltitude}m` };

      case 'land':
        this.state.mode = 'LAND';
        
        const landInterval = setInterval(() => {
          if (this.state.altitude > 0) {
            this.state.altitude = Math.max(0, this.state.altitude - 0.3);
            this.state.speed = 1.5;
          } else {
            clearInterval(landInterval);
            this.state.speed = 0;
            this.state.armed = false;
            this.state.mode = 'STABILIZE';
            this.emit('landed');
          }
        }, 100);
        
        return { success: true, message: 'Landing initiated' };

      case 'rtl':
        this.state.mode = 'RTL';
        return { success: true, message: 'Return to Launch initiated' };

      case 'goto':
        if (!command.params?.latitude || !command.params?.longitude) {
          return { success: false, message: 'Missing coordinates for goto command' };
        }
        this.state.mode = 'GUIDED';
        return { 
          success: true, 
          message: `Flying to ${command.params.latitude}, ${command.params.longitude}`,
          data: { targetLat: command.params.latitude, targetLon: command.params.longitude }
        };

      case 'set_mode':
        const mode = command.params?.mode as DroneState['mode'];
        if (!mode) {
          return { success: false, message: 'Mode not specified' };
        }
        this.state.mode = mode;
        return { success: true, message: `Mode set to ${mode}` };

      case 'emergency_stop':
        this.state.mode = 'STABILIZE';
        this.state.speed = 0;
        this.emit('emergency_stop');
        return { success: true, message: 'EMERGENCY STOP ACTIVATED' };

      default:
        return { success: false, message: 'Unknown command' };
    }
  }

  async createMission(name: string, waypoints: Omit<Waypoint, 'id'>[]): Promise<{ success: boolean; mission?: Mission; message: string }> {
    const mission: Mission = {
      id: `mission_${Date.now()}`,
      name,
      waypoints: waypoints.map((wp, i) => ({ ...wp, id: `wp_${i}` })),
      status: 'pending',
      createdAt: new Date(),
    };
    
    this.missions.push(mission);
    
    return {
      success: true,
      mission,
      message: `Mission "${name}" created with ${waypoints.length} waypoints`
    };
  }

  async startMission(missionId: string): Promise<{ success: boolean; message: string }> {
    const mission = this.missions.find(m => m.id === missionId);
    if (!mission) {
      return { success: false, message: 'Mission not found' };
    }
    
    if (!this.state.connected || !this.state.armed) {
      return { success: false, message: 'Drone must be connected and armed' };
    }
    
    this.activeMission = mission;
    mission.status = 'active';
    this.state.mode = 'AUTO';
    this.emit('mission_started', mission);
    
    return { success: true, message: `Mission "${mission.name}" started` };
  }

  async abortMission(): Promise<{ success: boolean; message: string }> {
    if (!this.activeMission) {
      return { success: false, message: 'No active mission' };
    }
    
    this.activeMission.status = 'aborted';
    this.activeMission = null;
    this.state.mode = 'LOITER';
    this.emit('mission_aborted');
    
    return { success: true, message: 'Mission aborted - Hovering in place' };
  }

  getState(): DroneState {
    return { ...this.state };
  }

  getMissions(): Mission[] {
    return [...this.missions];
  }

  getActiveMission(): Mission | null {
    return this.activeMission;
  }

  isSimulationMode(): boolean {
    return this.simulationMode;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const droneController = new DroneController();
