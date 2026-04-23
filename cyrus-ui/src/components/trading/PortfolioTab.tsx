import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, BarChart3, Target, Wallet } from "lucide-react";
import { Portfolio, Trade } from "@/types/trading";

interface Props {
  portfolio?: Portfolio;
  trades: Trade[];
  onClose: (id: string) => void;
  isClosing: boolean;
}

export function PortfolioTab({ portfolio, trades, onClose, isClosing }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Wallet className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Total Balance</p>
                <p className="text-2xl font-bold">${portfolio?.totalBalance?.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className={`w-8 h-8 ${(portfolio?.unrealizedPnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`} />
              <div>
                <p className="text-sm text-slate-400">Unrealized P&L</p>
                <p className={`text-2xl font-bold ${(portfolio?.unrealizedPnl || 0) >= 0 ? "text-green-400" : "text-red-400"}`}>
                  ${portfolio?.unrealizedPnl?.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="w-8 h-8 text-cyan-400" />
              <div>
                <p className="text-sm text-slate-400">Win Rate</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {((portfolio?.winRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-8 h-8 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Total Trades</p>
                <p className="text-2xl font-bold text-purple-400">{portfolio?.totalTrades}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <p className="text-center text-slate-500 py-8">No open positions</p>
          ) : (
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="p-3 bg-slate-900/50 rounded-lg border border-slate-700 flex items-center justify-between"
                  data-testid={`trade-${trade.id}`}
                >
                  <div className="flex items-center gap-3">
                    <Badge className={trade.side === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {trade.side.toUpperCase()}
                    </Badge>
                    <span className="font-mono font-bold">{trade.symbol}</span>
                    <span className="text-sm text-slate-400">Qty: {trade.quantity}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-slate-400">Entry: ${trade.entryPrice?.toFixed(4)}</p>
                      <p className={`font-bold ${trade.pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {trade.pnl >= 0 ? "+" : ""}${trade.pnl?.toFixed(2)} ({trade.pnlPercent?.toFixed(2)}%)
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onClose(trade.id)}
                      disabled={isClosing}
                      data-testid={`button-close-${trade.id}`}
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
    </div>
  );
}

