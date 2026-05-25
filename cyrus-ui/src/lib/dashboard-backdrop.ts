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
 * CSS `filter` for folder PNG: cool chrome radiance (specular + cyan edge light).
 * Pair the `<img>` with `mix-blend-darken` and `.cyrus-module-folder-trim` so matte/white frame stays gone.
 */
export const MODULE_FOLDER_ICON_FILTER =
  "hue-rotate(198deg) saturate(1.18) brightness(1.04) contrast(1.26) drop-shadow(0 0 14px rgba(34,211,238,0.38)) drop-shadow(0 0 4px rgba(186,230,253,0.55)) drop-shadow(0 1px 0 rgba(255,255,255,0.22))";

/** Tsodilo spiritual dance artwork used in System Spotlight hero card. */
export const TSODILO_SPIRITUAL_DANCE_URL = "/tsodilo-spiritual-dance.svg";
/** Tsodilo hills vectors + symbolic signs for dashboard atmospheric layers. */
export const TSODILO_HILLS_SIGNS_URL = "/tsodilo-hills-signs.svg";
