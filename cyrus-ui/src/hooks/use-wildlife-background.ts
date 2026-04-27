/**
 * useWildlifeBackground
 *
 * Returns the URL for the wildlife night-scene background image used across
 * the dashboard and module workspace shells. Centralised here so the asset
 * path is changed in one place if the image is ever swapped out.
 */
export function useWildlifeBackground(): string {
  return new URL(
    "../assets/generated/wildlife_background.svg",
    import.meta.url,
  ).href;
}
