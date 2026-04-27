import wildlifeBackgroundUrl from "../assets/generated/wildlife_background.svg";

/**
 * useWildlifeBackground
 *
 * Returns the URL for the wildlife night-scene background image used across
 * the dashboard and module workspace shells. Centralised here so the asset
 * path is changed in one place if the image is ever swapped out.
 *
 * Uses a direct ES module import so Vite resolves and hashes the asset at
 * build time, producing a reliable URL that works in the browser at runtime.
 */
export function useWildlifeBackground(): string {
  return wildlifeBackgroundUrl;
}
