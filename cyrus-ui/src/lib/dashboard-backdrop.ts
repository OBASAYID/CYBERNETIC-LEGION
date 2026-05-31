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
/** User-provided Tsodilo ceremonial dance hero art. */
export const TSODILO_DANCE_HERO_URL = "/tsodilo-dance-hero.png";
/** User-provided Tsodilo hunt symbol reference art. */
export const TSODILO_HUNT_SYMBOLS_URL = "/tsodilo-hunt-symbols.png";
/** User-provided Tsodilo rock wall painting texture. */
export const TSODILO_ROCK_ART_WALL_URL = "/tsodilo-rock-art-wall.png";
/** User-provided Tsodilo cave dance mural texture. */
export const TSODILO_CAVE_DANCE_URL = "/tsodilo-cave-dance.png";
/** User-provided Tsodilo marks pattern panel. */
export const TSODILO_MARKINGS_CANVAS_URL = "/tsodilo-markings-canvas.png";
/** User-provided ancient carved symbol plate texture. */
export const TSODILO_SYMBOLS_STELE_URL = "/tsodilo-symbols-stele.png";
/** Diamond hero art placed on a dark leather surface for the featured spotlight panel. */
export const CYRUS_DIAMONDS_LEATHER_URL = "/images/cyrus-diamonds-leather.png";
/** Refined brilliant-cut diamond render for the System Spotlight mining pillar card. */
export const CYRUS_MINING_DIAMOND_URL = "/images/cyrus-mining-diamond-hero.png";
/** Botswana wildlife tourism hero used in the national pillars strip. */
export const BOTSWANA_TOURISM_WILDLIFE_URL = "/images/botswana-dashboard-wildlife.jpg";
/** Cattle heritage texture used to represent Botswana beef exports. */
export const BOTSWANA_BEEF_EXPORTS_URL = "/images/botswana-beef-cattle-heritage.png";
/** Bulls with Botswana flag — System Spotlight beef exports pillar hero. */
export const BOTSWANA_BEEF_EXPORTS_HERO_URL = "/images/botswana-beef-exports-hero.png";
/** Technology and digital skills visual used for Botswana innovation pillar. */
export const BOTSWANA_TECHNOLOGY_URL = "/images/botswana-technology-network.png";
/** Debswana industrial mining site — System Spotlight technology pillar hero. */
export const BOTSWANA_TECHNOLOGY_HERO_URL = "/images/botswana-technology-hero.png";
/** Botswana coat of arms / Debswana mining sculpture — System Spotlight hero flank. */
export const BOTSWANA_COAT_OF_ARMS_DEBSWANA_URL = "/images/botswana-coat-of-arms-debswana-hero.png";

/** Botswana presidents — System Spotlight leadership strip (chronological). */
export const BOTSWANA_PRESIDENT_SERETSE_KHAMA_URL = "/images/botswana-president-01-seretse-khama.png";
export const BOTSWANA_PRESIDENT_KETUMILE_MASIRE_URL = "/images/botswana-president-02-ketumile-masire.png";
export const BOTSWANA_PRESIDENT_FESTUS_MOGAE_URL = "/images/botswana-president-03-festus-mogae.png";
export const BOTSWANA_PRESIDENT_IAN_KHAMA_URL = "/images/botswana-president-04-ian-khama.png";
export const BOTSWANA_PRESIDENT_MOKGWEETSI_MASISI_URL = "/images/botswana-president-05-mokgweetsi-masisi.png";
export const BOTSWANA_PRESIDENT_DUMA_BOKO_URL = "/images/botswana-president-06-duma-boko.png";
