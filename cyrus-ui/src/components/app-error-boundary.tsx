import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string; stack: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", stack: "" };

  static getDerivedStateFromError(err: Error): State {
    return {
      hasError: true,
      message: err.message || "Unexpected UI error",
      stack: err.stack || "",
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[CYRUS ErrorBoundary] Caught error:", error);
    console.error("[CYRUS ErrorBoundary] Component stack:", info.componentStack);
    console.error("[CYRUS ErrorBoundary] Error stack:", error.stack);
  }

  private handleClearCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center space-y-2 max-w-2xl w-full">
            <h1 className="text-lg font-mono text-red-400 tracking-wider">UI SURFACE FAULT</h1>
            <p className="text-sm text-white/80 break-words">{this.state.message}</p>
            {this.state.stack && (
              <pre className="mt-3 text-left text-xs text-white/40 bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto max-h-48 whitespace-pre-wrap break-all">
                {this.state.stack}
              </pre>
            )}
            <p className="text-xs text-white/40 pt-1">
              Open the browser console (F12) for full details. Reload to reconnect to the system.
              If this persists, clear site data and redeploy.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              type="button"
              className="px-6 py-3 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm font-mono tracking-wider hover:bg-cyan-500/10 transition-colors"
              onClick={() => window.location.reload()}
            >
              RELOAD
            </button>
            <button
              type="button"
              className="px-6 py-3 rounded-lg border border-red-500/40 text-red-400 text-sm font-mono tracking-wider hover:bg-red-500/10 transition-colors"
              onClick={this.handleClearCache}
            >
              CLEAR CACHE &amp; RELOAD
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
