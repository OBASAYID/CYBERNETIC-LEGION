import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PricePrediction } from "@/types/trading";
import { LineChart, TrendingDown, TrendingUp } from "lucide-react";

interface Props {
  predictions: PricePrediction[];
}

export function PredictionsTab({ predictions }: Props) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {predictions.map((pred) => (
        <Card key={pred.symbol} className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between">
              <span className="font-mono">{pred.symbol}</span>
              <Badge className={
                pred.direction === "up" ? "bg-green-500/20 text-green-400" :
                pred.direction === "down" ? "bg-red-500/20 text-red-400" :
                "bg-slate-500/20 text-slate-400"
              }>
                {pred.direction === "up" ? <TrendingUp className="w-3 h-3 mr-1" /> :
                 pred.direction === "down" ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                {pred.direction.toUpperCase()}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-slate-500">Current</p>
                <p className="font-mono font-bold">${pred.currentPrice?.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-slate-500">1h Pred</p>
                <p className={`font-mono font-bold ${pred.predictedPrice1h > pred.currentPrice ? "text-green-400" : "text-red-400"}`}>
                  ${pred.predictedPrice1h?.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">4h Pred</p>
                <p className={`font-mono font-bold ${pred.predictedPrice4h > pred.currentPrice ? "text-green-400" : "text-red-400"}`}>
                  ${pred.predictedPrice4h?.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">24h Pred</p>
                <p className={`font-mono font-bold ${pred.predictedPrice24h > pred.currentPrice ? "text-green-400" : "text-red-400"}`}>
                  ${pred.predictedPrice24h?.toFixed(4)}
                </p>
              </div>
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Confidence</span>
                <span className="text-cyan-400">{(pred.confidence * 100).toFixed(0)}%</span>
              </div>
              <Progress value={pred.confidence * 100} className="h-1.5" />
            </div>
            
            <div className="flex items-center justify-between text-xs">
              <Badge variant="outline" className="border-slate-600">
                Volatility: {pred.volatilityForecast}
              </Badge>
              <span className={`${pred.riskScore > 70 ? "text-red-400" : pred.riskScore > 40 ? "text-yellow-400" : "text-green-400"}`}>
                Risk: {pred.riskScore}
              </span>
            </div>
            
            <p className="text-xs text-slate-400 line-clamp-2">{pred.reasoning}</p>
          </CardContent>
        </Card>
      ))}
      
      {predictions.length === 0 && (
        <div className="col-span-full text-center py-12">
          <LineChart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">No predictions yet. Start the AI engine to generate forecasts.</p>
        </div>
      )}
    </div>
  );
}

