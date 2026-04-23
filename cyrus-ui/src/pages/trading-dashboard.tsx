import { TradingSummary } from "@/components/trading/TradingSummary";
import { useTradingDashboard } from "@/hooks/useTradingDashboard";
import { TradingTabs } from "@/components/trading/TradingTabs";

export default function TradingDashboard() {
  const {
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
    selectedSymbol,
    setSelectedSymbol,
    tradeQuantity,
    setTradeQuantity,
    setTradeSide,
    handleTrade,
    generatePredictionMutation,
    executeTradeMutation,
    closeTradeMutation,
    refineStrategyMutation,
    startAutonomousMutation,
    stopAutonomousMutation,
    getImpactColor,
    getSentimentColor,
  } = useTradingDashboard();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        <TradingSummary
          autonomousStatus={autonomousStatus}
          worldEventsCount={worldEvents.length}
          predictionsCount={predictions.length}
          strategiesCount={strategies.length}
          tradesCount={decisions.length}
          onStart={() => startAutonomousMutation.mutate()}
          onStop={() => stopAutonomousMutation.mutate()}
        />

        <TradingTabs
          autonomousStatus={autonomousStatus}
          worldEvents={worldEvents}
          predictions={predictions}
          strategies={strategies}
          decisions={decisions}
          forexMarkets={forexMarkets}
          cryptoMarkets={cryptoMarkets}
          markets={markets}
          selectedSymbol={selectedSymbol}
          tradeQuantity={tradeQuantity}
          setSelectedSymbol={setSelectedSymbol}
          setTradeQuantity={setTradeQuantity}
          setTradeSide={setTradeSide}
          handleTrade={handleTrade}
          generatePredictionMutation={generatePredictionMutation}
          executeTradeMutation={executeTradeMutation}
          closeTradeMutation={closeTradeMutation}
          refineStrategyMutation={refineStrategyMutation}
          portfolio={portfolio}
          trades={trades}
          getImpactColor={getImpactColor}
          getSentimentColor={getSentimentColor}
          onStartAutonomous={() => startAutonomousMutation.mutate()}
          onStopAutonomous={() => stopAutonomousMutation.mutate()}
        />
      </div>
    </div>
  );
}
