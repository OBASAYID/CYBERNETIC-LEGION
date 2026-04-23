import { systemFetch } from "./cyrus-api-client";

/** Play CYRUS TTS (same endpoint as other surfaces). Fails quietly if the API is unavailable. */
export async function speakCyrusTts(text: string, opts?: { voice?: string }): Promise<void> {
  const t = text.trim();
  if (!t || typeof window === "undefined") return;
  const res = await systemFetch("/api/cyrus/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: t, voice: opts?.voice ?? "nova" }),
  });
  if (!res.ok) return;
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  try {
    await new Promise<void>((resolve) => {
      audio.onended = () => resolve();
      audio.onerror = () => resolve();
      void audio.play().then(
        () => {},
        () => resolve(),
      );
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function getSpeechRecognitionConstructor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognition;
    webkitSpeechRecognition?: new () => SpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
