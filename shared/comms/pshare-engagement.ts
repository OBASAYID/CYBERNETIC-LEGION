/** CYRUS Pshare engagement scoring — shared by server + clients. */

export type PshareEngagementCounts = {
  likeCount: number;
  commentCount: number;
  shareCount: number;
  hypeCount: number;
  reactionCount: number;
  /** Hypes in the last 72 hours — drives trending boost. */
  recentHypeCount?: number;
};

export type PshareDiamondGrade = 0 | 1 | 2 | 3 | 4 | 5;

export const PSHARE_REACTION_EMOJIS = ["🔥", "⚡", "💎", "👏", "🚀", "❤️", "😂", "👀", "🎯"] as const;

export type PshareReactionEmoji = (typeof PSHARE_REACTION_EMOJIS)[number];

export const PSHARE_DIAMOND_TIER_LABELS: Record<PshareDiamondGrade, string> = {
  0: "",
  1: "Bronze",
  2: "Silver",
  3: "Gold",
  4: "Elite",
  5: "Platinum",
};

export function computePshareEngagementScore(counts: PshareEngagementCounts): number {
  return (
    counts.likeCount * 2 +
    counts.commentCount * 3 +
    counts.shareCount * 4 +
    counts.hypeCount * 5 +
    counts.reactionCount +
    (counts.recentHypeCount ?? 0) * 8
  );
}

export function computePshareDiamondGrade(
  counts: PshareEngagementCounts,
): PshareDiamondGrade {
  const score = computePshareEngagementScore(counts);
  const hype = counts.hypeCount;
  if (score >= 55 || (hype >= 10 && score >= 28)) return 5;
  if (score >= 38) return 4;
  if (score >= 22) return 3;
  if (score >= 11) return 2;
  if (score >= 4) return 1;
  return 0;
}

export function computePshareTrendScore(
  counts: PshareEngagementCounts,
  createdAt: string | Date | null | undefined,
): number {
  const base = computePshareEngagementScore(counts);
  let ageHours = 0;
  if (createdAt) {
    const t = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
    if (!Number.isNaN(t)) ageHours = (Date.now() - t) / 3_600_000;
  }
  const recency = Math.max(0.25, 1 - ageHours / 168);
  const hypeSurge = (counts.recentHypeCount ?? 0) * 14;
  return Math.round(base * recency + hypeSurge);
}

export function isPshareTrending(
  counts: PshareEngagementCounts,
  trendScore: number,
): boolean {
  return (counts.recentHypeCount ?? 0) >= 2 || trendScore >= 18;
}

export function enrichPsharePostEngagement<T extends { createdAt?: string | Date | null }>(
  post: T,
  counts: PshareEngagementCounts,
): T & {
  trendScore: number;
  diamondGrade: PshareDiamondGrade;
  diamondTier: string;
  isTrending: boolean;
} {
  const trendScore = computePshareTrendScore(counts, post.createdAt);
  const diamondGrade = computePshareDiamondGrade(counts);
  return {
    ...post,
    trendScore,
    diamondGrade,
    diamondTier: PSHARE_DIAMOND_TIER_LABELS[diamondGrade],
    isTrending: isPshareTrending(counts, trendScore),
  };
}
