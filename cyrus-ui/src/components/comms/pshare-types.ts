/** Pshare post shape from `/api/comms/pshare/posts`. */
import type { PshareDiamondGrade } from "@shared/comms/pshare-engagement";
import type { PsharePolishPreset, PshareStudioManifest } from "@shared/comms/pshare-studio";

export type PsharePost = {
  id: string;
  authorId?: string;
  authorName?: string;
  body: string;
  linkUrl?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileMimeType?: string | null;
  postKind?: string;
  mediaManifest?: PshareStudioManifest | Record<string, unknown> | null;
  audioUrl?: string | null;
  durationSec?: number | null;
  polishPreset?: PsharePolishPreset | string | null;
  liveStreamId?: string | null;
  liveStatus?: string | null;
  broadcastSource?: string | null;
  expiresAt?: string | null;
  archivedAt?: string | null;
  hasPhoto?: boolean;
  isPhotoPriority?: boolean;
  createdAt?: string | null;
  allowComments?: boolean;
  likeCount?: number;
  likedByMe?: boolean;
  commentCount?: number;
  shareCount?: number;
  hypeCount?: number;
  recentHypeCount?: number;
  reactionCount?: number;
  reactionSummary?: Record<string, number>;
  myReaction?: string | null;
  hypedByMe?: boolean;
  trendScore?: number;
  diamondGrade?: PshareDiamondGrade;
  diamondTier?: string;
  isTrending?: boolean;
};

export type PshareComment = {
  id: string;
  authorId?: string;
  authorName?: string;
  body: string;
  createdAt?: string | null;
};

export type PsharePendingMedia = {
  fileUrl: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  previewUrl?: string;
};
