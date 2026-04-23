import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Wallet, Brain, Globe, LineChart, BookOpen, TrendingUp } from "lucide-react";
import AlpacaBrokerPanel from "@/components/trading/AlpacaBrokerPanel";
import { AutonomousTab } from "@/components/trading/AutonomousTab";
import { EventsTab } from "@/components/trading/EventsTab";
import { PredictionsTab } from "@/components/trading/PredictionsTab";
import { StrategiesTab } from "@/components/trading/StrategiesTab";
import { MarketsTab } from "@/components/trading/MarketsTab";
import { PortfolioTab } from "@/components/trading/PortfolioTab";
import {
  AutonomousStatus,
  Portfolio,
  PricePrediction,
  Trade,
  TradeDecision,
  TradingStrategy,
  WorldEvent,
} from "@/types/trading";

interface MutationState {
  isPending?: boolean;
}

interface TradingTabsProps {
  autonomousStatus?: AutonomousStatus;
  worldEvents: WorldEvent[];
  predictions: PricePrediction[];
  strategies: TradingStrategy[];
  decisions: TradeDecision[];
  forexMarkets: any[];
  cryptoMarkets: any[];
  markets: any[];
  selectedSymbol: string;
  tradeQuantity: string;
  setSelectedSymbol: (v: string) => void;
  setTradeQuantity: (v: string) => void;
  setTradeSide: (v: "buy" | "sell") => void;
  handleTrade: () => void;
  generatePredictionMutation: MutationState & { mutate: (args: { symbol: string; currentPrice: number }) => void };
  executeTradeMutation: MutationState;
  closeTradeMutation: MutationState & { mutate: (id: string) => void };
  refineStrategyMutation: MutationState & { mutate: (id: string) => void };
  portfolio?: Portfolio;
  trades: Trade[];
  getImpactColor: (level: string) => string;
  getSentimentColor: (sentiment: string) => string;
  onStartAutonomous: () => void;
  onStopAutonomous: () => void;
}

export function TradingTabs({
  autonomousStatus,
  worldEvents,
  predictions,
  strategies,
  decisions,
  forexMarkets,
  cryptoMarkets,
  markets,
  selectedSymbol,
  tradeQuantity,
  setSelectedSymbol,
  setTradeQuantity,
  setTradeSide,
  handleTrade,
  generatePredictionMutation,
  executeTradeMutation,
  closeTradeMutation,
  refineStrategyMutation,
  portfolio,
  trades,
  getImpactColor,
  getSentimentColor,
  onStartAutonomous,
  onStopAutonomous,
}: TradingTabsProps) {
  return (
    <Tabs defaultValue="autonomous" className="w-full">
      <TabsList className="bg-slate-800/50 border border-slate-700">
        <TabsTrigger value="autonomous" data-testid="tab-autonomous">
          <Brain className="w-4 h-4 mr-1" />
          AI Engine
        </TabsTrigger>
        <TabsTrigger value="events" data-testid="tab-events">
          <Globe className="w-4 h-4 mr-1" />
          World Events
        </TabsTrigger>
        <TabsTrigger value="predictions" data-testid="tab-predictions">
          <LineChart className="w-4 h-4 mr-1" />
          Predictions
        </TabsTrigger>
        <TabsTrigger value="strategies" data-testid="tab-strategies">
          <BookOpen className="w-4 h-4 mr-1" />
          Strategies
        </TabsTrigger>
        <TabsTrigger value="markets" data-testid="tab-markets">
          <BarChart3 className="w-4 h-4 mr-1" />
          Markets
        </TabsTrigger>
        <TabsTrigger value="portfolio" data-testid="tab-portfolio">
          <Wallet className="w-4 h-4 mr-1" />
          Portfolio
        </TabsTrigger>
        <TabsTrigger value="alpaca" data-testid="tab-alpaca">
          <TrendingUp className="w-4 h-4 mr-1" />
          Alpaca
        </TabsTrigger>
      </TabsList>

      <TabsContent value="autonomous" className="space-y-4">
        <AutonomousTab
          decisions={decisions}
          worldEvents={worldEvents}
          getImpactColor={getImpactColor}
          getSentimentColor={getSentimentColor}
          onStart={onStartAutonomous}
          onStop={onStopAutonomous}
          autonomousStatus={autonomousStatus}
        />
      </TabsContent>

      <TabsContent value="events" className="space-y-4">
        <EventsTab worldEvents={worldEvents} getImpactColor={getImpactColor} getSentimentColor={getSentimentColor} />
      </TabsContent>

      <TabsContent value="predictions" className="space-y-4">
        <PredictionsTab predictions={predictions} />
      </TabsContent>

      <TabsContent value="strategies" className="space-y-4">
        <StrategiesTab
          strategies={strategies}
          onRefine={(id) => refineStrategyMutation.mutate(id)}
          isRefining={!!refineStrategyMutation.isPending}
        />
      </TabsContent>

      <TabsContent value="markets" className="space-y-4">
        <MarketsTab
          forexMarkets={forexMarkets}
          cryptoMarkets={cryptoMarkets}
          markets={markets}
          selectedSymbol={selectedSymbol}
          tradeQuantity={tradeQuantity}
          isTradingPending={!!executeTradeMutation.isPending}
          isPredictingPending={!!generatePredictionMutation.isPending}
          setSelectedSymbol={setSelectedSymbol}
          setTradeQuantity={setTradeQuantity}
          onBuy={() => {
            setTradeSide("buy");
            handleTrade();
          }}
          onSell={() => {
            setTradeSide("sell");
            handleTrade();
          }}
          onPredict={(symbol, price) => generatePredictionMutation.mutate({ symbol, currentPrice: price })}
        />
      </TabsContent>

      <TabsContent value="portfolio" className="space-y-4">
        <PortfolioTab
          portfolio={portfolio}
          trades={trades}
          onClose={(id) => closeTradeMutation.mutate(id)}
          isClosing={!!closeTradeMutation.isPending}
        />
      </TabsContent>

      <TabsContent value="alpaca" className="space-y-4">
        <AlpacaBrokerPanel />
      </TabsContent>
    </Tabs>
  );
}

