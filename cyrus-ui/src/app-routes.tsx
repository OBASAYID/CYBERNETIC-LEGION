import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { PresenceProvider } from "../../client/src/contexts/PresenceContext";
import { CommsPresenceBootstrap } from "../../client/src/hooks/usePresenceBootstrap";
import { CommsRoutes } from "./comms-routes";
import { CommandCenterRoutes } from "./command-center-routes";
import NotFound from "@/pages/not-found";
import { ApiKeyTriggerButton } from "@/components/ApiKeyModal";

const DashboardFresh = lazy(() => import("@/pages/dashboard-fresh"));

interface AppRoutesProps {
  onOpenApiKeyModal?: () => void;
  apiKeyConfigured?: boolean;
}

function DashboardFallback() {
  return <div className="min-h-screen min-h-dvh bg-white" aria-hidden="true" />;
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
        <Route path="/">
          <Suspense fallback={<DashboardFallback />}>
            <DashboardFresh />
          </Suspense>
        </Route>
        <CommsRoutes />
        <CommandCenterRoutes />
        <Route component={NotFound} />
      </Switch>
    </PresenceProvider>
  );
}
