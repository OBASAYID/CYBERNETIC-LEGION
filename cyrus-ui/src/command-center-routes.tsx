/**
 * Command Center feature pages — operational modules only.
 */
import { lazy, Suspense, type ComponentType, useEffect, useState } from "react";
import { Route, Redirect } from "wouter";
import { REMOVED_ROUTE_REDIRECTS } from "./lib/removed-routes";

const ModulesPage = lazy(() =>
  import("../../client/src/pages/ModulesPage").then((m) => ({ default: m.ModulesPage })),
);
const ScanPage = lazy(() =>
  import("../../client/src/pages/ScanPage").then((m) => ({ default: m.ScanPage })),
);
const DocumentsIntelligence = lazy(() =>
  import("./pages/documents-intelligence").then((m) => ({ default: m.default })),
);
const NavigationPage = lazy(() =>
  import("../../client/src/pages/NavigationPage").then((m) => ({ default: m.NavigationPage })),
);
const CommsPage = lazy(() =>
  import("./pages/comms-hub-page").then((m) => ({ default: m.default })),
);
const DeviceControlPage = lazy(() =>
  import("../../client/src/pages/DeviceControlPage").then((m) => ({ default: m.DeviceControlPage })),
);
const MedicalPage = lazy(() =>
  import("../../client/src/pages/MedicalPage").then((m) => ({ default: m.MedicalPage })),
);
const QuantumPage = lazy(() =>
  import("../../client/src/pages/QuantumPage").then((m) => ({ default: m.QuantumPage })),
);
const SecurityPage = lazy(() =>
  import("../../client/src/pages/SecurityPage").then((m) => ({ default: m.SecurityPage })),
);
const BiologyPage = lazy(() =>
  import("../../client/src/pages/BiologyPage").then((m) => ({ default: m.BiologyPage })),
);
const OperationsPage = lazy(() =>
  import("../../client/src/pages/OperationsPage").then((m) => ({ default: m.OperationsPage })),
);
const AlgorithmsPage = lazy(() => import("./pages/algorithms-page").then((m) => ({ default: m.AlgorithmsPage })));
const IntelligenceHubPage = lazy(() =>
  import("./pages/intelligence-hub-page").then((m) => ({ default: m.IntelligenceHubPage })),
);
const DocumentBuilder = lazy(() =>
  import("./pages/document-builder").then((m) => ({ default: m.default })),
);
const SettingsPage = lazy(() =>
  import("./pages/settings-page").then((m) => ({ default: m.default })),
);

function SuspenseRoute({ path, C }: { path: string; C: React.LazyExoticComponent<ComponentType<unknown>> }) {
  return (
    <Route path={path}>
      <Suspense fallback={<RouteLoadingFallback />}>
        <C />
      </Suspense>
    </Route>
  );
}

function RouteLoadingFallback() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 260);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) {
    return <div className="min-h-screen min-h-dvh bg-transparent" aria-hidden="true" />;
  }

  return (
    <div className="relative flex min-h-screen min-h-dvh flex-col items-center justify-center gap-3 overflow-x-hidden bg-transparent bg-gradient-to-b from-slate-950/35 via-slate-900/25 to-slate-950/40 font-mono text-sm tracking-widest text-cyan-400/90">
      <div className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
      LOADING MODULE…
    </div>
  );
}

function RemovedRouteRedirects() {
  return (
    <>
      {Object.entries(REMOVED_ROUTE_REDIRECTS).map(([from, to]) => (
        <Route key={from} path={from}>
          <Redirect to={to} />
        </Route>
      ))}
    </>
  );
}

/** Command Center module pages from `client/` (lazy routes aligned with the desktop Command Center layout). */
export function CommandCenterRoutes() {
  return (
    <>
      <RemovedRouteRedirects />
      <SuspenseRoute path="/intelligence" C={IntelligenceHubPage} />
      <SuspenseRoute path="/files" C={DocumentsIntelligence} />
      <SuspenseRoute path="/scan" C={ScanPage} />
      <SuspenseRoute path="/comms" C={CommsPage} />
      <SuspenseRoute path="/nav" C={NavigationPage} />
      <SuspenseRoute path="/modules" C={ModulesPage} />
      <SuspenseRoute path="/algorithms" C={AlgorithmsPage} />
      <SuspenseRoute path="/document-builder" C={DocumentBuilder} />
      <SuspenseRoute path="/device" C={DeviceControlPage} />
      <SuspenseRoute path="/medical" C={MedicalPage} />
      <SuspenseRoute path="/security" C={SecurityPage} />
      <SuspenseRoute path="/biology" C={BiologyPage} />
      <SuspenseRoute path="/quantum" C={QuantumPage} />
      <SuspenseRoute path="/ops" C={OperationsPage} />
      <SuspenseRoute path="/settings" C={SettingsPage} />
    </>
  );
}
