import { useCallback, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemFetch, systemApiUrl } from "@shared/cyrus-api-client";
import type { GwaFullReport, GwaLiveMetrics, GwaPhase } from "@shared/gwa-types";
import { GWA_PHASE_LABELS } from "@shared/gwa-types";
import { getCommsDeviceId } from "../lib/comms-device-id";

function gwaHeaders(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
    "X-User-Id": userId,
  };
}

type ActiveSessionResponse = {
  active: boolean;
  session: {
    id: string;
    title: string;
    status: string;
    currentPhase: GwaPhase;
    participantIds: string[];
    scenarioBrief?: string | null;
  } | null;
  metrics: GwaLiveMetrics | null;
};

export function useGroupWorkAssessment(groupId: string | null, myUserId: string) {
  const queryClient = useQueryClient();
  const [report, setReport] = useState<GwaFullReport | null>(null);

  const activeQuery = useQuery({
    queryKey: ["gwa", "active", groupId],
    queryFn: async (): Promise<ActiveSessionResponse> => {
      const res = await systemFetch(`/api/comms/gwa/groups/${groupId}/active`, {
        headers: gwaHeaders(myUserId),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load GWA session");
      return data;
    },
    enabled: !!groupId && !!myUserId,
    refetchInterval: (q) => (q.state.data?.active ? 5000 : false),
  });

  const startSession = useMutation({
    mutationFn: async (input: {
      title: string;
      scenarioBrief?: string;
      participantIds: string[];
    }) => {
      const res = await systemFetch("/api/comms/gwa/sessions", {
        method: "POST",
        headers: gwaHeaders(myUserId),
        body: JSON.stringify({ groupId, ...input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start assessment");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gwa", "active", groupId] });
      setReport(null);
    },
  });

  const advancePhase = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await systemFetch(`/api/comms/gwa/sessions/${sessionId}/advance-phase`, {
        method: "POST",
        headers: gwaHeaders(myUserId),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to advance phase");
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["gwa", "active", groupId] });
    },
  });

  const completeSession = useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await systemFetch(`/api/comms/gwa/sessions/${sessionId}/complete`, {
        method: "POST",
        headers: gwaHeaders(myUserId),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to complete assessment");
      return data.report as GwaFullReport;
    },
    onSuccess: (r) => {
      setReport(r);
      void queryClient.invalidateQueries({ queryKey: ["gwa", "active", groupId] });
    },
  });

  const openHtmlReport = useCallback((sessionId: string) => {
    const url = systemApiUrl(`/api/comms/gwa/sessions/${sessionId}/report/html`);
    window.open(url, "_blank", "noopener,noreferrer");
  }, []);

  const session = activeQuery.data?.session ?? null;
  const metrics = activeQuery.data?.metrics ?? null;
  const isActive = activeQuery.data?.active ?? false;
  const phaseLabel = session ? GWA_PHASE_LABELS[session.currentPhase as GwaPhase] : null;

  useEffect(() => {
    setReport(null);
  }, [groupId]);

  return {
    isActive,
    session,
    metrics,
    phaseLabel,
    report,
    loading: activeQuery.isLoading,
    error: activeQuery.error instanceof Error ? activeQuery.error.message : null,
    startSession,
    advancePhase,
    completeSession,
    openHtmlReport,
    refresh: () => void activeQuery.refetch(),
  };
}
