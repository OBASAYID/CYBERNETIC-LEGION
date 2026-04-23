interface NeedleMechanism {
  id: string;
  type: 'sterile_disposable' | 'retractable';
  gauge: number;
  status: 'ready' | 'inserted' | 'retracted' | 'disposed';
  insertionDepth: number;
  position: { x: number; y: number; z: number };
  sterilized: boolean;
  usageCount: number;
}

interface VacuumSystem {
  id: string;
  status: 'idle' | 'active' | 'complete';
  pressure: number;
  targetPressure: number;
  tubeVolume: number;
  collectedVolume: number;
  flowRate: number;
}

interface VeinDetection {
  detected: boolean;
  confidence: number;
  position: { x: number; y: number; depth: number };
  diameter: number;
  bloodFlow: 'normal' | 'weak' | 'strong';
  infraredReflection: number;
  suitableForSampling: boolean;
}

interface SterilizationSystem {
  uvLightStatus: 'off' | 'active' | 'complete';
  uvIntensity: number;
  exposureTime: number;
  lastSterilized: Date | null;
  sterileZoneActive: boolean;
  pathogenKillRate: number;
}

interface BloodSample {
  id: string;
  collectionTime: Date;
  volume: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
  hemolysis: boolean;
  clotted: boolean;
  temperature: number;
  patientId?: string;
  sampleType: 'venous' | 'capillary' | 'arterial';
  tubeType: string;
  preservative?: string;
}

interface SamplingSession {
  id: string;
  status: 'initializing' | 'positioning' | 'vein_detection' | 'inserting' | 'collecting' | 'retracting' | 'sterilizing' | 'complete' | 'aborted';
  startTime: Date;
  endTime?: Date;
  patientId?: string;
  armPosition: 'left' | 'right';
  needleId: string;
  sample?: BloodSample;
  errors: string[];
  safetyChecks: SafetyCheck[];
}

interface SafetyCheck {
  name: string;
  passed: boolean;
  timestamp: Date;
  details: string;
}

interface ServoMotor {
  id: string;
  position: number;
  targetPosition: number;
  speed: number;
  status: 'idle' | 'moving' | 'error';
}

interface PressureSensor {
  id: string;
  reading: number;
  unit: string;
  status: 'normal' | 'high' | 'low' | 'error';
}

class BloodSamplingSystem {
  private needles: Map<string, NeedleMechanism> = new Map();
  private vacuumSystems: Map<string, VacuumSystem> = new Map();
  private sessions: Map<string, SamplingSession> = new Map();
  private samples: Map<string, BloodSample> = new Map();
  private sterilization!: SterilizationSystem;
  private servoMotors: Map<string, ServoMotor> = new Map();
  private pressureSensors: Map<string, PressureSensor> = new Map();
  private emergencyStop: boolean = false;
  private simulationMode: boolean = true;

  constructor() {
    this.initializeSystem();
    console.log('[Blood Sampling] System initialized - Simulation mode active');
  }

  private initializeSystem(): void {
    this.needles.set('needle_01', {
      id: 'needle_01',
      type: 'sterile_disposable',
      gauge: 21,
      status: 'ready',
      insertionDepth: 0,
      position: { x: 0, y: 0, z: 0 },
      sterilized: true,
      usageCount: 0
    });

    this.vacuumSystems.set('vacuum_01', {
      id: 'vacuum_01',
      status: 'idle',
      pressure: 0,
      targetPressure: -50,
      tubeVolume: 10,
      collectedVolume: 0,
      flowRate: 0
    });

    this.sterilization = {
      uvLightStatus: 'off',
      uvIntensity: 0,
      exposureTime: 0,
      lastSterilized: null,
      sterileZoneActive: false,
      pathogenKillRate: 0
    };

    this.servoMotors.set('needle_servo', {
      id: 'needle_servo',
      position: 0,
      targetPosition: 0,
      speed: 5,
      status: 'idle'
    });

    this.servoMotors.set('arm_positioner', {
      id: 'arm_positioner',
      position: 90,
      targetPosition: 90,
      speed: 3,
      status: 'idle'
    });

    this.pressureSensors.set('vacuum_pressure', {
      id: 'vacuum_pressure',
      reading: 0,
      unit: 'mmHg',
      status: 'normal'
    });

    this.pressureSensors.set('blood_flow', {
      id: 'blood_flow',
      reading: 0,
      unit: 'mL/min',
      status: 'normal'
    });

    console.log('[Blood Sampling] Hardware components initialized');
  }

  async detectVein(armPosition: 'left' | 'right'): Promise<VeinDetection> {
    console.log(`[Blood Sampling] Scanning for veins on ${armPosition} arm...`);

    await this.delay(1500);

    const infraredReflection = 0.3 + Math.random() * 0.2;
    const detected = infraredReflection < 0.45;

    const result: VeinDetection = {
      detected,
      confidence: detected ? 85 + Math.random() * 15 : 20 + Math.random() * 30,
      position: {
        x: 45 + Math.random() * 10,
        y: 30 + Math.random() * 5,
        depth: 2 + Math.random() * 3
      },
      diameter: 3 + Math.random() * 2,
      bloodFlow: detected ? 'normal' : 'weak',
      infraredReflection,
      suitableForSampling: detected && infraredReflection < 0.42
    };

    console.log(`[Blood Sampling] Vein detection: ${detected ? 'SUCCESS' : 'RETRY NEEDED'} (confidence: ${result.confidence.toFixed(1)}%)`);
    return result;
  }

  async startSamplingSession(patientId?: string, armPosition: 'left' | 'right' = 'left'): Promise<SamplingSession> {
    if (this.emergencyStop) {
      throw new Error('Emergency stop active. Reset system before starting new session.');
    }

    const sessionId = `session_${Date.now()}`;
    const session: SamplingSession = {
      id: sessionId,
      status: 'initializing',
      startTime: new Date(),
      patientId,
      armPosition,
      needleId: 'needle_01',
      errors: [],
      safetyChecks: []
    };

    this.sessions.set(sessionId, session);

    session.safetyChecks.push({
      name: 'Needle sterility',
      passed: true,
      timestamp: new Date(),
      details: 'Sterile disposable needle verified'
    });

    session.safetyChecks.push({
      name: 'Vacuum system',
      passed: true,
      timestamp: new Date(),
      details: 'Vacuum pump operational'
    });

    session.safetyChecks.push({
      name: 'UV sterilization',
      passed: true,
      timestamp: new Date(),
      details: 'UV-C LEDs functional'
    });

    console.log(`[Blood Sampling] Session ${sessionId} initialized for ${armPosition} arm`);
    return session;
  }

  async executeFullSamplingSequence(sessionId: string): Promise<BloodSample> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error(`Session ${sessionId} not found`);

    try {
      session.status = 'positioning';
      await this.displayMessage('Place your arm on the rest. Keep still.');
      await this.delay(2000);

      session.status = 'vein_detection';
      await this.displayMessage('Scanning for vein...');
      const veinDetection = await this.detectVein(session.armPosition);
      
      if (!veinDetection.suitableForSampling) {
        session.errors.push('Vein not suitable for sampling');
        session.status = 'aborted';
        throw new Error('Unable to locate suitable vein. Please try other arm.');
      }

      await this.activateSterilization();
      await this.displayMessage('Sterilizing puncture site...');
      await this.delay(3000);

      session.status = 'inserting';
      await this.displayMessage('Inserting needle. Please remain still.');
      await this.insertNeedle(session.needleId, veinDetection.position);

      session.status = 'collecting';
      await this.displayMessage('Collecting blood sample...');
      const sample = await this.collectBlood(sessionId, 5);

      session.status = 'retracting';
      await this.displayMessage('Retracting needle...');
      await this.retractNeedle(session.needleId);

      session.status = 'sterilizing';
      await this.displayMessage('Applying pressure and sterilizing site...');
      await this.postSamplingSterilization();

      session.sample = sample;
      session.status = 'complete';
      session.endTime = new Date();

      await this.displayMessage('Blood sampling complete. Please remove your arm.');

      this.samples.set(sample.id, sample);
      console.log(`[Blood Sampling] Session ${sessionId} completed successfully`);

      return sample;

    } catch (error: any) {
      session.status = 'aborted';
      session.errors.push(error.message);
      await this.emergencyRetract();
      throw error;
    }
  }

  private async insertNeedle(needleId: string, position: { x: number; y: number; depth: number }): Promise<void> {
    const needle = this.needles.get(needleId);
    if (!needle) throw new Error(`Needle ${needleId} not found`);

    const servo = this.servoMotors.get('needle_servo');
    if (servo) {
      servo.status = 'moving';
      servo.targetPosition = 180;
    }

    console.log(`[Blood Sampling] Positioning needle to (${position.x.toFixed(1)}, ${position.y.toFixed(1)})...`);
    await this.delay(1000);

    needle.position = { x: position.x, y: position.y, z: 0 };

    console.log(`[Blood Sampling] Inserting needle to depth ${position.depth.toFixed(1)}mm...`);
    
    for (let depth = 0; depth <= position.depth; depth += 0.5) {
      if (this.emergencyStop) {
        throw new Error('Emergency stop activated during insertion');
      }
      needle.insertionDepth = depth;
      await this.delay(200);
    }

    needle.status = 'inserted';
    if (servo) {
      servo.position = 180;
      servo.status = 'idle';
    }

    console.log('[Blood Sampling] Needle insertion complete');
  }

  private async collectBlood(sessionId: string, targetVolume: number): Promise<BloodSample> {
    const vacuum = this.vacuumSystems.get('vacuum_01');
    if (!vacuum) throw new Error('Vacuum system not found');

    vacuum.status = 'active';
    console.log(`[Blood Sampling] Activating vacuum pump. Target: ${targetVolume}mL`);

    const flowSensor = this.pressureSensors.get('blood_flow');
    
    while (vacuum.collectedVolume < targetVolume) {
      if (this.emergencyStop) {
        vacuum.status = 'idle';
        throw new Error('Emergency stop activated during collection');
      }

      vacuum.pressure = -45 + Math.random() * 10;
      vacuum.flowRate = 0.8 + Math.random() * 0.4;
      vacuum.collectedVolume += vacuum.flowRate * 0.5;

      if (flowSensor) {
        flowSensor.reading = vacuum.flowRate;
      }

      await this.delay(500);
    }

    vacuum.status = 'complete';
    vacuum.collectedVolume = Math.min(vacuum.collectedVolume, vacuum.tubeVolume);

    const sample: BloodSample = {
      id: `sample_${Date.now()}`,
      collectionTime: new Date(),
      volume: vacuum.collectedVolume,
      quality: vacuum.collectedVolume >= targetVolume * 0.9 ? 'excellent' : 'good',
      hemolysis: false,
      clotted: false,
      temperature: 36.5 + Math.random() * 1,
      patientId: this.sessions.get(sessionId)?.patientId,
      sampleType: 'venous',
      tubeType: 'EDTA Purple Top',
      preservative: 'K2-EDTA'
    };

    console.log(`[Blood Sampling] Collection complete. Volume: ${sample.volume.toFixed(2)}mL`);
    return sample;
  }

  private async retractNeedle(needleId: string): Promise<void> {
    const needle = this.needles.get(needleId);
    if (!needle) throw new Error(`Needle ${needleId} not found`);

    const servo = this.servoMotors.get('needle_servo');
    if (servo) {
      servo.status = 'moving';
      servo.targetPosition = 0;
    }

    console.log('[Blood Sampling] Retracting needle...');

    while (needle.insertionDepth > 0) {
      needle.insertionDepth -= 0.5;
      await this.delay(100);
    }

    needle.status = 'retracted';
    needle.usageCount++;

    if (servo) {
      servo.position = 0;
      servo.status = 'idle';
    }

    console.log('[Blood Sampling] Needle retracted and disposed');
    needle.status = 'disposed';
  }

  async activateSterilization(): Promise<void> {
    console.log('[Blood Sampling] Activating UV-C sterilization...');
    
    this.sterilization.uvLightStatus = 'active';
    this.sterilization.uvIntensity = 100;
    this.sterilization.sterileZoneActive = true;

    const exposureTime = 10;
    for (let t = 0; t < exposureTime; t++) {
      this.sterilization.exposureTime = t + 1;
      this.sterilization.pathogenKillRate = Math.min(99.99, (t + 1) / exposureTime * 99.99);
      await this.delay(100);
    }

    this.sterilization.uvLightStatus = 'complete';
    this.sterilization.lastSterilized = new Date();

    console.log(`[Blood Sampling] Sterilization complete. Pathogen kill rate: ${this.sterilization.pathogenKillRate.toFixed(2)}%`);
  }

  private async postSamplingSterilization(): Promise<void> {
    this.sterilization.sterileZoneActive = true;
    this.sterilization.uvLightStatus = 'active';
    await this.delay(2000);
    this.sterilization.uvLightStatus = 'complete';
    this.sterilization.sterileZoneActive = false;
  }

  async emergencyRetract(): Promise<void> {
    console.log('[Blood Sampling] EMERGENCY RETRACT ACTIVATED');
    
    this.emergencyStop = true;

    for (const [id, needle] of this.needles) {
      if (needle.status === 'inserted') {
        needle.insertionDepth = 0;
        needle.status = 'retracted';
      }
    }

    for (const [id, vacuum] of this.vacuumSystems) {
      vacuum.status = 'idle';
      vacuum.pressure = 0;
    }

    for (const [id, servo] of this.servoMotors) {
      servo.targetPosition = 0;
      servo.position = 0;
      servo.status = 'idle';
    }

    console.log('[Blood Sampling] All systems returned to safe state');
  }

  resetEmergencyStop(): void {
    this.emergencyStop = false;
    console.log('[Blood Sampling] Emergency stop reset. System ready.');
  }

  private async displayMessage(message: string): Promise<void> {
    console.log(`[Blood Sampling UI] ${message}`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.simulationMode ? ms / 10 : ms));
  }

  async controlServo(servoId: string, position: number): Promise<ServoMotor> {
    const servo = this.servoMotors.get(servoId);
    if (!servo) throw new Error(`Servo ${servoId} not found`);

    servo.targetPosition = Math.max(0, Math.min(180, position));
    servo.status = 'moving';

    const step = servo.targetPosition > servo.position ? 1 : -1;
    while (servo.position !== servo.targetPosition) {
      servo.position += step;
      await this.delay(10);
    }

    servo.status = 'idle';
    return servo;
  }

  async controlVacuumPump(action: 'start' | 'stop', targetPressure?: number): Promise<VacuumSystem> {
    const vacuum = this.vacuumSystems.get('vacuum_01');
    if (!vacuum) throw new Error('Vacuum system not found');

    if (action === 'start') {
      vacuum.status = 'active';
      vacuum.targetPressure = targetPressure || -50;
      console.log(`[Blood Sampling] Vacuum pump started. Target: ${vacuum.targetPressure} mmHg`);
    } else {
      vacuum.status = 'idle';
      vacuum.pressure = 0;
      vacuum.flowRate = 0;
      console.log('[Blood Sampling] Vacuum pump stopped');
    }

    return vacuum;
  }

  async analyzeSampleQuality(sampleId: string): Promise<any> {
    const sample = this.samples.get(sampleId);
    if (!sample) throw new Error(`Sample ${sampleId} not found`);

    const analysis = {
      sampleId: sample.id,
      volume: sample.volume,
      volumeAdequate: sample.volume >= 3,
      quality: sample.quality,
      hemolysis: sample.hemolysis,
      hemolysisIndex: sample.hemolysis ? 50 + Math.random() * 200 : Math.random() * 20,
      clotted: sample.clotted,
      lipemia: Math.random() < 0.05,
      temperature: sample.temperature,
      temperatureOk: sample.temperature >= 35 && sample.temperature <= 38,
      timeToProcess: Math.floor((Date.now() - sample.collectionTime.getTime()) / 60000),
      suitableForAnalysis: !sample.hemolysis && !sample.clotted && sample.volume >= 3,
      recommendations: [] as string[]
    };

    if (!analysis.suitableForAnalysis) {
      if (sample.hemolysis) analysis.recommendations.push('Recollect sample - hemolysis detected');
      if (sample.clotted) analysis.recommendations.push('Recollect sample - clotting present');
      if (sample.volume < 3) analysis.recommendations.push('Recollect sample - insufficient volume');
    } else {
      analysis.recommendations.push('Sample suitable for CBC, BMP, and standard chemistry panels');
    }

    return analysis;
  }

  getSample(sampleId: string): BloodSample | undefined {
    return this.samples.get(sampleId);
  }

  getSession(sessionId: string): SamplingSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): SamplingSession[] {
    return Array.from(this.sessions.values());
  }

  getAllSamples(): BloodSample[] {
    return Array.from(this.samples.values());
  }

  getSystemStatus(): any {
    const needlesArray = Array.from(this.needles.values());
    const vacuumArray = Array.from(this.vacuumSystems.values());
    const servosArray = Array.from(this.servoMotors.values());
    const sensorsArray = Array.from(this.pressureSensors.values());

    return {
      operational: !this.emergencyStop,
      simulationMode: this.simulationMode,
      needles: {
        count: needlesArray.length,
        ready: needlesArray.filter(n => n.status === 'ready').length,
        details: needlesArray
      },
      vacuumSystem: vacuumArray[0],
      sterilization: this.sterilization,
      servoMotors: servosArray,
      pressureSensors: sensorsArray,
      activeSessions: Array.from(this.sessions.values()).filter(
        s => !['complete', 'aborted'].includes(s.status)
      ).length,
      completedSamples: this.samples.size,
      emergencyStopActive: this.emergencyStop
    };
  }

  getStatus(): any {
    return {
      operational: !this.emergencyStop,
      simulationMode: this.simulationMode,
      needlesReady: Array.from(this.needles.values()).filter(n => n.status === 'ready').length,
      activeSessions: Array.from(this.sessions.values()).filter(
        s => !['complete', 'aborted'].includes(s.status)
      ).length,
      completedSamples: this.samples.size,
      sterilizationReady: this.sterilization.uvLightStatus !== 'active',
      emergencyStop: this.emergencyStop
    };
  }
}

export const bloodSamplingSystem = new BloodSamplingSystem();
