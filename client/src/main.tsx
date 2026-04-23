import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import { queryClient } from "./lib/queryClient";
import App from "./App";
import "./index.css";

type ErrorBoundaryState = { hasError: boolean };

class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo): void {
    console.error("UI CRASH:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <h1>Critical UI Failure</h1>;
    }
    return this.props.children;
  }
}

function RuntimeHealthProbe() {
  useEffect(() => {
    systemFetch("/health")
      .then((res) => res.json())
      .catch(() => console.error("Backend unreachable"));
  }, []);

  console.count("Component Rendered");
  return null;
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <RuntimeHealthProbe />
      <App />
    </QueryClientProvider>
  </ErrorBoundary>
);
