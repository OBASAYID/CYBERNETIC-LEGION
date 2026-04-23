import { Express } from "express";

let biologyModule: any;
let environmentalSensing: any;
let medicalDiagnostics: any;
let roboticIntegration: any;
let teachingModule: any;
let securityEncryption: any;
let bloodSamplingSystem: any;
let interactiveLoaded = false;

async function ensureInteractiveLoaded() {
  if (interactiveLoaded) return;
  const m1 = await import("./biology-module");
  biologyModule = m1.biologyModule;
  const m2 = await import("./environmental-sensing");
  environmentalSensing = m2.environmentalSensing;
  const m3 = await import("./medical-diagnostics");
  medicalDiagnostics = m3.medicalDiagnostics;
  const m4 = await import("./robotic-integration");
  roboticIntegration = m4.roboticIntegration;
  const m5 = await import("./teaching-module");
  teachingModule = m5.teachingModule;
  const m6 = await import("./security-encryption");
  securityEncryption = m6.securityEncryption;
  const m7 = await import("./blood-sampling-system");
  bloodSamplingSystem = m7.bloodSamplingSystem;
  interactiveLoaded = true;
}

export function registerInteractiveRoutes(app: Express): void {
  console.log("[Interactive Systems] Registering API routes");

  setTimeout(() => {
    ensureInteractiveLoaded().catch(e => console.error("[Interactive] Load error:", e));
  }, 3000);

  app.use("/api/interactive", async (req, res, next) => {
    try {
      await ensureInteractiveLoaded();
      next();
    } catch (e) {
      res.status(503).json({ error: "Interactive modules still loading" });
    }
  });

  // ============ BIOLOGY MODULE ROUTES ============
  
  app.post("/api/interactive/biology/dna/analyze", async (req, res) => {
    try {
      const { sampleSequence, referenceSequence } = req.body;
      if (!sampleSequence) {
        return res.status(400).json({ success: false, error: "Sample sequence required" });
      }
      const result = biologyModule.analyzeDNA(sampleSequence, referenceSequence);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/biology/pathogen/detect", async (req, res) => {
    try {
      const { type, markers, symptoms } = req.body;
      const result = await biologyModule.detectPathogen({ type, markers, symptoms });
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/biology/venom/analyze", async (req, res) => {
    try {
      const { toxinMarkers, enzymeActivity, symptoms } = req.body;
      const result = await biologyModule.analyzeVenom({ toxinMarkers, enzymeActivity, symptoms });
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/biology/molecules/analyze", async (req, res) => {
    try {
      const { type, values } = req.body;
      const result = biologyModule.analyzeMolecules({ type, values });
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/biology/biosensors", (req, res) => {
    res.json({ success: true, sensors: biologyModule.getBiosensorReadings() });
  });

  app.get("/api/interactive/biology/status", (req, res) => {
    res.json({ success: true, status: biologyModule.getStatus() });
  });

  // ============ ENVIRONMENTAL SENSING ROUTES ============

  app.get("/api/interactive/environmental/sensors", (req, res) => {
    res.json({ success: true, sensors: environmentalSensing.getSensorReadings() });
  });

  app.post("/api/interactive/environmental/sensor/update", (req, res) => {
    try {
      const { sensorId, concentration, unit } = req.body;
      const result = environmentalSensing.updateSensorReading(sensorId, concentration, unit);
      if (!result) {
        return res.status(404).json({ success: false, error: "Sensor not found" });
      }
      res.json({ success: true, sensor: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/environmental/air-quality", (req, res) => {
    res.json({ success: true, analysis: environmentalSensing.analyzeAirQuality() });
  });

  app.get("/api/interactive/environmental/hazards", (req, res) => {
    res.json({ success: true, hazards: environmentalSensing.detectHazards() });
  });

  app.get("/api/interactive/environmental/atmospheric", (req, res) => {
    res.json({ success: true, conditions: environmentalSensing.getAtmosphericConditions() });
  });

  app.post("/api/interactive/environmental/atmospheric", (req, res) => {
    try {
      environmentalSensing.updateAtmosphericConditions(req.body);
      res.json({ success: true, conditions: environmentalSensing.getAtmosphericConditions() });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/environmental/voc/analyze", (req, res) => {
    try {
      const { readings } = req.body;
      const result = environmentalSensing.analyzeVOCs(readings || {});
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/environmental/report", async (req, res) => {
    try {
      const report = await environmentalSensing.getEnvironmentalReport();
      res.json({ success: true, report });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/environmental/status", (req, res) => {
    res.json({ success: true, status: environmentalSensing.getStatus() });
  });

  // ============ MEDICAL DIAGNOSTICS ROUTES ============

  app.post("/api/interactive/medical/symptoms/analyze", async (req, res) => {
    try {
      const { symptoms, patientInfo } = req.body;
      if (!symptoms || !Array.isArray(symptoms)) {
        return res.status(400).json({ success: false, error: "Symptoms array required" });
      }
      const result = await medicalDiagnostics.analyzeSymptoms(symptoms, patientInfo);
      res.json({ success: true, diagnosis: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/medical/vitals/analyze", (req, res) => {
    try {
      const vitals = req.body;
      const result = medicalDiagnostics.analyzeVitalSigns(vitals);
      res.json({ success: true, analysis: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/medical/image/analyze", async (req, res) => {
    try {
      const { imageData, imageType } = req.body;
      if (!imageData || !imageType) {
        return res.status(400).json({ success: false, error: "Image data and type required" });
      }
      const result = await medicalDiagnostics.analyzeMedicalImage(imageData, imageType);
      res.json({ success: true, analysis: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/medical/patient/register", (req, res) => {
    try {
      const profile = req.body;
      medicalDiagnostics.registerPatient(profile);
      res.json({ success: true, message: "Patient registered" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/medical/patient/:id", (req, res) => {
    const patient = medicalDiagnostics.getPatient(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }
    res.json({ success: true, patient });
  });

  app.get("/api/interactive/medical/patient/:id/risk", (req, res) => {
    const assessment = medicalDiagnostics.assessRisk(req.params.id);
    if (!assessment) {
      return res.status(404).json({ success: false, error: "Patient not found" });
    }
    res.json({ success: true, assessment });
  });

  app.get("/api/interactive/medical/status", (req, res) => {
    res.json({ success: true, status: medicalDiagnostics.getStatus() });
  });

  // ============ ROBOTIC INTEGRATION ROUTES ============

  app.get("/api/interactive/robotic/robots", (req, res) => {
    res.json({ success: true, robots: roboticIntegration.getAllRobots() });
  });

  app.get("/api/interactive/robotic/robot/:id", (req, res) => {
    const robot = roboticIntegration.getRobot(req.params.id);
    if (!robot) {
      return res.status(404).json({ success: false, error: "Robot not found" });
    }
    res.json({ success: true, robot });
  });

  app.post("/api/interactive/robotic/command", async (req, res) => {
    try {
      const { robotId, command } = req.body;
      if (!robotId || !command) {
        return res.status(400).json({ success: false, error: "Robot ID and command required" });
      }
      const result = await roboticIntegration.executeCommand(robotId, command);
      res.json({ success: result.success, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/robotic/sequence/create", (req, res) => {
    try {
      const sequence = roboticIntegration.createTaskSequence(req.body);
      res.json({ success: true, sequence });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/robotic/sequence/execute", async (req, res) => {
    try {
      const { sequenceId, robotId } = req.body;
      const result = await roboticIntegration.executeTaskSequence(sequenceId, robotId);
      res.json({ success: result.success, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/robotic/calibrate/:robotId", async (req, res) => {
    try {
      const result = await roboticIntegration.calibrateRobot(req.params.robotId);
      res.json({ success: result.success, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/robotic/emergency-stop", (req, res) => {
    roboticIntegration.emergencyStop();
    res.json({ success: true, message: "Emergency stop activated" });
  });

  app.post("/api/interactive/robotic/emergency-reset", (req, res) => {
    const result = roboticIntegration.resetEmergencyStop();
    res.json({ success: result, message: result ? "Emergency stop reset" : "Cannot reset - safety issues pending" });
  });

  app.get("/api/interactive/robotic/safety", (req, res) => {
    res.json({ success: true, safety: roboticIntegration.getSafetyStatus() });
  });

  app.get("/api/interactive/robotic/sensors", (req, res) => {
    res.json({ success: true, sensors: roboticIntegration.getSensorFusion() });
  });

  app.get("/api/interactive/robotic/ros-nodes", (req, res) => {
    res.json({ success: true, nodes: roboticIntegration.getROSNodes() });
  });

  app.post("/api/interactive/robotic/sequence/blood-sampling", (req, res) => {
    const sequence = roboticIntegration.createBloodSamplingSequence();
    res.json({ success: true, sequence });
  });

  app.post("/api/interactive/robotic/sequence/surgical", (req, res) => {
    const { procedure } = req.body;
    const sequence = roboticIntegration.createSurgicalSequence(procedure || "general");
    res.json({ success: true, sequence });
  });

  app.get("/api/interactive/robotic/status", (req, res) => {
    res.json({ success: true, status: roboticIntegration.getStatus() });
  });

  // ============ TEACHING MODULE ROUTES ============

  app.get("/api/interactive/teaching/lessons", (req, res) => {
    const { subject, level } = req.query;
    const lessons = teachingModule.getAllLessons(subject as string, level as string);
    res.json({ success: true, lessons });
  });

  app.get("/api/interactive/teaching/lesson/:id", (req, res) => {
    const lesson = teachingModule.getLesson(req.params.id);
    if (!lesson) {
      return res.status(404).json({ success: false, error: "Lesson not found" });
    }
    res.json({ success: true, lesson });
  });

  app.post("/api/interactive/teaching/lesson/generate", async (req, res) => {
    try {
      const { topic, level, subject } = req.body;
      if (!topic || !level || !subject) {
        return res.status(400).json({ success: false, error: "Topic, level, and subject required" });
      }
      const lesson = await teachingModule.generateLesson(topic, level, subject);
      res.json({ success: true, lesson });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/teaching/learner/register", (req, res) => {
    try {
      const learner = teachingModule.registerLearner(req.body);
      res.json({ success: true, learner });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/teaching/learner/:id", (req, res) => {
    const learner = teachingModule.getLearner(req.params.id);
    if (!learner) {
      return res.status(404).json({ success: false, error: "Learner not found" });
    }
    res.json({ success: true, learner });
  });

  app.get("/api/interactive/teaching/learner/:id/recommendations", (req, res) => {
    const lessons = teachingModule.getRecommendedLessons(req.params.id);
    res.json({ success: true, lessons });
  });

  app.get("/api/interactive/teaching/learner/:id/feedback", (req, res) => {
    const feedback = teachingModule.getAdaptiveFeedback(req.params.id);
    res.json({ success: true, feedback });
  });

  app.post("/api/interactive/teaching/session/start", (req, res) => {
    try {
      const { learnerId, lessonId } = req.body;
      const session = teachingModule.startSession(learnerId, lessonId);
      res.json({ success: true, session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/teaching/session/:id/exercise", (req, res) => {
    try {
      const { exerciseId, answer } = req.body;
      const result = teachingModule.submitExercise(req.params.id, exerciseId, answer);
      res.json({ success: true, result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/teaching/session/:id/complete", (req, res) => {
    const session = teachingModule.completeSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }
    res.json({ success: true, session });
  });

  app.post("/api/interactive/teaching/chat", async (req, res) => {
    try {
      const { learnerId, question } = req.body;
      const response = await teachingModule.chat(learnerId, question);
      res.json({ success: true, response });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/teaching/status", (req, res) => {
    res.json({ success: true, status: teachingModule.getStatus() });
  });

  // ============ SECURITY & ENCRYPTION ROUTES ============

  app.post("/api/interactive/security/encrypt", (req, res) => {
    try {
      const { data, keyId } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: "Data required" });
      }
      const encrypted = securityEncryption.encrypt(data, keyId);
      
      securityEncryption.logAudit({
        action: "encrypt",
        resourceType: "data",
        resourceId: encrypted.keyId,
        success: true
      });
      
      res.json({ success: true, encrypted });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/security/decrypt", (req, res) => {
    try {
      const { encryptedData } = req.body;
      if (!encryptedData) {
        return res.status(400).json({ success: false, error: "Encrypted data required" });
      }
      const decrypted = securityEncryption.decryptToString(encryptedData);
      
      securityEncryption.logAudit({
        action: "decrypt",
        resourceType: "data",
        resourceId: encryptedData.keyId,
        success: true
      });
      
      res.json({ success: true, data: decrypted });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/security/hash", (req, res) => {
    try {
      const { data, algorithm } = req.body;
      if (!data) {
        return res.status(400).json({ success: false, error: "Data required" });
      }
      const hash = securityEncryption.hash(data, algorithm);
      res.json({ success: true, hash });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/security/verify-hash", (req, res) => {
    try {
      const { data, expectedHash, algorithm } = req.body;
      const verified = securityEncryption.verifyHash(data, expectedHash, algorithm);
      res.json({ success: true, verified });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/security/user/register", (req, res) => {
    try {
      const { userId, role } = req.body;
      const control = securityEncryption.registerUser(userId, role);
      res.json({ success: true, control });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/security/permission/check", (req, res) => {
    const { userId, permission, resourceType } = req.body;
    const allowed = securityEncryption.checkPermission(userId, permission, resourceType);
    res.json({ success: true, allowed });
  });

  app.get("/api/interactive/security/audit", (req, res) => {
    const { userId, resourceType, startTime, endTime, success } = req.query;
    const logs = securityEncryption.getAuditLog({
      userId: userId as string,
      resourceType: resourceType as string,
      startTime: startTime ? parseInt(startTime as string) : undefined,
      endTime: endTime ? parseInt(endTime as string) : undefined,
      success: success !== undefined ? success === "true" : undefined
    });
    res.json({ success: true, logs });
  });

  app.post("/api/interactive/security/token/generate", (req, res) => {
    const { length } = req.body;
    const token = securityEncryption.generateSecureToken(length);
    res.json({ success: true, token });
  });

  app.get("/api/interactive/security/status", (req, res) => {
    res.json({ success: true, status: securityEncryption.getStatus() });
  });

  // ============ BLOOD SAMPLING SYSTEM ROUTES ============

  app.get("/api/interactive/blood-sampling/status", (req, res) => {
    res.json({ success: true, status: bloodSamplingSystem.getSystemStatus() });
  });

  app.post("/api/interactive/blood-sampling/vein/detect", async (req, res) => {
    try {
      const { armPosition } = req.body;
      const result = await bloodSamplingSystem.detectVein(armPosition || 'left');
      res.json({ success: true, detection: result });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/blood-sampling/session/start", async (req, res) => {
    try {
      const { patientId, armPosition } = req.body;
      const session = await bloodSamplingSystem.startSamplingSession(patientId, armPosition || 'left');
      res.json({ success: true, session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/blood-sampling/session/:id/execute", async (req, res) => {
    try {
      const sample = await bloodSamplingSystem.executeFullSamplingSequence(req.params.id);
      res.json({ success: true, sample });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get("/api/interactive/blood-sampling/session/:id", (req, res) => {
    const session = bloodSamplingSystem.getSession(req.params.id);
    if (!session) {
      return res.status(404).json({ success: false, error: "Session not found" });
    }
    res.json({ success: true, session });
  });

  app.get("/api/interactive/blood-sampling/sessions", (req, res) => {
    res.json({ success: true, sessions: bloodSamplingSystem.getAllSessions() });
  });

  app.get("/api/interactive/blood-sampling/sample/:id", (req, res) => {
    const sample = bloodSamplingSystem.getSample(req.params.id);
    if (!sample) {
      return res.status(404).json({ success: false, error: "Sample not found" });
    }
    res.json({ success: true, sample });
  });

  app.get("/api/interactive/blood-sampling/samples", (req, res) => {
    res.json({ success: true, samples: bloodSamplingSystem.getAllSamples() });
  });

  app.post("/api/interactive/blood-sampling/sample/:id/quality", async (req, res) => {
    try {
      const analysis = await bloodSamplingSystem.analyzeSampleQuality(req.params.id);
      res.json({ success: true, analysis });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/blood-sampling/sterilize", async (req, res) => {
    try {
      await bloodSamplingSystem.activateSterilization();
      res.json({ success: true, message: "Sterilization complete" });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/blood-sampling/servo/control", async (req, res) => {
    try {
      const { servoId, position } = req.body;
      const servo = await bloodSamplingSystem.controlServo(servoId, position);
      res.json({ success: true, servo });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/blood-sampling/vacuum/control", async (req, res) => {
    try {
      const { action, targetPressure } = req.body;
      const vacuum = await bloodSamplingSystem.controlVacuumPump(action, targetPressure);
      res.json({ success: true, vacuum });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.post("/api/interactive/blood-sampling/emergency-stop", async (req, res) => {
    await bloodSamplingSystem.emergencyRetract();
    res.json({ success: true, message: "Emergency stop activated" });
  });

  app.post("/api/interactive/blood-sampling/emergency-reset", (req, res) => {
    bloodSamplingSystem.resetEmergencyStop();
    res.json({ success: true, message: "Emergency stop reset" });
  });

  app.get("/api/interactive/blood-sampling/needles", (req, res) => {
    const status = bloodSamplingSystem.getSystemStatus();
    res.json({ success: true, needles: status.needles });
  });

  app.get("/api/interactive/blood-sampling/hardware", (req, res) => {
    const status = bloodSamplingSystem.getSystemStatus();
    res.json({
      success: true,
      hardware: {
        servoMotors: status.servoMotors,
        pressureSensors: status.pressureSensors,
        vacuumSystem: status.vacuumSystem,
        sterilization: status.sterilization
      }
    });
  });

  // ============ COMBINED STATUS ENDPOINT ============

  app.get("/api/interactive/status", (req, res) => {
    res.json({
      success: true,
      modules: {
        biology: biologyModule.getStatus(),
        environmental: environmentalSensing.getStatus(),
        medical: medicalDiagnostics.getStatus(),
        robotic: roboticIntegration.getStatus(),
        teaching: teachingModule.getStatus(),
        security: securityEncryption.getStatus(),
        bloodSampling: bloodSamplingSystem.getStatus()
      },
      timestamp: Date.now()
    });
  });

  console.log("[Interactive Systems] API routes registered successfully (7 modules, 75+ endpoints)");
}

export {
  biologyModule,
  environmentalSensing,
  medicalDiagnostics,
  roboticIntegration,
  teachingModule,
  securityEncryption,
  bloodSamplingSystem
};
