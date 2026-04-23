import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Activity,
  Zap,
  Target,
} from "lucide-react";

interface AlpacaStatus {
  connected: boolean;
  message?: string;
  accountId?: string;
  status?: string;
  currency?: string;
  cash?: number;
  portfolioValue?: number;
  buyingPower?: number;
  equity?: number;
  daytradeCount?: number;
  patternDayTrader?: boolean;
  cryptoStatus?: string;
  environment?: string;
}

interface AlpacaQuote {
  symbol: string;
  bid: number;
  ask: number;
  price: number;
  spread: number;
  bidSize?: number;
  askSize?: number;
  timestamp: number;
}

interface AlpacaPosition {
  asset_id: string;
  symbol: string;
  asset_class: string;
  avg_entry_price: string;
  qty: string;
  side: string;
  market_value: string;
  cost_basis: string;
  unrealized_pl: string;
  unrealized_plpc: string;
  current_price: string;
  change_today: string;
}

export default function AlpacaBrokerPanel() {
  const { toast } = useToast();
  const [orderSymbol, setOrderSymbol] = useState("AAPL");
  const [orderQty, setOrderQty] = useState("1");

  const { data: alpacaStatus, refetch: refetchStatus } = useQuery<AlpacaStatus>({
    queryKey: ["/api/alpaca/status"],
    refetchInterval: 10000,
  });

  const { data: stockQuotes = [] } = useQuery<AlpacaQuote[]>({
    queryKey: ["/api/alpaca/quotes"],
    refetchInterval: 5000,
    enabled: alpacaStatus?.connected,
  });

  const { data: cryptoQuotes = [] } = useQuery<AlpacaQuote[]>({
    queryKey: ["/api/alpaca/crypto"],
    refetchInterval: 5000,
    enabled: alpacaStatus?.connected,
  });

  const { data: positions = [], refetch: refetchPositions } = useQuery<AlpacaPosition[]>({
    queryKey: ["/api/alpaca/positions"],
    refetchInterval: 5000,
    enabled: alpacaStatus?.connected,
  });

  const connectMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/alpaca/connect"),
    onSuccess: () => {
      toast({ title: "Alpaca Connected", description: "Broker connection initialized" });
      refetchStatus();
    },
    onError: (error: Error) => {
      toast({ title: "Connection Failed", description: error.message, variant: "destructive" });
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: (params: { symbol: string; qty: number; side: string; type: string; time_in_force: string }) =>
      apiRequest("POST", "/api/alpaca/orders", params),
    onSuccess: (data: any) => {
      if (data.success) {
        toast({ title: "Order Placed", description: data.message });
        refetchPositions();
      } else {
        toast({ title: "Order Failed", description: data.error, variant: "destructive" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Order Error", description: error.message, variant: "destructive" });
    },
  });

  const closePositionMutation = useMutation({
    mutationFn: (symbol: string) => apiRequest("POST", `/api/alpaca/positions/${symbol}/close`),
    onSuccess: () => {
      toast({ title: "Position Closed" });
      refetchPositions();
    },
    onError: (error: Error) => {
      toast({ title: "Close Failed", description: error.message, variant: "destructive" });
    },
  });

  const handlePlaceOrder = (side: "buy" | "sell") => {
    placeOrderMutation.mutate({
      symbol: orderSymbol,
      qty: parseInt(orderQty),
      side,
      type: "market",
      time_in_force: "gtc",
    });
  };

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-400" />
            Alpaca Markets Connection
            <Badge className={alpacaStatus?.connected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
              {alpacaStatus?.connected ? "CONNECTED" : "DISCONNECTED"}
            </Badge>
            <Badge variant="outline" className="ml-auto">
              {alpacaStatus?.environment?.toUpperCase() || "PAPER"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!alpacaStatus?.connected ? (
            <div className="text-center py-8 space-y-4">
              <AlertTriangle className="w-12 h-12 text-yellow-400 mx-auto" />
              <p className="text-slate-400">{alpacaStatus?.message || "Alpaca credentials not configured"}</p>
              <p className="text-sm text-slate-500">Set ALPACA_API_KEY and ALPACA_SECRET_KEY environment variables</p>
              <Button
                onClick={() => connectMutation.mutate()}
                disabled={connectMutation.isPending}
                className="bg-green-500 hover:bg-green-600"
                data-testid="button-connect-alpaca"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${connectMutation.isPending ? "animate-spin" : ""}`} />
                Reconnect Alpaca
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Account</p>
                <p className="font-mono text-green-400">{alpacaStatus.accountId}</p>
                <p className="text-xs text-slate-500">{alpacaStatus.status}</p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Portfolio Value</p>
                <p className="text-xl font-bold text-white">
                  ${alpacaStatus.portfolioValue?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Buying Power</p>
                <p className="text-xl font-bold text-cyan-400">
                  ${alpacaStatus.buyingPower?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-lg">
                <p className="text-xs text-slate-400">Cash</p>
                <p className="text-xl font-bold text-green-400">
                  ${alpacaStatus.cash?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {alpacaStatus?.connected && (
        <>
          <div className="grid md:grid-cols-3 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-400" />
                  Stock Quotes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {stockQuotes.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Loading quotes...</p>
                ) : (
                  stockQuotes.map((quote) => (
                    <div key={quote.symbol} className="p-2 bg-slate-900/50 rounded-lg flex items-center justify-between">
                      <span className="font-mono font-bold">{quote.symbol}</span>
                      <div className="flex items-center gap-3 font-mono text-sm">
                        <span className="text-green-400">${quote.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  Crypto Quotes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {cryptoQuotes.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">Loading crypto...</p>
                ) : (
                  cryptoQuotes.map((quote) => (
                    <div key={quote.symbol} className="p-2 bg-slate-900/50 rounded-lg flex items-center justify-between">
                      <span className="font-mono font-bold">{quote.symbol}</span>
                      <span className="text-orange-400 font-mono">${quote.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-400" />
                  Quick Trade
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Symbol</Label>
                  <Input
                    value={orderSymbol}
                    onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
                    placeholder="AAPL"
                    className="bg-slate-900 border-slate-700"
                    data-testid="alpaca-input-symbol"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={orderQty}
                    onChange={(e) => setOrderQty(e.target.value)}
                    placeholder="1"
                    className="bg-slate-900 border-slate-700"
                    data-testid="alpaca-input-qty"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => handlePlaceOrder("buy")}
                    disabled={placeOrderMutation.isPending}
                    className="flex-1 bg-green-500 hover:bg-green-600"
                    data-testid="alpaca-button-buy"
                  >
                    <TrendingUp className="w-4 h-4 mr-1" />
                    BUY
                  </Button>
                  <Button
                    onClick={() => handlePlaceOrder("sell")}
                    disabled={placeOrderMutation.isPending}
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    data-testid="alpaca-button-sell"
                  >
                    <TrendingDown className="w-4 h-4 mr-1" />
                    SELL
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                Open Positions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <p className="text-center text-slate-500 py-8">No open positions</p>
              ) : (
                <div className="space-y-2">
                  {positions.map((position) => (
                    <div
                      key={position.asset_id}
                      className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-between"
                      data-testid={`alpaca-position-${position.symbol}`}
                    >
                      <div className="flex items-center gap-3">
                        <Badge className={position.side === "long" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                          {position.side.toUpperCase()}
                        </Badge>
                        <span className="font-mono font-bold">{position.symbol}</span>
                        <span className="text-sm text-slate-400">Qty: {position.qty}</span>
                        <Badge variant="outline" className="text-xs">{position.asset_class}</Badge>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-slate-400">Avg: ${parseFloat(position.avg_entry_price).toFixed(2)}</p>
                          <p className={`font-bold ${parseFloat(position.unrealized_pl) >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {parseFloat(position.unrealized_pl) >= 0 ? "+" : ""}
                            ${parseFloat(position.unrealized_pl).toFixed(2)}
                            <span className="text-xs ml-1">({(parseFloat(position.unrealized_plpc) * 100).toFixed(2)}%)</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => closePositionMutation.mutate(position.symbol)}
                          disabled={closePositionMutation.isPending}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                          data-testid={`alpaca-close-${position.symbol}`}
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

