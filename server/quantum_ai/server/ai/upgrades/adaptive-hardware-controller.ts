import OpenAI from "openai";

let openaiClient: OpenAI | null = null;

function getOpenAI(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

interface HardwareDevice {
  id: string;
  name: string;
  type: 'robot' | 'drone' | 'sensor' | 'actuator' | 'iot' | 'vehicle' | 'industrial';
  status: 'online' | 'offline' | 'error' | 'maintenance' | 'standby';
  connectionType: 'mqtt' | 'ros' | 'http' | 'websocket' | 'serial' | 'bluetooth' | 'zigbee';
  capabilities: string[];
  telemetry: Record<string, number | string | boolean>;
  lastUpdate: Date;
}

interface ROSNode {
  id: string;
  name: string;
  namespace: string;
  publishedTopics: string[];
  subscribedTopics: string[];
  services: string[];
  actions: string[];
  status: 'active' | 'inactive';
}

interface IOTDevice {
  id: string;
  name: string;
  protocol: 'mqtt' | 'coap' | 'http' | 'modbus' | 'zigbee' | 'zwave';
  sensors: { name: string; type: string; value: number; unit: string }[];
  actuators: { name: string; type: string; state: any }[];
  lastSeen: Date;
}

interface RoboticArm {
  id: string;
  name: string;
  joints: { id: string; angle: number; velocity: number; torque: number }[];
  endEffector: { type: string; state: 'open' | 'closed' | 'gripping'; force: number };
  position: { x: number; y: number; z: number };
  orientation: { roll: number; pitch: number; yaw: number };
  mode: 'idle' | 'moving' | 'gripping' | 'homing' | 'error';
}

interface HardwareCommand {
  id: string;
  deviceId: string;
  type: 'move' | 'grip' | 'sense' | 'configure' | 'stop' | 'home' | 'custom';
  parameters: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: 'pending' | 'executing' | 'completed' | 'failed';
  result?: any;
  timestamp: Date;
}

interface AutonomousBehavior {
  id: string;
  name: string;
  type: 'patrol' | 'follow' | 'avoid' | 'search' | 'monitor' | 'custom';
  active: boolean;
  parameters: Record<string, any>;
  triggers: { condition: string; action: string }[];
}

export class AdaptiveHardwareController {
  private devices: Map<string, HardwareDevice> = new Map();
  private rosNodes: Map<string, ROSNode> = new Map();
  private iotDevices: Map<string, IOTDevice> = new Map();
  private roboticArms: Map<string, RoboticArm> = new Map();
  private commands: Map<string, HardwareCommand> = new Map();
  private behaviors: Map<string, AutonomousBehavior> = new Map();
  private commandQueue: HardwareCommand[] = [];

  constructor() {
    console.log("[Adaptive Hardware Controller] Initializing IoT and robotics command interface");
    this.initializeSimulatedDevices();
    this.startTelemetrySimulation();
  }

  private initializeSimulatedDevices(): void {
    this.registerDevice({
      name: 'CYRUS Mobile Platform',
      type: 'robot',
      connectionType: 'ros',
      capabilities: ['navigation', 'mapping', 'object_detection', 'manipulation'],
      telemetry: {
        battery: 85,
        speed: 0,
        heading: 0,
        latitude: 0,
        longitude: 0,
        cpuTemp: 45
      }
    });

    this.registerDevice({
      name: 'Environment Sensor Array',
      type: 'sensor',
      connectionType: 'mqtt',
      capabilities: ['temperature', 'humidity', 'air_quality', 'motion', 'light'],
      telemetry: {
        temperature: 22.5,
        humidity: 45,
        airQuality: 85,
        motion: false,
        lightLevel: 500
      }
    });

    this.registerDevice({
      name: 'Smart Actuator Hub',
      type: 'actuator',
      connectionType: 'zigbee',
      capabilities: ['relay_control', 'dimming', 'motor_control'],
      telemetry: {
        relay1: false,
        relay2: false,
        dimmer1: 0,
        motorSpeed: 0
      }
    });

    this.registerRoboticArm({
      name: 'CYRUS Manipulation Arm',
      joints: [
        { id: 'joint1', angle: 0, velocity: 0, torque: 0 },
        { id: 'joint2', angle: 45, velocity: 0, torque: 0 },
        { id: 'joint3', angle: -30, velocity: 0, torque: 0 },
        { id: 'joint4', angle: 0, velocity: 0, torque: 0 },
        { id: 'joint5', angle: -45, velocity: 0, torque: 0 },
        { id: 'joint6', angle: 0, velocity: 0, torque: 0 }
      ],
      endEffector: { type: 'gripper', state: 'open', force: 0 },
      position: { x: 0.5, y: 0, z: 0.3 },
      orientation: { roll: 0, pitch: 90, yaw: 0 }
    });

    this.registerROSNode({
      name: 'navigation_node',
      namespace: '/cyrus',
      publishedTopics: ['/cmd_vel', '/path', '/goal_status'],
      subscribedTopics: ['/odom', '/scan', '/goal'],
      services: ['/set_goal', '/cancel_goal', '/get_plan'],
      actions: ['navigate_to_pose', 'follow_path']
    });

    this.registerIOTDevice({
      name: 'Smart Thermostat',
      protocol: 'mqtt',
      sensors: [
        { name: 'temperature', type: 'temperature', value: 22, unit: '°C' },
        { name: 'humidity', type: 'humidity', value: 45, unit: '%' }
      ],
      actuators: [
        { name: 'hvac', type: 'climate', state: { mode: 'auto', setpoint: 22 } }
      ]
    });
  }

  private startTelemetrySimulation(): void {
    setInterval(() => {
      for (const device of this.devices.values()) {
        if (device.status === 'online') {
          this.updateTelemetry(device);
        }
      }

      for (const arm of this.roboticArms.values()) {
        this.simulateArmMovement(arm);
      }

      this.processCommandQueue();
    }, 100);
  }

  private updateTelemetry(device: HardwareDevice): void {
    if (device.telemetry.battery !== undefined) {
      device.telemetry.battery = Math.max(0, (device.telemetry.battery as number) - 0.001);
    }
    if (device.telemetry.temperature !== undefined) {
      device.telemetry.temperature = (device.telemetry.temperature as number) + (Math.random() - 0.5) * 0.1;
    }
    if (device.telemetry.cpuTemp !== undefined) {
      device.telemetry.cpuTemp = 40 + Math.random() * 15;
    }
    device.lastUpdate = new Date();
  }

  private simulateArmMovement(arm: RoboticArm): void {
    if (arm.mode === 'moving') {
      for (const joint of arm.joints) {
        if (joint.velocity !== 0) {
          joint.angle += joint.velocity * 0.1;
          joint.angle = Math.max(-180, Math.min(180, joint.angle));
        }
      }
    }
  }

  private processCommandQueue(): void {
    if (this.commandQueue.length === 0) return;

    const command = this.commandQueue.shift();
    if (!command) return;

    command.status = 'executing';
    this.executeCommand(command);
  }

  registerDevice(config: Omit<HardwareDevice, 'id' | 'status' | 'lastUpdate'>): HardwareDevice {
    const device: HardwareDevice = {
      ...config,
      id: `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'online',
      lastUpdate: new Date()
    };

    this.devices.set(device.id, device);
    return device;
  }

  registerROSNode(config: Omit<ROSNode, 'id' | 'status'>): ROSNode {
    const node: ROSNode = {
      ...config,
      id: `ros_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      status: 'active'
    };

    this.rosNodes.set(node.id, node);
    return node;
  }

  registerIOTDevice(config: Omit<IOTDevice, 'id' | 'lastSeen'>): IOTDevice {
    const device: IOTDevice = {
      ...config,
      id: `iot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      lastSeen: new Date()
    };

    this.iotDevices.set(device.id, device);
    return device;
  }

  registerRoboticArm(config: Omit<RoboticArm, 'id' | 'mode'>): RoboticArm {
    const arm: RoboticArm = {
      ...config,
      id: `arm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      mode: 'idle'
    };

    this.roboticArms.set(arm.id, arm);
    return arm;
  }

  sendCommand(config: {
    deviceId: string;
    type: HardwareCommand['type'];
    parameters: Record<string, any>;
    priority?: HardwareCommand['priority'];
  }): HardwareCommand {
    const command: HardwareCommand = {
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      deviceId: config.deviceId,
      type: config.type,
      parameters: config.parameters,
      priority: config.priority || 'normal',
      status: 'pending',
      timestamp: new Date()
    };

    this.commands.set(command.id, command);

    if (config.priority === 'critical') {
      this.commandQueue.unshift(command);
    } else {
      this.commandQueue.push(command);
    }

    return command;
  }

  private executeCommand(command: HardwareCommand): void {
    setTimeout(() => {
      command.status = 'completed';

      switch (command.type) {
        case 'move':
          command.result = { success: true, finalPosition: command.parameters.target };
          break;
        case 'grip':
          command.result = { success: true, gripped: true, force: command.parameters.force || 10 };
          break;
        case 'sense':
          command.result = { success: true, readings: { value: Math.random() * 100 } };
          break;
        case 'home':
          command.result = { success: true, position: { x: 0, y: 0, z: 0 } };
          break;
        default:
          command.result = { success: true };
      }
    }, 500 + Math.random() * 500);
  }

  moveRoboticArm(armId: string, target: { x: number; y: number; z: number }): HardwareCommand {
    const arm = this.roboticArms.get(armId);
    if (!arm) throw new Error(`Arm ${armId} not found`);

    arm.mode = 'moving';

    setTimeout(() => {
      arm.position = target;
      arm.mode = 'idle';
    }, 2000);

    return this.sendCommand({
      deviceId: armId,
      type: 'move',
      parameters: { target },
      priority: 'normal'
    });
  }

  controlGripper(armId: string, action: 'open' | 'close', force?: number): HardwareCommand {
    const arm = this.roboticArms.get(armId);
    if (!arm) throw new Error(`Arm ${armId} not found`);

    arm.mode = 'gripping';
    arm.endEffector.state = action === 'close' ? 'gripping' : 'open';
    arm.endEffector.force = action === 'close' ? (force || 10) : 0;

    setTimeout(() => {
      arm.endEffector.state = action === 'close' ? 'closed' : 'open';
      arm.mode = 'idle';
    }, 1000);

    return this.sendCommand({
      deviceId: armId,
      type: 'grip',
      parameters: { action, force },
      priority: 'normal'
    });
  }

  publishToROSTopic(nodeId: string, topic: string, message: any): boolean {
    const node = this.rosNodes.get(nodeId);
    if (!node) return false;

    if (!node.publishedTopics.includes(topic)) return false;

    console.log(`[ROS] Publishing to ${topic}:`, message);
    return true;
  }

  setIOTActuator(deviceId: string, actuatorName: string, state: any): boolean {
    const device = this.iotDevices.get(deviceId);
    if (!device) return false;

    const actuator = device.actuators.find(a => a.name === actuatorName);
    if (!actuator) return false;

    actuator.state = state;
    return true;
  }

  readIOTSensor(deviceId: string, sensorName: string): { name: string; type: string; value: number; unit: string } | null {
    const device = this.iotDevices.get(deviceId);
    if (!device) return null;

    const sensor = device.sensors.find(s => s.name === sensorName);
    return sensor || null;
  }

  createAutonomousBehavior(config: Omit<AutonomousBehavior, 'id' | 'active'>): AutonomousBehavior {
    const behavior: AutonomousBehavior = {
      ...config,
      id: `behavior_${Date.now()}`,
      active: false
    };

    this.behaviors.set(behavior.id, behavior);
    return behavior;
  }

  activateBehavior(behaviorId: string): boolean {
    const behavior = this.behaviors.get(behaviorId);
    if (!behavior) return false;

    behavior.active = true;
    return true;
  }

  async interpretHardwareCommand(naturalLanguage: string): Promise<{
    interpretation: string;
    suggestedCommands: { deviceId: string; type: HardwareCommand['type']; parameters: Record<string, any> }[];
    executed: boolean;
  }> {
    const devices = this.getDevices();
    const arms = this.getRoboticArms();

    const suggestedCommands: { deviceId: string; type: HardwareCommand['type']; parameters: Record<string, any> }[] = [];

    const lowerInput = naturalLanguage.toLowerCase();

    if (lowerInput.includes('move') && arms.length > 0) {
      suggestedCommands.push({
        deviceId: arms[0].id,
        type: 'move',
        parameters: { target: { x: 0.5, y: 0.5, z: 0.3 } }
      });
    }

    if (lowerInput.includes('grip') || lowerInput.includes('grab')) {
      if (arms.length > 0) {
        suggestedCommands.push({
          deviceId: arms[0].id,
          type: 'grip',
          parameters: { action: 'close', force: 15 }
        });
      }
    }

    if (lowerInput.includes('home') || lowerInput.includes('reset')) {
      if (arms.length > 0) {
        suggestedCommands.push({
          deviceId: arms[0].id,
          type: 'home',
          parameters: {}
        });
      }
    }

    const openai = getOpenAI();
    if (!openai) {
      return {
        interpretation: `Command parsed: "${naturalLanguage}" [AI unavailable]`,
        suggestedCommands,
        executed: false
      };
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are CYRUS's Adaptive Hardware Controller. Interpret natural language commands for robotics and IoT devices.
Available devices: ${JSON.stringify(devices.map(d => ({ id: d.id, name: d.name, type: d.type })))}
Available robotic arms: ${JSON.stringify(arms.map(a => ({ id: a.id, name: a.name })))}`
          },
          { role: "user", content: naturalLanguage }
        ],
        max_tokens: 400
      });

      return {
        interpretation: response.choices[0].message.content || "Command interpreted.",
        suggestedCommands,
        executed: false
      };
    } catch (error) {
      return {
        interpretation: `Parsed command: "${naturalLanguage}". Found ${suggestedCommands.length} applicable actions for ${devices.length} devices.`,
        suggestedCommands,
        executed: false
      };
    }
  }

  getDevices(): HardwareDevice[] {
    return Array.from(this.devices.values());
  }

  getROSNodes(): ROSNode[] {
    return Array.from(this.rosNodes.values());
  }

  getIOTDevices(): IOTDevice[] {
    return Array.from(this.iotDevices.values());
  }

  getRoboticArms(): RoboticArm[] {
    return Array.from(this.roboticArms.values());
  }

  getBehaviors(): AutonomousBehavior[] {
    return Array.from(this.behaviors.values());
  }

  getStatus(): {
    deviceCount: number;
    rosNodeCount: number;
    iotDeviceCount: number;
    armCount: number;
    behaviorCount: number;
    pendingCommands: number;
    onlineDevices: number;
  } {
    return {
      deviceCount: this.devices.size,
      rosNodeCount: this.rosNodes.size,
      iotDeviceCount: this.iotDevices.size,
      armCount: this.roboticArms.size,
      behaviorCount: this.behaviors.size,
      pendingCommands: this.commandQueue.length,
      onlineDevices: Array.from(this.devices.values()).filter(d => d.status === 'online').length
    };
  }
}

export const adaptiveHardwareController = new AdaptiveHardwareController();
