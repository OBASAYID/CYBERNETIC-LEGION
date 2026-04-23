/**
 * Command Center feature pages are fused from `client/` into the `cyrus-ui` shell.
 * See `cyrus-ui/src/lib/fused-stack.ts` for the full layout map.
 */
import { lazy, Suspense, type ComponentType, useEffect, useState } from "react";
import { Route } from "wouter";

const ModulesPage = lazy(() =>
  import("../../client/src/pages/ModulesPage").then((m) => ({ default: m.ModulesPage })),
);
const ScanPage = lazy(() =>
  import("../../client/src/pages/ScanPage").then((m) => ({ default: m.ScanPage })),
);
const DocumentsIntelligence = lazy(() =>
  import("./pages/file-analysis").then((m) => ({ default: m.default })),
);
const NavigationPage = lazy(() =>
  import("../../client/src/pages/NavigationPage").then((m) => ({ default: m.NavigationPage })),
);
const CommsPage = lazy(() =>
  import("../../client/src/pages/CommsPage").then((m) => ({ default: m.CommsPage })),
);
const DeviceControlPage = lazy(() =>
  import("../../client/src/pages/DeviceControlPage").then((m) => ({ default: m.DeviceControlPage })),
);
const DronePage = lazy(() =>
  import("../../client/src/pages/DronePage").then((m) => ({ default: m.DronePage })),
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
const BloodSamplingPage = lazy(() =>
  import("../../client/src/pages/BloodSamplingPage").then((m) => ({ default: m.BloodSamplingPage })),
);
const OperationsPage = lazy(() =>
  import("../../client/src/pages/OperationsPage").then((m) => ({ default: m.OperationsPage })),
);
const AlgorithmsPage = lazy(() => import("./pages/algorithms-page").then((m) => ({ default: m.AlgorithmsPage })));

function SuspenseRoute({ path, C }: { path: string; C: React.LazyExoticComponent<ComponentType<unknown>> }) {
  return (
    <Route path={path}>
      <Suspense
        fallback={<RouteLoadingFallback />}
      >
        <C />
      </Suspense>
    </Route>
  );
}

function RouteLoadingFallback() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Delay fallback display to prevent blink/flicker on fast lazy loads.
    const t = window.setTimeout(() => setVisible(true), 260);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) {
    return (
      <div className="min-h-screen bg-slate-950" aria-hidden="true" />
    );
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-3 overflow-x-hidden bg-slate-950 bg-gradient-to-b from-slate-950/95 via-slate-900/90 to-slate-950 font-mono text-sm tracking-widest text-cyan-400/90 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
        <div className="absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-orange-500/40 to-transparent" />
      </div>
      <div className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
      LOADING MODULE…
    </div>
  );
}

/** Command Center module pages from `client/` (lazy routes aligned with the desktop Command Center layout). */
export function CommandCenterRoutes() {
  return (
    <>
      <SuspenseRoute path="/algorithms" C={AlgorithmsPage} />
      <SuspenseRoute path="/modules" C={ModulesPage} />
      <SuspenseRoute path="/scan" C={ScanPage} />
      <SuspenseRoute path="/files" C={DocumentsIntelligence} />
      <SuspenseRoute path="/nav" C={NavigationPage} />
      <SuspenseRoute path="/comms" C={CommsPage} />
      <SuspenseRoute path="/device" C={DeviceControlPage} />
      <SuspenseRoute path="/drone" C={DronePage} />
      <SuspenseRoute path="/medical" C={MedicalPage} />
      <SuspenseRoute path="/quantum" C={QuantumPage} />
      <SuspenseRoute path="/security" C={SecurityPage} />
      <SuspenseRoute path="/biology" C={BiologyPage} />
      <SuspenseRoute path="/blood" C={BloodSamplingPage} />
      <SuspenseRoute path="/ops" C={OperationsPage} />
    </>
  );
}
