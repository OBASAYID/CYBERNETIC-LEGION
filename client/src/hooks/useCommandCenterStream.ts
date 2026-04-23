import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  COMMAND_CENTER_STREAM_PATH,
  normalizeApprovals,
  normalizeAuditLogs,
  normalizeMissions,
  normalizePerformance,
} from "../api/cyrusApi.js";

type StreamState = {
  connected: boolean;
  lastEventAt: number | null;
  error: string | null;
};

type CommandCenterSnapshotEvent = {
  ts?: number;
  health?: Record<string, unknown>;
  node?: Record<string, unknown>;
  state?: Record<string, unknown>;
  lockdown?: Record<string, unknown>;
  embodiment?: Record<string, unknown>;
  performance?: Record<string, unknown>;
  approvals?: Record<string, Record<string, unknown>>;
  missions?: Record<string, Record<string, unknown>>;
  audit?: { logs?: unknown[] };
};

export function useCommandCenterStream(enabled = true): StreamState {
  const queryClient = useQueryClient();
  const [connected, setConnected] = useState(false);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setConnected(false);
      return;
    }

    const eventSource = new EventSource(COMMAND_CENTER_STREAM_PATH);
    let snapshotDebounceTimer: ReturnType<typeof setTimeout> | null = null;
    let pendingSnapshot: CommandCenterSnapshotEvent | null = null;

    const applySnapshot = (snapshot: CommandCenterSnapshotEvent) => {
      if (snapshot.health) {
        queryClient.setQueryData(["system-health"], snapshot.health);
      }
      if (snapshot.node) {
        queryClient.setQueryData(["system-node"], snapshot.node);
      }
      if (snapshot.state) {
        queryClient.setQueryData(["system-state"], snapshot.state);
      }
      if (snapshot.lockdown) {
        queryClient.setQueryData(["lockdown-state"], snapshot.lockdown);
      }
      if (snapshot.embodiment) {
        queryClient.setQueryData(["embodiment-status"], snapshot.embodiment);
      }
      if (snapshot.performance && typeof snapshot.performance === "object") {
        queryClient.setQueryData(["system-metrics"], normalizePerformance(snapshot.performance));
      }
      if (snapshot.approvals) {
        queryClient.setQueryData(["pending-approvals"], normalizeApprovals(snapshot.approvals));
      }
      if (snapshot.missions) {
        queryClient.setQueryData(["missions"], normalizeMissions(snapshot.missions));
      }
      if (snapshot.audit) {
        queryClient.setQueryData(["audit-logs"], normalizeAuditLogs(snapshot.audit));
      }
      if (typeof snapshot.ts === "number") {
        setLastEventAt(snapshot.ts);
      } else {
        setLastEventAt(Date.now());
      }
    };

    eventSource.onopen = () => {
      setConnected(true);
      setError(null);
    };

    eventSource.addEventListener("snapshot", (event) => {
      try {
        const snapshot = JSON.parse((event as MessageEvent).data) as CommandCenterSnapshotEvent;
        pendingSnapshot = snapshot;
        if (snapshotDebounceTimer) {
          clearTimeout(snapshotDebounceTimer);
        }
        snapshotDebounceTimer = setTimeout(() => {
          if (pendingSnapshot) {
            applySnapshot(pendingSnapshot);
            pendingSnapshot = null;
          }
        }, 120);
      } catch (streamError) {
        setError(streamError instanceof Error ? streamError.message : "Invalid stream payload");
      }
    });

    eventSource.addEventListener("error", (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { message?: string };
        if (payload?.message) {
          setError(payload.message);
        }
      } catch {
        setError("Command stream encountered an error");
      }
    });

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      if (snapshotDebounceTimer) {
        clearTimeout(snapshotDebounceTimer);
      }
      eventSource.close();
      setConnected(false);
    };
  }, [enabled, queryClient]);

  return { connected, lastEventAt, error };
}
