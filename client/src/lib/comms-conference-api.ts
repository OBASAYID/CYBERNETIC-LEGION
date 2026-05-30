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

export const LAST_CONFERENCE_KEY = "cyrus-comms-last-conference";

export type StoredConference = {
  conferenceId: string;
  roomCode?: string;
  title?: string;
};

export function readStoredConference(): StoredConference | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(LAST_CONFERENCE_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as StoredConference;
    return typeof j.conferenceId === "string" ? j : null;
  } catch {
    return null;
  }
}

export function persistStoredConference(c: StoredConference): void {
  try {
    sessionStorage.setItem(LAST_CONFERENCE_KEY, JSON.stringify(c));
  } catch {
    /* quota / private mode */
  }
}

/** Create a server conference, persist session, and join as host. */
export async function commsCreateAndJoinConference(body: {
  title: string;
  userName?: string;
  maxParticipants?: number;
}): Promise<{ conference?: CommsConference; error?: string }> {
  const { conference, error } = await commsCreateConference(body);
  if (error || !conference) return { error: error || "Create failed" };

  persistStoredConference({
    conferenceId: conference.conferenceId,
    roomCode: conference.roomCode,
    title: conference.title,
  });

  const join = await commsJoinConference({
    conferenceId: conference.conferenceId,
    userName: body.userName ?? "Host",
  });
  if (!join.success) return { conference, error: join.error || "Join failed" };
  return { conference };
}
