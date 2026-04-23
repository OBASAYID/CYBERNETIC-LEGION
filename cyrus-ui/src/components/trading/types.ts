export interface MarketData {
  symbol: string;
  type: "forex" | "crypto";
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlPercent: number;
  status: string;
  openedAt: number;
}

export interface Portfolio {
  totalBalance: number;
  availableBalance: number;
  marginUsed: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  positions: Trade[];
}

export interface TradingStatus {
  isRunning: boolean;
  autoTrade: boolean;
  marketsMonitored: number;
  openPositions: number;
  totalBalance: number;
  unrealizedPnl: number;
}

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  impactLevel: string;
  affectedAssets: string[];
  sentiment: string;
  timestamp: string;
  source: string;
  marketImpactScore: number;
}

export interface PricePrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice1h: number;
  predictedPrice4h: number;
  predictedPrice24h: number;
  confidence: number;
  direction: string;
  volatilityForecast: string;
  riskScore: number;
  reasoning: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: string;
  rules: Array<{ condition: string; action: string; weight: number; successRate: number }>;
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    expectancy: number;
  };
  adaptiveParameters: Record<string, number>;
  lastRefined: string;
  refinementCount: number;
  isActive: boolean;
}

export interface TradeDecision {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  strategyUsed: string;
  worldEventsConsidered: string[];
  timestamp: string;
  executed: boolean;
  outcome?: string;
}

export interface AutonomousStatus {
  isAutonomous: boolean;
  worldEventsCount: number;
  strategiesCount: number;
  decisionsCount: number;
  predictionsCount: number;
}
export interface MarketData {
  symbol: string;
  type: "forex" | "crypto";
  price: number;
  bid: number;
  ask: number;
  spread: number;
  volume24h: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface Trade {
  id: string;
  symbol: string;
  type: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  stopLoss: number;
  takeProfit: number;
  pnl: number;
  pnlPercent: number;
  status: string;
  openedAt: number;
}

export interface Portfolio {
  totalBalance: number;
  availableBalance: number;
  marginUsed: number;
  unrealizedPnl: number;
  realizedPnl: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  positions: Trade[];
}

export interface TradingStatus {
  isRunning: boolean;
  autoTrade: boolean;
  marketsMonitored: number;
  openPositions: number;
  totalBalance: number;
  unrealizedPnl: number;
}

export interface WorldEvent {
  id: string;
  title: string;
  description: string;
  category: string;
  impactLevel: string;
  affectedAssets: string[];
  sentiment: string;
  timestamp: string;
  source: string;
  marketImpactScore: number;
}

export interface PricePrediction {
  symbol: string;
  currentPrice: number;
  predictedPrice1h: number;
  predictedPrice4h: number;
  predictedPrice24h: number;
  confidence: number;
  direction: string;
  volatilityForecast: string;
  riskScore: number;
  reasoning: string;
}

export interface TradingStrategy {
  id: string;
  name: string;
  description: string;
  type: string;
  rules: Array<{ condition: string; action: string; weight: number; successRate: number }>;
  performance: {
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
    maxDrawdown: number;
    expectancy: number;
  };
  adaptiveParameters: Record<string, number>;
  lastRefined: string;
  refinementCount: number;
  isActive: boolean;
}

export interface TradeDecision {
  id: string;
  symbol: string;
  action: string;
  quantity: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  confidence: number;
  reasoning: string;
  strategyUsed: string;
  worldEventsConsidered: string[];
  timestamp: string;
  executed: boolean;
  outcome?: string;
}

export interface AutonomousStatus {
  isAutonomous: boolean;
  worldEventsCount: number;
  strategiesCount: number;
  decisionsCount: number;
  predictionsCount: number;
}

