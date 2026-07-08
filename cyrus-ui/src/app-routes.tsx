import { lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { PresenceProvider } from "../../client/src/contexts/PresenceContext";
import { CommsPresenceBootstrap } from "../../client/src/hooks/usePresenceBootstrap";
import { StackLinkBootstrap } from "../../client/src/hooks/useStackLink";
import { commsRouteElements } from "./comms-routes";
import { commandCenterRouteElements } from "./command-center-routes";
import NotFound from "@/pages/not-found";
import { ApiKeyTriggerButton } from "@/components/ApiKeyModal";
import { CyrusAiBar } from "@/components/cyrus-ai-bar";

const DiamondHome = lazy(() => import("@/pages/diamond-home"));

interface AppRoutesProps {
  onOpenApiKeyModal?: () => void;
  apiKeyConfigured?: boolean;
}

function DashboardFallback() {
  return <div className="min-h-screen min-h-dvh bg-[#080808]" aria-hidden="true" />;
}

export function AppRoutes({ onOpenApiKeyModal, apiKeyConfigured = false }: AppRoutesProps) {
  return (
    <PresenceProvider>
      <StackLinkBootstrap />
      <CommsPresenceBootstrap />
      {onOpenApiKeyModal && (
        <div className="fixed bottom-24 right-4 z-[90]">
          <ApiKeyTriggerButton onClick={onOpenApiKeyModal} isConfigured={apiKeyConfigured} />
        </div>
      )}
      <Switch>
        <Route path="/">
          <Suspense fallback={<DashboardFallback />}>
            <DiamondHome />
          </Suspense>
        </Route>
        {commsRouteElements}
        {commandCenterRouteElements}
        <Route component={NotFound} />
      </Switch>
      {/* Persistent CYRUS AI bottom bar */}
      <CyrusAiBar />
    </PresenceProvider>
  );
}
