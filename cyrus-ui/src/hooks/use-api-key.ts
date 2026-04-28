import { useCallback, useState } from "react";

const STORAGE_KEY = "cyrus-openai-api-key";

/** Validates that the key starts with "sk-" and has a reasonable length. */
export function isValidApiKeyFormat(key: string): boolean {
  const trimmed = key.trim();
  return trimmed.startsWith("sk-") && trimmed.length >= 20;
}

function readStoredKey(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(STORAGE_KEY, key);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* ignore storage errors */
  }
}

/**
 * Manages the OpenAI API key stored in localStorage.
 *
 * ⚠️  Security note: localStorage is accessible to any JavaScript running on
 * this origin. For production deployments, prefer injecting the key via a
 * server-side environment variable rather than storing it client-side.
 */
export function useApiKey() {
  const [apiKey, setApiKeyState] = useState<string>(() => readStoredKey());

  const setApiKey = useCallback((key: string) => {
    const trimmed = key.trim();
    writeStoredKey(trimmed);
    setApiKeyState(trimmed);
  }, []);

  const clearApiKey = useCallback(() => {
    writeStoredKey("");
    setApiKeyState("");
  }, []);

  const isConfigured = apiKey.length > 0 && isValidApiKeyFormat(apiKey);

  /** Returns a masked version: first 10 chars visible, rest replaced with •. */
  const maskedKey = apiKey
    ? apiKey.slice(0, 10) + "•".repeat(Math.max(0, apiKey.length - 10))
    : "";

  return {
    apiKey,
    maskedKey,
    isConfigured,
    setApiKey,
    clearApiKey,
  };
}
