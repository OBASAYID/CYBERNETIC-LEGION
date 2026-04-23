import OpenAI from "openai";

interface SymptomEntry {
  name: string;
  severity: 1 | 2 | 3 | 4 | 5;
  duration: string;
  onset: "sudden" | "gradual";
}

interface DiagnosticResult {
  possibleConditions: Array<{
    name: string;
    probability: number;
    severity: "mild" | "moderate" | "severe" | "critical";
    description: string;
  }>;
  recommendedTests: string[];
  urgency: "routine" | "soon" | "urgent" | "emergency";
  recommendations: string[];
  confidence: number;
}

interface VitalSigns {
  heartRate: number;
  bloodPressure: { systolic: number; diastolic: number };
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  bloodGlucose?: number;
}

interface VitalAnalysis {
  status: "normal" | "abnormal" | "critical";
  abnormalities: string[];
  risks: string[];
  recommendations: string[];
}

interface MedicalImageAnalysis {
  imageType: "xray" | "mri" | "ct" | "ultrasound" | "ecg";
  findings: string[];
  abnormalities: string[];
  confidence: number;
  recommendations: string[];
}

interface PatientProfile {
  id: string;
  age: number;
  sex: "male" | "female" | "other";
  weight: number;
  height: number;
  bloodType?: string;
  allergies: string[];
  medications: string[];
  conditions: string[];
  familyHistory: string[];
}

interface RiskAssessment {
  cardiovascularRisk: number;
  diabetesRisk: number;
  cancerRisk: number;
  overallHealth: "excellent" | "good" | "fair" | "poor";
  recommendations: string[];
}

class MedicalDiagnosticsModule {
  private openai: OpenAI | null = null;
  private symptomDatabase: Map<string, string[]> = new Map();
  private diseaseProfiles: Map<string, any> = new Map();
  private patients: Map<string, PatientProfile> = new Map();
  private diagnosisHistory: Map<string, DiagnosticResult[]> = new Map();

  constructor() {
    console.log("[Medical Diagnostics] Initializing diagnostic intelligence system");
    this.initializeSymptomDatabase();
    this.initializeDiseaseProfiles();
    console.log("[Medical Diagnostics] Loaded symptom patterns and disease profiles");
  }

  private getOpenAI(): OpenAI | null {
    if (!this.openai) {
      const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      }
    }
    return this.openai;
  }

  private initializeSymptomDatabase(): void {
    const symptomConditionMap = [
      { symptom: "fever", conditions: ["flu", "covid19", "infection", "malaria", "meningitis"] },
      { symptom: "cough", conditions: ["flu", "covid19", "bronchitis", "pneumonia", "asthma"] },
      { symptom: "headache", conditions: ["migraine", "tension_headache", "meningitis", "hypertension", "dehydration"] },
      { symptom: "chest_pain", conditions: ["heart_attack", "angina", "pneumonia", "anxiety", "costochondritis"] },
      { symptom: "shortness_of_breath", conditions: ["asthma", "covid19", "heart_failure", "pneumonia", "anxiety"] },
      { symptom: "fatigue", conditions: ["anemia", "diabetes", "hypothyroidism", "depression", "chronic_fatigue"] },
      { symptom: "nausea", conditions: ["gastritis", "pregnancy", "migraine", "food_poisoning", "appendicitis"] },
      { symptom: "dizziness", conditions: ["hypotension", "anemia", "dehydration", "vertigo", "stroke"] },
      { symptom: "abdominal_pain", conditions: ["appendicitis", "gastritis", "gallstones", "pancreatitis", "ibs"] },
      { symptom: "joint_pain", conditions: ["arthritis", "lupus", "gout", "lyme_disease", "fibromyalgia"] },
      { symptom: "skin_rash", conditions: ["eczema", "psoriasis", "allergic_reaction", "lupus", "shingles"] },
      { symptom: "weight_loss", conditions: ["diabetes", "hyperthyroidism", "cancer", "hiv", "depression"] }
    ];

    symptomConditionMap.forEach(s => this.symptomDatabase.set(s.symptom, s.conditions));
  }

  private initializeDiseaseProfiles(): void {
    const diseases = [
      { id: "flu", name: "Influenza", severity: "mild", symptoms: ["fever", "cough", "fatigue", "body_aches"] },
      { id: "covid19", name: "COVID-19", severity: "moderate", symptoms: ["fever", "cough", "shortness_of_breath", "loss_of_taste"] },
      { id: "diabetes", name: "Type 2 Diabetes", severity: "moderate", symptoms: ["fatigue", "thirst", "frequent_urination", "weight_loss"] },
      { id: "hypertension", name: "Hypertension", severity: "moderate", symptoms: ["headache", "dizziness", "chest_pain"] },
      { id: "heart_attack", name: "Myocardial Infarction", severity: "critical", symptoms: ["chest_pain", "shortness_of_breath", "arm_pain", "sweating"] },
      { id: "pneumonia", name: "Pneumonia", severity: "severe", symptoms: ["fever", "cough", "shortness_of_breath", "chest_pain"] },
      { id: "appendicitis", name: "Appendicitis", severity: "severe", symptoms: ["abdominal_pain", "nausea", "fever", "loss_of_appetite"] },
      { id: "migraine", name: "Migraine", severity: "mild", symptoms: ["headache", "nausea", "light_sensitivity", "aura"] },
      { id: "asthma", name: "Asthma", severity: "moderate", symptoms: ["shortness_of_breath", "cough", "wheezing", "chest_tightness"] },
      { id: "anemia", name: "Anemia", severity: "mild", symptoms: ["fatigue", "dizziness", "pale_skin", "shortness_of_breath"] }
    ];

    diseases.forEach(d => this.diseaseProfiles.set(d.id, d));
  }

  async analyzeSymptoms(symptoms: SymptomEntry[], patientInfo?: Partial<PatientProfile>): Promise<DiagnosticResult> {
    const conditionScores = new Map<string, number>();

    symptoms.forEach(symptom => {
      const normalizedSymptom = symptom.name.toLowerCase().replace(/\s+/g, "_");
      const conditions = this.symptomDatabase.get(normalizedSymptom);

      if (conditions) {
        conditions.forEach(condition => {
          const currentScore = conditionScores.get(condition) || 0;
          const weight = symptom.severity * (symptom.onset === "sudden" ? 1.5 : 1);
          conditionScores.set(condition, currentScore + weight);
        });
      }
    });

    const sortedConditions = [...conditionScores.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const totalScore = sortedConditions.reduce((sum, [_, score]) => sum + score, 0);

    const possibleConditions = sortedConditions.map(([conditionId, score]) => {
      const profile = this.diseaseProfiles.get(conditionId);
      return {
        name: profile?.name || conditionId,
        probability: Math.min(0.95, score / totalScore),
        severity: profile?.severity || "moderate",
        description: `Based on symptom analysis with ${Math.round((score / totalScore) * 100)}% match`
      };
    });

    const topCondition = possibleConditions[0];
    let urgency: DiagnosticResult["urgency"] = "routine";
    if (topCondition?.severity === "critical") urgency = "emergency";
    else if (topCondition?.severity === "severe") urgency = "urgent";
    else if (topCondition?.severity === "moderate") urgency = "soon";

    const recommendedTests = this.getRecommendedTests(possibleConditions.map(c => c.name));
    const recommendations = await this.generateRecommendations(symptoms, possibleConditions);

    return {
      possibleConditions,
      recommendedTests,
      urgency,
      recommendations,
      confidence: Math.min(0.95, totalScore > 0 ? 0.6 + (symptoms.length * 0.05) : 0.3)
    };
  }

  private getRecommendedTests(conditions: string[]): string[] {
    const testMap: Record<string, string[]> = {
      "Influenza": ["Rapid flu test", "Throat swab"],
      "COVID-19": ["PCR test", "Rapid antigen test"],
      "Type 2 Diabetes": ["Fasting blood glucose", "HbA1c", "Oral glucose tolerance test"],
      "Hypertension": ["Blood pressure monitoring", "ECG", "Kidney function tests"],
      "Myocardial Infarction": ["ECG", "Cardiac enzymes (Troponin)", "Chest X-ray"],
      "Pneumonia": ["Chest X-ray", "Sputum culture", "Complete blood count"],
      "Appendicitis": ["CT scan", "Ultrasound", "Complete blood count"],
      "Migraine": ["Neurological exam", "MRI if chronic"],
      "Asthma": ["Spirometry", "Peak flow test", "Allergy tests"],
      "Anemia": ["Complete blood count", "Iron studies", "Vitamin B12 levels"]
    };

    const tests = new Set<string>();
    conditions.forEach(condition => {
      const conditionTests = testMap[condition];
      if (conditionTests) {
        conditionTests.forEach(test => tests.add(test));
      }
    });

    return Array.from(tests).slice(0, 5);
  }

  private async generateRecommendations(
    symptoms: SymptomEntry[],
    conditions: DiagnosticResult["possibleConditions"]
  ): Promise<string[]> {
    const openai = this.getOpenAI();

    if (openai && conditions.length > 0) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "system",
            content: "You are a medical advisory AI. Provide 4-5 brief, actionable recommendations based on the symptoms and possible conditions. Include when to seek emergency care."
          }, {
            role: "user",
            content: `Symptoms: ${symptoms.map(s => `${s.name} (severity: ${s.severity}/5)`).join(", ")}. Possible conditions: ${conditions.map(c => `${c.name} (${Math.round(c.probability * 100)}%)`).join(", ")}`
          }],
          max_tokens: 250
        });

        return response.choices[0].message.content?.split("\n").filter(r => r.trim()) || this.getDefaultRecommendations(conditions[0]?.severity);
      } catch (error) {
        return this.getDefaultRecommendations(conditions[0]?.severity);
      }
    }

    return this.getDefaultRecommendations(conditions[0]?.severity);
  }

  private getDefaultRecommendations(severity?: string): string[] {
    const base = [
      "Rest and stay hydrated",
      "Monitor symptoms for changes",
      "Consult a healthcare provider if symptoms worsen"
    ];

    if (severity === "critical" || severity === "severe") {
      return [
        "SEEK IMMEDIATE MEDICAL ATTENTION",
        "Call emergency services if symptoms worsen",
        "Do not drive yourself to the hospital",
        ...base
      ];
    }

    return base;
  }

  analyzeVitalSigns(vitals: VitalSigns): VitalAnalysis {
    const abnormalities: string[] = [];
    const risks: string[] = [];
    const recommendations: string[] = [];

    if (vitals.heartRate < 60) {
      abnormalities.push("Bradycardia (low heart rate)");
      risks.push("Potential cardiac or medication issue");
    } else if (vitals.heartRate > 100) {
      abnormalities.push("Tachycardia (elevated heart rate)");
      risks.push("Possible dehydration, anxiety, or cardiac condition");
    }

    if (vitals.bloodPressure.systolic > 140 || vitals.bloodPressure.diastolic > 90) {
      abnormalities.push("Hypertension (high blood pressure)");
      risks.push("Increased cardiovascular risk");
      recommendations.push("Reduce sodium intake and monitor regularly");
    } else if (vitals.bloodPressure.systolic < 90 || vitals.bloodPressure.diastolic < 60) {
      abnormalities.push("Hypotension (low blood pressure)");
      risks.push("Risk of dizziness and fainting");
    }

    if (vitals.temperature > 38) {
      abnormalities.push("Fever");
      risks.push("Possible infection");
      recommendations.push("Rest, hydrate, and monitor for other symptoms");
    } else if (vitals.temperature < 36) {
      abnormalities.push("Hypothermia");
      risks.push("Metabolic or environmental concern");
    }

    if (vitals.respiratoryRate > 20) {
      abnormalities.push("Tachypnea (rapid breathing)");
      risks.push("Possible respiratory distress");
    } else if (vitals.respiratoryRate < 12) {
      abnormalities.push("Bradypnea (slow breathing)");
      risks.push("Possible respiratory depression");
    }

    if (vitals.oxygenSaturation < 95) {
      abnormalities.push("Low oxygen saturation");
      if (vitals.oxygenSaturation < 90) {
        risks.push("CRITICAL: Hypoxemia - seek immediate medical attention");
      } else {
        risks.push("Monitor oxygen levels closely");
      }
    }

    if (vitals.bloodGlucose) {
      if (vitals.bloodGlucose < 70) {
        abnormalities.push("Hypoglycemia (low blood sugar)");
        recommendations.push("Consume fast-acting carbohydrates immediately");
      } else if (vitals.bloodGlucose > 180) {
        abnormalities.push("Hyperglycemia (high blood sugar)");
        risks.push("Possible diabetes or glucose intolerance");
      }
    }

    const status: VitalAnalysis["status"] = 
      risks.some(r => r.includes("CRITICAL")) ? "critical" :
      abnormalities.length > 0 ? "abnormal" : "normal";

    if (status === "normal") {
      recommendations.push("All vital signs within normal range");
      recommendations.push("Continue regular health monitoring");
    }

    return { status, abnormalities, risks, recommendations };
  }

  async analyzeMedicalImage(
    imageData: string,
    imageType: MedicalImageAnalysis["imageType"]
  ): Promise<MedicalImageAnalysis> {
    const openai = this.getOpenAI();

    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "system",
            content: `You are a medical imaging analysis AI. Analyze the ${imageType} image and provide findings, abnormalities, and recommendations. Format your response as JSON with keys: findings (array), abnormalities (array), recommendations (array).`
          }, {
            role: "user",
            content: [
              { type: "text", text: `Analyze this ${imageType} image for diagnostic purposes.` },
              { type: "image_url", image_url: { url: imageData } }
            ]
          }],
          max_tokens: 500
        });

        const content = response.choices[0].message.content || "";
        try {
          const parsed = JSON.parse(content);
          return {
            imageType,
            findings: parsed.findings || ["Image analysis completed"],
            abnormalities: parsed.abnormalities || [],
            confidence: 0.85,
            recommendations: parsed.recommendations || ["Review with radiologist"]
          };
        } catch {
          return {
            imageType,
            findings: [content],
            abnormalities: [],
            confidence: 0.75,
            recommendations: ["Consult with specialist for detailed interpretation"]
          };
        }
      } catch (error) {
        console.error("[Medical Diagnostics] Image analysis error:", error);
      }
    }

    return {
      imageType,
      findings: ["Image received for analysis"],
      abnormalities: ["Unable to perform AI analysis - specialist review required"],
      confidence: 0,
      recommendations: ["Forward to radiologist for manual interpretation"]
    };
  }

  registerPatient(profile: PatientProfile): void {
    this.patients.set(profile.id, profile);
  }

  getPatient(patientId: string): PatientProfile | undefined {
    return this.patients.get(patientId);
  }

  assessRisk(patientId: string): RiskAssessment | null {
    const patient = this.patients.get(patientId);
    if (!patient) return null;

    let cardiovascularRisk = 0;
    let diabetesRisk = 0;
    let cancerRisk = 0;

    if (patient.age > 45) cardiovascularRisk += 15;
    if (patient.age > 55) cardiovascularRisk += 10;
    if (patient.sex === "male") cardiovascularRisk += 10;

    const bmi = patient.weight / Math.pow(patient.height / 100, 2);
    if (bmi > 25) diabetesRisk += 15;
    if (bmi > 30) { diabetesRisk += 20; cardiovascularRisk += 15; }

    if (patient.familyHistory.includes("diabetes")) diabetesRisk += 25;
    if (patient.familyHistory.includes("heart_disease")) cardiovascularRisk += 25;
    if (patient.familyHistory.includes("cancer")) cancerRisk += 20;

    if (patient.conditions.includes("hypertension")) cardiovascularRisk += 20;
    if (patient.conditions.includes("obesity")) { diabetesRisk += 15; cardiovascularRisk += 15; }

    const totalRisk = (cardiovascularRisk + diabetesRisk + cancerRisk) / 3;
    const overallHealth: RiskAssessment["overallHealth"] = 
      totalRisk < 15 ? "excellent" :
      totalRisk < 30 ? "good" :
      totalRisk < 50 ? "fair" : "poor";

    const recommendations: string[] = [];
    if (cardiovascularRisk > 30) recommendations.push("Schedule cardiovascular screening");
    if (diabetesRisk > 30) recommendations.push("Monitor blood glucose regularly");
    if (bmi > 25) recommendations.push("Consider weight management program");
    if (recommendations.length === 0) recommendations.push("Maintain current healthy lifestyle");

    return {
      cardiovascularRisk: Math.min(100, cardiovascularRisk),
      diabetesRisk: Math.min(100, diabetesRisk),
      cancerRisk: Math.min(100, cancerRisk),
      overallHealth,
      recommendations
    };
  }

  saveDiagnosis(patientId: string, diagnosis: DiagnosticResult): void {
    const history = this.diagnosisHistory.get(patientId) || [];
    history.push(diagnosis);
    this.diagnosisHistory.set(patientId, history);
  }

  getDiagnosisHistory(patientId: string): DiagnosticResult[] {
    return this.diagnosisHistory.get(patientId) || [];
  }

  getStatus(): { operational: boolean; patients: number; diagnoses: number; conditions: number } {
    return {
      operational: true,
      patients: this.patients.size,
      diagnoses: [...this.diagnosisHistory.values()].reduce((sum, h) => sum + h.length, 0),
      conditions: this.diseaseProfiles.size
    };
  }
}

export const medicalDiagnostics = new MedicalDiagnosticsModule();
