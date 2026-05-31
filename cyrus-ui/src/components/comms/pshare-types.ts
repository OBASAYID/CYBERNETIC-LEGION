/** Pshare post shape from `/api/comms/pshare/posts`. */
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
  createdAt?: string | null;
  likeCount?: number;
  commentCount?: number;
};

export type PsharePendingMedia = {
  fileUrl: string;
  fileName: string;
  fileMimeType: string;
  fileSize: number;
  previewUrl?: string;
};
