/**
 * Optional demo fusion stubs for UI modules that expect fixed JSON shapes (trading, drones, etc.).
 * Mounted at `/api` before session auth — keep minimal; prefer real routes in `server/routes.ts` when they exist.
 *
 * Does not register `POST /files/analyze` — the main app already serves `/api/files/analyze`.
 */
import { randomBytes } from "crypto";
import { Router, type Request, type Response } from "express";

const router = Router();

const now = () => Date.now();

/** Public advanced-fusion surface: login shell and fused UI can probe the stack without session cookies. */
router.get("/fusion/bootstrap", (_req: Request, res: Response) => {
  res.json({
    tier: "advanced",
    protocolVersion: "1.0.0",
    channels: ["rest", "session", "inference", "trading", "navigation", "drones"],
    capabilities: {
      authGate: true,
      trading: true,
      drones: true,
      aiQuery: true,
      navigation: true,
      webrtcPeers: true,
    },
    surfaces: {
      health: "/health/ready",
      login: "/api/login",
      status: "/api/status",
    },
    serverTime: new Date().toISOString(),
    uptimeMs: Math.round(process.uptime() * 1000),
  });
});

router.post("/fusion/handshake", (req: Request, res: Response) => {
  const body = (req.body ?? {}) as { displayName?: string; role?: string; client?: string };
  const fusionSessionId = `fus_${randomBytes(12).toString("hex")}`;
  res.json({
    accepted: true,
    fusionSessionId,
    tier: "advanced",
    echo: {
      displayName: body.displayName ?? null,
      role: body.role ?? null,
      client: body.client ?? "cyrus-ui",
    },
    issuedAt: new Date().toISOString(),
    hints: {
      useCredentials: "include",
      bootstrapPath: "/api/fusion/bootstrap",
    },
  });
});

function demoMarkets() {
  const ts = now();
  const row = (
    symbol: string,
    type: "forex" | "crypto",
    price: number,
    change24h: number,
  ) => {
    const spread = type === "forex" ? 0.25 : Math.max(price * 0.0004, 0.01);
    return {
      symbol,
      type,
      price,
      bid: price - spread / 2,
      ask: price + spread / 2,
      spread,
      volume24h: type === "forex" ? 4.2e8 : 1.8e9,
      change24h,
      high24h: price * 1.015,
      low24h: price * 0.985,
      timestamp: ts,
    };
  };
  return [
    row("EURUSD", "forex", 1.085_2, 0.12),
    row("GBPUSD", "forex", 1.264_8, -0.08),
    row("USDJPY", "forex", 149.35, 0.19),
    row("AUDUSD", "forex", 0.652_1, 0.04),
    row("BTCUSD", "crypto", 98_520, 1.15),
    row("ETHUSD", "crypto", 3452.4, -0.32),
    row("SOLUSD", "crypto", 142.8, 2.05),
    row("NVDA", "crypto", 132.67, 0.88),
  ];
}

router.get("/trading/markets", (_req: Request, res: Response) => {
  res.json(demoMarkets());
});

router.get("/trading/portfolio", (_req: Request, res: Response) => {
  res.json({
    totalBalance: 500_000,
    availableBalance: 420_000,
    marginUsed: 80_000,
    unrealizedPnl: 12_500,
    realizedPnl: 48_200,
    totalTrades: 142,
    winningTrades: 86,
    losingTrades: 56,
    winRate: 60.6,
    positions: [] as unknown[],
  });
});

router.get("/trading/status", (_req: Request, res: Response) => {
  res.json({
    isRunning: true,
    autoTrade: false,
    marketsMonitored: demoMarkets().length,
    openPositions: 0,
    totalBalance: 500_000,
    unrealizedPnl: 12_500,
  });
});

router.get("/trading/trades", (_req: Request, res: Response) => {
  res.json([]);
});

router.get("/trading/autonomous/status", (_req: Request, res: Response) => {
  res.json({
    isAutonomous: false,
    worldEventsCount: 1,
    strategiesCount: 1,
    decisionsCount: 0,
    predictionsCount: 1,
  });
});

router.post("/trading/autonomous/start", (_req: Request, res: Response) => {
  res.json({ ok: true, started: true });
});

router.post("/trading/autonomous/stop", (_req: Request, res: Response) => {
  res.json({ ok: true, stopped: true });
});

router.post("/trading/autonomous", (_req: Request, res: Response) => {
  res.json({
    strategy: "executed",
    trades: 3,
    pnl: 250,
  });
});

router.get("/trading/events", (_req: Request, res: Response) => {
  res.json([
    {
      id: "evt-demo-1",
      title: "Fusion demo: macro print",
      description: "Stub world event for autonomous trading UI.",
      category: "macro",
      impactLevel: "medium",
      affectedAssets: ["EURUSD", "BTCUSD"],
      sentiment: "neutral",
      timestamp: new Date().toISOString(),
      source: "complete-fusion-api",
      marketImpactScore: 42,
    },
  ]);
});

router.get("/trading/predictions", (_req: Request, res: Response) => {
  res.json([
    {
      symbol: "BTCUSD",
      currentPrice: 98_520,
      predictedPrice1h: 98_900,
      predictedPrice4h: 99_400,
      predictedPrice24h: 101_200,
      confidence: 0.72,
      direction: "bullish",
      volatilityForecast: "elevated",
      riskScore: 38,
      reasoning: "Demo prediction from fusion stubs.",
    },
  ]);
});

router.get("/trading/strategies", (_req: Request, res: Response) => {
  res.json([
    {
      id: "fusion-momentum-v1",
      name: "Fusion Momentum (demo)",
      description: "Lightweight trend-follower for UI smoke tests.",
      type: "momentum",
      rules: [
        { condition: "RSI(14) < 35 and price > MA(50)", action: "scale_in_long", weight: 0.4, successRate: 0.62 },
        { condition: "Spread < 2x median", action: "allow_entry", weight: 0.3, successRate: 0.71 },
        { condition: "Vol spike > 2σ", action: "reduce_size", weight: 0.3, successRate: 0.55 },
      ],
      performance: {
        totalTrades: 120,
        winRate: 0.58,
        profitFactor: 1.62,
        sharpeRatio: 1.15,
        maxDrawdown: 0.12,
        expectancy: 0.004,
      },
      adaptiveParameters: { riskBudget: 0.02, maxLeverage: 3 },
      lastRefined: new Date().toISOString(),
      refinementCount: 2,
      isActive: true,
    },
  ]);
});

router.get("/trading/decisions", (_req: Request, res: Response) => {
  res.json([]);
});

router.post("/trading/strategies/:strategyId/refine", (req: Request, res: Response) => {
  res.json({ message: `Strategy ${req.params.strategyId} refined (demo)` });
});

router.post("/trading/analyze", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.post("/trading/execute", (req: Request, res: Response) => {
  const body = req.body as { symbol?: string; side?: string; quantity?: number };
  res.json({
    side: body.side ?? "buy",
    symbol: body.symbol ?? "EURUSD",
    quantity: body.quantity ?? 0,
    filled: true,
  });
});

router.post("/trading/close", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

router.get("/drones/status", (_req: Request, res: Response) => {
  res.json({
    drones: [{ id: "drone-1", status: "hovering", lat: 37.7749, lng: -122.4194 }],
  });
});

router.post("/drones/mavlink", (_req: Request, res: Response) => {
  res.json({
    command: "executed",
    telemetry: { alt: 50, speed: 15 },
  });
});

router.post("/ai/query", (req: Request, res: Response) => {
  const prompt = String((req.body as { prompt?: string })?.prompt ?? "");
  res.json({ response: `🌌 AI: ${prompt}`, confidence: 0.95 });
});

router.post("/ai/scan-translate", (_req: Request, res: Response) => {
  res.json({
    translation: "Translated text",
    language: "en→es",
  });
});

router.get("/navigation/position", (_req: Request, res: Response) => {
  res.json({
    lat: 37.7749,
    lng: -122.4194,
    heading: 270,
  });
});

router.get("/webrtc/peers", (_req: Request, res: Response) => {
  res.json({
    peers: ["user1", "drone1"],
    active: 2,
  });
});

export default router;
