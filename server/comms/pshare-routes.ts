import { Router } from "express";
import { db } from "../db.js";
import { psharePosts, pshareComments, pshareLikes, onlineUsers } from "../../shared/schema";
import { eq, and, or, desc, asc, sql, inArray, count } from "drizzle-orm";

const router = Router();

let pshareTablesReady = false;

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
  for (const alter of [
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS post_kind varchar NOT NULL DEFAULT 'general'`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_title varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_price varchar`,
    `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_currency varchar`,
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

router.use(async (_req, res, next) => {
  try {
    await ensurePshareTables();
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
    const rows = await db
      .select()
      .from(psharePosts)
      .where(visibleToUserSafe(userId))
      .orderBy(desc(psharePosts.createdAt))
      .limit(200);

    const ids = rows.map((r) => r.id);
    let likeRows: { postId: string; c: number }[] = [];
    let commentRows: { postId: string; c: number }[] = [];
    const myLikes = new Set<string>();

    if (ids.length) {
      likeRows = await db
        .select({ postId: pshareLikes.postId, c: count() })
        .from(pshareLikes)
        .where(inArray(pshareLikes.postId, ids))
        .groupBy(pshareLikes.postId);

      commentRows = await db
        .select({ postId: pshareComments.postId, c: count() })
        .from(pshareComments)
        .where(inArray(pshareComments.postId, ids))
        .groupBy(pshareComments.postId);

      const liked = await db
        .select({ postId: pshareLikes.postId })
        .from(pshareLikes)
        .where(and(inArray(pshareLikes.postId, ids), eq(pshareLikes.userId, userId)));
      for (const l of liked) myLikes.add(l.postId);
    }

    const likeByPost = Object.fromEntries(likeRows.map((x) => [x.postId, Number(x.c)]));
    const commentByPost = Object.fromEntries(commentRows.map((x) => [x.postId, Number(x.c)]));

    const authorIds = rows.map((r) => r.authorId);
    const names = await displayNameMap(authorIds);

    res.json({
      posts: rows.map((p) => ({
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
        visibility: p.visibility,
        allowComments: p.allowComments,
        allowedUserIds: (p.allowedUserIds as string[]) || [],
        createdAt: p.createdAt,
        likeCount: likeByPost[p.id] || 0,
        likedByMe: myLikes.has(p.id),
        commentCount: commentByPost[p.id] || 0,
      })),
    });
  } catch (e: any) {
    console.error("[Pshare] list posts:", e);
    res.status(500).json({ error: "Failed to load posts" });
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
    const canSee = await db
      .select({ id: psharePosts.id })
      .from(psharePosts)
      .where(and(eq(psharePosts.id, id), visibleToUserSafe(userId)))
      .limit(1);
    if (!canSee.length) {
      return res.status(404).json({ error: "Not found" });
    }
    const names = await displayNameMap([row.authorId]);
    const [lc] = await db
      .select({ c: count() })
      .from(pshareLikes)
      .where(eq(pshareLikes.postId, id));
    const [meL] = await db
      .select()
      .from(pshareLikes)
      .where(and(eq(pshareLikes.postId, id), eq(pshareLikes.userId, userId)))
      .limit(1);
    res.json({
      post: {
        id: row.id,
        authorId: row.authorId,
        authorName: names[row.authorId] || row.authorId,
        body: row.body,
        linkUrl: row.linkUrl,
        fileUrl: row.fileUrl,
        fileName: row.fileName,
        fileMimeType: row.fileMimeType,
        postKind: row.postKind || "general",
        listingTitle: row.listingTitle ?? null,
        listingPrice: row.listingPrice ?? null,
        listingCurrency: row.listingCurrency ?? null,
        visibility: row.visibility,
        allowComments: row.allowComments,
        allowedUserIds: (row.allowedUserIds as string[]) || [],
        createdAt: row.createdAt,
        likeCount: Number(lc?.c || 0),
        likedByMe: !!meL,
      },
    });
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
  const postKind = String(postKindIn || "general").toLowerCase() === "listing" ? "listing" : "general";
  const listingTitle = postKind === "listing" ? String(listingTitleIn || "").trim() : "";
  const listingPrice = postKind === "listing" ? String(listingPriceIn || "").trim() : "";
  const listingCurrency = postKind === "listing" ? String(listingCurrencyIn || "").trim() : "";
  const hasListingFields = postKind === "listing" && !!(listingTitle || listingPrice);
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
        visibility: v,
        allowComments: !!allowComments,
        allowedUserIds: v === "selected" ? allowed : [],
      })
      .returning();

    const names = await displayNameMap([userId]);
    res.json({
      post: {
        id: inserted.id,
        authorId: inserted.authorId,
        authorName: names[inserted.authorId] || inserted.authorId,
        body: inserted.body,
        linkUrl: inserted.linkUrl,
        fileUrl: inserted.fileUrl,
        fileName: inserted.fileName,
        fileMimeType: inserted.fileMimeType,
        postKind: inserted.postKind || "general",
        listingTitle: inserted.listingTitle ?? null,
        listingPrice: inserted.listingPrice ?? null,
        listingCurrency: inserted.listingCurrency ?? null,
        visibility: inserted.visibility,
        allowComments: inserted.allowComments,
        allowedUserIds: (inserted.allowedUserIds as string[]) || [],
        createdAt: inserted.createdAt,
        likeCount: 0,
        likedByMe: false,
        commentCount: 0,
      },
    });
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

router.post("/api/comms/pshare/posts/:id/like", async (req: any, res) => {
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
    const [lc] = await db
      .select({ c: count() })
      .from(pshareLikes)
      .where(eq(pshareLikes.postId, id));
    const liked = !existing.length;
    res.json({ liked, likeCount: Number(lc?.c || 0) });
  } catch (e: any) {
    console.error("[Pshare] like:", e);
    res.status(500).json({ error: "Failed to update like" });
  }
});

export const pshareRouter = router;
