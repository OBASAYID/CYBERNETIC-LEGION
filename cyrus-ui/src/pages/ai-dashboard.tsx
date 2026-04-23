import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  Radar,
  Route,
  Target,
  Zap,
  Shield,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Navigation,
  Activity,
  Eye,
  Ear,
  Cpu,
  Database,
  RefreshCw,
  ChevronRight,
  Circle,
  Layers,
  BarChart3,
  LineChart,
  ArrowLeft
} from "lucide-react";
import { systemFetch } from "@/lib/system-api";

interface SensorData {
  type: string;
  status: string;
  confidence: number;
  lastUpdate: number;
  detections: number;
}

interface PathData {
  id: string;
  waypoints: any[];
  totalDistance: number;
  estimatedTime: number;
  riskLevel: string;
  noFlyZonesAvoided: string[];
}

interface LearningMetric {
  name: string;
  value: number;
  trend: string;
  target?: number;
  unit?: string;
}

interface LearningModel {
  id: string;
  name: string;
  type: string;
  accuracy: number;
  trainingDataSize: number;
}

interface NoFlyZone {
  id: string;
  name: string;
  type: string;
  radius: number;
  active: boolean;
}

export default function AIDashboard() {
  const [activePath, setActivePath] = useState<PathData | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<string | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);

  const { data: learningStats, refetch: refetchStats } = useQuery<any>({
    queryKey: ["/api/cyrus/learning/stats"],
    refetchInterval: 5000
  });

  const { data: learningMetrics } = useQuery<LearningMetric[]>({
    queryKey: ["/api/cyrus/learning/metrics"],
    refetchInterval: 5000
  });

  const { data: learningModels } = useQuery<LearningModel[]>({
    queryKey: ["/api/cyrus/learning/models"],
    refetchInterval: 10000
  });

  const { data: noFlyZones } = useQuery<NoFlyZone[]>({
    queryKey: ["/api/cyrus/path/no-fly-zones"]
  });

  const { data: thresholds } = useQuery<any[]>({
    queryKey: ["/api/cyrus/learning/thresholds"]
  });

  const { data: sensorStatus, refetch: refetchSensors } = useQuery<any>({
    queryKey: ["/api/cyrus/sensor-fusion/status"],
    refetchInterval: 3000
  });

  const { data: cognitiveMetrics } = useQuery<any>({
    queryKey: ["/api/cyrus/cognitive/metrics"],
    refetchInterval: 3000
  });

  const { data: neuralArchitecture } = useQuery<any[]>({
    queryKey: ["/api/cyrus/cognitive/neural-architecture"]
  });

  const { data: quantumStates } = useQuery<any[]>({
    queryKey: ["/api/cyrus/cognitive/quantum-states"],
    refetchInterval: 5000
  });

  const { data: symbolicRules } = useQuery<any[]>({
    queryKey: ["/api/cyrus/cognitive/symbolic-rules"]
  });

  const { data: safetyConstraints } = useQuery<any[]>({
    queryKey: ["/api/cyrus/cognitive/safety-constraints"]
  });

  const sensors: SensorData[] = sensorStatus?.sensors?.map((s: any) => ({
    type: s.name,
    status: s.active ? "active" : "standby",
    confidence: s.reliability,
    lastUpdate: s.lastUpdate || Date.now(),
    detections: s.detectionCount || Math.floor(Math.random() * 20)
  })) || [
    { type: "AESA Radar", status: "active", confidence: 0.98, lastUpdate: Date.now() - 100, detections: 12 },
    { type: "EO/IR Thermal", status: "active", confidence: 0.95, lastUpdate: Date.now() - 200, detections: 8 },
    { type: "SIGINT", status: "active", confidence: 0.87, lastUpdate: Date.now() - 500, detections: 3 },
    { type: "GPS/INS", status: "active", confidence: 0.99, lastUpdate: Date.now() - 50, detections: 0 },
    { type: "LIDAR", status: "active", confidence: 0.94, lastUpdate: Date.now() - 150, detections: 45 },
    { type: "Acoustic", status: "standby", confidence: 0.82, lastUpdate: Date.now() - 1000, detections: 2 }
  ];

  const testPathPlanning = async () => {
    setIsPlanning(true);
    try {
      const response = await systemFetch("/api/cyrus/path/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: { latitude: -24.6282, longitude: 25.9231, altitude: 100, heading: 0, speed: 0, accuracy: 5, timestamp: Date.now() },
          destination: { latitude: -24.72, longitude: 26.05, altitude: 200, heading: 0, speed: 0, accuracy: 5, timestamp: Date.now() }
        })
      });
      const data = await response.json();
      if (data.path) {
        setActivePath(data.path);
      }
    } catch (error) {
      console.error("Path planning failed:", error);
    } finally {
      setIsPlanning(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    if (trend === "improving") return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend === "declining") return <AlertTriangle className="w-3 h-3 text-red-500" />;
    return <Activity className="w-3 h-3 text-muted-foreground" />;
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "low": return "text-green-500 bg-green-500/10";
      case "medium": return "text-yellow-500 bg-yellow-500/10";
      case "high": return "text-orange-500 bg-orange-500/10";
      case "critical": return "text-red-500 bg-red-500/10";
      default: return "text-muted-foreground bg-muted";
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="page-ai-dashboard">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="icon" className="mr-2" data-testid="button-back">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Brain className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">CYRUS AI Command Center</h1>
                <p className="text-xs text-muted-foreground">Advanced Intelligence & Autonomous Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                All Systems Operational
              </Badge>
              <Button size="sm" variant="outline" onClick={() => refetchStats()} data-testid="button-refresh">
                <RefreshCw className="w-4 h-4 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <Layers className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="cognitive" data-testid="tab-cognitive">
              <Cpu className="w-4 h-4 mr-2" />
              Cognitive
            </TabsTrigger>
            <TabsTrigger value="sensors" data-testid="tab-sensors">
              <Radar className="w-4 h-4 mr-2" />
              Sensors
            </TabsTrigger>
            <TabsTrigger value="navigation" data-testid="tab-navigation">
              <Route className="w-4 h-4 mr-2" />
              Navigation
            </TabsTrigger>
            <TabsTrigger value="learning" data-testid="tab-learning">
              <Brain className="w-4 h-4 mr-2" />
              Learning
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-model-accuracy">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Model Accuracy</CardTitle>
                  <Cpu className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {learningStats ? `${(learningStats.modelAccuracy * 100).toFixed(1)}%` : "--"}
                  </div>
                  <Progress value={(learningStats?.modelAccuracy || 0) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Neural network performance</p>
                </CardContent>
              </Card>

              <Card data-testid="card-success-rate">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Mission Success</CardTitle>
                  <Target className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {learningStats ? `${(learningStats.successRate * 100).toFixed(1)}%` : "--"}
                  </div>
                  <Progress value={(learningStats?.successRate || 0) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Overall mission completion</p>
                </CardContent>
              </Card>

              <Card data-testid="card-improvement">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Improvement Rate</CardTitle>
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {learningStats ? `${(learningStats.improvementRate * 100).toFixed(1)}%` : "--"}
                  </div>
                  <Progress value={(learningStats?.improvementRate || 0) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Metrics trending positive</p>
                </CardContent>
              </Card>

              <Card data-testid="card-events">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Learning Events</CardTitle>
                  <Database className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {learningStats?.totalEvents?.toLocaleString() || "0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {learningStats?.adaptiveAdjustments || 0} threshold adjustments
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-sensor-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Radar className="w-5 h-5" />
                    Sensor Array Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sensors.map((sensor, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${sensor.status === "active" ? "bg-green-500" : "bg-yellow-500"}`} />
                          <span className="font-medium text-sm">{sensor.type}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">{sensor.detections} detections</span>
                          <Badge variant="outline">{(sensor.confidence * 100).toFixed(0)}%</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-noflyzone-overview">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    No-Fly Zone Awareness
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {noFlyZones?.map((zone) => (
                      <div key={zone.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${zone.active ? "bg-red-500" : "bg-muted-foreground"}`} />
                          <div>
                            <span className="font-medium text-sm">{zone.name}</span>
                            <p className="text-xs text-muted-foreground capitalize">{zone.type}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{(zone.radius / 1000).toFixed(1)}km</span>
                          <Badge variant={zone.active ? "destructive" : "secondary"}>
                            {zone.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Loading zones...</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="cognitive" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card data-testid="card-processing-efficiency">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Processing Efficiency</CardTitle>
                  <Zap className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {cognitiveMetrics ? `${(cognitiveMetrics.processingEfficiency * 100).toFixed(1)}%` : "--"}
                  </div>
                  <Progress value={(cognitiveMetrics?.processingEfficiency || 0) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Hybrid neural-symbolic processing</p>
                </CardContent>
              </Card>

              <Card data-testid="card-quantum-coherence">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Quantum Coherence</CardTitle>
                  <Activity className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-500">
                    {cognitiveMetrics ? `${(cognitiveMetrics.quantumCoherence * 100).toFixed(1)}%` : "--"}
                  </div>
                  <Progress value={(cognitiveMetrics?.quantumCoherence || 0) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Probabilistic reasoning state</p>
                </CardContent>
              </Card>

              <Card data-testid="card-creativity-index">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Creativity Index</CardTitle>
                  <Brain className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-cyan-500">
                    {cognitiveMetrics ? cognitiveMetrics.creativityIndex.toFixed(2) : "--"}
                  </div>
                  <Progress value={Math.min((cognitiveMetrics?.creativityIndex || 0) * 100, 100)} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Emergent insight generation</p>
                </CardContent>
              </Card>

              <Card data-testid="card-safety-compliance">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-medium">Safety Compliance</CardTitle>
                  <Shield className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {cognitiveMetrics ? `${(cognitiveMetrics.safetyCompliance * 100).toFixed(0)}%` : "--"}
                  </div>
                  <Progress value={(cognitiveMetrics?.safetyCompliance || 0) * 100} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">Ethical constraint adherence</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-neural-architecture">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    Neural Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {neuralArchitecture?.slice(0, 8).map((layer: any) => (
                      <div key={layer.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            layer.type === "input" ? "bg-blue-500" :
                            layer.type === "output" ? "bg-green-500" :
                            layer.type === "attention" ? "bg-purple-500" :
                            layer.type === "memory" ? "bg-orange-500" :
                            "bg-cyan-500"
                          }`} />
                          <div>
                            <span className="text-sm font-medium">{layer.id.replace(/_/g, " ")}</span>
                            <p className="text-xs text-muted-foreground capitalize">{layer.type} - {layer.activation}</p>
                          </div>
                        </div>
                        <Badge variant="outline">{layer.neurons} neurons</Badge>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Loading architecture...</p>}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-quantum-states">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Quantum State Visualization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {quantumStates?.map((qs: any) => (
                      <div key={qs.id} className="p-3 rounded-lg bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium capitalize">{qs.id.replace(/_/g, " ")}</span>
                          <Badge variant={qs.state.superposition ? "default" : "secondary"} className="text-xs">
                            {qs.state.superposition ? "Superposition" : "Collapsed"}
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Amplitude</span>
                            <span className="font-mono">{qs.state.amplitude.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Phase</span>
                            <span className="font-mono">{(qs.state.phase / Math.PI).toFixed(2)}π</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Probability</span>
                            <span className="font-mono">{(qs.state.probability * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-sm col-span-2">Loading quantum states...</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-symbolic-rules">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Symbolic Reasoning Rules
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {symbolicRules?.map((rule: any) => (
                      <div key={rule.id} className="p-3 rounded-lg bg-muted/50 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium capitalize">{rule.category}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={rule.learned ? "default" : "secondary"} className="text-xs">
                              {rule.learned ? "Learned" : "Core"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">P{rule.priority}</Badge>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">{rule.condition}</p>
                        <p className="text-xs text-green-500">{rule.action}</p>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Loading rules...</p>}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-safety-constraints">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Safety Constraints
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {safetyConstraints?.map((constraint: any) => (
                      <div key={constraint.id} className="p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{constraint.name}</span>
                          <Badge variant={constraint.type === "hard" ? "destructive" : "secondary"} className="text-xs">
                            {constraint.type.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{constraint.description}</p>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className={constraint.active ? "text-green-500" : "text-red-500"}>
                            {constraint.active ? "Active" : "Inactive"}
                          </span>
                          <span className="text-muted-foreground">Violations: {constraint.violations}</span>
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Loading constraints...</p>}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="sensors" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sensors.map((sensor, idx) => (
                <Card 
                  key={idx} 
                  className={`cursor-pointer transition-all ${selectedSensor === sensor.type ? "ring-2 ring-primary" : ""}`}
                  onClick={() => setSelectedSensor(sensor.type)}
                  data-testid={`card-sensor-${sensor.type.toLowerCase().replace(/\//g, "-")}`}
                >
                  <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                    <CardTitle className="text-sm font-medium">{sensor.type}</CardTitle>
                    {sensor.type.includes("Radar") && <Radar className="w-4 h-4 text-primary" />}
                    {sensor.type.includes("EO/IR") && <Eye className="w-4 h-4 text-primary" />}
                    {sensor.type.includes("SIGINT") && <Zap className="w-4 h-4 text-primary" />}
                    {sensor.type.includes("GPS") && <MapPin className="w-4 h-4 text-primary" />}
                    {sensor.type.includes("LIDAR") && <Target className="w-4 h-4 text-primary" />}
                    {sensor.type.includes("Acoustic") && <Ear className="w-4 h-4 text-primary" />}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={sensor.status === "active" ? "default" : "secondary"}>
                          {sensor.status}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Confidence</span>
                          <span className="font-medium">{(sensor.confidence * 100).toFixed(1)}%</span>
                        </div>
                        <Progress value={sensor.confidence * 100} />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Detections</span>
                        <span className="font-bold">{sensor.detections}</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last update: {Math.round((Date.now() - sensor.lastUpdate) / 1000)}s ago
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card data-testid="card-fusion-matrix">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  Sensor Fusion Matrix
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-6 gap-1 text-xs">
                  {sensors.map((s1, i) => (
                    sensors.map((s2, j) => (
                      <div 
                        key={`${i}-${j}`}
                        className={`aspect-square rounded flex items-center justify-center font-mono ${
                          i === j ? "bg-primary text-primary-foreground" : 
                          Math.abs(s1.confidence - s2.confidence) < 0.1 ? "bg-green-500/20 text-green-500" :
                          "bg-muted text-muted-foreground"
                        }`}
                      >
                        {i === j ? "1.0" : (s1.confidence * s2.confidence).toFixed(2)}
                      </div>
                    ))
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Cross-sensor correlation matrix showing data fusion confidence
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="navigation" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2" data-testid="card-path-visualizer">
                <CardHeader className="flex flex-row items-center justify-between gap-2">
                  <CardTitle className="flex items-center gap-2">
                    <Route className="w-5 h-5" />
                    Path Planning Visualizer
                  </CardTitle>
                  <Button size="sm" onClick={testPathPlanning} disabled={isPlanning} data-testid="button-plan-path">
                    {isPlanning ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Navigation className="w-4 h-4 mr-1" />}
                    {isPlanning ? "Planning..." : "Plan Route"}
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg relative overflow-hidden">
                    <div className="absolute inset-0 opacity-20">
                      {[...Array(20)].map((_, i) => (
                        <div
                          key={i}
                          className="absolute border-t border-l border-primary/30"
                          style={{
                            left: `${(i % 5) * 25}%`,
                            top: `${Math.floor(i / 5) * 25}%`,
                            width: "25%",
                            height: "25%"
                          }}
                        />
                      ))}
                    </div>
                    
                    {noFlyZones?.map((zone, idx) => (
                      <div
                        key={zone.id}
                        className="absolute rounded-full border-2 border-red-500/50 bg-red-500/10"
                        style={{
                          left: `${20 + idx * 25}%`,
                          top: `${30 + idx * 10}%`,
                          width: `${zone.radius / 500}px`,
                          height: `${zone.radius / 500}px`,
                          transform: "translate(-50%, -50%)"
                        }}
                      >
                        <div className="absolute inset-0 flex items-center justify-center">
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                        </div>
                      </div>
                    ))}

                    {activePath && (
                      <>
                        <div className="absolute w-4 h-4 rounded-full bg-green-500 border-2 border-white" style={{ left: "10%", top: "80%", transform: "translate(-50%, -50%)" }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-green-400 whitespace-nowrap">START</div>
                        </div>
                        
                        <svg className="absolute inset-0 w-full h-full pointer-events-none">
                          <path
                            d="M 10% 80% Q 30% 50%, 50% 40% Q 70% 30%, 85% 15%"
                            fill="none"
                            stroke="url(#pathGradient)"
                            strokeWidth="3"
                            strokeDasharray="8 4"
                            className="animate-pulse"
                          />
                          <defs>
                            <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#22c55e" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div className="absolute w-4 h-4 rounded-full bg-blue-500 border-2 border-white" style={{ left: "85%", top: "15%", transform: "translate(-50%, -50%)" }}>
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-blue-400 whitespace-nowrap">DEST</div>
                        </div>
                      </>
                    )}

                    {!activePath && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <Navigation className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                          <p className="text-muted-foreground text-sm">Click "Plan Route" to generate a path</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-path-details">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Route Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {activePath ? (
                    <div className="space-y-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">Total Distance</div>
                        <div className="text-2xl font-bold">{(activePath.totalDistance / 1000).toFixed(2)} km</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">Estimated Time</div>
                        <div className="text-2xl font-bold">{Math.ceil(activePath.estimatedTime / 60)} min</div>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">Risk Level</div>
                        <Badge className={getRiskColor(activePath.riskLevel)}>
                          {activePath.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <div className="text-sm text-muted-foreground mb-1">Waypoints</div>
                        <div className="text-2xl font-bold">{activePath.waypoints.length}</div>
                      </div>
                      {activePath.noFlyZonesAvoided.length > 0 && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                          <div className="text-sm text-red-400 mb-1">Zones Avoided</div>
                          <div className="flex flex-wrap gap-1">
                            {activePath.noFlyZonesAvoided.map((zone, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs">
                                {zone}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Route className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No active route</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="learning" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card data-testid="card-metrics">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="w-5 h-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {learningMetrics?.map((metric) => (
                      <div key={metric.name} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getTrendIcon(metric.trend)}
                            <span className="text-sm font-medium capitalize">
                              {metric.name.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-sm font-bold">
                            {metric.unit === "%" 
                              ? `${(metric.value * 100).toFixed(1)}%`
                              : `${metric.value.toFixed(1)}${metric.unit || ""}`
                            }
                          </span>
                        </div>
                        <div className="relative">
                          <Progress 
                            value={metric.unit === "%" ? metric.value * 100 : Math.min(metric.value, 100)} 
                          />
                          {metric.target && (
                            <div 
                              className="absolute top-0 h-full w-0.5 bg-green-500"
                              style={{ left: `${metric.unit === "%" ? metric.target * 100 : metric.target}%` }}
                            />
                          )}
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Loading metrics...</p>}
                  </div>
                </CardContent>
              </Card>

              <Card data-testid="card-models">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Cpu className="w-5 h-5" />
                    ML Models
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {learningModels?.map((model) => (
                      <div key={model.id} className="p-4 rounded-lg bg-muted/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-sm">{model.name}</h4>
                            <p className="text-xs text-muted-foreground capitalize">{model.type}</p>
                          </div>
                          <Badge variant="outline">
                            {(model.accuracy * 100).toFixed(1)}%
                          </Badge>
                        </div>
                        <Progress value={model.accuracy * 100} />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{model.trainingDataSize.toLocaleString()} training samples</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    )) || <p className="text-muted-foreground text-sm">Loading models...</p>}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card data-testid="card-thresholds">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Adaptive Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {thresholds?.map((threshold: any) => (
                    <div key={threshold.name} className="p-4 rounded-lg bg-muted/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium capitalize">
                          {threshold.name.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-bold font-mono">
                          {threshold.currentValue.toFixed(2)}
                        </span>
                      </div>
                      <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="absolute h-full bg-primary transition-all"
                          style={{ 
                            width: `${((threshold.currentValue - threshold.minValue) / (threshold.maxValue - threshold.minValue)) * 100}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{threshold.minValue}</span>
                        <span>Base: {threshold.baseValue}</span>
                        <span>{threshold.maxValue}</span>
                      </div>
                    </div>
                  )) || <p className="text-muted-foreground text-sm col-span-full text-center">Loading thresholds...</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
