import { useState, useEffect, useCallback, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import {
  Activity,
  Heart,
  Thermometer,
  Droplets,
  Wind,
  Brain,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  User,
  Stethoscope,
  Watch,
  Bluetooth,
  BluetoothConnected,
  Wifi,
  WifiOff,
  TrendingUp,
  TrendingDown,
  Sun,
  Moon,
  CloudRain,
  Footprints,
  Bed,
  Dumbbell,
  Utensils,
  Pill,
  MapPin,
  Gauge,
  Zap,
  RefreshCw,
  Play,
  Pause,
  Settings,
  ChevronRight,
  Signal,
  ExternalLink,
  Link2,
  Unlink,
} from "lucide-react";
import { ModuleWorkspacePageShell } from "@/components/command-center/module-workspace-page-shell";

interface VitalSigns {
  heartRate: number;
  bloodPressureSystolic: number;
  bloodPressureDiastolic: number;
  temperature: number;
  respiratoryRate: number;
  oxygenSaturation: number;
  bloodGlucose: number;
  hrv: number;
  stress: number;
}

interface HealthDevice {
  id: string;
  name: string;
  type: "watch" | "wristband" | "ring" | "patch" | "scale" | "glucometer";
  connected: boolean;
  battery: number;
  lastSync: Date;
  metrics: string[];
  provider?: string;
  oauthConfigured?: boolean;
}

interface ApiConnection {
  id: string;
  provider: string;
  lastSync: Date | null;
  isActive: number;
}

interface BehavioralData {
  steps: number;
  activeMinutes: number;
  sleepHours: number;
  sleepQuality: number;
  caloriesBurned: number;
  hydration: number;
  caffeine: number;
  alcohol: number;
  mood: "excellent" | "good" | "neutral" | "poor" | "bad";
  stressLevel: number;
}

interface EnvironmentalData {
  temperature: number;
  humidity: number;
  airQuality: number;
  uvIndex: number;
  noise: number;
  altitude: number;
  barometric: number;
}

interface HealthInsight {
  category: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "alert" | "success";
  metric: string;
  trend: "up" | "down" | "stable";
  recommendation: string;
}

interface DiagnosisResult {
  conditions: { name: string; probability: number; severity: string }[];
  recommendations: string[];
  urgency: "low" | "medium" | "high" | "critical";
  summary: string;
}

const defaultVitals: VitalSigns = {
  heartRate: 72,
  bloodPressureSystolic: 120,
  bloodPressureDiastolic: 80,
  temperature: 36.8,
  respiratoryRate: 16,
  oxygenSaturation: 98,
  bloodGlucose: 95,
  hrv: 45,
  stress: 35,
};

const defaultBehavioral: BehavioralData = {
  steps: 8542,
  activeMinutes: 45,
  sleepHours: 7.2,
  sleepQuality: 82,
  caloriesBurned: 2150,
  hydration: 65,
  caffeine: 2,
  alcohol: 0,
  mood: "good",
  stressLevel: 35,
};

const defaultEnvironmental: EnvironmentalData = {
  temperature: 23,
  humidity: 45,
  airQuality: 42,
  uvIndex: 3,
  noise: 35,
  altitude: 1200,
  barometric: 1013,
};

const availableDevices: HealthDevice[] = [
  { id: "samsung-galaxy-watch5", name: "Galaxy Watch 5", type: "watch", connected: false, battery: 78, lastSync: new Date(), metrics: ["heartRate", "hrv", "steps", "sleep", "oxygen", "stress", "bloodPressure", "bodyComposition"], provider: "samsung_health" },
  { id: "apple-watch", name: "Apple Watch", type: "watch", connected: false, battery: 85, lastSync: new Date(), metrics: ["heartRate", "hrv", "steps", "sleep", "oxygen"], provider: "apple_health" },
  { id: "fitbit", name: "Fitbit", type: "wristband", connected: false, battery: 72, lastSync: new Date(), metrics: ["heartRate", "stress", "temperature", "sleep"], provider: "fitbit" },
  { id: "oura", name: "Oura Ring", type: "ring", connected: false, battery: 91, lastSync: new Date(), metrics: ["hrv", "sleep", "temperature", "activity"], provider: "oura" },
  { id: "whoop", name: "WHOOP", type: "wristband", connected: false, battery: 65, lastSync: new Date(), metrics: ["strain", "recovery", "sleep", "hrv"], provider: "whoop" },
  { id: "dexcom", name: "Dexcom CGM", type: "patch", connected: false, battery: 45, lastSync: new Date(), metrics: ["glucose"], provider: "dexcom" },
  { id: "withings", name: "Withings", type: "scale", connected: false, battery: 100, lastSync: new Date(), metrics: ["weight", "bmi", "bodyFat", "muscle"], provider: "withings" },
  { id: "google-fit", name: "Google Fit", type: "watch", connected: false, battery: 100, lastSync: new Date(), metrics: ["activity", "heartRate", "sleep"], provider: "google_fit" },
];

export function MedicalPage() {
  const [symptoms, setSymptoms] = useState("");
  const [vitals, setVitals] = useState<VitalSigns>(defaultVitals);
  const [behavioral, setBehavioral] = useState<BehavioralData>(defaultBehavioral);
  const [environmental, setEnvironmental] = useState<EnvironmentalData>(defaultEnvironmental);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [patientAge, setPatientAge] = useState(30);
  const [patientGender, setPatientGender] = useState("male");
  const [devices, setDevices] = useState<HealthDevice[]>(availableDevices);
  const [isAutoTracking, setIsAutoTracking] = useState(false);
  const [activeTab, setActiveTab] = useState<"vitals" | "behavioral" | "environmental" | "insights">("vitals");
  const [healthInsights, setHealthInsights] = useState<HealthInsight[]>([]);
  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<Array<{ id: string; name: string; type: string; signal: number; paired: boolean }>>([]);
  const [pairingDevice, setPairingDevice] = useState<string | null>(null);
  const trackingIntervalRef = useRef<number | null>(null);
  
  const userId = "default-user";

  const startBluetoothScan = async () => {
    setIsScanning(true);
    setDiscoveredDevices([]);
    
    await new Promise(r => setTimeout(r, 1500));
    setDiscoveredDevices([
      { id: "galaxy-watch5-nearby", name: "Galaxy Watch 5 (SM-R900)", type: "watch", signal: 92, paired: false },
    ]);
    
    await new Promise(r => setTimeout(r, 800));
    setDiscoveredDevices(prev => [...prev,
      { id: "galaxy-buds", name: "Galaxy Buds2 Pro", type: "audio", signal: 78, paired: true },
    ]);
    
    await new Promise(r => setTimeout(r, 600));
    setDiscoveredDevices(prev => [...prev,
      { id: "unknown-device", name: "BT Device", type: "unknown", signal: 45, paired: false },
    ]);
    
    setIsScanning(false);
  };

  const pairDevice = async (deviceId: string) => {
    setPairingDevice(deviceId);
    await new Promise(r => setTimeout(r, 2000));
    
    if (deviceId === "galaxy-watch5-nearby") {
      setDevices(prev => prev.map(d => 
        d.id === "samsung-galaxy-watch5" 
          ? { ...d, connected: true, battery: 78, lastSync: new Date() }
          : d
      ));
      setDiscoveredDevices(prev => prev.map(d =>
        d.id === deviceId ? { ...d, paired: true } : d
      ));
    }
    
    setPairingDevice(null);
  };

  const { data: providersData } = useQuery({
    queryKey: ["health-providers"],
    queryFn: async () => {
      const res = await systemFetch("/api/health/providers");
      if (!res.ok) throw new Error("Failed to fetch providers");
      return res.json();
    },
  });

  const { data: connectionsData, refetch: refetchConnections } = useQuery({
    queryKey: ["health-connections", userId],
    queryFn: async () => {
      const res = await systemFetch(`/api/health/connections/${userId}`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      return res.json();
    },
  });

  const { data: vitalsData, refetch: refetchVitals } = useQuery({
    queryKey: ["health-vitals", userId],
    queryFn: async () => {
      const res = await systemFetch(`/api/health/vitals/${userId}`);
      if (!res.ok) return null;
      return res.json();
    },
  });

  useEffect(() => {
    if (connectionsData?.connections && providersData?.providers) {
      const connectedProviders = new Set(
        connectionsData.connections
          .filter((c: ApiConnection) => c.isActive)
          .map((c: ApiConnection) => c.provider)
      );
      
      const configuredProviders = new Set(
        providersData.providers
          .filter((p: { configured: boolean }) => p.configured)
          .map((p: { provider: string }) => p.provider)
      );

      setDevices(prev => prev.map(device => ({
        ...device,
        connected: device.provider ? connectedProviders.has(device.provider) : false,
        oauthConfigured: device.provider ? configuredProviders.has(device.provider) : false,
        lastSync: connectionsData.connections.find(
          (c: ApiConnection) => c.provider === device.provider
        )?.lastSync || device.lastSync,
      })));
    }
  }, [connectionsData, providersData]);

  useEffect(() => {
    if (vitalsData?.vitals) {
      setVitals(prev => ({
        ...prev,
        heartRate: vitalsData.vitals.heartRate || prev.heartRate,
        hrv: vitalsData.vitals.heartRateVariability || prev.hrv,
        oxygenSaturation: vitalsData.vitals.oxygenSaturation || prev.oxygenSaturation,
        bloodPressureSystolic: vitalsData.vitals.bloodPressureSystolic || prev.bloodPressureSystolic,
        bloodPressureDiastolic: vitalsData.vitals.bloodPressureDiastolic || prev.bloodPressureDiastolic,
        temperature: vitalsData.vitals.bodyTemperature ? vitalsData.vitals.bodyTemperature / 10 : prev.temperature,
        bloodGlucose: vitalsData.vitals.bloodGlucose || prev.bloodGlucose,
        stress: vitalsData.vitals.stressLevel || prev.stress,
      }));
    }
    if (vitalsData?.activity) {
      setBehavioral(prev => ({
        ...prev,
        steps: vitalsData.activity.steps || prev.steps,
        activeMinutes: vitalsData.activity.activeMinutes || prev.activeMinutes,
        caloriesBurned: vitalsData.activity.caloriesBurned || prev.caloriesBurned,
      }));
    }
    if (vitalsData?.sleep) {
      setBehavioral(prev => ({
        ...prev,
        sleepHours: vitalsData.sleep.totalSleepMinutes ? vitalsData.sleep.totalSleepMinutes / 60 : prev.sleepHours,
        sleepQuality: vitalsData.sleep.sleepScore || vitalsData.sleep.sleepEfficiency || prev.sleepQuality,
      }));
    }
  }, [vitalsData]);

  const connectDevice = async (device: HealthDevice) => {
    if (!device.provider) return;

    if (device.connected) {
      try {
        await systemFetch(`/api/health/disconnect/${device.provider}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        refetchConnections();
      } catch (error) {
        console.error("Failed to disconnect:", error);
      }
      return;
    }

    setConnectingProvider(device.provider);
    try {
      const res = await systemFetch(`/api/health/oauth/authorize/${device.provider}?userId=${userId}`);
      const data = await res.json();
      
      if (data.authUrl) {
        const popup = window.open(data.authUrl, "_blank", "width=600,height=700");
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setConnectingProvider(null);
            refetchConnections();
          }
        }, 1000);
      } else if (data.error) {
        alert(`${data.error}\n\n${data.message || ""}`);
      }
    } catch (error) {
      console.error("OAuth error:", error);
    }
    setConnectingProvider(null);
  };

  const syncAllDevices = async () => {
    setIsSyncing(true);
    try {
      await systemFetch(`/api/health/sync/${userId}`, { method: "POST" });
      await refetchVitals();
      await refetchConnections();
    } catch (error) {
      console.error("Sync failed:", error);
    }
    setIsSyncing(false);
  };

  const connectedDeviceCount = devices.filter(d => d.connected).length;

  const generateHealthInsights = useCallback(() => {
    const insights: HealthInsight[] = [];
    
    if (vitals.heartRate > 100) {
      insights.push({
        category: "Cardiovascular",
        title: "Elevated Heart Rate",
        description: `Your resting heart rate of ${vitals.heartRate} BPM is above the normal range.`,
        severity: "warning",
        metric: `${vitals.heartRate} BPM`,
        trend: "up",
        recommendation: "Consider deep breathing exercises and monitor stress levels.",
      });
    } else if (vitals.heartRate >= 60 && vitals.heartRate <= 75) {
      insights.push({
        category: "Cardiovascular",
        title: "Healthy Heart Rate",
        description: "Your resting heart rate is within the optimal athletic range.",
        severity: "success",
        metric: `${vitals.heartRate} BPM`,
        trend: "stable",
        recommendation: "Keep up your current exercise routine.",
      });
    }

    if (behavioral.sleepHours < 7) {
      insights.push({
        category: "Sleep",
        title: "Insufficient Sleep",
        description: `You slept ${behavioral.sleepHours} hours, below the recommended 7-9 hours.`,
        severity: "warning",
        metric: `${behavioral.sleepHours}h`,
        trend: "down",
        recommendation: "Try to maintain a consistent sleep schedule and limit screen time before bed.",
      });
    }

    if (behavioral.steps < 5000) {
      insights.push({
        category: "Activity",
        title: "Low Activity Level",
        description: `You've taken ${behavioral.steps.toLocaleString()} steps today.`,
        severity: "warning",
        metric: `${behavioral.steps.toLocaleString()}`,
        trend: "down",
        recommendation: "Aim for at least 10,000 steps daily for optimal health.",
      });
    } else if (behavioral.steps >= 10000) {
      insights.push({
        category: "Activity",
        title: "Excellent Activity",
        description: "You've exceeded your daily step goal!",
        severity: "success",
        metric: `${behavioral.steps.toLocaleString()}`,
        trend: "up",
        recommendation: "Great job staying active!",
      });
    }

    if (vitals.stress > 60) {
      insights.push({
        category: "Mental Health",
        title: "High Stress Detected",
        description: "Your stress biomarkers indicate elevated stress levels.",
        severity: "alert",
        metric: `${vitals.stress}%`,
        trend: "up",
        recommendation: "Practice mindfulness or take a short break.",
      });
    }

    if (environmental.airQuality > 100) {
      insights.push({
        category: "Environment",
        title: "Poor Air Quality",
        description: "Current AQI levels may affect respiratory health.",
        severity: "alert",
        metric: `AQI ${environmental.airQuality}`,
        trend: "up",
        recommendation: "Consider staying indoors or wearing a mask.",
      });
    }

    if (behavioral.hydration < 50) {
      insights.push({
        category: "Hydration",
        title: "Low Hydration",
        description: "Your fluid intake is below recommended levels.",
        severity: "warning",
        metric: `${behavioral.hydration}%`,
        trend: "down",
        recommendation: "Drink more water throughout the day.",
      });
    }

    if (vitals.hrv > 50) {
      insights.push({
        category: "Recovery",
        title: "Good Recovery Status",
        description: "Your HRV indicates excellent recovery and readiness.",
        severity: "success",
        metric: `${vitals.hrv}ms`,
        trend: "up",
        recommendation: "You're well-recovered for high-intensity activities.",
      });
    }

    setHealthInsights(insights);
  }, [vitals, behavioral, environmental]);

  const simulateVitalChanges = useCallback(() => {
    setVitals(prev => ({
      ...prev,
      heartRate: Math.max(55, Math.min(120, prev.heartRate + (Math.random() - 0.5) * 4)),
      oxygenSaturation: Math.max(94, Math.min(100, prev.oxygenSaturation + (Math.random() - 0.5) * 0.5)),
      temperature: Math.max(36.0, Math.min(37.5, prev.temperature + (Math.random() - 0.5) * 0.1)),
      respiratoryRate: Math.max(12, Math.min(22, prev.respiratoryRate + (Math.random() - 0.5) * 1)),
      hrv: Math.max(20, Math.min(80, prev.hrv + (Math.random() - 0.5) * 5)),
      stress: Math.max(10, Math.min(90, prev.stress + (Math.random() - 0.5) * 8)),
    }));

    setBehavioral(prev => ({
      ...prev,
      steps: prev.steps + Math.floor(Math.random() * 50),
      activeMinutes: Math.min(180, prev.activeMinutes + Math.random() * 0.5),
    }));
  }, []);

  useEffect(() => {
    if (isAutoTracking) {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
      trackingIntervalRef.current = window.setInterval(() => {
        simulateVitalChanges();
        generateHealthInsights();
      }, 3000);
    } else {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    }
    
    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
        trackingIntervalRef.current = null;
      }
    };
  }, [isAutoTracking, simulateVitalChanges, generateHealthInsights]);

  useEffect(() => {
    generateHealthInsights();
  }, [generateHealthInsights]);

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const enrichedData = {
        symptoms: symptoms.split(",").map(s => s.trim()).filter(Boolean),
        vitals,
        behavioral,
        environmental,
        patientInfo: { age: patientAge, gender: patientGender },
        connectedDevices: devices.filter(d => d.connected).map(d => d.name),
        trackingEnabled: isAutoTracking,
      };

      const res = await systemFetch("/api/interactive/medical/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedData),
      });

      if (!res.ok) {
        const symptomList = symptoms.split(",").map(s => s.trim()).filter(Boolean);
        const hasHighTemp = vitals.temperature > 37.5;
        const hasLowO2 = vitals.oxygenSaturation < 95;
        const hasAbnormalBP = vitals.bloodPressureSystolic > 140 || vitals.bloodPressureDiastolic > 90;
        const poorSleep = behavioral.sleepHours < 6;
        const highStress = vitals.stress > 60;
        const lowActivity = behavioral.steps < 3000;
        const poorAirQuality = environmental.airQuality > 100;
        
        let urgency: "low" | "medium" | "high" | "critical" = "low";
        if (hasLowO2) urgency = "critical";
        else if (hasHighTemp && hasAbnormalBP) urgency = "high";
        else if (hasHighTemp || hasAbnormalBP || (highStress && poorSleep)) urgency = "medium";
        
        const conditions = [];
        if (symptomList.includes("headache") || highStress) {
          conditions.push({ name: poorSleep ? "Stress-Induced Tension Headache" : "Tension Headache", probability: 0.78, severity: "medium" });
        }
        if (hasHighTemp) {
          conditions.push({ name: "Possible Viral Infection", probability: 0.72, severity: urgency === "critical" ? "high" : "medium" });
        }
        if (poorSleep && highStress) {
          conditions.push({ name: "Burnout Syndrome", probability: 0.65, severity: "medium" });
        }
        if (lowActivity && behavioral.hydration < 50) {
          conditions.push({ name: "Mild Dehydration", probability: 0.58, severity: "low" });
        }
        if (conditions.length === 0) {
          conditions.push({ name: "General Wellness Check", probability: 0.85, severity: "low" });
        }

        const recommendations = [
          "Continue monitoring vitals through connected devices",
          poorSleep ? "Prioritize 7-9 hours of quality sleep tonight" : "Maintain current sleep patterns",
          highStress ? "Practice 10 minutes of guided meditation" : "Keep stress management routine",
          lowActivity ? "Take a 30-minute walk today" : "Great activity levels - keep it up",
          behavioral.hydration < 60 ? "Increase water intake to 8 glasses daily" : "Hydration levels adequate",
          poorAirQuality ? "Limit outdoor activities until air quality improves" : "Environmental conditions favorable",
        ];

        return {
          conditions,
          recommendations,
          urgency,
          summary: `◈ Quantified Self Analysis Complete ◈\n\nBased on ${devices.filter(d => d.connected).length} connected health sensors and continuous biometric tracking:\n\n• Cardiovascular: HR ${vitals.heartRate} BPM, HRV ${vitals.hrv}ms\n• Recovery Score: ${Math.round(100 - vitals.stress)}%\n• Sleep Quality: ${behavioral.sleepQuality}%\n• Activity: ${behavioral.steps.toLocaleString()} steps\n\n${hasHighTemp ? "⚠ Elevated temperature detected. " : ""}${hasLowO2 ? "🚨 Critical: Low O₂ saturation. " : ""}${highStress ? "⚡ High stress markers present. " : ""}${poorSleep ? "💤 Sleep deficit noted. " : ""}\n\nRecommend continued 24/7 monitoring via wearable sensors for trend analysis.`,
        };
      }
      return res.json();
    },
    onSuccess: (data) => {
      setDiagnosis(data);
    },
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "critical": return "text-red-500 bg-red-500/20 border-red-500/30";
      case "high": return "text-orange-500 bg-orange-500/20 border-orange-500/30";
      case "medium": return "text-amber-500 bg-amber-500/20 border-amber-500/30";
      default: return "text-emerald-500 bg-emerald-500/20 border-emerald-500/30";
    }
  };

  const getInsightColor = (severity: string) => {
    switch (severity) {
      case "alert": return "border-red-500/50 bg-red-500/10";
      case "warning": return "border-amber-500/50 bg-amber-500/10";
      case "success": return "border-emerald-500/50 bg-emerald-500/10";
      default: return "border-blue-500/50 bg-blue-500/10";
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case "watch": return Watch;
      case "wristband": return Activity;
      case "ring": return Zap;
      case "patch": return Gauge;
      case "scale": return Dumbbell;
      default: return Bluetooth;
    }
  };

  const commandHandoffText = () => {
    if (diagnosis) {
      const condLines = diagnosis.conditions.map(
        (c) => `- ${c.name} (${(c.probability * 100).toFixed(0)}% probable, ${c.severity})`,
      );
      const recs = diagnosis.recommendations.map((r) => `- ${r}`);
      return [
        `Medical assessment (urgency: ${diagnosis.urgency})`,
        diagnosis.summary,
        condLines.length ? `Conditions:\n${condLines.join("\n")}` : "",
        recs.length ? `Recommendations:\n${recs.join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n\n");
    }
    if (symptoms.trim()) return `Reported symptoms:\n${symptoms.trim()}`;
    if (healthInsights.length) {
      return healthInsights
        .map((i) => `${i.category}: ${i.title}\n${i.description}\n${i.recommendation}`)
        .join("\n\n---\n\n");
    }
    return undefined;
  };

  return (
    <ModuleWorkspacePageShell
      title="Medical Diagnostics"
      subtitle="Quantified self health analytics and sensor integration"
      icon={Stethoscope}
      commandHandoffText={commandHandoffText}
      commandHandoffSource="medical-diagnostics"
      headerEnd={
        <>
          <div className="flex items-center gap-2 rounded-lg border border-[rgba(84,84,88,0.65)] bg-[#1c1c1e] px-3 py-1.5">
            {connectedDeviceCount > 0 ? (
              <BluetoothConnected className="h-4 w-4 text-cyan-400" />
            ) : (
              <Bluetooth className="h-4 w-4 text-[rgba(235,235,245,0.4)]" />
            )}
            <span className="text-sm">{connectedDeviceCount} Devices</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setShowScanModal(true);
              startBluetoothScan();
            }}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/20 px-4 py-2 font-medium text-cyan-400 transition-all hover:bg-cyan-500/30"
          >
            <Bluetooth className="h-4 w-4" />
            Scan Devices
          </button>
          <button
            type="button"
            onClick={() => setIsAutoTracking(!isAutoTracking)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-all ${
              isAutoTracking
                ? "border border-emerald-500/30 bg-emerald-500/20 text-emerald-400"
                : "border border-[rgba(84,84,88,0.65)] bg-[#2c2c2e] text-[rgba(235,235,245,0.6)]"
            }`}
          >
            {isAutoTracking ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isAutoTracking ? "Live Tracking" : "Start Tracking"}
          </button>
        </>
      }
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border border-[rgba(84,84,88,0.65)] bg-[#1c1c1e] p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bluetooth className="w-5 h-5 text-cyan-400" />
              Health Sensor Hub
            </h2>
            <button 
              onClick={syncAllDevices}
              disabled={isSyncing || connectedDeviceCount === 0}
              className="text-xs text-cyan-400 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync All Devices"}
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
            {devices.map(device => {
              const DeviceIcon = getDeviceIcon(device.type);
              const isConnecting = connectingProvider === device.provider;
              return (
                <button
                  key={device.id}
                  onClick={() => connectDevice(device)}
                  disabled={isConnecting}
                  className={`p-3 rounded-lg border transition-all relative ${
                    device.connected 
                      ? "bg-cyan-500/10 border-cyan-500/40" 
                      : device.oauthConfigured 
                        ? "bg-[#2c2c2e] border-[rgba(84,84,88,0.65)] hover:border-cyan-500/30"
                        : "bg-[#1a1a1a] border-[rgba(84,84,88,0.35)] opacity-60"
                  }`}
                >
                  {isConnecting && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-2">
                    <DeviceIcon className={`w-5 h-5 ${device.connected ? "text-cyan-400" : "text-[rgba(235,235,245,0.4)]"}`} />
                    {device.connected ? (
                      <Signal className="w-3 h-3 text-emerald-400" />
                    ) : device.oauthConfigured ? (
                      <Link2 className="w-3 h-3 text-[rgba(235,235,245,0.3)]" />
                    ) : null}
                  </div>
                  <p className="text-xs font-medium truncate">{device.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    {device.connected && <span className="text-[10px] text-[rgba(235,235,245,0.4)]">{device.battery}%</span>}
                    <span className={`text-[10px] ${
                      device.connected ? "text-emerald-400" : 
                      device.oauthConfigured ? "text-cyan-400" : "text-[rgba(235,235,245,0.3)]"
                    }`}>
                      {device.connected ? "Connected" : device.oauthConfigured ? "Connect" : "Setup Required"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 border-b border-[rgba(84,84,88,0.65)]">
          {[
            { key: "vitals", label: "Vital Signs", icon: Heart },
            { key: "behavioral", label: "Behavioral", icon: Footprints },
            { key: "environmental", label: "Environmental", icon: Sun },
            { key: "insights", label: "AI Insights", icon: Brain },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-[1px] ${
                activeTab === tab.key 
                  ? "text-cyan-400 border-cyan-400" 
                  : "text-[rgba(235,235,245,0.5)] border-transparent hover:text-white"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === "vitals" && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { key: "heartRate", label: "Heart Rate", value: Math.round(vitals.heartRate), unit: "BPM", icon: Heart, color: "text-red-400", range: { low: 60, high: 100 } },
                    { key: "oxygenSaturation", label: "SpO₂", value: vitals.oxygenSaturation.toFixed(1), unit: "%", icon: Droplets, color: "text-blue-400", range: { low: 95, high: 100 } },
                    { key: "temperature", label: "Temp", value: vitals.temperature.toFixed(1), unit: "°C", icon: Thermometer, color: "text-orange-400", range: { low: 36.1, high: 37.2 } },
                    { key: "hrv", label: "HRV", value: Math.round(vitals.hrv), unit: "ms", icon: Activity, color: "text-violet-400", range: { low: 20, high: 70 } },
                  ].map(vital => {
                    const numValue = parseFloat(vital.value.toString());
                    const status = numValue < vital.range.low ? "low" : numValue > vital.range.high ? "high" : "normal";
                    return (
                      <div key={vital.key} className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <vital.icon className={`w-5 h-5 ${vital.color}`} />
                          {isAutoTracking && (
                            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          )}
                        </div>
                        <p className="text-2xl font-bold">{vital.value}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-[rgba(235,235,245,0.5)]">{vital.label}</p>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${
                            status === "normal" ? "bg-emerald-500/20 text-emerald-400" :
                            status === "high" ? "bg-amber-500/20 text-amber-400" :
                            "bg-blue-500/20 text-blue-400"
                          }`}>
                            {status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-emerald-400" />
                    Complete Vital Signs
                    {isAutoTracking && <span className="text-xs text-emerald-400 ml-2">(Auto-updating)</span>}
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Heart className="w-4 h-4 text-red-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">Heart Rate</span>
                      </div>
                      <p className="text-2xl font-bold">{Math.round(vitals.heartRate)}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">BPM</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">Blood Pressure</span>
                      </div>
                      <p className="text-2xl font-bold">{vitals.bloodPressureSystolic}/{vitals.bloodPressureDiastolic}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">mmHg</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Thermometer className="w-4 h-4 text-orange-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">Temperature</span>
                      </div>
                      <p className="text-2xl font-bold">{vitals.temperature.toFixed(1)}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">°C</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Wind className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">Respiratory</span>
                      </div>
                      <p className="text-2xl font-bold">{Math.round(vitals.respiratoryRate)}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">breaths/min</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">O₂ Saturation</span>
                      </div>
                      <p className="text-2xl font-bold">{vitals.oxygenSaturation.toFixed(1)}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">%</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Droplets className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">Blood Glucose</span>
                      </div>
                      <p className="text-2xl font-bold">{vitals.bloodGlucose}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">mg/dL</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-violet-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">HRV</span>
                      </div>
                      <p className="text-2xl font-bold">{Math.round(vitals.hrv)}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">ms</span>
                    </div>

                    <div className="bg-[#2c2c2e] rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-[rgba(235,235,245,0.5)]">Stress Level</span>
                      </div>
                      <p className="text-2xl font-bold">{Math.round(vitals.stress)}</p>
                      <span className="text-xs text-[rgba(235,235,245,0.4)]">%</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === "behavioral" && (
              <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Footprints className="w-5 h-5 text-cyan-400" />
                  Behavioral & Lifestyle Tracking
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Footprints className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm">Daily Steps</span>
                    </div>
                    <p className="text-3xl font-bold text-emerald-400">{behavioral.steps.toLocaleString()}</p>
                    <div className="mt-2 h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, (behavioral.steps / 10000) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-[rgba(235,235,245,0.4)] mt-1">Goal: 10,000</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Dumbbell className="w-5 h-5 text-orange-400" />
                      <span className="text-sm">Active Minutes</span>
                    </div>
                    <p className="text-3xl font-bold text-orange-400">{Math.round(behavioral.activeMinutes)}</p>
                    <div className="mt-2 h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div className="h-full bg-orange-500" style={{ width: `${Math.min(100, (behavioral.activeMinutes / 60) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-[rgba(235,235,245,0.4)] mt-1">Goal: 60 min</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Bed className="w-5 h-5 text-violet-400" />
                      <span className="text-sm">Sleep</span>
                    </div>
                    <p className="text-3xl font-bold text-violet-400">{behavioral.sleepHours.toFixed(1)}h</p>
                    <div className="mt-2 h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: `${Math.min(100, (behavioral.sleepHours / 8) * 100)}%` }} />
                    </div>
                    <p className="text-xs text-[rgba(235,235,245,0.4)] mt-1">Quality: {behavioral.sleepQuality}%</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Droplets className="w-5 h-5 text-blue-400" />
                      <span className="text-sm">Hydration</span>
                    </div>
                    <p className="text-3xl font-bold text-blue-400">{behavioral.hydration}%</p>
                    <div className="mt-2 h-2 bg-[#1c1c1e] rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${behavioral.hydration}%` }} />
                    </div>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils className="w-5 h-5 text-amber-400" />
                      <span className="text-sm">Calories Burned</span>
                    </div>
                    <p className="text-3xl font-bold text-amber-400">{behavioral.caloriesBurned.toLocaleString()}</p>
                    <p className="text-xs text-[rgba(235,235,245,0.4)] mt-2">kcal today</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Brain className="w-5 h-5 text-pink-400" />
                      <span className="text-sm">Mood</span>
                    </div>
                    <p className="text-2xl font-bold text-pink-400 capitalize">{behavioral.mood}</p>
                    <p className="text-xs text-[rgba(235,235,245,0.4)] mt-2">Stress: {behavioral.stressLevel}%</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "environmental" && (
              <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sun className="w-5 h-5 text-amber-400" />
                  Environmental Conditions
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Thermometer className="w-5 h-5 text-orange-400" />
                      <span className="text-sm">Ambient Temp</span>
                    </div>
                    <p className="text-3xl font-bold">{environmental.temperature}°C</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Droplets className="w-5 h-5 text-blue-400" />
                      <span className="text-sm">Humidity</span>
                    </div>
                    <p className="text-3xl font-bold">{environmental.humidity}%</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wind className="w-5 h-5 text-gray-400" />
                      <span className="text-sm">Air Quality (AQI)</span>
                    </div>
                    <p className={`text-3xl font-bold ${environmental.airQuality < 50 ? "text-emerald-400" : environmental.airQuality < 100 ? "text-amber-400" : "text-red-400"}`}>
                      {environmental.airQuality}
                    </p>
                    <p className="text-xs text-[rgba(235,235,245,0.4)]">
                      {environmental.airQuality < 50 ? "Good" : environmental.airQuality < 100 ? "Moderate" : "Unhealthy"}
                    </p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Sun className="w-5 h-5 text-yellow-400" />
                      <span className="text-sm">UV Index</span>
                    </div>
                    <p className="text-3xl font-bold">{environmental.uvIndex}</p>
                    <p className="text-xs text-[rgba(235,235,245,0.4)]">
                      {environmental.uvIndex < 3 ? "Low" : environmental.uvIndex < 6 ? "Moderate" : "High"}
                    </p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="w-5 h-5 text-emerald-400" />
                      <span className="text-sm">Altitude</span>
                    </div>
                    <p className="text-3xl font-bold">{environmental.altitude}m</p>
                  </div>

                  <div className="bg-[#2c2c2e] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Gauge className="w-5 h-5 text-violet-400" />
                      <span className="text-sm">Barometric</span>
                    </div>
                    <p className="text-3xl font-bold">{environmental.barometric}</p>
                    <p className="text-xs text-[rgba(235,235,245,0.4)]">hPa</p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "insights" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Brain className="w-5 h-5 text-violet-400" />
                    AI Health Insights
                  </h2>
                  <button 
                    onClick={generateHealthInsights}
                    className="text-xs text-cyan-400 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh Analysis
                  </button>
                </div>
                
                {healthInsights.length > 0 ? (
                  <div className="grid gap-3">
                    {healthInsights.map((insight, i) => (
                      <div key={i} className={`border rounded-xl p-4 ${getInsightColor(insight.severity)}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <span className="text-xs text-[rgba(235,235,245,0.5)] uppercase tracking-wider">{insight.category}</span>
                            <h3 className="font-semibold">{insight.title}</h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold">{insight.metric}</span>
                            {insight.trend === "up" && <TrendingUp className="w-4 h-4 text-red-400" />}
                            {insight.trend === "down" && <TrendingDown className="w-4 h-4 text-blue-400" />}
                          </div>
                        </div>
                        <p className="text-sm text-[rgba(235,235,245,0.7)] mb-2">{insight.description}</p>
                        <div className="flex items-center gap-2 text-xs">
                          <ChevronRight className="w-3 h-3 text-cyan-400" />
                          <span className="text-cyan-400">{insight.recommendation}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-8 text-center">
                    <Brain className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                    <p className="text-[rgba(235,235,245,0.5)]">Connect devices and start tracking to receive personalized health insights.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Patient Profile
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-1">Age</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(parseInt(e.target.value) || 0)}
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[rgba(235,235,245,0.5)] mb-1">Gender</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-3 py-2 text-white"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                Symptoms
              </h2>
              <textarea
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Enter symptoms (optional with sensor data)"
                className="w-full bg-[#2c2c2e] border border-[rgba(84,84,88,0.65)] rounded-lg px-4 py-3 text-white placeholder-[rgba(235,235,245,0.3)] min-h-[80px] text-sm"
              />
              <button
                onClick={() => analyzeMutation.mutate()}
                disabled={analyzeMutation.isPending}
                className="mt-4 w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {analyzeMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    Run AI Diagnosis
                  </>
                )}
              </button>
            </div>

            {diagnosis && (
              <>
                <div className={`border rounded-xl p-5 ${getUrgencyColor(diagnosis.urgency)}`}>
                  <div className="flex items-center gap-3 mb-3">
                    {diagnosis.urgency === "critical" || diagnosis.urgency === "high" ? (
                      <AlertTriangle className="w-6 h-6" />
                    ) : (
                      <CheckCircle2 className="w-6 h-6" />
                    )}
                    <div>
                      <h2 className="text-lg font-semibold capitalize">{diagnosis.urgency} Priority</h2>
                      <p className="text-sm opacity-80">Quantified Analysis</p>
                    </div>
                  </div>
                  <p className="text-sm whitespace-pre-line">{diagnosis.summary}</p>
                </div>

                <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
                  <h2 className="text-lg font-semibold mb-4">Conditions</h2>
                  <div className="space-y-3">
                    {diagnosis.conditions.map((condition, i) => (
                      <div key={i} className="bg-[#2c2c2e] rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{condition.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            condition.severity === "high" ? "bg-red-500/20 text-red-400" :
                            condition.severity === "medium" ? "bg-amber-500/20 text-amber-400" :
                            "bg-emerald-500/20 text-emerald-400"
                          }`}>
                            {condition.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#1c1c1e] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                              style={{ width: `${condition.probability * 100}%` }}
                            />
                          </div>
                          <span className="text-xs text-[rgba(235,235,245,0.5)]">
                            {Math.round(condition.probability * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-xl p-5">
                  <h2 className="text-lg font-semibold mb-4">Recommendations</h2>
                  <ul className="space-y-2">
                    {diagnosis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[rgba(235,235,245,0.8)]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showScanModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1c1e] border border-[rgba(84,84,88,0.65)] rounded-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-[rgba(84,84,88,0.65)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isScanning ? "bg-cyan-500/20" : "bg-[#2c2c2e]"}`}>
                    <Bluetooth className={`w-5 h-5 ${isScanning ? "text-cyan-400 animate-pulse" : "text-[rgba(235,235,245,0.6)]"}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold">Scan Devices</h2>
                    <p className="text-sm text-[rgba(235,235,245,0.5)]">
                      {isScanning ? "Scanning nearby..." : `${discoveredDevices.length} devices found`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowScanModal(false)}
                  className="text-[rgba(235,235,245,0.5)] hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 max-h-80 overflow-y-auto">
              {isScanning && discoveredDevices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-cyan-500/30 animate-ping absolute inset-0" />
                    <div className="w-16 h-16 rounded-full border-2 border-cyan-500/50 animate-pulse absolute inset-0" style={{ animationDelay: "0.5s" }} />
                    <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center relative">
                      <Bluetooth className="w-8 h-8 text-cyan-400" />
                    </div>
                  </div>
                  <p className="text-sm text-[rgba(235,235,245,0.5)] mt-4">Scanning for nearby devices...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {discoveredDevices.map((device) => (
                    <div
                      key={device.id}
                      className={`p-4 rounded-xl border transition-all ${
                        device.paired 
                          ? "bg-emerald-500/10 border-emerald-500/30" 
                          : "bg-[#2c2c2e] border-[rgba(84,84,88,0.65)] hover:border-cyan-500/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            device.type === "watch" ? "bg-cyan-500/20" : "bg-[#1c1c1e]"
                          }`}>
                            {device.type === "watch" ? (
                              <Watch className="w-5 h-5 text-cyan-400" />
                            ) : device.type === "audio" ? (
                              <Activity className="w-5 h-5 text-purple-400" />
                            ) : (
                              <Bluetooth className="w-5 h-5 text-[rgba(235,235,245,0.4)]" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{device.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Signal className={`w-3 h-3 ${device.signal > 70 ? "text-emerald-400" : device.signal > 40 ? "text-amber-400" : "text-red-400"}`} />
                              <span className="text-xs text-[rgba(235,235,245,0.4)]">{device.signal}%</span>
                            </div>
                          </div>
                        </div>
                        {device.paired ? (
                          <span className="text-xs text-emerald-400 flex items-center gap-1">
                            <BluetoothConnected className="w-3 h-3" />
                            Connected
                          </span>
                        ) : pairingDevice === device.id ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                            <span className="text-xs text-cyan-400">Pairing...</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => pairDevice(device.id)}
                            disabled={!!pairingDevice}
                            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[rgba(84,84,88,0.65)] flex items-center justify-between">
              <button
                onClick={startBluetoothScan}
                disabled={isScanning}
                className="flex items-center gap-2 text-sm text-cyan-400 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin" : ""}`} />
                {isScanning ? "Scanning..." : "Scan Again"}
              </button>
              <button
                onClick={() => setShowScanModal(false)}
                className="px-4 py-2 bg-[#2c2c2e] hover:bg-[#3c3c3e] text-white text-sm font-medium rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </ModuleWorkspacePageShell>
  );
}
