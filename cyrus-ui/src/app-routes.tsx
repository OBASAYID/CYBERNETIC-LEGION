import { Switch, Route } from "wouter";
import { PresenceProvider } from "../../client/src/contexts/PresenceContext";
import { CommandCenterRoutes } from "./command-center-routes";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import DashboardFresh from "@/pages/dashboard-fresh";
import DroneControl from "@/pages/drone-control";
import AIDashboard from "@/pages/ai-dashboard";
import AIAssistant from "@/pages/ai-assistant";
import TradingDashboard from "@/pages/trading-dashboard";
import DesignAutomation from "@/pages/design-automation";
import DeviceControl from "@/pages/device-control";
import Navigation from "@/pages/navigation";
import DocumentsIntelligence from "@/pages/documents-intelligence";
import DocumentBuilder from "@/pages/document-builder";
import { ApiKeyTriggerButton } from "@/components/ApiKeyModal";

interface AppRoutesProps {
  onOpenApiKeyModal?: () => void;
  apiKeyConfigured?: boolean;
}

export function AppRoutes({ onOpenApiKeyModal, apiKeyConfigured = false }: AppRoutesProps) {
  return (
    <PresenceProvider>
      {/* Global API key trigger — fixed bottom-right, always accessible */}
      {onOpenApiKeyModal && (
        <div className="fixed bottom-4 right-4 z-[90]">
          <ApiKeyTriggerButton
            onClick={onOpenApiKeyModal}
            isConfigured={apiKeyConfigured}
          />
        </div>
      )}
      <Switch>
        <Route path="/" component={DashboardFresh} />
        <Route path="/dashboard-legacy" component={Dashboard} />
        <Route path="/drone-control" component={DroneControl} />
        <Route path="/ai-dashboard" component={AIDashboard} />
        <Route path="/ai-assistant" component={AIAssistant} />
        <Route path="/trading" component={TradingDashboard} />
        <Route path="/design" component={DesignAutomation} />
        <Route path="/device-control" component={DeviceControl} />
        <Route path="/navigation" component={Navigation} />
        <Route path="/file-analysis" component={DocumentsIntelligence} />
        <Route path="/document-builder" component={DocumentBuilder} />
        <CommandCenterRoutes />
        <Route component={NotFound} />
      </Switch>
    </PresenceProvider>
  );
}

