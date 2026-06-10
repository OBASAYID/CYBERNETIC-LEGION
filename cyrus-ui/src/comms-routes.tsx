/**
 * Comms-only routes — isolated from Command Center / AI lazy modules.
 */
import { lazy, Suspense, type ComponentType, useEffect, useState } from "react";
import { Route } from "wouter";

const CommsHubPage = lazy(() =>
  import("./pages/comms-hub-page").then((m) => ({ default: m.default })),
);
const CommsCallPage = lazy(() =>
  import("./pages/comms-call-page").then((m) => ({ default: m.default })),
);
const GroupCallModulePage = lazy(() =>
  import("./pages/group-call-module-page").then((m) => ({ default: m.default })),
);

function CommsRouteFallback() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setVisible(true), 200);
    return () => window.clearTimeout(t);
  }, []);

  if (!visible) {
    return <div className="min-h-screen min-h-dvh bg-black" aria-hidden="true" />;
  }

  return (
    <div className="flex min-h-screen min-h-dvh items-center justify-center bg-black text-xs tracking-widest text-cyan-400/80">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500/25 border-t-cyan-400" />
    </div>
  );
}

function SuspenseCommsRoute({
  path,
  C,
}: {
  path: string;
  C: React.LazyExoticComponent<ComponentType<unknown>>;
}) {
  return (
    <Route path={path}>
      <Suspense fallback={<CommsRouteFallback />}>
        <C />
      </Suspense>
    </Route>
  );
}

export const commsRouteElements = (
  <>
    <SuspenseCommsRoute path="/comms/call" C={CommsCallPage} />
    <SuspenseCommsRoute path="/comms/group-module" C={GroupCallModulePage} />
    <SuspenseCommsRoute path="/comms" C={CommsHubPage} />
  </>
);

/** @deprecated Use `commsRouteElements` inside `<Switch>` — bare components match as `*` and block other routes. */
export function CommsRoutes() {
  return commsRouteElements;
}
