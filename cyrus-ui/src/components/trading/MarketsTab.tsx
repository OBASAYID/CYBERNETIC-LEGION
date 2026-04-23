import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MarketData } from "@/types/trading";
import { ArrowDownRight, ArrowUpRight, DollarSign, LineChart, Zap } from "lucide-react";
interface Props {
  forexMarkets: MarketData[];
  cryptoMarkets: MarketData[];
  markets: MarketData[];
  selectedSymbol: string;
  tradeQuantity: string;
  isTradingPending: boolean;
  isPredictingPending: boolean;
  setSelectedSymbol: (value: string) => void;
  setTradeQuantity: (value: string) => void;
  onBuy: () => void;
  onSell: () => void;
  onPredict: (symbol: string, price: number) => void;
}

export function MarketsTab({
  forexMarkets,
  cryptoMarkets,
  markets,
  selectedSymbol,
  tradeQuantity,
  isTradingPending,
  isPredictingPending,
  setSelectedSymbol,
  setTradeQuantity,
  onBuy,
  onSell,
  onPredict,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-400" />
              Forex Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {forexMarkets.map((market) => (
              <div
                key={market.symbol}
                onClick={() => setSelectedSymbol(market.symbol)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedSymbol === market.symbol 
                    ? "bg-green-500/20 border border-green-500/50" 
                    : "bg-slate-900/50 border border-slate-700 hover:border-slate-600"
                }`}
                data-testid={`market-${market.symbol}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">{market.symbol}</span>
                  <span className="font-mono text-lg">{market.price?.toFixed(5)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400 mt-1">
                  <span>Spread: {market.spread?.toFixed(1)}</span>
                  <span className={market.change24h >= 0 ? "text-green-400" : "text-red-400"}>
                    {market.change24h >= 0 ? "+" : ""}{market.change24h?.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Crypto Markets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cryptoMarkets.map((market) => (
              <div
                key={market.symbol}
                onClick={() => setSelectedSymbol(market.symbol)}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  selectedSymbol === market.symbol 
                    ? "bg-amber-500/20 border border-amber-500/50" 
                    : "bg-slate-900/50 border border-slate-700 hover:border-slate-600"
                }`}
                data-testid={`market-${market.symbol}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold">{market.symbol}</span>
                  <span className="font-mono text-lg">${market.price?.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-slate-400 mt-1">
                  <span>Vol: ${(market.volume24h / 1e9)?.toFixed(2)}B</span>
                  <span className={market.change24h >= 0 ? "text-green-400" : "text-red-400"}>
                    {market.change24h >= 0 ? "+" : ""}{market.change24h?.toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {selectedSymbol && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle>Trade {selectedSymbol}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-4">
            <div className="space-y-2 flex-1">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={tradeQuantity}
                onChange={(e) => setTradeQuantity(e.target.value)}
                className="bg-slate-900/50 border-slate-700"
                data-testid="input-trade-quantity"
              />
            </div>
            <Button
              onClick={onBuy}
              className="bg-green-500 hover:bg-green-600"
              disabled={isTradingPending}
              data-testid="button-buy"
            >
              <ArrowUpRight className="w-4 h-4 mr-1" />
              BUY
            </Button>
            <Button
              onClick={onSell}
              className="bg-red-500 hover:bg-red-600"
              disabled={isTradingPending}
              data-testid="button-sell"
            >
              <ArrowDownRight className="w-4 h-4 mr-1" />
              SELL
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const market = markets.find(m => m.symbol === selectedSymbol);
                if (market) onPredict(selectedSymbol, market.price);
              }}
              disabled={isPredictingPending}
              data-testid="button-predict"
            >
              <LineChart className="w-4 h-4 mr-1" />
              Predict
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

