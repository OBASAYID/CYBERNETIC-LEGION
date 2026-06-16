import { getCommsDeviceId } from "./cyrus-identity";
import { systemApiUrl, systemFetch } from "@shared/cyrus-api-client";

/** Register FCM/web push token so incoming calls can wake offline devices. */
export async function registerCallPushToken(userId: string, token: string): Promise<void> {
  if (!token?.trim() || !userId?.trim()) return;
  const deviceId = getCommsDeviceId();
  await systemFetch(systemApiUrl("/api/comms/push/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      userId,
      deviceId,
      token: token.trim(),
      platform: typeof window !== "undefined" && "PushManager" in window ? "web" : "fcm",
    }),
  });
}

/** Best-effort: read token from service worker / FCM when the host app provides it. */
export function readEmbeddedPushToken(): string | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { CYRUS_FCM_TOKEN?: string };
  return w.CYRUS_FCM_TOKEN?.trim() || null;
}
