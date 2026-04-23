import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorldEvent } from "@/types/trading";
import { Globe } from "lucide-react";

interface Props {
  worldEvents: WorldEvent[];
  getImpactColor: (level: string) => string;
  getSentimentColor: (sentiment: string) => string;
}

export function EventsTab({ worldEvents, getImpactColor, getSentimentColor }: Props) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          World Events & Market Impact Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {worldEvents.map((event) => (
          <div key={event.id} className="p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={getImpactColor(event.impactLevel)}>
                    {event.impactLevel.toUpperCase()}
                  </Badge>
                  <Badge variant="outline" className="border-slate-600">
                    {event.category}
                  </Badge>
                  <span className={`font-semibold ${getSentimentColor(event.sentiment)}`}>
                    {event.sentiment}
                  </span>
                </div>
                <h4 className="font-bold">{event.title}</h4>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-cyan-400">
                  {event.marketImpactScore}
                </div>
                <div className="text-xs text-slate-500">Impact Score</div>
              </div>
            </div>
            <p className="text-sm text-slate-300">{event.description}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              {event.affectedAssets?.map((asset) => (
                <Badge key={asset} className="bg-slate-700/50 text-slate-300">
                  {asset}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-slate-500 mt-2">
              Source: {event.source} | {new Date(event.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

