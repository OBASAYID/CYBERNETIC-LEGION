/**
 * REST wrappers for multi-party conferencing (Phase 3).
 * Matches `server/comms/comms-routes.ts`; identity uses session / `X-Device-Id` via `systemFetch`.
 */
import { systemFetch } from "@shared/cyrus-api-client";

export type CommsConference = {
  conferenceId: string;
  title: string;
  roomCode: string;
  meetingLink?: string;
  hostId?: string;
  hostName?: string;
};

export async function commsCreateConference(body: {
  title: string;
  description?: string;
  maxParticipants?: number;
  password?: string | null;
  userName?: string;
}): Promise<{ conference?: CommsConference; error?: string }> {
  const res = await systemFetch("/api/comms/conferences/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: body.title,
      description: body.description,
      maxParticipants: body.maxParticipants ?? 50,
      password: body.password ?? undefined,
      userName: body.userName ?? "Host",
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    success?: boolean;
    conference?: CommsConference;
    error?: string;
  };
  if (!res.ok) return { error: data.error || res.statusText };
  return { conference: data.conference };
}

export async function commsJoinConference(body: {
  conferenceId: string;
  userName?: string;
}): Promise<{ success?: boolean; error?: string }> {
  const res = await systemFetch(
    `/api/comms/conferences/${encodeURIComponent(body.conferenceId)}/join`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userName: body.userName ?? "Guest" }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { error: (data as { error?: string }).error || res.statusText };
  return { success: true, ...data };
}

export async function commsListActiveConferences(): Promise<{
  conferences?: unknown[];
  totalConferences?: number;
}> {
  const res = await systemFetch("/api/comms/conferences/active");
  if (!res.ok) return {};
  return res.json();
}
