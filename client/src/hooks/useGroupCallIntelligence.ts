import { useCallback, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { systemFetch } from "@shared/cyrus-api-client";
import type {
  GroupCallBriefing,
  GroupCallDiscussionNote,
  GroupCallMeetingSummary,
} from "@shared/group-call-intelligence-types";
import { getCommsDeviceId } from "../lib/comms-device-id";

function intelHeaders(userId: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-Device-Id": getCommsDeviceId(),
    "X-User-Id": userId,
  };
}

export function useGroupCallIntelligence(myUserId: string) {
  const [briefing, setBriefing] = useState<GroupCallBriefing | null>(null);
  const [summary, setSummary] = useState<GroupCallMeetingSummary | null>(null);
  const [discussionNotes, setDiscussionNotes] = useState<GroupCallDiscussionNote[]>([]);

  const generateBriefing = useMutation({
    mutationFn: async (input: { groupName: string; agenda: string; topic: string; sessionId?: string }) => {
      const path = input.sessionId
        ? `/api/comms/group-call/sessions/${input.sessionId}/briefing/generate`
        : "/api/comms/group-call/briefing/generate";
      const res = await systemFetch(path, {
        method: "POST",
        headers: intelHeaders(myUserId),
        body: JSON.stringify({
          groupName: input.groupName,
          agenda: input.agenda,
          topic: input.topic,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Briefing generation failed");
      return data.briefing as GroupCallBriefing;
    },
    onSuccess: (b) => setBriefing(b),
  });

  const generatePostMeeting = useMutation({
    mutationFn: async (input: {
      briefing: GroupCallBriefing;
      includeQuiz?: boolean;
      sessionId?: string;
      gwaReport?: unknown;
    }) => {
      const path = input.sessionId
        ? `/api/comms/group-call/sessions/${input.sessionId}/post-meeting/generate`
        : "/api/comms/group-call/post-meeting/generate";
      const res = await systemFetch(path, {
        method: "POST",
        headers: intelHeaders(myUserId),
        body: JSON.stringify({
          briefing: input.briefing,
          discussionNotes,
          includeQuiz: input.includeQuiz,
          gwaReport: input.gwaReport,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Post-meeting synthesis failed");
      return data.summary as GroupCallMeetingSummary;
    },
    onSuccess: (s) => setSummary(s),
  });

  const addDiscussionNote = useCallback(
    (content: string, displayName: string) => {
      const trimmed = content.trim();
      if (!trimmed) return;
      setDiscussionNotes((prev) => [
        ...prev,
        {
          id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          userId: myUserId,
          displayName,
          content: trimmed,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [myUserId],
  );

  const resetSession = useCallback(() => {
    setBriefing(null);
    setSummary(null);
    setDiscussionNotes([]);
  }, []);

  return {
    briefing,
    summary,
    discussionNotes,
    generateBriefing,
    generatePostMeeting,
    addDiscussionNote,
    resetSession,
    isGeneratingBriefing: generateBriefing.isPending,
    isGeneratingSummary: generatePostMeeting.isPending,
  };
}
