import OpenAI from "openai";

interface GasSensorReading {
  sensorId: string;
  gasType: string;
  concentration: number;
  unit: string;
  timestamp: number;
  safetyLevel: "safe" | "caution" | "warning" | "danger" | "critical";
}

interface AirQualityAnalysis {
  aqi: number;
  aqiCategory: "good" | "moderate" | "unhealthy_sensitive" | "unhealthy" | "very_unhealthy" | "hazardous";
  pollutants: Array<{
    name: string;
    concentration: number;
    unit: string;
    status: "normal" | "elevated" | "high" | "dangerous";
  }>;
  healthRecommendations: string[];
  timestamp: number;
}

interface AtmosphericConditions {
  temperature: number;
  humidity: number;
  pressure: number;
  altitude: number;
  windSpeed: number;
  windDirection: string;
  visibility: number;
  uvIndex: number;
  timestamp: number;
}

interface HazardDetection {
  hazardDetected: boolean;
  hazardType?: string;
  severity: "none" | "low" | "medium" | "high" | "critical";
  gasesDetected: string[];
  actionRequired: string[];
  evacuationRecommended: boolean;
}

interface VOCAnalysis {
  totalVOC: number;
  compounds: Array<{
    name: string;
    concentration: number;
    source?: string;
    healthRisk: "low" | "moderate" | "high";
  }>;
  overallRisk: "safe" | "monitor" | "action_required";
}

class EnvironmentalSensingModule {
  private openai: OpenAI | null = null;
  private gasSensors: Map<string, GasSensorReading> = new Map();
  private atmosphericData: AtmosphericConditions | null = null;
  private gasThresholds: Map<string, { safe: number; caution: number; warning: number; danger: number }> = new Map();

  constructor() {
    console.log("[Environmental Sensing] Initializing environmental monitoring system");
    this.initializeGasThresholds();
    this.initializeDefaultSensors();
    console.log("[Environmental Sensing] Gas detection thresholds configured");
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

  private initializeGasThresholds(): void {
    const thresholds = [
      { gas: "CO", safe: 9, caution: 35, warning: 100, danger: 400 },
      { gas: "CO2", safe: 1000, caution: 2000, warning: 5000, danger: 40000 },
      { gas: "O2", safe: 19.5, caution: 18, warning: 16, danger: 14 },
      { gas: "CH4", safe: 1000, caution: 10000, warning: 25000, danger: 50000 },
      { gas: "H2S", safe: 1, caution: 10, warning: 50, danger: 100 },
      { gas: "NH3", safe: 25, caution: 50, warning: 100, danger: 300 },
      { gas: "SO2", safe: 2, caution: 5, warning: 10, danger: 100 },
      { gas: "NO2", safe: 0.1, caution: 1, warning: 5, danger: 20 },
      { gas: "O3", safe: 0.05, caution: 0.1, warning: 0.2, danger: 0.5 },
      { gas: "VOC", safe: 250, caution: 500, warning: 1000, danger: 3000 },
      { gas: "PM2.5", safe: 12, caution: 35, warning: 55, danger: 150 },
      { gas: "PM10", safe: 50, caution: 100, warning: 150, danger: 350 },
      { gas: "radon", safe: 2, caution: 4, warning: 8, danger: 20 }
    ];

    thresholds.forEach(t => this.gasThresholds.set(t.gas, { safe: t.safe, caution: t.caution, warning: t.warning, danger: t.danger }));
  }

  private initializeDefaultSensors(): void {
    const defaultSensors = [
      { id: "MQ135", type: "CO2", value: 450, unit: "ppm" },
      { id: "MQ7", type: "CO", value: 2, unit: "ppm" },
      { id: "MQ4", type: "CH4", value: 200, unit: "ppm" },
      { id: "MQ136", type: "H2S", value: 0.5, unit: "ppm" },
      { id: "PMS5003", type: "PM2.5", value: 8, unit: "μg/m³" }
    ];

    defaultSensors.forEach(s => {
      this.gasSensors.set(s.id, {
        sensorId: s.id,
        gasType: s.type,
        concentration: s.value,
        unit: s.unit,
        timestamp: Date.now(),
        safetyLevel: this.calculateSafetyLevel(s.type, s.value)
      });
    });
  }

  private calculateSafetyLevel(gasType: string, concentration: number): GasSensorReading["safetyLevel"] {
    const threshold = this.gasThresholds.get(gasType);
    if (!threshold) return "safe";

    if (gasType === "O2") {
      if (concentration >= threshold.safe) return "safe";
      if (concentration >= threshold.caution) return "caution";
      if (concentration >= threshold.warning) return "warning";
      if (concentration >= threshold.danger) return "danger";
      return "critical";
    }

    if (concentration <= threshold.safe) return "safe";
    if (concentration <= threshold.caution) return "caution";
    if (concentration <= threshold.warning) return "warning";
    if (concentration <= threshold.danger) return "danger";
    return "critical";
  }

  registerGasSensor(sensorId: string, gasType: string): void {
    this.gasSensors.set(sensorId, {
      sensorId,
      gasType,
      concentration: 0,
      unit: "ppm",
      timestamp: Date.now(),
      safetyLevel: "safe"
    });
  }

  updateSensorReading(sensorId: string, concentration: number, unit?: string): GasSensorReading | null {
    const sensor = this.gasSensors.get(sensorId);
    if (!sensor) return null;

    const updated: GasSensorReading = {
      ...sensor,
      concentration,
      unit: unit || sensor.unit,
      timestamp: Date.now(),
      safetyLevel: this.calculateSafetyLevel(sensor.gasType, concentration)
    };

    this.gasSensors.set(sensorId, updated);
    return updated;
  }

  getSensorReadings(): GasSensorReading[] {
    return Array.from(this.gasSensors.values());
  }

  analyzeAirQuality(): AirQualityAnalysis {
    const sensors = this.getSensorReadings();

    const pollutants = sensors.map(s => ({
      name: s.gasType,
      concentration: s.concentration,
      unit: s.unit,
      status: this.getConcentrationStatus(s.safetyLevel)
    }));

    const pm25 = sensors.find(s => s.gasType === "PM2.5")?.concentration || 0;
    const aqi = this.calculateAQI(pm25);
    const aqiCategory = this.getAQICategory(aqi);

    const healthRecommendations = this.generateHealthRecommendations(aqiCategory, pollutants);

    return {
      aqi,
      aqiCategory,
      pollutants,
      healthRecommendations,
      timestamp: Date.now()
    };
  }

  private getConcentrationStatus(safetyLevel: GasSensorReading["safetyLevel"]): "normal" | "elevated" | "high" | "dangerous" {
    const statusMap: Record<string, "normal" | "elevated" | "high" | "dangerous"> = {
      "safe": "normal",
      "caution": "elevated",
      "warning": "high",
      "danger": "dangerous",
      "critical": "dangerous"
    };
    return statusMap[safetyLevel] || "normal";
  }

  private calculateAQI(pm25: number): number {
    const breakpoints = [
      { pm_low: 0, pm_high: 12, aqi_low: 0, aqi_high: 50 },
      { pm_low: 12.1, pm_high: 35.4, aqi_low: 51, aqi_high: 100 },
      { pm_low: 35.5, pm_high: 55.4, aqi_low: 101, aqi_high: 150 },
      { pm_low: 55.5, pm_high: 150.4, aqi_low: 151, aqi_high: 200 },
      { pm_low: 150.5, pm_high: 250.4, aqi_low: 201, aqi_high: 300 },
      { pm_low: 250.5, pm_high: 500.4, aqi_low: 301, aqi_high: 500 }
    ];

    for (const bp of breakpoints) {
      if (pm25 >= bp.pm_low && pm25 <= bp.pm_high) {
        return Math.round(
          ((bp.aqi_high - bp.aqi_low) / (bp.pm_high - bp.pm_low)) * (pm25 - bp.pm_low) + bp.aqi_low
        );
      }
    }

    return pm25 > 500 ? 500 : 0;
  }

  private getAQICategory(aqi: number): AirQualityAnalysis["aqiCategory"] {
    if (aqi <= 50) return "good";
    if (aqi <= 100) return "moderate";
    if (aqi <= 150) return "unhealthy_sensitive";
    if (aqi <= 200) return "unhealthy";
    if (aqi <= 300) return "very_unhealthy";
    return "hazardous";
  }

  private generateHealthRecommendations(
    category: AirQualityAnalysis["aqiCategory"],
    pollutants: AirQualityAnalysis["pollutants"]
  ): string[] {
    const recommendations: string[] = [];

    switch (category) {
      case "good":
        recommendations.push("Air quality is satisfactory");
        recommendations.push("Outdoor activities are safe for all groups");
        break;
      case "moderate":
        recommendations.push("Air quality is acceptable");
        recommendations.push("Unusually sensitive people should reduce prolonged outdoor exertion");
        break;
      case "unhealthy_sensitive":
        recommendations.push("Sensitive groups should reduce outdoor activities");
        recommendations.push("Consider wearing N95 masks outdoors");
        break;
      case "unhealthy":
        recommendations.push("Everyone should reduce prolonged outdoor exertion");
        recommendations.push("Close windows and use air purifiers indoors");
        break;
      case "very_unhealthy":
        recommendations.push("Avoid outdoor activities");
        recommendations.push("Keep windows and doors closed");
        recommendations.push("Use HEPA air purifiers indoors");
        break;
      case "hazardous":
        recommendations.push("EMERGENCY: Stay indoors immediately");
        recommendations.push("Seal all doors and windows");
        recommendations.push("Evacuate if conditions persist");
        break;
    }

    const dangerousGases = pollutants.filter(p => p.status === "dangerous");
    if (dangerousGases.length > 0) {
      recommendations.push(`ALERT: Dangerous levels of ${dangerousGases.map(g => g.name).join(", ")} detected`);
    }

    return recommendations;
  }

  updateAtmosphericConditions(conditions: Partial<AtmosphericConditions>): void {
    this.atmosphericData = {
      temperature: conditions.temperature ?? 20,
      humidity: conditions.humidity ?? 50,
      pressure: conditions.pressure ?? 1013.25,
      altitude: conditions.altitude ?? 0,
      windSpeed: conditions.windSpeed ?? 0,
      windDirection: conditions.windDirection ?? "N",
      visibility: conditions.visibility ?? 10,
      uvIndex: conditions.uvIndex ?? 0,
      timestamp: Date.now()
    };
  }

  getAtmosphericConditions(): AtmosphericConditions | null {
    return this.atmosphericData;
  }

  detectHazards(): HazardDetection {
    const sensors = this.getSensorReadings();
    const dangerousSensors = sensors.filter(s => s.safetyLevel === "danger" || s.safetyLevel === "critical");
    const warningSensors = sensors.filter(s => s.safetyLevel === "warning");

    if (dangerousSensors.length === 0 && warningSensors.length === 0) {
      return {
        hazardDetected: false,
        severity: "none",
        gasesDetected: [],
        actionRequired: ["Continue normal operations", "Maintain regular monitoring"],
        evacuationRecommended: false
      };
    }

    const allHazardGases = [...dangerousSensors, ...warningSensors].map(s => s.gasType);
    const severity = dangerousSensors.length > 0 ? 
      (dangerousSensors.some(s => s.safetyLevel === "critical") ? "critical" : "high") :
      "medium";

    const actionRequired: string[] = [];
    const evacuationRecommended = severity === "critical" || dangerousSensors.length >= 2;

    if (evacuationRecommended) {
      actionRequired.push("EVACUATE IMMEDIATELY");
      actionRequired.push("Activate emergency ventilation");
      actionRequired.push("Contact emergency services");
    } else {
      actionRequired.push("Increase ventilation");
      actionRequired.push("Identify and eliminate gas source");
      actionRequired.push("Monitor levels closely");
    }

    let hazardType = "Unknown gas hazard";
    if (dangerousSensors.some(s => s.gasType === "CO")) hazardType = "Carbon monoxide poisoning risk";
    else if (dangerousSensors.some(s => s.gasType === "H2S")) hazardType = "Hydrogen sulfide exposure";
    else if (dangerousSensors.some(s => s.gasType === "CH4")) hazardType = "Methane/explosion risk";
    else if (dangerousSensors.some(s => s.gasType === "O2")) hazardType = "Oxygen deficiency";

    return {
      hazardDetected: true,
      hazardType,
      severity,
      gasesDetected: allHazardGases,
      actionRequired,
      evacuationRecommended
    };
  }

  analyzeVOCs(readings: Record<string, number>): VOCAnalysis {
    const totalVOC = Object.values(readings).reduce((sum, val) => sum + val, 0);

    const vocSources: Record<string, string> = {
      benzene: "Vehicle exhaust, industrial emissions",
      formaldehyde: "Building materials, furniture",
      toluene: "Paints, adhesives, solvents",
      xylene: "Paints, lacquers, cleaning agents",
      acetone: "Cleaning products, nail polish",
      ethanol: "Sanitizers, alcoholic beverages"
    };

    const compounds = Object.entries(readings).map(([name, concentration]) => ({
      name,
      concentration,
      source: vocSources[name.toLowerCase()] || "Unknown source",
      healthRisk: (concentration > 100 ? "high" : concentration > 50 ? "moderate" : "low") as "low" | "moderate" | "high"
    }));

    const overallRisk: VOCAnalysis["overallRisk"] = 
      totalVOC > 1000 ? "action_required" :
      totalVOC > 500 ? "monitor" : "safe";

    return {
      totalVOC,
      compounds,
      overallRisk
    };
  }

  async getEnvironmentalReport(): Promise<{
    airQuality: AirQualityAnalysis;
    hazards: HazardDetection;
    atmospheric: AtmosphericConditions | null;
    sensors: GasSensorReading[];
  }> {
    return {
      airQuality: this.analyzeAirQuality(),
      hazards: this.detectHazards(),
      atmospheric: this.getAtmosphericConditions(),
      sensors: this.getSensorReadings()
    };
  }

  getStatus(): { operational: boolean; sensors: number; airQuality: string; hazards: number } {
    const hazards = this.detectHazards();
    const airQuality = this.analyzeAirQuality();

    return {
      operational: true,
      sensors: this.gasSensors.size,
      airQuality: airQuality.aqiCategory,
      hazards: hazards.hazardDetected ? 1 : 0
    };
  }
}

export const environmentalSensing = new EnvironmentalSensingModule();
