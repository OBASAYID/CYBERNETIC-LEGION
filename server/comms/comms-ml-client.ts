const ML_SERVICE_URL = process.env.COMMS_ML_URL || "http://comms-ml:5002";
const TIMEOUT_MS = 5000;

interface SentimentResult {
  score: number;
  confidence: number;
  label: 'positive' | 'neutral' | 'negative';
  vader_compound?: number;
  vader_positive?: number;
  vader_negative?: number;
  vader_neutral?: number;
  keyword_score?: number;
  toxicity?: number;
  method: string;
  cached?: boolean;
}

interface BehaviorPrediction {
  predicted_behavior: string;
  confidence: number;
  probabilities: Record<string, number>;
}

interface AnomalyResult {
  is_anomaly: boolean;
  anomaly_score: number;
  reasons: string[];
  alert_level: 'normal' | 'warning' | 'critical';
}

interface ClusterResult {
  clusters: Record<string, string[]>;
  n_clusters: number;
  method: string;
}

interface ChurnRisk {
  churn_risk: number;
  risk_level: 'low' | 'medium' | 'high';
  factors: string[];
}

interface BestCallTime {
  bestHour: number;
  bestHourFormatted: string;
  bestDay: string;
  confidence: number;
  hourlyOverlap: number[];
}

interface NetworkHealth {
  totalUsers: number;
  activeToday: number;
  avgSentiment: number;
  messagesToday: number;
  callSuccessRate: number;
  healthScore: number;
}

interface MLServiceStatus {
  models: Record<string, { status: string; method: string; accuracy: number }>;
  cache_size: number;
}

class CommsMLClient {
  private available = false;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000;

  constructor() {
    this.checkHealth();
    setInterval(() => this.checkHealth(), this.healthCheckInterval);
  }

  private async checkHealth(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${ML_SERVICE_URL}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await res.json();
      const wasAvailable = this.available;
      this.available = data.status === 'operational';
      if (this.available && !wasAvailable) {
        console.log('[Comms ML Client] Connected to ML Intelligence Service');
      }
      this.lastHealthCheck = Date.now();
      return this.available;
    } catch {
      if (this.available) {
        console.log('[Comms ML Client] ML Service unavailable - using TypeScript fallbacks');
      }
      this.available = false;
      return false;
    }
  }

  isAvailable(): boolean {
    return this.available;
  }

  private async post<T>(path: string, body: any): Promise<T | null> {
    if (!this.available) return null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`${ML_SERVICE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json() as T;
    } catch {
      return null;
    }
  }

  private async get<T>(path: string): Promise<T | null> {
    if (!this.available) return null;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(`${ML_SERVICE_URL}${path}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json() as T;
    } catch {
      return null;
    }
  }

  async analyzeSentiment(text: string): Promise<SentimentResult | null> {
    return this.post<SentimentResult>('/api/ml/analyze-sentiment', { text });
  }

  async generateEmbedding(text: string, dimension = 128): Promise<{ embedding: number[]; dimension: number } | null> {
    return this.post('/api/ml/generate-embedding', { text, dimension });
  }

  async predictBehavior(interactions: any[]): Promise<BehaviorPrediction | null> {
    return this.post<BehaviorPrediction>('/api/ml/predict-behavior', { interactions });
  }

  async detectAnomalies(interactions: any[], baselineInteractions?: any[]): Promise<AnomalyResult | null> {
    return this.post<AnomalyResult>('/api/ml/detect-anomalies', {
      interactions,
      baseline_interactions: baselineInteractions || [],
    });
  }

  async clusterUsers(profiles: any[]): Promise<ClusterResult | null> {
    return this.post<ClusterResult>('/api/ml/cluster-users', { profiles });
  }

  async calculateChurnRisk(userData: any): Promise<ChurnRisk | null> {
    return this.post<ChurnRisk>('/api/ml/churn-risk', { user_data: userData });
  }

  async predictBestCallTime(userHours: number[], targetHours: number[]): Promise<BestCallTime | null> {
    return this.post<BestCallTime>('/api/ml/best-call-time', {
      user_hours: userHours,
      target_hours: targetHours,
    });
  }

  async suggestContacts(interactions: any[], userId: string): Promise<{ suggestions: any[] } | null> {
    return this.post('/api/ml/suggest-contacts', { interactions, user_id: userId });
  }

  async getNetworkHealth(interactions: any[], profiles: any[]): Promise<NetworkHealth | null> {
    return this.post<NetworkHealth>('/api/ml/network-health', { interactions, profiles });
  }

  async batchAnalyzeSentiment(texts: string[]): Promise<{ results: SentimentResult[]; count: number } | null> {
    return this.post('/api/ml/batch-analyze', { texts });
  }

  async getStatus(): Promise<MLServiceStatus | null> {
    return this.get<MLServiceStatus>('/api/ml/status');
  }
}

export const commsMLClient = new CommsMLClient();
