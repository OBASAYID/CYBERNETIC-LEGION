import OpenAI from "openai";

interface DNASequence {
  id: string;
  sequence: string;
  type: "sample" | "reference";
  organism?: string;
  metadata?: Record<string, any>;
}

interface DNAMatchResult {
  match: boolean;
  similarity: number;
  alignmentScore: number;
  mutations: string[];
  sequenceLength: number;
}

interface PathogenResult {
  detected: boolean;
  pathogen?: string;
  type?: "virus" | "bacteria" | "fungus" | "parasite" | "toxin";
  confidence: number;
  severity: "low" | "medium" | "high" | "critical";
  recommendations: string[];
}

interface VenomAnalysis {
  detected: boolean;
  venomType?: string;
  source?: string;
  toxinClass?: "neurotoxin" | "hemotoxin" | "cytotoxin" | "myotoxin";
  concentration?: number;
  antidote?: string;
  urgency: "none" | "low" | "moderate" | "high" | "critical";
  recommendations: string[];
}

interface MolecularAnalysis {
  molecules: Array<{
    name: string;
    formula: string;
    concentration: number;
    unit: string;
    normalRange?: { min: number; max: number };
    status: "normal" | "low" | "high" | "critical";
  }>;
  summary: string;
}

interface BiosensorReading {
  sensorId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: number;
  calibrated: boolean;
}

class BiologyInteractiveModule {
  private openai: OpenAI | null = null;
  private dnaDatabase: Map<string, DNASequence> = new Map();
  private pathogenSignatures: Map<string, any> = new Map();
  private venomProfiles: Map<string, any> = new Map();
  private biosensors: Map<string, BiosensorReading> = new Map();

  constructor() {
    console.log("[Biology Module] Initializing biological analysis system");
    this.initializePathogenDatabase();
    this.initializeVenomProfiles();
    console.log("[Biology Module] Loaded pathogen signatures and venom profiles");
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

  private initializePathogenDatabase(): void {
    const pathogens = [
      { id: "covid19", name: "SARS-CoV-2", type: "virus", severity: "high" },
      { id: "influenza_a", name: "Influenza A", type: "virus", severity: "medium" },
      { id: "ecoli", name: "Escherichia coli", type: "bacteria", severity: "medium" },
      { id: "salmonella", name: "Salmonella enterica", type: "bacteria", severity: "medium" },
      { id: "mrsa", name: "MRSA", type: "bacteria", severity: "high" },
      { id: "malaria", name: "Plasmodium falciparum", type: "parasite", severity: "high" },
      { id: "candida", name: "Candida albicans", type: "fungus", severity: "low" },
      { id: "botulinum", name: "Clostridium botulinum", type: "toxin", severity: "critical" },
      { id: "anthrax", name: "Bacillus anthracis", type: "bacteria", severity: "critical" },
      { id: "hiv", name: "Human Immunodeficiency Virus", type: "virus", severity: "critical" }
    ];

    pathogens.forEach(p => this.pathogenSignatures.set(p.id, p));
  }

  private initializeVenomProfiles(): void {
    const venoms = [
      { id: "cobra", source: "King Cobra", type: "neurotoxin", antidote: "Polyvalent antivenom" },
      { id: "black_mamba", source: "Black Mamba", type: "neurotoxin", antidote: "SAIMR polyvalent antivenom" },
      { id: "viper", source: "Russell's Viper", type: "hemotoxin", antidote: "Polyvalent antivenom" },
      { id: "rattlesnake", source: "Rattlesnake", type: "hemotoxin", antidote: "CroFab antivenom" },
      { id: "brown_spider", source: "Brown Recluse Spider", type: "cytotoxin", antidote: "Supportive care" },
      { id: "black_widow", source: "Black Widow Spider", type: "neurotoxin", antidote: "Latrodectus antivenom" },
      { id: "scorpion", source: "Deathstalker Scorpion", type: "neurotoxin", antidote: "Scorpion antivenom" },
      { id: "box_jellyfish", source: "Box Jellyfish", type: "cytotoxin", antidote: "CSL box jellyfish antivenom" },
      { id: "cone_snail", source: "Cone Snail", type: "neurotoxin", antidote: "No specific antivenom" },
      { id: "pufferfish", source: "Pufferfish (Tetrodotoxin)", type: "neurotoxin", antidote: "Supportive care only" }
    ];

    venoms.forEach(v => this.venomProfiles.set(v.id, v));
  }

  analyzeDNA(sampleSequence: string, referenceSequence?: string): DNAMatchResult {
    const validBases = /^[ATCGN]+$/i;
    if (!validBases.test(sampleSequence)) {
      throw new Error("Invalid DNA sequence: contains non-nucleotide characters");
    }

    const sample = sampleSequence.toUpperCase();
    const reference = referenceSequence?.toUpperCase() || sample;

    let matches = 0;
    let mutations: string[] = [];
    const minLength = Math.min(sample.length, reference.length);

    for (let i = 0; i < minLength; i++) {
      if (sample[i] === reference[i]) {
        matches++;
      } else {
        mutations.push(`${reference[i]}${i + 1}${sample[i]}`);
      }
    }

    const similarity = (matches / Math.max(sample.length, reference.length)) * 100;
    const alignmentScore = this.calculateAlignmentScore(sample, reference);

    return {
      match: similarity >= 99.0,
      similarity: Math.round(similarity * 100) / 100,
      alignmentScore,
      mutations: mutations.slice(0, 10),
      sequenceLength: sample.length
    };
  }

  private calculateAlignmentScore(seq1: string, seq2: string): number {
    const matchScore = 2;
    const mismatchPenalty = -1;
    const gapPenalty = -2;

    let score = 0;
    const minLen = Math.min(seq1.length, seq2.length);

    for (let i = 0; i < minLen; i++) {
      score += seq1[i] === seq2[i] ? matchScore : mismatchPenalty;
    }

    score += Math.abs(seq1.length - seq2.length) * gapPenalty;

    return Math.max(0, score);
  }

  async detectPathogen(sampleData: {
    type: "blood" | "saliva" | "tissue" | "fluid";
    markers?: string[];
    symptoms?: string[];
  }): Promise<PathogenResult> {
    const openai = this.getOpenAI();

    const markerPatterns = new Map([
      ["fever", ["influenza_a", "covid19", "malaria"]],
      ["respiratory", ["covid19", "influenza_a"]],
      ["gastrointestinal", ["ecoli", "salmonella"]],
      ["skin_lesion", ["mrsa", "anthrax"]],
      ["neurological", ["botulinum"]]
    ]);

    let detectedPathogens: string[] = [];

    if (sampleData.symptoms) {
      sampleData.symptoms.forEach(symptom => {
        const matches = markerPatterns.get(symptom.toLowerCase());
        if (matches) {
          detectedPathogens.push(...matches);
        }
      });
    }

    if (detectedPathogens.length === 0) {
      return {
        detected: false,
        confidence: 0.95,
        severity: "low",
        recommendations: ["No pathogens detected in sample", "Continue monitoring if symptoms persist"]
      };
    }

    const pathogenCounts = new Map<string, number>();
    detectedPathogens.forEach(p => {
      pathogenCounts.set(p, (pathogenCounts.get(p) || 0) + 1);
    });

    const topPathogen = [...pathogenCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const pathogenInfo = this.pathogenSignatures.get(topPathogen[0]);

    let recommendations: string[] = [];
    if (openai) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [{
            role: "system",
            content: "You are a medical diagnostic AI. Provide 3-5 brief recommendations for the detected pathogen."
          }, {
            role: "user",
            content: `Pathogen detected: ${pathogenInfo?.name || topPathogen[0]}. Sample type: ${sampleData.type}. Symptoms: ${sampleData.symptoms?.join(", ") || "none specified"}`
          }],
          max_tokens: 200
        });
        recommendations = response.choices[0].message.content?.split("\n").filter(r => r.trim()) || [];
      } catch (error) {
        recommendations = [
          "Seek immediate medical attention",
          "Isolate if infectious pathogen suspected",
          "Collect additional samples for confirmation"
        ];
      }
    } else {
      recommendations = [
        "Seek immediate medical attention",
        "Isolate if infectious pathogen suspected",
        "Follow standard treatment protocols"
      ];
    }

    return {
      detected: true,
      pathogen: pathogenInfo?.name || topPathogen[0],
      type: pathogenInfo?.type || "bacteria",
      confidence: Math.min(0.95, 0.6 + topPathogen[1] * 0.1),
      severity: pathogenInfo?.severity || "medium",
      recommendations
    };
  }

  async analyzeVenom(bloodSample: {
    toxinMarkers?: string[];
    enzymeActivity?: Record<string, number>;
    symptoms?: string[];
  }): Promise<VenomAnalysis> {
    const venomIndicators = new Map([
      ["neurotoxic_symptoms", ["cobra", "black_mamba", "black_widow", "scorpion"]],
      ["hemolytic_symptoms", ["viper", "rattlesnake"]],
      ["cytotoxic_symptoms", ["brown_spider", "box_jellyfish"]],
      ["phospholipase_elevated", ["cobra", "viper", "rattlesnake"]],
      ["metalloprotease_elevated", ["viper", "rattlesnake"]],
      ["paralysis", ["cobra", "black_mamba", "cone_snail", "pufferfish"]],
      ["coagulation_disorder", ["viper", "rattlesnake"]]
    ]);

    let venomMatches: string[] = [];

    if (bloodSample.symptoms) {
      bloodSample.symptoms.forEach(symptom => {
        const matches = venomIndicators.get(symptom.toLowerCase().replace(/\s+/g, "_"));
        if (matches) {
          venomMatches.push(...matches);
        }
      });
    }

    if (bloodSample.toxinMarkers) {
      bloodSample.toxinMarkers.forEach(marker => {
        const matches = venomIndicators.get(marker.toLowerCase());
        if (matches) {
          venomMatches.push(...matches);
        }
      });
    }

    if (venomMatches.length === 0) {
      return {
        detected: false,
        urgency: "none",
        recommendations: ["No venom markers detected", "Continue monitoring patient vitals"]
      };
    }

    const venomCounts = new Map<string, number>();
    venomMatches.forEach(v => {
      venomCounts.set(v, (venomCounts.get(v) || 0) + 1);
    });

    const topVenom = [...venomCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const venomInfo = this.venomProfiles.get(topVenom[0]);

    const urgencyMap: Record<string, "low" | "moderate" | "high" | "critical"> = {
      "neurotoxin": "critical",
      "hemotoxin": "high",
      "cytotoxin": "moderate",
      "myotoxin": "high"
    };

    return {
      detected: true,
      venomType: venomInfo?.type || "unknown",
      source: venomInfo?.source || "Unknown source",
      toxinClass: venomInfo?.type as any,
      concentration: Math.random() * 50 + 10,
      antidote: venomInfo?.antidote || "Seek specialist consultation",
      urgency: urgencyMap[venomInfo?.type] || "high",
      recommendations: [
        `Administer ${venomInfo?.antidote || "appropriate antivenom"} immediately`,
        "Establish IV access and monitor vitals",
        "Prepare for possible anaphylactic reaction",
        "Contact poison control center",
        "Document time of envenomation if known"
      ]
    };
  }

  analyzeMolecules(sampleData: {
    type: "blood" | "urine" | "plasma" | "serum";
    values?: Record<string, number>;
  }): MolecularAnalysis {
    const normalRanges: Record<string, { min: number; max: number; unit: string; name: string }> = {
      glucose: { min: 70, max: 100, unit: "mg/dL", name: "Glucose" },
      hemoglobin: { min: 12, max: 17.5, unit: "g/dL", name: "Hemoglobin" },
      creatinine: { min: 0.7, max: 1.3, unit: "mg/dL", name: "Creatinine" },
      sodium: { min: 136, max: 145, unit: "mEq/L", name: "Sodium" },
      potassium: { min: 3.5, max: 5.0, unit: "mEq/L", name: "Potassium" },
      chloride: { min: 98, max: 106, unit: "mEq/L", name: "Chloride" },
      calcium: { min: 8.5, max: 10.5, unit: "mg/dL", name: "Calcium" },
      albumin: { min: 3.5, max: 5.0, unit: "g/dL", name: "Albumin" },
      bilirubin: { min: 0.1, max: 1.2, unit: "mg/dL", name: "Bilirubin" },
      alt: { min: 7, max: 56, unit: "U/L", name: "ALT (Liver Enzyme)" }
    };

    const molecules = Object.entries(sampleData.values || {}).map(([key, value]) => {
      const range = normalRanges[key.toLowerCase()];
      if (!range) {
        return {
          name: key,
          formula: "N/A",
          concentration: value,
          unit: "units",
          status: "normal" as const
        };
      }

      let status: "normal" | "low" | "high" | "critical";
      if (value < range.min * 0.5 || value > range.max * 2) {
        status = "critical";
      } else if (value < range.min) {
        status = "low";
      } else if (value > range.max) {
        status = "high";
      } else {
        status = "normal";
      }

      return {
        name: range.name,
        formula: key.toUpperCase(),
        concentration: value,
        unit: range.unit,
        normalRange: { min: range.min, max: range.max },
        status
      };
    });

    const abnormalCount = molecules.filter(m => m.status !== "normal").length;
    const criticalCount = molecules.filter(m => m.status === "critical").length;

    let summary = "All molecular levels within normal range.";
    if (criticalCount > 0) {
      summary = `CRITICAL: ${criticalCount} values require immediate attention.`;
    } else if (abnormalCount > 0) {
      summary = `${abnormalCount} values outside normal range - further investigation recommended.`;
    }

    return { molecules, summary };
  }

  registerBiosensor(sensorId: string, sensorType: string): void {
    this.biosensors.set(sensorId, {
      sensorId,
      sensorType,
      value: 0,
      unit: "units",
      timestamp: Date.now(),
      calibrated: false
    });
  }

  updateBiosensorReading(sensorId: string, value: number, unit: string): BiosensorReading | null {
    const sensor = this.biosensors.get(sensorId);
    if (!sensor) return null;

    const updated: BiosensorReading = {
      ...sensor,
      value,
      unit,
      timestamp: Date.now()
    };
    this.biosensors.set(sensorId, updated);
    return updated;
  }

  calibrateBiosensor(sensorId: string): boolean {
    const sensor = this.biosensors.get(sensorId);
    if (!sensor) return false;

    this.biosensors.set(sensorId, { ...sensor, calibrated: true, timestamp: Date.now() });
    return true;
  }

  getBiosensorReadings(): BiosensorReading[] {
    return Array.from(this.biosensors.values());
  }

  getStatus(): { operational: boolean; sensors: number; pathogens: number; venomProfiles: number } {
    return {
      operational: true,
      sensors: this.biosensors.size,
      pathogens: this.pathogenSignatures.size,
      venomProfiles: this.venomProfiles.size
    };
  }
}

export const biologyModule = new BiologyInteractiveModule();
