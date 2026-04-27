/**
 * useWildlifeBackground
 *
 * Returns the URL for the wildlife night-scene background image used across
 * the dashboard and module workspace shells. Centralised here so the asset
 * path is changed in one place if the image is ever swapped out.
 *
 * The SVG is served from the Vite public directory as a static file, so the
 * path is a simple root-relative string that the browser can load directly
 * without relying on Vite's module resolution or asset hashing pipeline.
 */
export function useWildlifeBackground(): string {
  return "/wildlife_background.svg";
}
