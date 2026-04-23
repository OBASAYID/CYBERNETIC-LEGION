import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message || "Unexpected UI error" };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[CYRUS UI boundary]", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center space-y-2 max-w-lg">
            <h1 className="text-lg font-mono text-red-400 tracking-wider">UI SURFACE FAULT</h1>
            <p className="text-sm text-white/60 break-words">{this.state.message}</p>
            <p className="text-xs text-white/40">
              Reload to reconnect to the system. If this persists, capture the browser console and server logs.
            </p>
          </div>
          <button
            type="button"
            className="px-6 py-3 rounded-lg border border-cyan-500/40 text-cyan-300 text-sm font-mono tracking-wider hover:bg-cyan-500/10"
            onClick={() => window.location.reload()}
          >
            RELOAD
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
