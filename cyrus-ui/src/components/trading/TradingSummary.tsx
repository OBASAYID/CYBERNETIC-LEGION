import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Brain,
  Globe,
  LineChart,
  BookOpen,
  Bot,
} from "lucide-react";

interface AutonomousStatus {
  isAutonomous: boolean;
}

interface Props {
  autonomousStatus?: AutonomousStatus;
  worldEventsCount: number;
  predictionsCount: number;
  strategiesCount: number;
  tradesCount: number;
  onStart: () => void;
  onStop: () => void;
}

export function TradingSummary({
  autonomousStatus,
  worldEventsCount,
  predictionsCount,
  strategiesCount,
  tradesCount,
  onStart,
  onStop,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              CYRUS Autonomous Trading
            </h1>
            <p className="text-sm text-slate-400">AI-Powered Market Analysis & Execution</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {autonomousStatus?.isAutonomous ? (
            <Button
              onClick={onStop}
              variant="outline"
              className="border-red-500/50 text-red-400 gap-2"
              data-testid="button-stop-autonomous"
            >
              Stop AI Trading
            </Button>
          ) : (
            <Button
              onClick={onStart}
              className="bg-gradient-to-r from-green-500 to-emerald-600 gap-2"
              data-testid="button-start-autonomous"
            >
              Start Autonomous AI
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Brain className={`w-5 h-5 ${autonomousStatus?.isAutonomous ? "text-green-400 animate-pulse" : "text-slate-500"}`} />
              <div>
                <p className="text-xs text-slate-400">AI Status</p>
                <p className={`font-bold ${autonomousStatus?.isAutonomous ? "text-green-400" : "text-slate-500"}`}>
                  {autonomousStatus?.isAutonomous ? "ACTIVE" : "STANDBY"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              <div>
                <p className="text-xs text-slate-400">World Events</p>
                <p className="font-bold text-blue-400">{worldEventsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-purple-400" />
              <div>
                <p className="text-xs text-slate-400">Predictions</p>
                <p className="font-bold text-purple-400">{predictionsCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" />
              <div>
                <p className="text-xs text-slate-400">Strategies</p>
                <p className="font-bold text-amber-400">{strategiesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs text-slate-400">Decisions</p>
                <p className="font-bold text-cyan-400">{tradesCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

