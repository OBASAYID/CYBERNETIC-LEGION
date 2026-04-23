import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Clock, Newspaper, Bot, TrendingUp, TrendingDown } from "lucide-react";
import { AutonomousStatus, TradeDecision, WorldEvent } from "@/types/trading";
import { ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props {
  decisions: TradeDecision[];
  worldEvents: WorldEvent[];
  getImpactColor: (level: string) => string;
  getSentimentColor: (sentiment: string) => string;
  onStart?: () => void;
  onStop?: () => void;
  autonomousStatus?: AutonomousStatus;
}

const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className="text-sm text-slate-500 text-center py-8">{children}</p>
);

export function AutonomousTab({
  decisions,
  worldEvents,
  getImpactColor,
  getSentimentColor,
  onStart,
  onStop,
  autonomousStatus,
}: Props) {
  return (
    <div className="space-y-4">
      {(onStart || onStop) && (
        <div className="flex flex-wrap items-center gap-2 justify-between rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2">
          <div className="text-xs text-slate-400">
            {autonomousStatus ? (
              <span>
                Autonomous:{" "}
                <span className={autonomousStatus.isAutonomous ? "text-emerald-400" : "text-slate-500"}>
                  {autonomousStatus.isAutonomous ? "running" : "stopped"}
                </span>
                {" · "}
                Events {autonomousStatus.worldEventsCount} · Strategies {autonomousStatus.strategiesCount}
              </span>
            ) : (
              <span>Autonomous trading controls</span>
            )}
          </div>
          <div className="flex gap-2">
            {onStart ? (
              <Button size="sm" variant="default" className="h-8" onClick={onStart} data-testid="autonomous-start">
                Start
              </Button>
            ) : null}
            {onStop ? (
              <Button size="sm" variant="outline" className="h-8" onClick={onStop} data-testid="autonomous-stop">
                Stop
              </Button>
            ) : null}
          </div>
        </div>
      )}
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="w-5 h-5 text-cyan-400" />
            Recent AI Decisions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {decisions.length === 0 ? (
            <EmptyState>No autonomous decisions yet. Start the AI to begin trading.</EmptyState>
          ) : (
            decisions.slice(0, 10).map((decision) => (
              <div key={decision.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge className={decision.action === "buy" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {decision.action.toUpperCase()}
                    </Badge>
                    <span className="font-mono font-bold">{decision.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={decision.confidence * 100} className="w-16 h-2" />
                    <span className="text-xs text-slate-400">{(decision.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2">{decision.reasoning}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span>Strategy: {decision.strategyUsed}</span>
                  {decision.executed ? (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  ) : (
                    <Clock className="w-4 h-4 text-yellow-400" />
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-blue-400" />
            Latest Market Events
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-h-96 overflow-y-auto">
          {worldEvents.length === 0 ? (
            <EmptyState>No world events detected. AI is monitoring global markets.</EmptyState>
          ) : (
            worldEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="p-3 bg-slate-900/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <Badge className={getImpactColor(event.impactLevel)}>
                    {event.impactLevel.toUpperCase()}
                  </Badge>
                  <span className={`text-sm font-semibold ${getSentimentColor(event.sentiment)}`}>
                    {event.sentiment === "bullish" ? <TrendingUp className="w-4 h-4 inline" /> :
                     event.sentiment === "bearish" ? <TrendingDown className="w-4 h-4 inline" /> : null}
                    {" "}{event.sentiment}
                  </span>
                </div>
                <h4 className="font-medium text-sm">{event.title}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {event.affectedAssets?.slice(0, 4).map((asset) => (
                    <Badge key={asset} variant="outline" className="text-xs border-slate-600">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
    </div>
  );
}

