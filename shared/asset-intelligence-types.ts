/** Asset intelligence scoring dimensions — ML-calibrated web asset mining. */

export const ASSET_SCORE_DIMENSIONS = [
  "relevance",
  "source_trust",
  "educational_value",
  "visual_clarity",
  "license_safety",
  "domain_fit",
  "technical_quality",
  "retrieval_priority",
  "overall_quality",
] as const;

export type AssetScoreDimension = (typeof ASSET_SCORE_DIMENSIONS)[number];
export type AssetScoreVector = Record<AssetScoreDimension, number>;

export const ASSET_FEATURE_NAMES = [
  "query_term_overlap",
  "domain_match",
  "wikimedia_source",
  "has_license",
  "has_attribution",
  "tag_density",
  "title_informativeness",
  "bytes_normalized",
  "is_3d_model",
  "png_format",
  "svg_format",
  "jpeg_format",
  "trusted_host",
  "edu_host",
  "gov_host",
  "anatomy_keyword",
  "engineering_keyword",
  "science_keyword",
] as const;

export const ASSET_ALGORITHM_VERSION = "cyrus-asset-v1.0";
