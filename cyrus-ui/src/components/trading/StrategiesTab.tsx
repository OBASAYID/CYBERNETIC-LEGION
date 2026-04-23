import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";
import { TradingStrategy } from "@/types/trading";

interface Props {
  strategies: TradingStrategy[];
  onRefine: (id: string) => void;
  isRefining: boolean;
}

export function StrategiesTab({ strategies, onRefine, isRefining }: Props) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      {strategies.map((strategy) => (
        <Card key={strategy.id} className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{strategy.name}</CardTitle>
              <Badge className={strategy.isActive ? "bg-green-500/20 text-green-400" : "bg-slate-500/20 text-slate-400"}>
                {strategy.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="text-sm text-slate-400">{strategy.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="p-2 bg-slate-900/50 rounded">
                <p className="text-slate-500">Win Rate</p>
                <p className={`font-bold ${strategy.performance.winRate > 0.6 ? "text-green-400" : strategy.performance.winRate > 0.5 ? "text-yellow-400" : "text-red-400"}`}>
                  {(strategy.performance.winRate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-2 bg-slate-900/50 rounded">
                <p className="text-slate-500">Profit Factor</p>
                <p className={`font-bold ${strategy.performance.profitFactor > 1.5 ? "text-green-400" : "text-yellow-400"}`}>
                  {strategy.performance.profitFactor?.toFixed(2)}
                </p>
              </div>
              <div className="p-2 bg-slate-900/50 rounded">
                <p className="text-slate-500">Sharpe</p>
                <p className="font-bold text-cyan-400">{strategy.performance.sharpeRatio?.toFixed(2)}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Strategy Rules:</p>
              {strategy.rules.slice(0, 3).map((rule, i) => (
                <div key={i} className="flex items-center justify-between text-xs p-2 bg-slate-900/30 rounded">
                  <span className="text-slate-300 truncate flex-1">{rule.condition}</span>
                  <Badge variant="outline" className="ml-2">
                    {(rule.successRate * 100).toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Refined {strategy.refinementCount}x</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRefine(strategy.id)}
                disabled={isRefining}
                data-testid={`button-refine-${strategy.id}`}
              >
                <Lightbulb className="w-3 h-3 mr-1" />
                Refine Strategy
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

