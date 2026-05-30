import { Switch, Route } from "wouter";
import { PresenceProvider } from "../../client/src/contexts/PresenceContext";
import { CommsPresenceBootstrap } from "../../client/src/hooks/usePresenceBootstrap";
import { CommandCenterRoutes } from "./command-center-routes";
import NotFound from "@/pages/not-found";
import DashboardFresh from "@/pages/dashboard-fresh";
import { ApiKeyTriggerButton } from "@/components/ApiKeyModal";

interface AppRoutesProps {
  onOpenApiKeyModal?: () => void;
  apiKeyConfigured?: boolean;
}

export function AppRoutes({ onOpenApiKeyModal, apiKeyConfigured = false }: AppRoutesProps) {
  return (
    <PresenceProvider>
      <CommsPresenceBootstrap />
      {onOpenApiKeyModal && (
        <div className="fixed bottom-4 right-4 z-[90]">
          <ApiKeyTriggerButton onClick={onOpenApiKeyModal} isConfigured={apiKeyConfigured} />
        </div>
      )}
      <Switch>
        <Route path="/" component={DashboardFresh} />
        <CommandCenterRoutes />
        <Route component={NotFound} />
      </Switch>
    </PresenceProvider>
  );
}
