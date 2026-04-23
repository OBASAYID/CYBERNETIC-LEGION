import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MarketData,
  Trade,
  Portfolio,
  TradingStatus,
  WorldEvent,
  PricePrediction,
  TradingStrategy,
  TradeDecision,
  AutonomousStatus,
} from "@/types/trading";

export function useTradingDashboard() {
  const { toast } = useToast();
  const [selectedSymbol, setSelectedSymbol] = useState<string>("");
  const [tradeQuantity, setTradeQuantity] = useState<string>("1000");
  const [tradeSide, setTradeSide] = useState<"buy" | "sell">("buy");

  const { data: status } = useQuery<TradingStatus>({
    queryKey: ["/api/trading/status"],
    refetchInterval: 2000,
  });

  const { data: markets = [] } = useQuery<MarketData[]>({
    queryKey: ["/api/trading/markets"],
    refetchInterval: 3000,
  });

  const { data: portfolio } = useQuery<Portfolio>({
    queryKey: ["/api/trading/portfolio"],
    refetchInterval: 2000,
  });

  const { data: trades = [] } = useQuery<Trade[]>({
    queryKey: ["/api/trading/trades"],
    refetchInterval: 2000,
  });

  const { data: autonomousStatus } = useQuery<AutonomousStatus>({
    queryKey: ["/api/trading/autonomous/status"],
    refetchInterval: 3000,
  });

  const { data: worldEvents = [] } = useQuery<WorldEvent[]>({
    queryKey: ["/api/trading/events"],
    refetchInterval: 10000,
  });

  const { data: predictions = [] } = useQuery<PricePrediction[]>({
    queryKey: ["/api/trading/predictions"],
    refetchInterval: 5000,
  });

  const { data: strategies = [] } = useQuery<TradingStrategy[]>({
    queryKey: ["/api/trading/strategies"],
    refetchInterval: 10000,
  });

  const { data: decisions = [] } = useQuery<TradeDecision[]>({
    queryKey: ["/api/trading/decisions"],
    refetchInterval: 3000,
  });

  const startAutonomousMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/trading/autonomous/start"),
    onSuccess: () => {
      toast({
        title: "Autonomous Trading AI Started",
        description: "CYRUS is now analyzing markets and executing trades",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/autonomous/status"] });
    },
  });

  const stopAutonomousMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/trading/autonomous/stop"),
    onSuccess: () => {
      toast({ title: "Autonomous Trading AI Stopped" });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/autonomous/status"] });
    },
  });

  const refineStrategyMutation = useMutation({
    mutationFn: (strategyId: string) => apiRequest("POST", `/api/trading/strategies/${strategyId}/refine`),
    onSuccess: (data: any) => {
      toast({ title: "Strategy Refined", description: data.message || `Strategy has been optimized` });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/strategies"] });
    },
  });

  const generatePredictionMutation = useMutation({
    mutationFn: (params: { symbol: string; currentPrice: number }) =>
      apiRequest("POST", "/api/trading/analyze", params),
    onSuccess: () => {
      toast({ title: "Analysis Generated" });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/predictions"] });
    },
  });

  const executeTradeMutation = useMutation({
    mutationFn: (params: { symbol: string; side: string; quantity: number }) =>
      apiRequest("POST", "/api/trading/execute", params),
    onSuccess: (data: any) => {
      if (data.error) {
        toast({ title: "Trade Rejected", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "Trade Executed", description: `${data.side?.toUpperCase()} ${data.symbol}` });
        queryClient.invalidateQueries({ queryKey: ["/api/trading/portfolio"] });
        queryClient.invalidateQueries({ queryKey: ["/api/trading/trades"] });
      }
    },
  });

  const closeTradeMutation = useMutation({
    mutationFn: (tradeId: string) => apiRequest("POST", "/api/trading/close", { tradeId }),
    onSuccess: () => {
      toast({ title: "Trade Closed" });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/trades"] });
    },
  });

  const forexMarkets = useMemo(() => markets.filter((m) => m.type === "forex"), [markets]);
  const cryptoMarkets = useMemo(() => markets.filter((m) => m.type === "crypto"), [markets]);

  const handleTrade = () => {
    if (!selectedSymbol) {
      toast({ title: "Select a market first", variant: "destructive" });
      return;
    }
    executeTradeMutation.mutate({
      symbol: selectedSymbol,
      side: tradeSide,
      quantity: parseFloat(tradeQuantity),
    });
  };

  const getImpactColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/50";
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/50";
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "bullish":
        return "text-green-400";
      case "bearish":
        return "text-red-400";
      default:
        return "text-slate-400";
    }
  };

  return {
    // state
    selectedSymbol,
    setSelectedSymbol,
    tradeQuantity,
    setTradeQuantity,
    tradeSide,
    setTradeSide,
    // data
    status,
    markets,
    portfolio,
    trades,
    autonomousStatus,
    worldEvents,
    predictions,
    strategies,
    decisions,
    forexMarkets,
    cryptoMarkets,
    // actions
    handleTrade,
    generatePredictionMutation,
    executeTradeMutation,
    closeTradeMutation,
    refineStrategyMutation,
    startAutonomousMutation,
    stopAutonomousMutation,
    // helpers
    getImpactColor,
    getSentimentColor,
  };
}

