/** Served from `public/` — full-resolution PNG; use with `background-size: cover` only (no upscaling artifacts beyond browser interpolation). */
export const DASHBOARD_CRACK_TEXTURE_URL = "/dashboard-crack-texture.png";
/** User-provided smoke vortex reference image for atmospheric layer styling. */
export const SMOKE_VORTEX_TEXTURE_URL = "/smoke-vortex.png";
/** User-provided warm ribbon reference image for module lighting treatment. */
export const MODULE_RIBBON_LIGHT_URL = "/module-ribbon-light.png";
/** Main modules icon (folder) provided by user and polished in UI styling. */
export const MODULES_MAIN_ICON_URL = "/modules-main-icon.png";
/** Full folder artwork for module workspace tiles (replaces flat rectangle with folder silhouette). */
export const MODULE_FOLDER_TILE_URL = "/module-folder-tile.png";

/**
 * CSS `filter` for folder PNG: cyan/blue folder on screen.
 * Pair with `mix-blend-multiply` on the `<img>` and a `bg-sky-950` (or similar) rounded backing
 * so light/white matte in the asset blends away.
 */
export const MODULE_FOLDER_ICON_FILTER =
  "hue-rotate(172deg) saturate(1.3) brightness(1.05) contrast(1.09) drop-shadow(0 2px 5px rgba(8,70,110,0.38)) drop-shadow(0 0 14px rgba(56,189,248,0.45))";
