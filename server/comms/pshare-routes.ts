import { Router } from "express";
import { db } from "../db.js";
import { psharePosts, pshareComments, pshareLikes, onlineUsers, liveStreams } from "../../shared/schema";
import {
  enrichPsharePostEngagement,
  PSHARE_REACTION_EMOJIS,
  type PshareReactionEmoji,
} from "../../shared/comms/pshare-engagement.js";
import {
  adviseLiveBroadcast,
  isPsharePhotoUpload,
  isPsharePostExpired,
  psharePhotoFeedBoost,
  psharePostExpiresAt,
  pshareRetentionCutoff,
  type PshareBroadcastSource,
} from "../../shared/comms/pshare-engine.js";
import { adviseStudioProject, normalizePostKind } from "../../shared/comms/pshare-studio.js";
import { eq, and, or, desc, asc, sql, inArray, count, gte, lt, isNull, isNotNull } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

let pshareTablesReady = false;
let lastPshareArchiveAt = 0;

async function archiveExpiredPsharePosts(): Promise<number> {
  const cutoff = pshareRetentionCutoff();
  const archived = await db
    .update(psharePosts)
    .set({ archivedAt: new Date() })
    .where(and(lt(psharePosts.createdAt, cutoff), isNull(psharePosts.archivedAt)))
    .returning({ id: psharePosts.id });
  return archived.length;
}

async function maybeArchiveExpiredPsharePosts(): Promise<void> {
  const now = Date.now();
  if (now - lastPshareArchiveAt < 5 * 60 * 1000) return;
  lastPshareArchiveAt = now;
  try {
    const n = await archiveExpiredPsharePosts();
    if (n > 0) console.log(`[Pshare] archived ${n} post(s) to chat history`);
  } catch (e: any) {
    console.warn("[Pshare] archive (non-fatal):", e?.message || e);
  }
}

async function ensurePshareTables(): Promise<void> {
  if (pshareTablesReady) return;
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pshare_posts (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      author_id varchar NOT NULL,
      body text NOT NULL DEFAULT '',
      link_url varchar,
      file_url varchar,
      file_name varchar,
      file_mime_type varchar,
      post_kind varchar NOT NULL DEFAULT 'general',
      listing_title varchar,
      listing_price varchar,
      listing_currency varchar,
      visibility varchar NOT NULL DEFAULT 'all',
      allow_comments boolean NOT NULL DEFAULT true,
      allowed_user_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamp NOT NULL DEFAULT now()
    )`));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pshare_comments (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      post_id varchar NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
      author_id varchar NOT NULL,
      body text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS pshare_comments_post_id_idx ON pshare_comments(post_id)`));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pshare_likes (
      post_id varchar NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
      user_id varchar NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS pshare_posts_created_idx ON pshare_posts(created_at DESC)`));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pshare_reactions (
      post_id varchar NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
      user_id varchar NOT NULL,
      emoji varchar NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )`));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pshare_shares (
      id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
      post_id varchar NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
      user_id varchar NOT NULL,
      created_at timestamp NOT NULL DEFAULT now()
    )`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS pshare_shares_post_id_idx ON pshare_shares(post_id)`));
  await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS pshare_hypes (
      post_id varchar NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
      user_id varchar NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      PRIMARY KEY (post_id, user_id)
    )`));
  await db.execute(sql.raw(`CREATE INDEX IF NOT EXISTS pshare_hypes_created_idx ON pshare_hypes(created_at DESC)`));
  for (const alter of [
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS post_kind varchar NOT NULL DEFAULT 'general'`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_title varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_price varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_currency varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS media_manifest jsonb`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS audio_url varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS duration_sec integer`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS polish_preset varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS live_stream_id varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS live_status varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS broadcast_source varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS expires_at timestamp`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS archived_at timestamp`,
  ]) {
    try {
      await db.execute(sql.raw(alter));
    } catch (e: any) {
      console.warn("[Pshare] column migrate (non-fatal):", e?.message || e);
    }
  }
  pshareTablesReady = true;
}

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    (typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"] : null) ||
    (typeof req.headers["X-Device-Id"] === "string" ? req.headers["X-Device-Id"] : null) ||
    null
  );
}

function visibleToUserSafe(userId: string) {
  const j = JSON.stringify([userId]);
  return or(
    eq(psharePosts.visibility, "all"),
    eq(psharePosts.authorId, userId),
    and(eq(psharePosts.visibility, "selected"), sql`(${psharePosts.allowedUserIds})::jsonb @> ${j}::jsonb`)
  );
}

async function displayNameMap(userIds: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (unique.length === 0) return {};
  const rows = await db
    .select({ id: onlineUsers.id, displayName: onlineUsers.displayName })
    .from(onlineUsers)
    .where(inArray(onlineUsers.id, unique));
  const m: Record<string, string> = {};
  for (const r of rows) {
    m[r.id] = r.displayName || r.id;
  }
  for (const id of unique) {
    if (!m[id]) m[id] = id;
  }
  return m;
}

type EngagementMaps = {
  likeByPost: Record<string, number>;
  commentByPost: Record<string, number>;
  shareByPost: Record<string, number>;
  hypeByPost: Record<string, number>;
  recentHypeByPost: Record<string, number>;
  reactionByPost: Record<string, number>;
  reactionSummaryByPost: Record<string, Record<string, number>>;
  myLikes: Set<string>;
  myHypes: Set<string>;
  myReactions: Record<string, string>;
};

async function loadEngagementMaps(postIds: string[], userId: string): Promise<EngagementMaps> {
  const empty: EngagementMaps = {
    likeByPost: {},
    commentByPost: {},
    shareByPost: {},
    hypeByPost: {},
    recentHypeByPost: {},
    reactionByPost: {},
    reactionSummaryByPost: {},
    myLikes: new Set(),
    myHypes: new Set(),
    myReactions: {},
  };
  if (!postIds.length) return empty;

  const likeRows = await db
    .select({ postId: pshareLikes.postId, c: count() })
    .from(pshareLikes)
    .where(inArray(pshareLikes.postId, postIds))
    .groupBy(pshareLikes.postId);

  const commentRows = await db
    .select({ postId: pshareComments.postId, c: count() })
    .from(pshareComments)
    .where(inArray(pshareComments.postId, postIds))
    .groupBy(pshareComments.postId);

  const shareResult = await db.execute<{ post_id: string; c: string }>(sql.raw(`
    SELECT post_id, COUNT(*)::int AS c FROM pshare_shares
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
    GROUP BY post_id
  `));
  const hypeResult = await db.execute<{ post_id: string; c: string }>(sql.raw(`
    SELECT post_id, COUNT(*)::int AS c FROM pshare_hypes
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
    GROUP BY post_id
  `));
  const recentHypeResult = await db.execute<{ post_id: string; c: string }>(sql.raw(`
    SELECT post_id, COUNT(*)::int AS c FROM pshare_hypes
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
      AND created_at > now() - interval '72 hours'
    GROUP BY post_id
  `));
  const reactionCountResult = await db.execute<{ post_id: string; c: string }>(sql.raw(`
    SELECT post_id, COUNT(*)::int AS c FROM pshare_reactions
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
    GROUP BY post_id
  `));
  const reactionRows = await db.execute<{ post_id: string; emoji: string; c: string }>(sql.raw(`
    SELECT post_id, emoji, COUNT(*)::int AS c FROM pshare_reactions
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
    GROUP BY post_id, emoji
  `));

  const liked = await db
    .select({ postId: pshareLikes.postId })
    .from(pshareLikes)
    .where(and(inArray(pshareLikes.postId, postIds), eq(pshareLikes.userId, userId)));

  const hyped = await db.execute<{ post_id: string }>(sql.raw(`
    SELECT post_id FROM pshare_hypes
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
      AND user_id = '${userId.replace(/'/g, "''")}'
  `));
  const myReactionRows = await db.execute<{ post_id: string; emoji: string }>(sql.raw(`
    SELECT post_id, emoji FROM pshare_reactions
    WHERE post_id IN (${postIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",")})
      AND user_id = '${userId.replace(/'/g, "''")}'
  `));

  const likeByPost = Object.fromEntries(likeRows.map((x) => [x.postId, Number(x.c)]));
  const commentByPost = Object.fromEntries(commentRows.map((x) => [x.postId, Number(x.c)]));
  const shareByPost = Object.fromEntries(
    (shareResult.rows as { post_id: string; c: string }[]).map((x) => [x.post_id, Number(x.c)]),
  );
  const hypeByPost = Object.fromEntries(
    (hypeResult.rows as { post_id: string; c: string }[]).map((x) => [x.post_id, Number(x.c)]),
  );
  const recentHypeByPost = Object.fromEntries(
    (recentHypeResult.rows as { post_id: string; c: string }[]).map((x) => [x.post_id, Number(x.c)]),
  );
  const reactionByPost = Object.fromEntries(
    (reactionCountResult.rows as { post_id: string; c: string }[]).map((x) => [x.post_id, Number(x.c)]),
  );
  const reactionSummaryByPost: Record<string, Record<string, number>> = {};
  for (const row of reactionRows.rows as { post_id: string; emoji: string; c: string }[]) {
    if (!reactionSummaryByPost[row.post_id]) reactionSummaryByPost[row.post_id] = {};
    reactionSummaryByPost[row.post_id][row.emoji] = Number(row.c);
  }

  const myLikes = new Set(liked.map((l) => l.postId));
  const myHypes = new Set((hyped.rows as { post_id: string }[]).map((r) => r.post_id));
  const myReactions: Record<string, string> = {};
  for (const r of myReactionRows.rows as { post_id: string; emoji: string }[]) {
    myReactions[r.post_id] = r.emoji;
  }

  return {
    likeByPost,
    commentByPost,
    shareByPost,
    hypeByPost,
    recentHypeByPost,
    reactionByPost,
    reactionSummaryByPost,
    myLikes,
    myHypes,
    myReactions,
  };
}

function mapPostRow(
  p: (typeof psharePosts.$inferSelect),
  names: Record<string, string>,
  maps: EngagementMaps,
) {
  const likeCount = maps.likeByPost[p.id] || 0;
  const commentCount = maps.commentByPost[p.id] || 0;
  const shareCount = maps.shareByPost[p.id] || 0;
  const hypeCount = maps.hypeByPost[p.id] || 0;
  const reactionCount = maps.reactionByPost[p.id] || 0;
  const recentHypeCount = maps.recentHypeByPost[p.id] || 0;
  const base = {
    id: p.id,
    authorId: p.authorId,
    authorName: names[p.authorId] || p.authorId,
    body: p.body,
    linkUrl: p.linkUrl,
    fileUrl: p.fileUrl,
    fileName: p.fileName,
    fileMimeType: p.fileMimeType,
    postKind: p.postKind || "general",
    listingTitle: p.listingTitle ?? null,
    listingPrice: p.listingPrice ?? null,
    listingCurrency: p.listingCurrency ?? null,
    mediaManifest: (p.mediaManifest as Record<string, unknown>) ?? null,
    audioUrl: p.audioUrl ?? null,
    durationSec: p.durationSec ?? null,
    polishPreset: p.polishPreset ?? null,
    liveStreamId: p.liveStreamId ?? null,
    liveStatus: p.liveStatus ?? null,
    broadcastSource: p.broadcastSource ?? null,
    expiresAt:
      p.expiresAt instanceof Date
        ? p.expiresAt.toISOString()
        : p.expiresAt ?? psharePostExpiresAt(p.createdAt).toISOString(),
    archivedAt: p.archivedAt instanceof Date ? p.archivedAt.toISOString() : p.archivedAt ?? null,
    hasPhoto: isPsharePhotoUpload(p.fileName, p.fileMimeType),
    isPhotoPriority: isPsharePhotoUpload(p.fileName, p.fileMimeType),
    visibility: p.visibility,
    allowComments: p.allowComments,
    allowedUserIds: (p.allowedUserIds as string[]) || [],
    createdAt: p.createdAt,
    likeCount,
    likedByMe: maps.myLikes.has(p.id),
    commentCount,
    shareCount,
    hypeCount,
    recentHypeCount,
    reactionCount,
    reactionSummary: maps.reactionSummaryByPost[p.id] || {},
    myReaction: maps.myReactions[p.id] || null,
    hypedByMe: maps.myHypes.has(p.id),
  };
  return enrichPsharePostEngagement(base, {
    likeCount,
    commentCount,
    shareCount,
    hypeCount,
    reactionCount,
    recentHypeCount,
  });
}

async function assertPostVisible(postId: string, userId: string): Promise<boolean> {
  const canSee = await db
    .select({ id: psharePosts.id })
    .from(psharePosts)
    .where(and(eq(psharePosts.id, postId), visibleToUserSafe(userId)))
    .limit(1);
  return canSee.length > 0;
}

router.use(async (_req, res, next) => {
  try {
    await ensurePshareTables();
    await maybeArchiveExpiredPsharePosts();
    next();
  } catch (e: any) {
    console.error("[Pshare] ensure tables:", e);
    res.status(503).json({ error: "Pshare storage unavailable" });
  }
});

router.get("/api/comms/pshare/posts", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const cutoff = pshareRetentionCutoff();
    const rows = await db
      .select()
      .from(psharePosts)
      .where(
        and(
          visibleToUserSafe(userId),
          isNull(psharePosts.archivedAt),
          gte(psharePosts.createdAt, cutoff),
        ),
      )
      .orderBy(desc(psharePosts.createdAt))
      .limit(200);

    const ids = rows.map((r) => r.id);
    const maps = await loadEngagementMaps(ids, userId);
    const authorIds = rows.map((r) => r.authorId);
    const names = await displayNameMap(authorIds);

    const posts = rows
      .map((p) => mapPostRow(p, names, maps))
      .sort(
        (a, b) =>
          b.trendScore +
          psharePhotoFeedBoost(b.fileName, b.fileMimeType) -
          (a.trendScore + psharePhotoFeedBoost(a.fileName, a.fileMimeType)) ||
          Number(new Date(b.createdAt)) - Number(new Date(a.createdAt)),
      );

    res.json({ posts, retentionHours: 24 });
  } catch (e: any) {
    console.error("[Pshare] list posts:", e);
    res.status(500).json({ error: "Failed to load posts" });
  }
});

router.get("/api/comms/pshare/history", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  try {
    const rows = await db
      .select()
      .from(psharePosts)
      .where(and(visibleToUserSafe(userId), isNotNull(psharePosts.archivedAt)))
      .orderBy(desc(psharePosts.archivedAt))
      .limit(200);

    const ids = rows.map((r) => r.id);
    const maps = await loadEngagementMaps(ids, userId);
    const authorIds = rows.map((r) => r.authorId);
    const names = await displayNameMap(authorIds);

    const posts = rows.map((p) => mapPostRow(p, names, maps));

    res.json({ posts, label: "Chat history", retentionHours: 24 });
  } catch (e: any) {
    console.error("[Pshare] list history:", e);
    res.status(500).json({ error: "Failed to load chat history" });
  }
});
router.post("/api/comms/pshare/live/start", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });

  const body = req.body || {};
  const caption = String(body.caption || body.body || "").trim();
  const sourceRaw = String(body.source || body.broadcastSource || "mobile_camera").toLowerCase();
  const source: PshareBroadcastSource =
    sourceRaw === "drone" ? "drone" : sourceRaw === "webcam" ? "webcam" : "mobile_camera";
  const droneUrl = body.droneUrl || body.sourceUrl ? String(body.droneUrl || body.sourceUrl).trim() : "";
  const streamName = String(body.streamName || caption || "Pshare live").trim() || "Pshare live";

  if (source === "drone" && !droneUrl) {
    return res.status(400).json({ error: "Drone feed URL is required (RTSP or HLS)." });
  }

  const advice = adviseLiveBroadcast({ source });
  const streamId = randomUUID();
  const expiresAt = psharePostExpiresAt(new Date());
  const liveSourceType = source === "drone" ? "drone" : source === "webcam" ? "webcam" : "mobile_camera";

  try {
    const names = await displayNameMap([userId]);
    const broadcasterName = names[userId] || userId;

    await db.insert(liveStreams).values({
      streamId,
      streamName,
      sourceType: liveSourceType,
      sourceUrl: source === "drone" ? droneUrl : null,
      broadcasterId: userId,
      broadcasterName,
      viewers: [],
      status: "active",
      quality: source === "drone" ? "1080p" : "720p",
    });

    const [inserted] = await db
      .insert(psharePosts)
      .values({
        authorId: userId,
        body: caption || (source === "drone" ? "Drone live broadcast" : "Live from mobile camera"),
        linkUrl: source === "drone" ? droneUrl : null,
        fileUrl: source === "drone" ? droneUrl : null,
        fileName: source === "drone" ? "drone-feed" : null,
        fileMimeType: source === "drone" ? "application/x-pshare-live" : "video/webm",
        postKind: "live",
        liveStreamId: streamId,
        liveStatus: "live",
        broadcastSource: source,
        expiresAt,
        visibility: "all",
        allowComments: true,
        allowedUserIds: [],
        mediaManifest: {
          source,
          profile: advice.profile,
          tips: advice.tips,
        },
      })
      .returning();

    const maps = await loadEngagementMaps([inserted.id], userId);
    res.json({
      post: mapPostRow(inserted, names, maps),
      streamId,
      advice,
    });
  } catch (e: any) {
    console.error("[Pshare] live start:", e);
    res.status(500).json({ error: "Failed to start live broadcast" });
  }
});

router.post("/api/comms/pshare/live/:postId/chunk", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const { postId } = req.params;
  const { fileUrl, fileName, fileMimeType } = req.body || {};
  if (!fileUrl) return res.status(400).json({ error: "fileUrl required" });

  try {
    const [row] = await db.select().from(psharePosts).where(eq(psharePosts.id, postId)).limit(1);
    if (!row || row.authorId !== userId) return res.status(404).json({ error: "Not found" });
    if (row.postKind !== "live" || row.liveStatus !== "live") {
      return res.status(400).json({ error: "Post is not an active live broadcast" });
    }

    const [updated] = await db
      .update(psharePosts)
      .set({
        fileUrl: String(fileUrl).trim(),
        fileName: fileName ? String(fileName) : row.fileName,
        fileMimeType: fileMimeType ? String(fileMimeType) : row.fileMimeType || "video/webm",
      })
      .where(eq(psharePosts.id, postId))
      .returning();

    const names = await displayNameMap([userId]);
    const maps = await loadEngagementMaps([postId], userId);
    res.json({ post: mapPostRow(updated, names, maps) });
  } catch (e: any) {
    console.error("[Pshare] live chunk:", e);
    res.status(500).json({ error: "Failed to update live segment" });
  }
});

router.post("/api/comms/pshare/live/:postId/stop", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const { postId } = req.params;
  const { fileUrl, fileName, fileMimeType, recordingUrl } = req.body || {};

  try {
    const [row] = await db.select().from(psharePosts).where(eq(psharePosts.id, postId)).limit(1);
    if (!row || row.authorId !== userId) return res.status(404).json({ error: "Not found" });

    if (row.liveStreamId) {
      await db
        .update(liveStreams)
        .set({
          status: "ended",
          endTime: new Date(),
          recordingUrl: recordingUrl ? String(recordingUrl) : null,
        })
        .where(eq(liveStreams.streamId, row.liveStreamId));
    }

    const [updated] = await db
      .update(psharePosts)
      .set({
        liveStatus: "ended",
        fileUrl: fileUrl ? String(fileUrl).trim() : row.fileUrl,
        fileName: fileName ? String(fileName) : row.fileName,
        fileMimeType: fileMimeType ? String(fileMimeType) : row.fileMimeType,
      })
      .where(eq(psharePosts.id, postId))
      .returning();

    const names = await displayNameMap([userId]);
    const maps = await loadEngagementMaps([postId], userId);
    res.json({ post: mapPostRow(updated, names, maps) });
  } catch (e: any) {
    console.error("[Pshare] live stop:", e);
    res.status(500).json({ error: "Failed to stop live broadcast" });
  }
});

router.get("/api/comms/pshare/posts/:id", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const { id } = req.params;
  try {
    const [row] = await db.select().from(psharePosts).where(eq(psharePosts.id, id)).limit(1);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    if (isPsharePostExpired(row.createdAt) && !row.archivedAt) {
      return res.status(404).json({ error: "Post expired" });
    }
    const canSee = await db
      .select({ id: psharePosts.id })
      .from(psharePosts)
      .where(and(eq(psharePosts.id, id), visibleToUserSafe(userId)))
      .limit(1);
    if (!canSee.length) {
      return res.status(404).json({ error: "Not found" });
    }
    const names = await displayNameMap([row.authorId]);
    const maps = await loadEngagementMaps([id], userId);
    res.json({ post: mapPostRow(row, names, maps) });
  } catch (e: any) {
    console.error("[Pshare] get post:", e);
    res.status(500).json({ error: "Failed to load post" });
  }
});

router.post("/api/comms/pshare/posts", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const {
    body = "",
    linkUrl = null,
    fileUrl = null,
    fileName = null,
    fileMimeType = null,
    postKind: postKindIn = "general",
    listingTitle: listingTitleIn = null,
    listingPrice: listingPriceIn = null,
    listingCurrency: listingCurrencyIn = null,
    mediaManifest = null,
    audioUrl = null,
    durationSec = null,
    polishPreset = null,
    visibility = "all",
    allowComments = true,
    allowedUserIds = [],
  } = req.body || {};

  const v = visibility === "selected" ? "selected" : "all";
  const list: string[] = Array.isArray(allowedUserIds)
    ? allowedUserIds.map((x: unknown) => String(x)).filter((x) => x && x !== userId)
    : [];

  if (v === "selected" && list.length === 0) {
    return res.status(400).json({ error: "Select at least one user for a private audience, or use Everyone." });
  }

  const text = String(body || "").trim();
  const link = linkUrl ? String(linkUrl).trim() : "";
  const hasFile = !!(fileUrl && String(fileUrl).trim());
  const postKindRaw = String(postKindIn || "general").toLowerCase();
  const postKind = normalizePostKind(
    postKindRaw === "listing" ? "listing" : postKindRaw,
  );
  const listingTitle = postKind === "listing" ? String(listingTitleIn || "").trim() : "";
  const listingPrice = postKind === "listing" ? String(listingPriceIn || "").trim() : "";
  const listingCurrency = postKind === "listing" ? String(listingCurrencyIn || "").trim() : "";
  const hasListingFields = postKind === "listing" && !!(listingTitle || listingPrice);
  const manifest =
    mediaManifest && typeof mediaManifest === "object" ? mediaManifest : null;
  const photoPriority = isPsharePhotoUpload(fileName, fileMimeType);
  const mergedManifest =
    photoPriority && manifest
      ? { ...manifest, mediaPriority: "photo" }
      : photoPriority
        ? { mediaPriority: "photo" }
        : manifest;
  if (!text && !link && !hasFile && !hasListingFields) {
    return res.status(400).json({
      error:
        postKind === "listing"
          ? "Add a title or price, or include a description, link, or photo."
          : "Add text, a link, or an attachment.",
    });
  }

  try {
    const allowed = v === "selected" ? [...new Set([...list, userId])] : [];
    const expiresAt = psharePostExpiresAt(new Date());
    const [inserted] = await db
      .insert(psharePosts)
      .values({
        authorId: userId,
        body: text,
        linkUrl: link || null,
        fileUrl: fileUrl ? String(fileUrl).trim() : null,
        fileName: fileName ? String(fileName) : null,
        fileMimeType: fileMimeType ? String(fileMimeType) : null,
        postKind,
        listingTitle: listingTitle || null,
        listingPrice: listingPrice || null,
        listingCurrency: listingCurrency || null,
        mediaManifest: mergedManifest,
        audioUrl: audioUrl ? String(audioUrl).trim() : null,
        durationSec: durationSec != null ? Number(durationSec) || null : null,
        polishPreset: polishPreset ? String(polishPreset) : null,
        expiresAt,
        visibility: v,
        allowComments: !!allowComments,
        allowedUserIds: v === "selected" ? allowed : [],
      })
      .returning();

    const names = await displayNameMap([userId]);
    const maps = await loadEngagementMaps([inserted.id], userId);
    res.json({ post: mapPostRow(inserted, names, maps) });
  } catch (e: any) {
    console.error("[Pshare] create post:", e);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.delete("/api/comms/pshare/posts/:id", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const { id } = req.params;
  try {
    const [row] = await db.select().from(psharePosts).where(eq(psharePosts.id, id)).limit(1);
    if (!row) {
      return res.status(404).json({ error: "Not found" });
    }
    if (row.authorId !== userId) {
      return res.status(403).json({ error: "Only the author can delete this post" });
    }
    await db.delete(psharePosts).where(eq(psharePosts.id, id));
    res.json({ success: true });
  } catch (e: any) {
    console.error("[Pshare] delete post:", e);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.get("/api/comms/pshare/posts/:id/comments", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const { id } = req.params;
  try {
    const canSee = await db
      .select()
      .from(psharePosts)
      .where(and(eq(psharePosts.id, id), visibleToUserSafe(userId)))
      .limit(1);
    if (!canSee.length) {
      return res.status(404).json({ error: "Not found" });
    }
    const comments = await db
      .select()
      .from(pshareComments)
      .where(eq(pshareComments.postId, id))
      .orderBy(asc(pshareComments.createdAt));

    const names = await displayNameMap(comments.map((c) => c.authorId));
    res.json({
      comments: comments.map((c) => ({
        id: c.id,
        authorId: c.authorId,
        authorName: names[c.authorId] || c.authorId,
        body: c.body,
        createdAt: c.createdAt,
      })),
    });
  } catch (e: any) {
    console.error("[Pshare] list comments:", e);
    res.status(500).json({ error: "Failed to load comments" });
  }
});

router.post("/api/comms/pshare/posts/:id/comments", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const { id } = req.params;
  const text = String(req.body?.body || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Comment cannot be empty" });
  }
  try {
    const [post] = await db.select().from(psharePosts).where(eq(psharePosts.id, id)).limit(1);
    if (!post) {
      return res.status(404).json({ error: "Not found" });
    }
    const canSee = await db
      .select()
      .from(psharePosts)
      .where(and(eq(psharePosts.id, id), visibleToUserSafe(userId)))
      .limit(1);
    if (!canSee.length) {
      return res.status(404).json({ error: "Not found" });
    }
    if (!post.allowComments) {
      return res.status(403).json({ error: "Comments are disabled for this post" });
    }
    const [inserted] = await db
      .insert(pshareComments)
      .values({ postId: id, authorId: userId, body: text })
      .returning();
    const names = await displayNameMap([userId]);
    res.json({
      comment: {
        id: inserted.id,
        authorId: inserted.authorId,
        authorName: names[inserted.authorId] || inserted.authorId,
        body: inserted.body,
        createdAt: inserted.createdAt,
      },
    });
  } catch (e: any) {
    console.error("[Pshare] add comment:", e);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

router.post("/api/comms/pshare/studio/advise", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const body = req.body || {};
  const mode = body.mode === "clip" ? "clip" : "story";
  const slideCount = Math.max(0, Number(body.slideCount) || 0);
  const audioDurationSec = body.audioDurationSec != null ? Number(body.audioDurationSec) : undefined;
  const imageCount = Math.max(0, Number(body.imageCount) || 0);
  const videoCount = Math.max(0, Number(body.videoCount) || 0);
  const advice = adviseStudioProject({
    mode,
    slideCount,
    audioDurationSec: Number.isFinite(audioDurationSec) ? audioDurationSec : undefined,
    imageCount,
    videoCount,
  });
  res.json({ advice });
});

router.post("/api/comms/pshare/posts/:id/like", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const { id } = req.params;
  try {
    if (!(await assertPostVisible(id, userId))) {
      return res.status(404).json({ error: "Not found" });
    }
    const existing = await db
      .select()
      .from(pshareLikes)
      .where(and(eq(pshareLikes.postId, id), eq(pshareLikes.userId, userId)))
      .limit(1);
    if (existing.length) {
      await db.delete(pshareLikes).where(and(eq(pshareLikes.postId, id), eq(pshareLikes.userId, userId)));
    } else {
      await db.insert(pshareLikes).values({ postId: id, userId });
    }
    const maps = await loadEngagementMaps([id], userId);
    const liked = !existing.length;
    res.json({
      liked,
      likeCount: maps.likeByPost[id] || 0,
      diamondGrade: computeDiamondForPost(id, maps),
    });
  } catch (e: any) {
    console.error("[Pshare] like:", e);
    res.status(500).json({ error: "Failed to update like" });
  }
});

function computeDiamondForPost(postId: string, maps: EngagementMaps) {
  return enrichPsharePostEngagement(
    { createdAt: new Date() },
    {
      likeCount: maps.likeByPost[postId] || 0,
      commentCount: maps.commentByPost[postId] || 0,
      shareCount: maps.shareByPost[postId] || 0,
      hypeCount: maps.hypeByPost[postId] || 0,
      reactionCount: maps.reactionByPost[postId] || 0,
      recentHypeCount: maps.recentHypeByPost[postId] || 0,
    },
  ).diamondGrade;
}

router.post("/api/comms/pshare/posts/:id/reaction", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const { id } = req.params;
  const emoji = String(req.body?.emoji || "").trim();
  if (!PSHARE_REACTION_EMOJIS.includes(emoji as PshareReactionEmoji)) {
    return res.status(400).json({ error: "Invalid reaction emoji" });
  }
  try {
    if (!(await assertPostVisible(id, userId))) {
      return res.status(404).json({ error: "Not found" });
    }
    const existing = await db.execute<{ emoji: string }>(sql.raw(`
      SELECT emoji FROM pshare_reactions
      WHERE post_id = '${id.replace(/'/g, "''")}' AND user_id = '${userId.replace(/'/g, "''")}'
      LIMIT 1
    `));
    const prev = (existing.rows[0] as { emoji: string } | undefined)?.emoji;
    if (prev === emoji) {
      await db.execute(sql.raw(`
        DELETE FROM pshare_reactions
        WHERE post_id = '${id.replace(/'/g, "''")}' AND user_id = '${userId.replace(/'/g, "''")}'
      `));
    } else if (prev) {
      await db.execute(sql.raw(`
        UPDATE pshare_reactions SET emoji = '${emoji.replace(/'/g, "''")}', created_at = now()
        WHERE post_id = '${id.replace(/'/g, "''")}' AND user_id = '${userId.replace(/'/g, "''")}'
      `));
    } else {
      await db.execute(sql.raw(`
        INSERT INTO pshare_reactions (post_id, user_id, emoji)
        VALUES ('${id.replace(/'/g, "''")}', '${userId.replace(/'/g, "''")}', '${emoji.replace(/'/g, "''")}')
      `));
    }
    const maps = await loadEngagementMaps([id], userId);
    res.json({
      myReaction: maps.myReactions[id] || null,
      reactionSummary: maps.reactionSummaryByPost[id] || {},
      reactionCount: maps.reactionByPost[id] || 0,
      diamondGrade: computeDiamondForPost(id, maps),
    });
  } catch (e: any) {
    console.error("[Pshare] reaction:", e);
    res.status(500).json({ error: "Failed to update reaction" });
  }
});

router.post("/api/comms/pshare/posts/:id/share", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const { id } = req.params;
  try {
    if (!(await assertPostVisible(id, userId))) {
      return res.status(404).json({ error: "Not found" });
    }
    await db.execute(sql.raw(`
      INSERT INTO pshare_shares (post_id, user_id)
      VALUES ('${id.replace(/'/g, "''")}', '${userId.replace(/'/g, "''")}')
    `));
    const maps = await loadEngagementMaps([id], userId);
    res.json({
      shareCount: maps.shareByPost[id] || 0,
      diamondGrade: computeDiamondForPost(id, maps),
    });
  } catch (e: any) {
    console.error("[Pshare] share:", e);
    res.status(500).json({ error: "Failed to record share" });
  }
});

router.post("/api/comms/pshare/posts/:id/hype", async (req: any, res) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const { id } = req.params;
  try {
    if (!(await assertPostVisible(id, userId))) {
      return res.status(404).json({ error: "Not found" });
    }
    const existing = await db.execute(sql.raw(`
      SELECT 1 FROM pshare_hypes
      WHERE post_id = '${id.replace(/'/g, "''")}' AND user_id = '${userId.replace(/'/g, "''")}'
      LIMIT 1
    `));
    const had = existing.rows.length > 0;
    if (had) {
      await db.execute(sql.raw(`
        DELETE FROM pshare_hypes
        WHERE post_id = '${id.replace(/'/g, "''")}' AND user_id = '${userId.replace(/'/g, "''")}'
      `));
    } else {
      await db.execute(sql.raw(`
        INSERT INTO pshare_hypes (post_id, user_id)
        VALUES ('${id.replace(/'/g, "''")}', '${userId.replace(/'/g, "''")}')
      `));
    }
    const maps = await loadEngagementMaps([id], userId);
    res.json({
      hyped: !had,
      hypeCount: maps.hypeByPost[id] || 0,
      recentHypeCount: maps.recentHypeByPost[id] || 0,
      isTrending: enrichPsharePostEngagement(
        { createdAt: new Date() },
        {
          likeCount: maps.likeByPost[id] || 0,
          commentCount: maps.commentByPost[id] || 0,
          shareCount: maps.shareByPost[id] || 0,
          hypeCount: maps.hypeByPost[id] || 0,
          reactionCount: maps.reactionByPost[id] || 0,
          recentHypeCount: maps.recentHypeByPost[id] || 0,
        },
      ).isTrending,
      diamondGrade: computeDiamondForPost(id, maps),
    });
  } catch (e: any) {
    console.error("[Pshare] hype:", e);
    res.status(500).json({ error: "Failed to update hype" });
  }
});

export const pshareRouter = router;
