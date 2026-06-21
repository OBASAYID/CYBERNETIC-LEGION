import { Router } from "express";
import { db } from "../db.js";
import { onlineUsers, directMessages, callHistory, meetingRooms, reminders, newsItems, contacts, incomingCalls, groupChats, callSessions, liveStreams, sharedMedia, callMessages } from "../../shared/schema";
import { commsInteractionEvents } from "../../shared/models/comms.js";
import { eq, or, and, desc, asc, ilike, inArray, sql, isNotNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";
import { getConnectedUsers } from "./signaling.js";
import { communicationEngine } from "./communication-engine.js";
import { commsIntelligence } from "./comms-intelligence.js";
import { refreshCommsUserAvatar, getLiveCommsUserIds, getCommsRuntimeMetrics, getActiveCalls } from "./socket-signaling.js";
import {
  parseDeviceInfo,
  mergeDeviceInfoForOnlineTransition,
  setLocationShareEnabled,
  persistLastKnownLocation,
  invalidateLocationShareCache,
} from "./comms-profile-persist.js";
import { pshareRouter } from "./pshare-routes.js";
import { gwaRouter } from "./gwa-routes.js";
import { groupCallIntelligenceRouter } from "./group-call-intelligence-routes.js";
import { pushCallRouter } from "./push-routes.js";
import { getDeliveryHubStats, deleteChatMessage } from "./delivery-hub.js";
import { getCyrusCommWebRtcConfigResponse } from "./cyrus-comm-config.js";
import {
  completeChunkUpload,
  getChunkUploadSession,
  getCommsChunkSizeBytes,
  getCommsChunksDir,
  getCommsMaxUploadBytes,
  initChunkUpload,
  writeUploadChunk,
} from "./comms-chunk-upload.js";
import { serveCommsMediaWithRange } from "./comms-media-serve.js";
import {
  avatarImageExtensionForSave,
  isAllowedAvatarImage,
} from "../../shared/comms/avatar-image-formats.js";
import { AVATAR_SERVE_MIME } from "../../shared/comms/avatar-image-formats.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { resolveCommsRecordingsDir, resolveCommsUploadDir, unlinkCommsMediaFile } from "./upload-paths.js";

const COMMS_UPLOAD_DIR = resolveCommsUploadDir();
const COMMS_RECORDINGS_DIR = resolveCommsRecordingsDir(COMMS_UPLOAD_DIR);

const commsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COMMS_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const uniqueName = `${Date.now()}-${uuid()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
});

const recordingUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COMMS_RECORDINGS_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".webm";
      cb(null, `recording-${Date.now()}-${uuid()}${ext}`);
    },
  }),
  limits: { fileSize: 512 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype.startsWith("audio/") ||
      file.mimetype.startsWith("video/") ||
      file.mimetype === "application/octet-stream";
    cb(null, ok);
  },
});

/** Served with correct Content-Type so PDF/HTML open in-browser; ?download=1 forces attachment. */
const COMMS_SERVE_MIME: Record<string, string> = {
  ".pdf": "application/pdf",
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xml": "application/xml",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".zip": "application/zip",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".svgz": "image/svg+xml",
  ".ico": "image/x-icon",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".avif": "image/avif",
  ".jfif": "image/jpeg",
  ".apng": "image/png",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".m4a": "audio/mp4",
  ".m4b": "audio/mp4",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".wmv": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mpeg": "video/mpeg",
  ".mpg": "video/mpeg",
  ".3gp": "video/3gpp",
  ".epub": "application/epub+zip",
  ".mobi": "application/x-mobipocket-ebook",
  ".azw": "application/vnd.amazon.ebook",
  ".azw3": "application/vnd.amazon.ebook",
  ".fb2": "application/x-fictionbook+xml",
  ".opus": "audio/opus",
  ".flac": "audio/flac",
  ".wma": "audio/x-ms-wma",
  ".7z": "application/x-7z-compressed",
  ".rar": "application/vnd.rar",
  ".tar": "application/x-tar",
  ".gz": "application/gzip",
  ".bz2": "application/x-bzip2",
  ".rtf": "application/rtf",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".aac": "audio/aac",
  ".stl": "model/stl",
  ".obj": "model/obj",
  ".step": "application/step",
  ".stp": "application/step",
  ".iges": "model/iges",
  ".igs": "model/iges",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".ply": "application/ply",
  ".3mf": "application/3mf",
  ".fbx": "application/octet-stream",
  ".dae": "model/vnd.collada+xml",
  ".x_t": "application/octet-stream",
  ".x_b": "application/octet-stream",
  ".sldprt": "application/octet-stream",
  ".sldasm": "application/octet-stream",
  ".slddrw": "application/octet-stream",
  ".jt": "application/octet-stream",
  ".amf": "application/amf+xml",
  ".off": "application/octet-stream",
  ".wrl": "model/vrml",
  ".vrml": "model/vrml",
};

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COMMS_UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = avatarImageExtensionForSave(file.originalname, file.mimetype);
      const uniqueName = `avatar-${Date.now()}-${uuid()}${ext}`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 16 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedAvatarImage(file.originalname, file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Unsupported image type. Use JPG, PNG, WebP, GIF, HEIC, AVIF, SVG, or other common photo formats.",
        ),
      );
    }
  },
});

const voiceNoteUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COMMS_UPLOAD_DIR),
    filename: (_req, _file, cb) => {
      const uniqueName = `${Date.now()}-${uuid()}.webm`;
      cb(null, uniqueName);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("audio/")) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

const chunkUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getCommsChunkSizeBytes() + 1024 * 1024 },
});

const router = Router();

function getUserId(req: any): string | null {
  // Prefer per-device identity for comms so two devices on the same account
  // can exchange direct chat/call payloads without colliding on account id.
  const deviceIdHeader =
    (typeof req.headers["x-device-id"] === "string" ? req.headers["x-device-id"] : null) ||
    (typeof req.headers["X-Device-Id"] === "string" ? req.headers["X-Device-Id"] : null);
  if (deviceIdHeader && deviceIdHeader.trim()) return deviceIdHeader.trim();

  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

/** Account/comms user id for persisted chat threads (matches socket senderId). */
function getMessageActorId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"].trim() : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"].trim() : null) ||
    getUserId(req)
  );
}

router.get("/api/comms/delivery/stats", (_req, res) => {
  res.json(getDeliveryHubStats());
});

router.get("/api/comms/users", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const users = await db.select().from(onlineUsers).where(eq(onlineUsers.isOnline, true));
    const wsConnectedUsers = getConnectedUsers();
    const dbById = new Map(users.map((u) => [u.id, u]));

    for (const wsUser of wsConnectedUsers) {
      if (!dbById.has(wsUser.id)) {
        dbById.set(wsUser.id, {
          id: wsUser.id,
          displayName: wsUser.displayName,
          email: null,
          profileImageUrl: null,
          lastSeen: wsUser.lastActivity,
          isOnline: true,
          socketId: null,
          status: wsUser.inCall ? "in_call" : "online",
          location: null,
          deviceInfo: null,
        } as any);
      }
    }

    const filteredUsers = Array.from(dbById.values()).filter((u) => u.id !== userId);
    res.json(filteredUsers);
  } catch (error: any) {
    const isTableMissing = error?.message?.includes("does not exist") || error?.code === "42P01";
    if (isTableMissing) {
      console.warn("[Comms] online_users table not ready yet — returning empty list");
      return res.json([]);
    }
    console.error("Error fetching online users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.get("/api/comms/users/all", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const includeSelf = String(req.query.includeSelf) === "1" || String(req.query.includeSelf) === "true";
    const allUsers = await db.select().from(onlineUsers);
    const liveCommsIds = getLiveCommsUserIds();
    const wsConnectedUsers = getConnectedUsers();
    const wsLiveIds = new Set(wsConnectedUsers.map((u) => u.id));
    const liveIds = new Set<string>([...Array.from(liveCommsIds), ...Array.from(wsLiveIds)]);

    const mapRow = (u: (typeof allUsers)[number]) => {
      const live = liveIds.has(u.id);
      const di = parseDeviceInfo(u.deviceInfo);
      const lastLocation =
        di.locationShareEnabled && di.lastLocation
          ? {
              lat: di.lastLocation.lat,
              lng: di.lastLocation.lng,
              accuracy: di.lastLocation.accuracy ?? null,
              at: di.lastLocation.at,
            }
          : null;
      return {
        id: u.id,
        displayName: u.displayName || "Unknown User",
        isOnline: live || u.isOnline || false,
        lastSeen: u.lastSeen?.toISOString() || null,
        profileImageUrl: u.profileImageUrl || null,
        status: live ? (u.status === "in_call" ? "in_call" : "online") : u.status || "offline",
        onlineSince: di.onlineSince || null,
        lastLocation,
        locationShareEnabled: !!di.locationShareEnabled,
      };
    };

    const dbMapped = (includeSelf ? allUsers : allUsers.filter(u => u.id !== userId)).map(mapRow);
    const seen = new Set(dbMapped.map((u) => u.id));
    const wsOnly = wsConnectedUsers
      .filter((u) => !seen.has(u.id))
      .filter((u) => includeSelf || u.id !== userId)
      .map((u) => ({
        id: u.id,
        displayName: u.displayName || "Unknown User",
        isOnline: true,
        lastSeen: u.lastActivity?.toISOString?.() || new Date().toISOString(),
        profileImageUrl: null,
        status: u.inCall ? "in_call" : "online",
        onlineSince: null,
        lastLocation: null,
        locationShareEnabled: false,
      }));

    res.json([...dbMapped, ...wsOnly]);
  } catch (error: any) {
    const isTableMissing = error?.message?.includes("does not exist") || error?.code === "42P01";
    if (isTableMissing) {
      console.warn("[Comms] online_users table not ready yet — returning empty list");
      return res.json([]);
    }
    console.error("Error fetching all users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/api/comms/user/status", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { isOnline, socketId, displayName } = req.body;
    const claims = req.user?.claims || {};
    const nextOnline = isOnline !== false;
    const dn =
      displayName ||
      `${claims?.first_name || ""} ${claims?.last_name || ""}`.trim() ||
      claims?.email ||
      "Anonymous";

    const [existing] = await db.select().from(onlineUsers).where(eq(onlineUsers.id, userId)).limit(1);
    const mergedDevice = mergeDeviceInfoForOnlineTransition(existing?.deviceInfo, nextOnline);

    await db
      .insert(onlineUsers)
      .values({
        id: userId,
        displayName: dn,
        email: claims?.email,
        profileImageUrl: claims?.profile_image_url,
        lastSeen: new Date(),
        isOnline: nextOnline,
        socketId,
        deviceInfo: mergedDevice,
      })
      .onConflictDoUpdate({
        target: onlineUsers.id,
        set: {
          lastSeen: new Date(),
          isOnline: nextOnline,
          socketId,
          displayName: dn,
          profileImageUrl: claims?.profile_image_url,
          deviceInfo: mergedDevice,
        },
      });

    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user status:", error);
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.post("/api/comms/user/location-share", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "User id required (X-User-Id or X-Device-Id)" });
    }
    const enabled = Boolean(req.body?.enabled);
    await setLocationShareEnabled(userId, enabled);
    invalidateLocationShareCache(userId);
    res.json({ success: true, locationShareEnabled: enabled });
  } catch (error: any) {
    console.error("Error updating location share:", error);
    res.status(500).json({ error: "Failed to update location share" });
  }
});

router.post("/api/comms/user/location", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(401).json({ error: "User id required" });
    }
    const lat = Number(req.body?.latitude);
    const lng = Number(req.body?.longitude);
    const accuracy = typeof req.body?.accuracy === "number" ? req.body.accuracy : undefined;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ error: "latitude and longitude required" });
    }
    await persistLastKnownLocation(userId, lat, lng, accuracy);
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error persisting location:", error);
    res.status(500).json({ error: "Failed to persist location" });
  }
});

router.get("/api/comms/messages", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.json([]);
    }

    const messages = await db.select().from(directMessages)
      .where(
        or(
          eq(directMessages.senderId, userId),
          eq(directMessages.recipientId, userId)
        )
      )
      .orderBy(desc(directMessages.createdAt))
      .limit(100);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      content: msg.content,
      timestamp: msg.createdAt?.toISOString() || new Date().toISOString(),
      read: msg.isRead || false,
      messageType: msg.messageType || "text",
      fileUrl: msg.fileUrl || null,
      fileName: msg.fileName || null,
      fileMimeType: (msg as { fileMimeType?: string | null }).fileMimeType || null,
      fileSizeBytes: msg.fileSizeBytes ?? null,
    }));

    res.json(formattedMessages);
  } catch (error: any) {
    // Graceful fallback: if the table doesn't exist yet, return empty array
    // instead of a 500 so the UI doesn't break on first boot.
    const isTableMissing = error?.message?.includes("does not exist") ||
      error?.code === "42P01";
    if (isTableMissing) {
      console.warn("[Comms] direct_messages table not ready yet — returning empty list");
      return res.json([]);
    }
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.get("/api/comms/messages/:recipientId", async (req: any, res) => {
  try {
    const userId = getMessageActorId(req);
    const { recipientId } = req.params;
    const requestId = `comms-msg-read-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log("[Comms][messages:read:start]", {
      requestId,
      userId,
      recipientId,
      headerUserId: req.headers["x-user-id"] || null,
      headerDeviceId: req.headers["x-device-id"] || null,
    });

    if (!userId) {
      console.warn("[Comms][messages:read:skip:no-user]", { requestId, recipientId });
      return res.json([]);
    }

    const messages = await db.select().from(directMessages)
      .where(
        or(
          and(eq(directMessages.senderId, userId), eq(directMessages.recipientId, recipientId)),
          and(eq(directMessages.senderId, recipientId), eq(directMessages.recipientId, userId))
        )
      )
      .orderBy(asc(directMessages.createdAt));

    console.log("[Comms][messages:read:result]", {
      requestId,
      userId,
      recipientId,
      count: messages.length,
    });

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.senderId,
      recipientId: msg.recipientId,
      content: msg.content,
      timestamp: msg.createdAt?.toISOString() || new Date().toISOString(),
      read: msg.isRead || false,
      messageType: msg.messageType || "text",
      fileUrl: msg.fileUrl || null,
      fileName: msg.fileName || null,
      fileMimeType: (msg as { fileMimeType?: string | null }).fileMimeType || null,
      fileSizeBytes: msg.fileSizeBytes ?? null,
    }));

    res.json(formattedMessages);
  } catch (error: any) {
    // Graceful fallback: table may not exist on first boot
    const isTableMissing = error?.message?.includes("does not exist") ||
      error?.code === "42P01";
    if (isTableMissing) {
      console.warn("[Comms] direct_messages table not ready yet — returning empty list");
      return res.json([]);
    }
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.delete("/api/comms/messages/:messageId", async (req: any, res) => {
  try {
    const actorId = getMessageActorId(req);
    if (!actorId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { messageId } = req.params;
    const result = await deleteChatMessage({ messageId, actorId });
    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }
    res.json({ success: true, messageId, message: result.message });
  } catch (error: any) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Failed to delete message" });
  }
});

router.get("/api/comms/calls/:roomId/messages", async (req: any, res) => {
  try {
    const userId = getMessageActorId(req);
    if (!userId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { roomId } = req.params;
    const rows = await db
      .select()
      .from(callMessages)
      .where(and(eq(callMessages.callSessionId, roomId), eq(callMessages.isPrivate, false)))
      .orderBy(asc(callMessages.createdAt))
      .limit(500);

    res.json({
      messages: rows.map((m) => {
        const mediaUrls = Array.isArray(m.mediaUrls) ? (m.mediaUrls as string[]) : [];
        return {
          id: m.id,
          senderId: m.userId,
          senderName: m.userName || m.userId,
          message: m.content,
          messageType: m.messageType || "text",
          fileUrl: mediaUrls[0] || undefined,
          fileName: undefined,
          fileMimeType: undefined,
          timestamp: m.createdAt?.toISOString() || new Date().toISOString(),
          roomId,
        };
      }),
    });
  } catch (error: any) {
    console.error("Error fetching call messages:", error);
    res.status(500).json({ error: "Failed to fetch call messages" });
  }
});

router.delete("/api/comms/calls/:roomId/messages/:messageId", async (req: any, res) => {
  try {
    const actorId = getMessageActorId(req);
    if (!actorId) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const { roomId, messageId } = req.params;
    const [row] = await db
      .select()
      .from(callMessages)
      .where(and(eq(callMessages.id, messageId), eq(callMessages.callSessionId, roomId)))
      .limit(1);
    if (!row) {
      return res.status(404).json({ error: "Message not found" });
    }
    if (row.userId !== actorId) {
      return res.status(403).json({ error: "Only the sender can delete this message" });
    }
    const mediaUrls = Array.isArray(row.mediaUrls) ? (row.mediaUrls as string[]) : [];
    for (const url of mediaUrls) unlinkCommsMediaFile(url);
    await db.delete(callMessages).where(eq(callMessages.id, messageId));
    res.json({ success: true, messageId, roomId });
  } catch (error: any) {
    console.error("Error deleting call message:", error);
    res.status(500).json({ error: "Failed to delete call message" });
  }
});

router.post("/api/comms/messages", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { recipientId, content } = req.body;
    const requestId = `comms-msg-send-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    console.log("[Comms][messages:send:start]", {
      requestId,
      senderId: userId,
      recipientId: recipientId || "broadcast",
      contentLength: typeof content === "string" ? content.length : 0,
      headerUserId: req.headers["x-user-id"] || null,
      headerDeviceId: req.headers["x-device-id"] || null,
    });

    if (!content?.trim()) {
      console.warn("[Comms][messages:send:reject-empty]", { requestId, senderId: userId });
      return res.status(400).json({ error: "Message content required" });
    }

    const [message] = await db.insert(directMessages).values({
      senderId: userId,
      recipientId: recipientId || 'broadcast',
      content,
    }).returning();

    console.log("[Comms][messages:send:persisted]", {
      requestId,
      messageId: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      createdAt: message.createdAt?.toISOString?.() || null,
    });

    res.json({
      id: message.id,
      senderId: message.senderId,
      recipientId: message.recipientId,
      content: message.content,
      timestamp: message.createdAt?.toISOString() || new Date().toISOString(),
      read: false
    });
  } catch (error: any) {
    // Graceful fallback: table may not exist on first boot
    const isTableMissing = error?.message?.includes("does not exist") ||
      error?.code === "42P01";
    if (isTableMissing) {
      console.warn("[Comms] direct_messages table not ready — message not persisted");
      // Return a synthetic response so the UI doesn't break
      return res.json({
        id: `tmp_${Date.now()}`,
        senderId: getUserId(req) || "unknown",
        recipientId: req.body?.recipientId || "broadcast",
        content: req.body?.content || "",
        timestamp: new Date().toISOString(),
        read: false,
        _persisted: false,
      });
    }
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

router.get("/api/comms/reminders", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    
    let reminderList;
    if (userId) {
      reminderList = await db.select().from(reminders)
        .where(eq(reminders.userId, userId))
        .orderBy(asc(reminders.dueAt));
    } else {
      reminderList = await db.select().from(reminders)
        .orderBy(asc(reminders.dueAt))
        .limit(50);
    }

    const formattedReminders = reminderList.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      dueAt: r.dueAt?.toISOString() || new Date().toISOString(),
      completed: r.completed || false,
      priority: r.priority || 'medium'
    }));

    res.json(formattedReminders);
  } catch (error) {
    console.error("Error fetching reminders:", error);
    res.status(500).json({ error: "Failed to fetch reminders" });
  }
});

router.post("/api/comms/reminders", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { title, description, dueAt, priority } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ error: "Title required" });
    }

    const [reminder] = await db.insert(reminders).values({
      userId,
      title,
      description: description || null,
      dueAt: new Date(dueAt),
      priority: priority || 'medium',
      completed: false,
    }).returning();

    res.json({
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      dueAt: reminder.dueAt?.toISOString(),
      completed: reminder.completed,
      priority: reminder.priority
    });
  } catch (error) {
    console.error("Error creating reminder:", error);
    res.status(500).json({ error: "Failed to create reminder" });
  }
});

router.post("/api/comms/reminders/:id/complete", async (req: any, res) => {
  try {
    const { id } = req.params;

    await db.update(reminders)
      .set({ completed: true })
      .where(eq(reminders.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error completing reminder:", error);
    res.status(500).json({ error: "Failed to complete reminder" });
  }
});

router.delete("/api/comms/reminders/:id", async (req: any, res) => {
  try {
    const { id } = req.params;

    await db.delete(reminders).where(eq(reminders.id, id));

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    res.status(500).json({ error: "Failed to delete reminder" });
  }
});

router.get("/api/comms/news", async (req: any, res) => {
  try {
    let newsList = await db.select().from(newsItems)
      .orderBy(desc(newsItems.publishedAt))
      .limit(20);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const isStale = newsList.length === 0 || 
      (newsList[0]?.createdAt && new Date(newsList[0].createdAt) < oneHourAgo);

    if (isStale) {
      const apiKey = process.env.NEWS_API_KEY;
      if (apiKey) {
        try {
          const topics = (req.query.topics as string) || "technology,science,world";
          const url = `https://newsapi.org/v2/top-headlines?category=technology&pageSize=20&language=en&apiKey=${apiKey}`;
          const resp = await fetch(url);
          if (resp.ok) {
            const data: any = await resp.json();
            const articles = data.articles || [];

            if (articles.length > 0) {
              await db.delete(newsItems);

              const insertValues = articles
                .filter((a: any) => a.title && a.title !== "[Removed]")
                .map((a: any) => ({
                  title: a.title || "Untitled",
                  summary: a.description || a.content || "",
                  source: a.source?.name || "Unknown",
                  url: a.url || "#",
                  category: "technology",
                  publishedAt: a.publishedAt ? new Date(a.publishedAt) : new Date(),
                }));

              if (insertValues.length > 0) {
                await db.insert(newsItems).values(insertValues);
                newsList = await db.select().from(newsItems)
                  .orderBy(desc(newsItems.publishedAt))
                  .limit(20);
              }
            }
          }
        } catch (fetchError) {
          console.error("[Comms News] Failed to fetch from NewsAPI:", fetchError);
        }
      }
    }

    const formattedNews = newsList.map(n => ({
      id: n.id,
      title: n.title,
      summary: n.summary || '',
      source: n.source || 'Unknown',
      url: n.url || '#',
      category: n.category || 'general',
      publishedAt: (n.publishedAt instanceof Date ? n.publishedAt : new Date()).toISOString()
    }));

    res.json(formattedNews);
  } catch (error) {
    console.error("Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news" });
  }
});

router.post("/api/comms/call/start", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { recipientId, callType } = req.body;
    const roomId = `call_${uuid()}`;

    const [call] = await db.insert(callHistory).values({
      callerId: userId,
      recipientId: recipientId || null,
      roomId,
      callType: callType || "audio",
      status: "ringing",
    }).returning();

    res.json({ call, roomId });
  } catch (error) {
    console.error("Error starting call:", error);
    res.status(500).json({ error: "Failed to start call" });
  }
});

router.post("/api/comms/call/:callId/answer", async (req: any, res) => {
  try {
    const { callId } = req.params;

    await db.update(callHistory)
      .set({ status: "connected" })
      .where(eq(callHistory.id, callId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error answering call:", error);
    res.status(500).json({ error: "Failed to answer call" });
  }
});

router.post("/api/comms/call/:callId/end", async (req: any, res) => {
  try {
    const { callId } = req.params;

    await db.update(callHistory)
      .set({ status: "ended", endedAt: new Date() })
      .where(eq(callHistory.id, callId));

    res.json({ success: true });
  } catch (error) {
    console.error("Error ending call:", error);
    res.status(500).json({ error: "Failed to end call" });
  }
});

router.get("/api/comms/calls/history", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    
    let calls;
    if (userId) {
      calls = await db.select().from(callHistory)
        .where(or(eq(callHistory.callerId, userId), eq(callHistory.recipientId, userId)))
        .orderBy(desc(callHistory.startedAt))
        .limit(50);
    } else {
      calls = await db.select().from(callHistory)
        .orderBy(desc(callHistory.startedAt))
        .limit(50);
    }

    res.json(calls);
  } catch (error) {
    console.error("Error fetching call history:", error);
    res.status(500).json({ error: "Failed to fetch call history" });
  }
});

router.post("/api/comms/meeting/create", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { name } = req.body;
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const [meeting] = await db.insert(meetingRooms).values({
      name: name || "CYRUS Meeting",
      hostId: userId,
      roomCode,
      participants: [userId],
    }).returning();

    res.json(meeting);
  } catch (error) {
    console.error("Error creating meeting:", error);
    res.status(500).json({ error: "Failed to create meeting" });
  }
});

router.post("/api/comms/meeting/join", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { roomCode } = req.body;

    const [meeting] = await db.select().from(meetingRooms)
      .where(and(eq(meetingRooms.roomCode, roomCode), eq(meetingRooms.isActive, true)));

    if (!meeting) {
      return res.status(404).json({ error: "Meeting not found" });
    }

    const participants = (meeting.participants as string[]) || [];
    if (!participants.includes(userId)) {
      participants.push(userId);
      await db.update(meetingRooms)
        .set({ participants })
        .where(eq(meetingRooms.id, meeting.id));
    }

    res.json(meeting);
  } catch (error) {
    console.error("Error joining meeting:", error);
    res.status(500).json({ error: "Failed to join meeting" });
  }
});

router.get("/api/comms/meetings", async (req: any, res) => {
  try {
    const meetings = await db.select().from(meetingRooms)
      .where(eq(meetingRooms.isActive, true))
      .orderBy(desc(meetingRooms.createdAt));

    res.json(meetings);
  } catch (error) {
    console.error("Error fetching meetings:", error);
    res.status(500).json({ error: "Failed to fetch meetings" });
  }
});

router.get("/api/comms/online-users", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const connectedUsers = getConnectedUsers();
    const filteredUsers = connectedUsers.filter(u => u.id !== userId);
    res.json(filteredUsers);
  } catch (error) {
    console.error("Error fetching online users:", error);
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

router.get("/api/comms/contacts", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.json([]);
    }

    const userContacts = await db.select().from(contacts)
      .where(eq(contacts.userId, userId))
      .orderBy(desc(contacts.isFavorite), asc(contacts.contactName));

    res.json(userContacts);
  } catch (error) {
    console.error("Error fetching contacts:", error);
    res.status(500).json({ error: "Failed to fetch contacts" });
  }
});

router.post("/api/comms/contacts", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.status(400).json({ error: "Device ID required" });
    }
    const { contactId, contactName, contactEmail, isFavorite } = req.body;

    if (!contactId || !contactName) {
      return res.status(400).json({ error: "contactId and contactName are required" });
    }

    const [contact] = await db.insert(contacts).values({
      userId,
      contactId,
      contactName,
      contactEmail,
      isFavorite: isFavorite || false,
    }).returning();

    res.json(contact);
  } catch (error) {
    console.error("Error adding contact:", error);
    res.status(500).json({ error: "Failed to add contact" });
  }
});

router.delete("/api/comms/contacts/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    await db.delete(contacts).where(eq(contacts.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact:", error);
    res.status(500).json({ error: "Failed to delete contact" });
  }
});

router.patch("/api/comms/contacts/:id/favorite", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body;
    
    await db.update(contacts)
      .set({ isFavorite })
      .where(eq(contacts.id, id));
    
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating contact:", error);
    res.status(500).json({ error: "Failed to update contact" });
  }
});

router.get("/api/comms/call-history", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = (page - 1) * limit;

    let sessions;
    if (userId) {
      sessions = await db.select().from(callSessions)
        .where(
          sql`${callSessions.participants}::jsonb @> ${JSON.stringify([{ userId }])}::jsonb`
        )
        .orderBy(desc(callSessions.startTime))
        .limit(limit)
        .offset(offset);
    } else {
      sessions = await db.select().from(callSessions)
        .orderBy(desc(callSessions.startTime))
        .limit(limit)
        .offset(offset);
    }

    const formatted = sessions.map(s => ({
      id: s.id,
      callId: s.callId,
      type: s.type,
      participants: s.participants,
      mediaConfig: s.mediaConfig,
      quality: s.quality,
      startTime: s.startTime?.toISOString() || null,
      endTime: s.endTime?.toISOString() || null,
      durationSeconds: s.durationSeconds,
      recordingUrl: s.recordingUrl,
      metadata: s.metadata,
    }));

    res.json({ page, limit, sessions: formatted });
  } catch (error: any) {
    console.error("Error fetching call history:", error);
    res.status(500).json({ error: "Failed to fetch call history" });
  }
});

router.post("/api/comms/call-history", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { recipientId, roomId, callType, status, duration } = req.body;

    const [record] = await db.insert(callHistory).values({
      callerId: userId,
      recipientId,
      roomId: roomId || `call_${uuid()}`,
      callType: callType || "video",
      status: status || "completed",
      startedAt: new Date(),
      endedAt: status === "completed" ? new Date() : null,
      duration,
    }).returning();

    res.json(record);
  } catch (error) {
    console.error("Error saving call history:", error);
    res.status(500).json({ error: "Failed to save call history" });
  }
});

router.post("/api/comms/messages/enhanced", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { recipientId, groupId, content, messageType, replyToId, fileUrl, fileName, fileSizeBytes } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Message content required" });
    
    const message = await communicationEngine.sendMessage(
      userId, recipientId || null, groupId || null, content,
      messageType || "text", replyToId, fileUrl, fileName, fileSizeBytes
    );
    res.json({ success: true, message });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/messages/:messageId/read", async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const userId = getUserId(req) || "unknown";
    const result = await communicationEngine.markAsRead(messageId, userId);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/messages/:messageId/react", async (req: any, res) => {
  try {
    const { messageId } = req.params;
    const userId = getUserId(req) || "unknown";
    const { reaction } = req.body;
    if (!reaction) return res.status(400).json({ error: "reaction is required" });
    const reactions = await communicationEngine.addReaction(messageId, userId, reaction);
    if (!reactions) return res.status(404).json({ error: "Message not found" });
    res.json({ success: true, reactions });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/groups", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { name, members } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: "Group name required" });
    const group = await communicationEngine.createGroupChat(name, userId, members || []);
    res.json({ success: true, group });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/comms/groups", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.json([]);
    const groups = await communicationEngine.getGroupChats(userId);
    res.json(groups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/comms/groups/:groupId/messages", async (req: any, res) => {
  try {
    const { groupId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const messages = await communicationEngine.getGroupMessages(groupId, limit);
    res.json(messages);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/calls/initiate", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { recipientId, callType, userName } = req.body;
    if (!recipientId) return res.status(400).json({ error: "recipientId required" });
    const call = await communicationEngine.initiateCall(userId, userName || userId, recipientId, callType || "voice");
    res.json({ success: true, call });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/calls/:callId/accept", async (req: any, res) => {
  try {
    const { callId } = req.params;
    const userId = getUserId(req) || "unknown";
    const success = await communicationEngine.acceptCall(callId, userId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/calls/:callId/decline", async (req: any, res) => {
  try {
    const { callId } = req.params;
    const userId = getUserId(req) || "unknown";
    const success = await communicationEngine.declineCall(callId, userId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/calls/:callId/end", async (req: any, res) => {
  try {
    const { callId } = req.params;
    const userId = getUserId(req) || "unknown";
    const call = await communicationEngine.endCall(callId, userId);
    if (!call) return res.status(404).json({ error: "Call not found" });
    res.json({ success: true, call });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/comms/calls/active", (req, res) => {
  const calls = communicationEngine.getActiveCalls();
  res.json({ totalCalls: calls.length, calls });
});

router.post("/api/comms/conferences/create", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { title, description, maxParticipants, password, participantIds, userName } = req.body;
    if (!title?.trim()) return res.status(400).json({ error: "Title required" });
    const conference = await communicationEngine.createConference(
      userId, userName || userId, title, description, maxParticipants || 999, password, participantIds || []
    );
    res.json({ success: true, conference });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/conferences/:conferenceId/join", async (req: any, res) => {
  try {
    const { conferenceId } = req.params;
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { userName } = req.body;
    const success = await communicationEngine.joinConference(conferenceId, userId, userName || userId);
    if (!success) return res.status(400).json({ error: "Cannot join conference (full or not found)" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/conferences/:conferenceId/leave", async (req: any, res) => {
  try {
    const { conferenceId } = req.params;
    const userId = getUserId(req) || "unknown";
    const success = await communicationEngine.leaveConference(conferenceId, userId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/conferences/:conferenceId/end", (req, res) => {
  const { conferenceId } = req.params;
  const success = communicationEngine.endConference(conferenceId);
  if (!success) return res.status(404).json({ error: "Conference not found" });
  res.json({ success: true, message: "Conference ended" });
});

router.post("/api/comms/conferences/:conferenceId/screen-share/start", async (req: any, res) => {
  try {
    const { conferenceId } = req.params;
    const userId = getUserId(req) || "unknown";
    const success = await communicationEngine.startScreenShare(conferenceId, userId);
    if (!success) return res.status(400).json({ error: "Cannot start screen share" });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/conferences/:conferenceId/screen-share/stop", async (req: any, res) => {
  try {
    const { conferenceId } = req.params;
    const success = await communicationEngine.stopScreenShare(conferenceId);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/api/comms/conferences/:conferenceId/recording/toggle", (req, res) => {
  const { conferenceId } = req.params;
  const isRecording = communicationEngine.toggleRecording(conferenceId);
  res.json({ success: true, isRecording });
});

router.get("/api/comms/conferences/active", (req, res) => {
  const conferences = communicationEngine.getActiveConferences();
  res.json({ totalConferences: conferences.length, conferences: conferences.map(c => ({
    conferenceId: c.conferenceId,
    title: c.title,
    hostId: c.hostId,
    hostName: c.hostName,
    participantCount: c.participants.length,
    maxParticipants: c.maxParticipants,
    isRecording: c.isRecording,
    screenSharingBy: c.screenSharingBy,
    roomCode: c.roomCode,
    meetingLink: c.meetingLink,
  }))});
});

router.get("/api/comms/conferences/:conferenceId", (req, res) => {
  const { conferenceId } = req.params;
  const conference = communicationEngine.getConference(conferenceId);
  if (!conference) return res.status(404).json({ error: "Conference not found" });
  res.json(conference);
});

router.post("/api/comms/presence/update", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { displayName, status } = req.body;
    const validStatuses = ["online", "away", "do_not_disturb", "offline", "in_call"];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }
    const presence = await communicationEngine.updatePresence(userId, displayName || userId, status || "online");
    res.json({ success: true, presence });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/comms/presence/:userId", (req, res) => {
  const { userId } = req.params;
  const presence = communicationEngine.getPresence(userId);
  if (!presence) return res.status(404).json({ error: "User presence not found" });
  res.json(presence);
});

router.get("/api/comms/presence", (req, res) => {
  const onlinePresence = communicationEngine.getAllOnlinePresence();
  res.json({ totalOnline: onlinePresence.length, users: onlinePresence });
});

router.get("/api/comms/statistics", (req, res) => {
  res.json(communicationEngine.getStatistics());
});

router.post("/api/comms/encryption/generate-key", (req: any, res) => {
  const userId = getUserId(req) || `anon_${Date.now()}`;
  const key = communicationEngine.generateEncryptionKey(userId);
  res.json({ success: true, userId, keyGenerated: true });
});

router.get("/api/comms/status", (req, res) => {
  const stats = communicationEngine.getStatistics();
  res.json({
    operational: true,
    features: {
      messaging: true,
      enhancedMessaging: true,
      groupChat: true,
      reminders: true,
      news: true,
      voiceCalls: true,
      videoCalls: true,
      meetings: true,
      conferences: true,
      screenSharing: true,
      callRecording: true,
      webrtc: true,
      contacts: true,
      presence: true,
      directCalling: true,
      encryption: true,
      fileSharing: true,
      messageReactions: true,
      readReceipts: true,
    },
    websocket: '/cyrus-io',
    ...stats,
  });
});

/** SFU runtime status (mediasoup vs star relay fallback). */
router.get("/api/comms/sfu/status", (_req, res) => {
  try {
    const { getSfuStatus } = require("./sfu/sfu-manager.js") as {
      getSfuStatus: () => import("../../shared/comms/sfu-types.js").SfuStatusResponse;
    };
    res.json(getSfuStatus());
  } catch (e: unknown) {
    res.status(500).json({ error: e instanceof Error ? e.message : "sfu status failed" });
  }
});

/** Phase 4: lightweight WebRTC readiness probe for ops / dashboards (no secrets). */
router.get("/api/comms/webrtc-health", (_req, res) => {
  try {
    const cfg = getCyrusCommWebRtcConfigResponse();
    res.json({
      ok: true,
      relayConfigured: cfg.relayConfigured,
      iceServerCount: Array.isArray(cfg.iceServers) ? cfg.iceServers.length : 0,
      iceTransportPolicy: cfg.iceTransportPolicy,
      encodingProfile: cfg.linkHints?.encodingProfile,
      satelliteBackhaulCapable: cfg.linkHints?.satelliteBackhaulCapable,
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "webrtc-health failed" });
  }
});

router.get("/api/comms/runtime-metrics", (_req, res) => {
  try {
    res.json({
      ok: true,
      signaling: {
        websocket: "/cyrus-io",
      },
      runtime: getCommsRuntimeMetrics(),
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || "runtime-metrics failed" });
  }
});

router.get("/api/comms/metrics/prometheus", (_req, res) => {
  try {
    const runtime = getCommsRuntimeMetrics();
    const activeCallCount = getActiveCalls().length;
    const setupTotal = runtime.callSetupSucceeded + runtime.callSetupFailed;
    const setupSuccessRate = setupTotal > 0 ? runtime.callSetupSucceeded / setupTotal : 1;
    const lines = [
      "# HELP cyrus_comms_qos_samples_received_total QoS samples received from clients",
      "# TYPE cyrus_comms_qos_samples_received_total counter",
      `cyrus_comms_qos_samples_received_total ${runtime.qosSamplesReceived}`,
      "# HELP cyrus_comms_qos_samples_rejected_invalid_total QoS samples rejected due to invalid payload values",
      "# TYPE cyrus_comms_qos_samples_rejected_invalid_total counter",
      `cyrus_comms_qos_samples_rejected_invalid_total ${runtime.qosSamplesRejectedInvalid}`,
      "# HELP cyrus_comms_qos_samples_rate_limited_total QoS samples dropped by server-side rate limiting",
      "# TYPE cyrus_comms_qos_samples_rate_limited_total counter",
      `cyrus_comms_qos_samples_rate_limited_total ${runtime.qosSamplesRateLimited}`,
      "# HELP cyrus_comms_signaling_invalid_payload_rejected_total Signaling events rejected due to invalid payload schema",
      "# TYPE cyrus_comms_signaling_invalid_payload_rejected_total counter",
      `cyrus_comms_signaling_invalid_payload_rejected_total ${runtime.signalingInvalidPayloadRejected}`,
      "# HELP cyrus_comms_signaling_event_rate_limited_total Signaling events dropped by per-socket control-plane rate limiting",
      "# TYPE cyrus_comms_signaling_event_rate_limited_total counter",
      `cyrus_comms_signaling_event_rate_limited_total ${runtime.signalingEventRateLimited}`,
      "# HELP cyrus_comms_qos_actions_issued_total QoS recovery actions emitted",
      "# TYPE cyrus_comms_qos_actions_issued_total counter",
      `cyrus_comms_qos_actions_issued_total ${runtime.qosActionsIssued}`,
      "# HELP cyrus_comms_qos_degraded_samples_total Degraded QoS samples observed",
      "# TYPE cyrus_comms_qos_degraded_samples_total counter",
      `cyrus_comms_qos_degraded_samples_total ${runtime.degradedSamples}`,
      "# HELP cyrus_comms_qos_critical_samples_total Critical QoS samples observed",
      "# TYPE cyrus_comms_qos_critical_samples_total counter",
      `cyrus_comms_qos_critical_samples_total ${runtime.criticalSamples}`,
      "# HELP cyrus_comms_active_calls Number of active calls tracked",
      "# TYPE cyrus_comms_active_calls gauge",
      `cyrus_comms_active_calls ${activeCallCount}`,
      "# HELP cyrus_comms_qos_tracked_peers Number of peers with recent QoS samples",
      "# TYPE cyrus_comms_qos_tracked_peers gauge",
      `cyrus_comms_qos_tracked_peers ${runtime.qosTrackedPeers}`,
      "# HELP cyrus_comms_qos_room_profiles_tracked Number of room-level adaptive QoS baseline profiles tracked",
      "# TYPE cyrus_comms_qos_room_profiles_tracked gauge",
      `cyrus_comms_qos_room_profiles_tracked ${runtime.qosRoomProfilesTracked}`,
      "# HELP cyrus_comms_qos_adaptive_degraded_samples_total QoS samples classified degraded by adaptive room policy",
      "# TYPE cyrus_comms_qos_adaptive_degraded_samples_total counter",
      `cyrus_comms_qos_adaptive_degraded_samples_total ${runtime.qosAdaptiveDegradedSamples}`,
      "# HELP cyrus_comms_qos_adaptive_critical_samples_total QoS samples classified critical by adaptive room policy",
      "# TYPE cyrus_comms_qos_adaptive_critical_samples_total counter",
      `cyrus_comms_qos_adaptive_critical_samples_total ${runtime.qosAdaptiveCriticalSamples}`,
      "# HELP cyrus_comms_qos_actions_suppressed_hysteresis_total QoS actions suppressed by hysteresis guard",
      "# TYPE cyrus_comms_qos_actions_suppressed_hysteresis_total counter",
      `cyrus_comms_qos_actions_suppressed_hysteresis_total ${runtime.qosActionsSuppressedHysteresis}`,
      "# HELP cyrus_comms_qos_actions_suppressed_cooldown_total QoS actions suppressed by cooldown guard",
      "# TYPE cyrus_comms_qos_actions_suppressed_cooldown_total counter",
      `cyrus_comms_qos_actions_suppressed_cooldown_total ${runtime.qosActionsSuppressedCooldown}`,
      "# HELP cyrus_comms_qos_action_state_tracked Number of room-user QoS actuator states tracked",
      "# TYPE cyrus_comms_qos_action_state_tracked gauge",
      `cyrus_comms_qos_action_state_tracked ${runtime.qosActionStateTracked}`,
      "# HELP cyrus_comms_fanout_published_total Cross-node comms fanout events published",
      "# TYPE cyrus_comms_fanout_published_total counter",
      `cyrus_comms_fanout_published_total ${runtime.commsFanoutPublished}`,
      "# HELP cyrus_comms_fanout_received_total Cross-node comms fanout events received",
      "# TYPE cyrus_comms_fanout_received_total counter",
      `cyrus_comms_fanout_received_total ${runtime.commsFanoutReceived}`,
      "# HELP cyrus_comms_fanout_delivered_total Cross-node comms fanout events delivered to local sockets",
      "# TYPE cyrus_comms_fanout_delivered_total counter",
      `cyrus_comms_fanout_delivered_total ${runtime.commsFanoutDelivered}`,
      "# HELP cyrus_comms_call_setup_started_total Call setup attempts started",
      "# TYPE cyrus_comms_call_setup_started_total counter",
      `cyrus_comms_call_setup_started_total ${runtime.callSetupStarted}`,
      "# HELP cyrus_comms_call_setup_succeeded_total Call setup attempts succeeded",
      "# TYPE cyrus_comms_call_setup_succeeded_total counter",
      `cyrus_comms_call_setup_succeeded_total ${runtime.callSetupSucceeded}`,
      "# HELP cyrus_comms_call_setup_failed_total Call setup attempts failed",
      "# TYPE cyrus_comms_call_setup_failed_total counter",
      `cyrus_comms_call_setup_failed_total ${runtime.callSetupFailed}`,
      "# HELP cyrus_comms_call_setup_success_ratio Ratio of successful call setups",
      "# TYPE cyrus_comms_call_setup_success_ratio gauge",
      `cyrus_comms_call_setup_success_ratio ${setupSuccessRate}`,
      "# HELP cyrus_comms_session_rehydrates_total Session rehydrate events after reconnect",
      "# TYPE cyrus_comms_session_rehydrates_total counter",
      `cyrus_comms_session_rehydrates_total ${runtime.sessionRehydrates}`,
      "# HELP cyrus_comms_reconnect_under_2s_total Reconnects completed under 2 seconds",
      "# TYPE cyrus_comms_reconnect_under_2s_total counter",
      `cyrus_comms_reconnect_under_2s_total ${runtime.reconnectUnder2s}`,
      "# HELP cyrus_comms_reconnect_2_to_5s_total Reconnects completed between 2 and 5 seconds",
      "# TYPE cyrus_comms_reconnect_2_to_5s_total counter",
      `cyrus_comms_reconnect_2_to_5s_total ${runtime.reconnect2to5s}`,
      "# HELP cyrus_comms_reconnect_5_to_10s_total Reconnects completed between 5 and 10 seconds",
      "# TYPE cyrus_comms_reconnect_5_to_10s_total counter",
      `cyrus_comms_reconnect_5_to_10s_total ${runtime.reconnect5to10s}`,
      "# HELP cyrus_comms_reconnect_over_10s_total Reconnects completed over 10 seconds",
      "# TYPE cyrus_comms_reconnect_over_10s_total counter",
      `cyrus_comms_reconnect_over_10s_total ${runtime.reconnectOver10s}`,
      "# HELP cyrus_comms_ice_restart_attempts_total ICE restart attempts reported by clients",
      "# TYPE cyrus_comms_ice_restart_attempts_total counter",
      `cyrus_comms_ice_restart_attempts_total ${runtime.iceRestartAttempts}`,
      "# HELP cyrus_comms_ice_restart_succeeded_total ICE restart successes reported by clients",
      "# TYPE cyrus_comms_ice_restart_succeeded_total counter",
      `cyrus_comms_ice_restart_succeeded_total ${runtime.iceRestartSucceeded}`,
      "# HELP cyrus_comms_ice_restart_failed_total ICE restart failures reported by clients",
      "# TYPE cyrus_comms_ice_restart_failed_total counter",
      `cyrus_comms_ice_restart_failed_total ${runtime.iceRestartFailed}`,
      "# HELP cyrus_comms_relay_restart_attempts_total Relay restart attempts reported by clients",
      "# TYPE cyrus_comms_relay_restart_attempts_total counter",
      `cyrus_comms_relay_restart_attempts_total ${runtime.relayRestartAttempts}`,
      "# HELP cyrus_comms_relay_restart_succeeded_total Relay restart successes reported by clients",
      "# TYPE cyrus_comms_relay_restart_succeeded_total counter",
      `cyrus_comms_relay_restart_succeeded_total ${runtime.relayRestartSucceeded}`,
      "# HELP cyrus_comms_relay_restart_failed_total Relay restart failures reported by clients",
      "# TYPE cyrus_comms_relay_restart_failed_total counter",
      `cyrus_comms_relay_restart_failed_total ${runtime.relayRestartFailed}`,
      "# HELP cyrus_comms_recovery_latency_avg_ms Average media recovery latency in milliseconds",
      "# TYPE cyrus_comms_recovery_latency_avg_ms gauge",
      `cyrus_comms_recovery_latency_avg_ms ${runtime.recoveryLatencyAvgMs}`,
      "# HELP cyrus_comms_recovery_latency_under_1s_total Recovery events under 1 second",
      "# TYPE cyrus_comms_recovery_latency_under_1s_total counter",
      `cyrus_comms_recovery_latency_under_1s_total ${runtime.recoveryLatencyUnder1s}`,
      "# HELP cyrus_comms_recovery_latency_1_to_2s_total Recovery events between 1 and 2 seconds",
      "# TYPE cyrus_comms_recovery_latency_1_to_2s_total counter",
      `cyrus_comms_recovery_latency_1_to_2s_total ${runtime.recoveryLatency1to2s}`,
      "# HELP cyrus_comms_recovery_latency_2_to_5s_total Recovery events between 2 and 5 seconds",
      "# TYPE cyrus_comms_recovery_latency_2_to_5s_total counter",
      `cyrus_comms_recovery_latency_2_to_5s_total ${runtime.recoveryLatency2to5s}`,
      "# HELP cyrus_comms_recovery_latency_over_5s_total Recovery events over 5 seconds",
      "# TYPE cyrus_comms_recovery_latency_over_5s_total counter",
      `cyrus_comms_recovery_latency_over_5s_total ${runtime.recoveryLatencyOver5s}`,
      "# HELP cyrus_comms_chaos_injections_total Chaos test hooks executed",
      "# TYPE cyrus_comms_chaos_injections_total counter",
      `cyrus_comms_chaos_injections_total ${runtime.chaosInjections}`,
      "# HELP cyrus_comms_pending_call_timeouts_total Pending calls expired without answer",
      "# TYPE cyrus_comms_pending_call_timeouts_total counter",
      `cyrus_comms_pending_call_timeouts_total ${runtime.pendingCallTimeouts}`,
      "# HELP cyrus_comms_active_call_drift_reconciles_total Active calls reconciled after participant drift",
      "# TYPE cyrus_comms_active_call_drift_reconciles_total counter",
      `cyrus_comms_active_call_drift_reconciles_total ${runtime.activeCallDriftReconciles}`,
      "# HELP cyrus_comms_active_call_drift_pruned_total Active calls pruned after full participant drift",
      "# TYPE cyrus_comms_active_call_drift_pruned_total counter",
      `cyrus_comms_active_call_drift_pruned_total ${runtime.activeCallDriftPruned}`,
    ];
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.send(`${lines.join("\n")}\n`);
  } catch (e: any) {
    res.status(500).send(`# cyrus_comms_metrics_error ${JSON.stringify(e?.message || "unknown")}\n`);
  }
});

router.post(
  "/api/comms/user/avatar",
  (req, res, next) => {
    avatarUpload.single("file")(req, res, (err: unknown) => {
      if (err) {
        return res.status(400).json({ error: err instanceof Error ? err.message : "Invalid upload" });
      }
      next();
    });
  },
  async (req: any, res) => {
    try {
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ error: "User id required (X-User-Id or X-Device-Id)" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No image file uploaded" });
      }
      const safeFilename = path.basename(req.file.filename);
      const fileUrl = `/api/comms/media/${encodeURIComponent(safeFilename)}`;

      await db
        .insert(onlineUsers)
        .values({
          id: userId,
          displayName: "User",
          email: null,
          profileImageUrl: fileUrl,
          lastSeen: new Date(),
          isOnline: true,
        })
        .onConflictDoUpdate({
          target: onlineUsers.id,
          set: {
            profileImageUrl: fileUrl,
            lastSeen: new Date(),
          },
        });

      refreshCommsUserAvatar(userId, fileUrl);
      res.json({ success: true, profileImageUrl: fileUrl });
    } catch (error: any) {
      console.error("Error saving avatar:", error);
      res.status(500).json({ error: "Failed to save avatar" });
    }
  }
);

router.get("/api/comms/upload/capabilities", (_req, res) => {
  res.json({
    maxUploadBytes: getCommsMaxUploadBytes(),
    chunkSizeBytes: getCommsChunkSizeBytes(),
    directUploadMaxBytes: 6 * 1024 * 1024,
    supportsChunkedUpload: true,
    supportsRangeStreaming: true,
  });
});

router.post("/api/comms/upload/init", async (req: any, res) => {
  try {
    const userId = getUserId(req) || "unknown";
    const { fileName, fileSize, mimeType } = req.body || {};
    const size = parseInt(String(fileSize), 10);
    if (!fileName || !Number.isFinite(size) || size <= 0) {
      return res.status(400).json({ error: "fileName and fileSize are required" });
    }
    const session = initChunkUpload(getCommsChunksDir(COMMS_UPLOAD_DIR), {
      fileName: String(fileName),
      fileSize: size,
      mimeType: typeof mimeType === "string" ? mimeType : undefined,
      userId,
    });
    res.json({
      uploadId: session.uploadId,
      chunkSize: session.chunkSize,
      totalChunks: session.totalChunks,
      fileName: session.fileName,
      mimeType: session.mimeType,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to init upload" });
  }
});

router.post("/api/comms/upload/chunk", chunkUpload.single("chunk"), async (req: any, res) => {
  try {
    const uploadId = String(req.body.uploadId || "");
    const chunkIndex = parseInt(String(req.body.chunkIndex), 10);
    if (!uploadId || !Number.isFinite(chunkIndex)) {
      return res.status(400).json({ error: "uploadId and chunkIndex required" });
    }
    if (!req.file?.buffer) {
      return res.status(400).json({ error: "No chunk data" });
    }
    const progress = await writeUploadChunk(
      getCommsChunksDir(COMMS_UPLOAD_DIR),
      uploadId,
      chunkIndex,
      req.file.buffer,
    );
    res.json({ success: true, ...progress });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Chunk upload failed" });
  }
});

router.get("/api/comms/upload/:uploadId/status", (req, res) => {
  const chunksRoot = getCommsChunksDir(COMMS_UPLOAD_DIR);
  const session = getChunkUploadSession(String(req.params.uploadId || ""), chunksRoot);
  if (!session) return res.status(404).json({ error: "Upload session not found" });
  res.json({
    uploadId: session.uploadId,
    fileName: session.fileName,
    fileSize: session.fileSize,
    chunkSize: session.chunkSize,
    totalChunks: session.totalChunks,
    receivedChunks: session.receivedChunks.size,
  });
});

router.post("/api/comms/upload/complete", async (req: any, res) => {
  try {
    const uploadId = String(req.body.uploadId || "");
    if (!uploadId) return res.status(400).json({ error: "uploadId required" });
    const merged = await completeChunkUpload(
      getCommsChunksDir(COMMS_UPLOAD_DIR),
      COMMS_UPLOAD_DIR,
      uploadId,
    );
    const safeFilename = path.basename(merged.fileName);
    const fileUrl = `/api/comms/media/${encodeURIComponent(safeFilename)}`;
    res.json({
      success: true,
      fileUrl,
      fileName: safeFilename,
      fileSize: merged.fileSize,
      mimeType: merged.mimeType,
    });
  } catch (error: any) {
    res.status(400).json({ error: error.message || "Failed to complete upload" });
  }
});

router.post("/api/comms/upload", commsUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const safeFilename = path.basename(req.file.filename);
    const fileId = path.basename(safeFilename, path.extname(safeFilename));
    const fileUrl = `/api/comms/media/${encodeURIComponent(safeFilename)}`;
    res.json({
      success: true,
      fileId,
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error: any) {
    console.error("Error uploading comms file:", error);
    res.status(500).json({ error: "Failed to upload file" });
  }
});

router.post("/api/comms/voice-note", voiceNoteUpload.single("file"), async (req: any, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }
    const safeFilename = path.basename(req.file.filename);
    const fileId = path.basename(safeFilename, path.extname(safeFilename));
    const fileUrl = `/api/comms/media/${encodeURIComponent(safeFilename)}`;
    const duration = req.body.duration || null;
    res.json({
      success: true,
      fileId,
      fileUrl,
      duration,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });
  } catch (error: any) {
    console.error("Error uploading voice note:", error);
    res.status(500).json({ error: "Failed to upload voice note" });
  }
});

router.get("/api/comms/media/:id", (req, res) => {
  try {
    const raw = decodeURIComponent(String(req.params.id || ""));
    const safeName = path.basename(raw);
    if (!safeName) {
      return res.status(404).json({ error: "Media not found" });
    }
    let filePath = path.join(COMMS_UPLOAD_DIR, safeName);
    let resolvedName = safeName;
    if (!fs.existsSync(filePath)) {
      const files = fs.readdirSync(COMMS_UPLOAD_DIR);
      const match = files.find((f) => f === safeName || f.startsWith(safeName));
      if (!match) {
        return res.status(404).json({ error: "Media not found" });
      }
      resolvedName = match;
      filePath = path.join(COMMS_UPLOAD_DIR, match);
    }
    const ext = path.extname(resolvedName).toLowerCase();
    const mime = COMMS_SERVE_MIME[ext] || AVATAR_SERVE_MIME[ext] || "application/octet-stream";
    serveCommsMediaWithRange(req, res, filePath, mime, path.basename(resolvedName));
  } catch (error: any) {
    console.error("Error serving media:", error);
    res.status(500).json({ error: "Failed to serve media" });
  }
});

router.get("/api/comms/recordings", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const limit = Math.min(parseInt(String(req.query.limit || "30"), 10) || 30, 100);

    let rows;
    if (userId) {
      rows = await db
        .select()
        .from(callSessions)
        .where(
          and(
            isNotNull(callSessions.recordingUrl),
            sql`${callSessions.participants}::jsonb @> ${JSON.stringify([{ userId }])}::jsonb`,
          ),
        )
        .orderBy(desc(callSessions.startTime))
        .limit(limit);
    } else {
      rows = await db
        .select()
        .from(callSessions)
        .where(isNotNull(callSessions.recordingUrl))
        .orderBy(desc(callSessions.startTime))
        .limit(limit);
    }

    const recordings = rows.map((s) => {
      const mediaConfig = (s.mediaConfig || {}) as { video?: boolean };
      const meta = (s.metadata || {}) as { recordedBy?: string; fileSizeBytes?: number };
      return {
        id: s.id,
        callId: s.callId,
        type: s.type,
        participants: s.participants,
        callType: mediaConfig.video ? "video" : "audio",
        quality: s.quality,
        startTime: s.startTime?.toISOString() || null,
        endTime: s.endTime?.toISOString() || null,
        durationSeconds: s.durationSeconds,
        recordingUrl: s.recordingUrl,
        recordedBy: meta.recordedBy || null,
        fileSizeBytes: meta.fileSizeBytes || null,
      };
    });

    res.json({ recordings });
  } catch (error: any) {
    console.error("Error listing recordings:", error);
    res.status(500).json({ error: "Failed to list recordings" });
  }
});

router.post(
  "/api/comms/sessions/:roomId/recording",
  recordingUpload.single("file"),
  async (req: any, res) => {
    try {
      const roomId = String(req.params.roomId || "").trim();
      if (!roomId) return res.status(400).json({ error: "roomId required" });
      if (!req.file) return res.status(400).json({ error: "No recording file uploaded" });

      const userId = getUserId(req) || req.body.recordedBy || "unknown";
      const displayName = typeof req.body.displayName === "string" ? req.body.displayName : undefined;
      const callType = req.body.callType === "video" ? "video" : "audio";
      const durationSeconds = parseInt(String(req.body.durationSeconds || "0"), 10) || null;

      const safeFilename = path.basename(req.file.filename);
      const recordingUrl = `/api/comms/media/recordings/${encodeURIComponent(safeFilename)}`;

      const [existing] = await db
        .select()
        .from(callSessions)
        .where(eq(callSessions.callId, roomId))
        .limit(1);

      const metadata = {
        ...((existing?.metadata as Record<string, unknown>) || {}),
        recordedBy: userId,
        recordedByName: displayName,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        uploadedAt: new Date().toISOString(),
      };

      if (existing) {
        await db
          .update(callSessions)
          .set({
            recordingUrl,
            durationSeconds: durationSeconds ?? existing.durationSeconds,
            metadata,
          })
          .where(eq(callSessions.callId, roomId));
      } else {
        await db.insert(callSessions).values({
          callId: roomId,
          type: "p2p",
          participants: [{ userId, displayName, joinedAt: new Date().toISOString() }],
          mediaConfig: { audio: true, video: callType === "video", screen: false },
          quality: "HD",
          startTime: new Date(),
          durationSeconds,
          recordingUrl,
          metadata,
        });
      }

      try {
        await db
          .update(callHistory)
          .set({ isRecording: false, recordingUrl })
          .where(eq(callHistory.roomId, roomId));
      } catch {
        /* optional */
      }

      res.json({
        success: true,
        recordingUrl,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        durationSeconds,
      });
    } catch (error: any) {
      console.error("Error uploading session recording:", error);
      res.status(500).json({ error: "Failed to save recording" });
    }
  },
);

router.get("/api/comms/media/recordings/:id", (req, res) => {
  try {
    const raw = decodeURIComponent(String(req.params.id || ""));
    const safeName = path.basename(raw);
    if (!safeName) return res.status(404).json({ error: "Recording not found" });
    const filePath = path.join(COMMS_RECORDINGS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Recording not found" });
    }
    const ext = path.extname(safeName).toLowerCase();
    const mime = COMMS_SERVE_MIME[ext] || "video/webm";
    res.setHeader("Content-Type", mime);
    const forceDownload = String(req.query.download || "") === "1";
    if (forceDownload) {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeName)}"`);
    } else {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(safeName)}"`);
    }
    res.sendFile(filePath);
  } catch (error: any) {
    console.error("Error serving recording:", error);
    res.status(500).json({ error: "Failed to serve recording" });
  }
});

router.get("/api/comms/admin/stats", async (_req, res) => {
  try {
    const stats = communicationEngine.getStatistics();
    const activeCalls = communicationEngine.getActiveCalls();
    const activeConferences = communicationEngine.getActiveConferences();
    const onlinePresence = communicationEngine.getAllOnlinePresence();

    const allUsers = await db.select().from(onlineUsers);
    const onlineCount = allUsers.filter(u => u.isOnline).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messagesToday = await db.select({ count: sql<number>`count(*)` })
      .from(directMessages)
      .where(sql`${directMessages.createdAt} >= ${today}`);

    res.json({
      ...stats,
      activeCalls: activeCalls.length,
      activeConferences: activeConferences.length,
      onlineUsers: onlineCount,
      totalUsers: allUsers.length,
      messagesToday: Number(messagesToday[0]?.count || 0),
      systemHealth: {
        socketConnections: onlinePresence.length,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
    });
  } catch (error: any) {
    console.error("Error fetching admin stats:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
});

router.get("/api/comms/admin/active-calls", (_req, res) => {
  try {
    const activeCalls = communicationEngine.getActiveCalls();
    const activeConferences = communicationEngine.getActiveConferences();
    res.json({
      calls: activeCalls.map(c => ({
        callId: c.callId,
        callType: c.callType,
        initiatorId: c.initiatorId,
        initiatorName: c.initiatorName,
        participants: c.participants,
        status: c.status,
        startedAt: c.startedAt,
        callQuality: c.callQuality,
        isRecording: c.isRecording,
      })),
      conferences: activeConferences.map(c => ({
        conferenceId: c.conferenceId,
        title: c.title,
        hostId: c.hostId,
        hostName: c.hostName,
        participantCount: c.participants.length,
        maxParticipants: c.maxParticipants,
        isRecording: c.isRecording,
        screenSharingBy: c.screenSharingBy,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching active calls:", error);
    res.status(500).json({ error: "Failed to fetch active calls" });
  }
});

router.get("/api/comms/admin/online-users", async (_req, res) => {
  try {
    const allUsers = await db.select().from(onlineUsers).where(eq(onlineUsers.isOnline, true));
    const onlinePresence = communicationEngine.getAllOnlinePresence();
    const presenceMap = new Map(onlinePresence.map(p => [p.userId, p]));

    const detailedUsers = allUsers.map(u => {
      const presence = presenceMap.get(u.id);
      return {
        id: u.id,
        displayName: u.displayName || "Unknown",
        email: u.email,
        profileImageUrl: u.profileImageUrl,
        status: presence?.status || u.status || "online",
        lastSeen: u.lastSeen,
        socketId: u.socketId,
        connectionQuality: presence?.connectionQuality ?? u.connectionQuality,
        networkLatencyMs: presence?.networkLatencyMs ?? u.networkLatencyMs,
        currentCallId: presence?.currentCallId || u.currentCallId,
        currentConferenceId: presence?.currentConferenceId || u.currentConferenceId,
      };
    });

    res.json({ totalOnline: detailedUsers.length, users: detailedUsers });
  } catch (error: any) {
    console.error("Error fetching online users for admin:", error);
    res.status(500).json({ error: "Failed to fetch online users" });
  }
});

router.post("/api/comms/messages/read", async (req: any, res) => {
  try {
    const { messageIds } = req.body;
    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: "messageIds array is required" });
    }
    const userId = getUserId(req) || "unknown";
    const now = new Date();

    await db.update(directMessages)
      .set({ isRead: true, readAt: now })
      .where(inArray(directMessages.id, messageIds));

    res.json({ success: true, markedCount: messageIds.length, readAt: now.toISOString() });
  } catch (error: any) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

router.get("/api/comms/users/search", async (req: any, res) => {
  try {
    const q = (req.query.q as string || "").trim();
    if (!q) {
      return res.json([]);
    }
    const userId = getUserId(req);
    const results = await db.select().from(onlineUsers)
      .where(ilike(onlineUsers.displayName, `%${q}%`))
      .limit(20);

    const filtered = results
      .filter((u) => u.id !== userId)
      .map((u) => {
        const di = parseDeviceInfo(u.deviceInfo);
        const lastLocation =
          di.locationShareEnabled && di.lastLocation
            ? {
                lat: di.lastLocation.lat,
                lng: di.lastLocation.lng,
                accuracy: di.lastLocation.accuracy ?? null,
                at: di.lastLocation.at,
              }
            : null;
        return {
          id: u.id,
          displayName: u.displayName || "Unknown User",
          email: u.email,
          isOnline: u.isOnline || false,
          lastSeen: u.lastSeen?.toISOString() || null,
          profileImageUrl: u.profileImageUrl || null,
          status: u.status || "offline",
          onlineSince: di.onlineSince || null,
          lastLocation,
          locationShareEnabled: !!di.locationShareEnabled,
        };
      });

    res.json(filtered);
  } catch (error: any) {
    console.error("Error searching users:", error);
    res.status(500).json({ error: "Failed to search users" });
  }
});

router.get("/api/comms/conversations", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return res.json([]);
    }

    const messages = await db.select().from(directMessages)
      .where(
        or(
          eq(directMessages.senderId, userId),
          eq(directMessages.recipientId, userId)
        )
      )
      .orderBy(desc(directMessages.createdAt));

    const conversationMap = new Map<string, {
      peerId: string;
      lastMessage: typeof messages[0];
      unreadCount: number;
    }>();

    for (const msg of messages) {
      const peerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
      if (!conversationMap.has(peerId)) {
        conversationMap.set(peerId, {
          peerId,
          lastMessage: msg,
          unreadCount: 0,
        });
      }
      const conv = conversationMap.get(peerId)!;
      if (msg.recipientId === userId && !msg.isRead) {
        conv.unreadCount++;
      }
    }

    const peerIds = Array.from(conversationMap.keys());
    let peerMap = new Map<string, any>();
    if (peerIds.length > 0) {
      const peers = await db.select().from(onlineUsers)
        .where(inArray(onlineUsers.id, peerIds));
      peerMap = new Map(peers.map(p => [p.id, p]));
    }

    const groups = await communicationEngine.getGroupChats(userId);

    const conversations = Array.from(conversationMap.values()).map(conv => {
      const peer = peerMap.get(conv.peerId);
      return {
        type: "direct" as const,
        peerId: conv.peerId,
        peerName: peer?.displayName || "Unknown User",
        peerAvatar: peer?.profileImageUrl || null,
        peerOnline: peer?.isOnline || false,
        lastMessage: {
          content: conv.lastMessage.content,
          timestamp: conv.lastMessage.createdAt?.toISOString() || new Date().toISOString(),
          senderId: conv.lastMessage.senderId,
          messageType: conv.lastMessage.messageType || "text",
        },
        unreadCount: conv.unreadCount,
      };
    });

    const groupConversations = (groups || []).map((g: any) => ({
      type: "group" as const,
      groupId: g.id,
      groupName: g.name,
      members: g.members,
      lastMessage: null,
      unreadCount: 0,
    }));

    const allConversations = [...conversations, ...groupConversations];
    allConversations.sort((a, b) => {
      const aTime = a.lastMessage?.timestamp || "";
      const bTime = b.lastMessage?.timestamp || "";
      return bTime.localeCompare(aTime);
    });

    res.json(allConversations);
  } catch (error: any) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

router.get("/api/comms/call-history/:callId", async (req: any, res) => {
  try {
    const { callId } = req.params;

    const [session] = await db.select().from(callSessions)
      .where(eq(callSessions.callId, callId));

    if (!session) {
      return res.status(404).json({ error: "Call session not found" });
    }

    const messages = await db.select().from(callMessages)
      .where(eq(callMessages.callSessionId, callId))
      .orderBy(asc(callMessages.createdAt));

    const media = await db.select().from(sharedMedia)
      .where(eq(sharedMedia.callSessionId, callId))
      .orderBy(desc(sharedMedia.createdAt));

    res.json({
      session: {
        id: session.id,
        callId: session.callId,
        type: session.type,
        participants: session.participants,
        mediaConfig: session.mediaConfig,
        quality: session.quality,
        startTime: session.startTime?.toISOString() || null,
        endTime: session.endTime?.toISOString() || null,
        durationSeconds: session.durationSeconds,
        recordingUrl: session.recordingUrl,
        metadata: session.metadata,
      },
      messages: messages.map(m => ({
        id: m.id,
        userId: m.userId,
        userName: m.userName,
        content: m.content,
        mediaUrls: m.mediaUrls,
        messageType: m.messageType,
        isPrivate: m.isPrivate,
        privateRecipients: m.privateRecipients,
        timestamp: m.createdAt?.toISOString() || null,
      })),
      media: media.map(md => ({
        id: md.id,
        mediaId: md.mediaId,
        filename: md.filename,
        mediaType: md.mediaType,
        fileUrl: md.fileUrl,
        thumbnailUrl: md.thumbnailUrl,
        fileSize: md.fileSize,
        annotations: md.annotations,
        createdAt: md.createdAt?.toISOString() || null,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching call session details:", error);
    res.status(500).json({ error: "Failed to fetch call session details" });
  }
});

router.get("/api/comms/live-streams", async (_req: any, res) => {
  try {
    const streams = await db.select().from(liveStreams)
      .where(eq(liveStreams.status, "active"))
      .orderBy(desc(liveStreams.startTime));

    const formatted = streams.map(s => ({
      id: s.id,
      streamId: s.streamId,
      streamName: s.streamName,
      sourceType: s.sourceType,
      sourceUrl: s.sourceUrl,
      broadcasterId: s.broadcasterId,
      broadcasterName: s.broadcasterName,
      viewerCount: Array.isArray(s.viewers) ? (s.viewers as any[]).length : 0,
      status: s.status,
      quality: s.quality,
      startTime: s.startTime?.toISOString() || null,
    }));

    res.json({ streams: formatted });
  } catch (error: any) {
    console.error("Error fetching live streams:", error);
    res.status(500).json({ error: "Failed to fetch live streams" });
  }
});

router.get("/api/comms/live-streams/:streamId", async (req: any, res) => {
  try {
    const { streamId } = req.params;

    const [stream] = await db.select().from(liveStreams)
      .where(eq(liveStreams.streamId, streamId));

    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }

    res.json({
      id: stream.id,
      streamId: stream.streamId,
      streamName: stream.streamName,
      sourceType: stream.sourceType,
      sourceUrl: stream.sourceUrl,
      broadcasterId: stream.broadcasterId,
      broadcasterName: stream.broadcasterName,
      viewers: stream.viewers,
      viewerCount: Array.isArray(stream.viewers) ? (stream.viewers as any[]).length : 0,
      status: stream.status,
      quality: stream.quality,
      callSessionId: stream.callSessionId,
      startTime: stream.startTime?.toISOString() || null,
      endTime: stream.endTime?.toISOString() || null,
      recordingUrl: stream.recordingUrl,
    });
  } catch (error: any) {
    console.error("Error fetching stream details:", error);
    res.status(500).json({ error: "Failed to fetch stream details" });
  }
});

router.post("/api/comms/live-streams", async (req: any, res) => {
  try {
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { streamName, sourceType, sourceUrl, quality, callSessionId, broadcasterName } = req.body;

    if (!streamName?.trim()) {
      return res.status(400).json({ error: "streamName is required" });
    }
    if (!sourceType?.trim()) {
      return res.status(400).json({ error: "sourceType is required" });
    }

    const validSourceTypes = ["drone", "cctv", "webcam", "screen", "rtsp", "mobile_camera"];
    if (!validSourceTypes.includes(sourceType)) {
      return res.status(400).json({ error: `sourceType must be one of: ${validSourceTypes.join(", ")}` });
    }

    const streamId = uuid();

    const [stream] = await db.insert(liveStreams).values({
      streamId,
      streamName,
      sourceType,
      sourceUrl: sourceUrl || null,
      broadcasterId: userId,
      broadcasterName: broadcasterName || null,
      viewers: [],
      status: "active",
      quality: quality || "720p",
      callSessionId: callSessionId || null,
    }).returning();

    res.json({
      id: stream.id,
      streamId: stream.streamId,
      streamName: stream.streamName,
      sourceType: stream.sourceType,
      sourceUrl: stream.sourceUrl,
      broadcasterId: stream.broadcasterId,
      broadcasterName: stream.broadcasterName,
      viewerCount: 0,
      status: stream.status,
      quality: stream.quality,
      startTime: stream.startTime?.toISOString() || null,
    });
  } catch (error: any) {
    console.error("Error creating live stream:", error);
    res.status(500).json({ error: "Failed to create live stream" });
  }
});

router.put("/api/comms/live-streams/:streamId/end", async (req: any, res) => {
  try {
    const { streamId } = req.params;

    const [stream] = await db.select().from(liveStreams)
      .where(eq(liveStreams.streamId, streamId));

    if (!stream) {
      return res.status(404).json({ error: "Stream not found" });
    }

    if (stream.status === "ended") {
      return res.status(400).json({ error: "Stream already ended" });
    }

    const endTime = new Date();
    await db.update(liveStreams)
      .set({ status: "ended", endTime })
      .where(eq(liveStreams.streamId, streamId));

    res.json({ success: true, streamId, endTime: endTime.toISOString() });
  } catch (error: any) {
    console.error("Error ending live stream:", error);
    res.status(500).json({ error: "Failed to end live stream" });
  }
});

router.get("/api/comms/shared-media", async (req: any, res) => {
  try {
    const callSessionId = req.query.callSessionId as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    let mediaList;
    if (callSessionId) {
      mediaList = await db.select().from(sharedMedia)
        .where(eq(sharedMedia.callSessionId, callSessionId))
        .orderBy(desc(sharedMedia.createdAt))
        .limit(limit);
    } else {
      mediaList = await db.select().from(sharedMedia)
        .orderBy(desc(sharedMedia.createdAt))
        .limit(limit);
    }

    const formatted = mediaList.map(m => ({
      id: m.id,
      mediaId: m.mediaId,
      uploadedBy: m.uploadedBy,
      uploaderName: m.uploaderName,
      filename: m.filename,
      mediaType: m.mediaType,
      fileUrl: m.fileUrl,
      thumbnailUrl: m.thumbnailUrl,
      fileSize: m.fileSize,
      mimeType: m.mimeType,
      callSessionId: m.callSessionId,
      sharedWith: m.sharedWith,
      annotations: m.annotations,
      createdAt: m.createdAt?.toISOString() || null,
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error("Error fetching shared media:", error);
    res.status(500).json({ error: "Failed to fetch shared media" });
  }
});

router.post("/api/comms/shared-media/:mediaId/annotate", async (req: any, res) => {
  try {
    const { mediaId } = req.params;
    const userId = getUserId(req) || `anon_${Date.now()}`;
    const { annotationType, annotationData, userName } = req.body;

    if (!annotationType) {
      return res.status(400).json({ error: "annotationType is required" });
    }

    const validTypes = ["drawing", "comment", "highlight"];
    if (!validTypes.includes(annotationType)) {
      return res.status(400).json({ error: `annotationType must be one of: ${validTypes.join(", ")}` });
    }

    const [media] = await db.select().from(sharedMedia)
      .where(eq(sharedMedia.mediaId, mediaId));

    if (!media) {
      return res.status(404).json({ error: "Media not found" });
    }

    const existingAnnotations = Array.isArray(media.annotations) ? (media.annotations as any[]) : [];
    const newAnnotation = {
      userId,
      userName: userName || null,
      type: annotationType,
      data: annotationData || null,
      timestamp: new Date().toISOString(),
    };
    const updatedAnnotations = [...existingAnnotations, newAnnotation];

    await db.update(sharedMedia)
      .set({ annotations: updatedAnnotations })
      .where(eq(sharedMedia.mediaId, mediaId));

    res.json({ success: true, annotation: newAnnotation, totalAnnotations: updatedAnnotations.length });
  } catch (error: any) {
    console.error("Error annotating media:", error);
    res.status(500).json({ error: "Failed to annotate media" });
  }
});

router.get("/api/comms/ice-servers", (_req: any, res) => {
  try {
    const cfg = getCyrusCommWebRtcConfigResponse();
    res.json({ iceServers: cfg.iceServers, relayConfigured: cfg.relayConfigured });
  } catch (error: any) {
    console.error("Error fetching ICE servers:", error);
    res.status(500).json({ error: "Failed to fetch ICE servers" });
  }
});

router.get("/api/comms/intelligence/profile/:userId", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const insights = await commsIntelligence.getUserInsights(userId);
    res.json({ success: true, ...insights });
  } catch (error: any) {
    res.json({ success: false, profile: null, sentimentTrend: [], anomalies: [], contactSuggestions: [], churnRisk: 0, recommendations: [] });
  }
});

router.get("/api/comms/intelligence/suggestions/:userId", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const suggestions = await commsIntelligence.suggestContacts(userId, 10);
    res.json({ success: true, suggestions });
  } catch (error: any) {
    res.json({ success: true, suggestions: [] });
  }
});

router.get("/api/comms/intelligence/best-time/:userId/:targetUserId", async (req: any, res) => {
  try {
    const { userId, targetUserId } = req.params;
    const prediction = await commsIntelligence.predictBestCallTime(userId, targetUserId);
    res.json({ success: true, ...prediction });
  } catch (error: any) {
    res.json({ success: true, bestHour: 10, bestDay: "Monday", confidence: 0.1 });
  }
});

router.get("/api/comms/intelligence/anomalies/:userId", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const anomalies = await commsIntelligence.detectAnomalies(userId);
    res.json({ success: true, anomalies });
  } catch (error: any) {
    res.json({ success: true, anomalies: [] });
  }
});

router.get("/api/comms/intelligence/network-health", async (_req: any, res) => {
  try {
    const health = await commsIntelligence.getNetworkHealth();
    res.json({ success: true, ...health });
  } catch (error: any) {
    res.json({ success: true, totalUsers: 0, activeToday: 0, messagesToday: 0, avgSentiment: 0, sentimentLabel: "neutral", callSuccessRate: 100, callsToday: 0 });
  }
});

router.post("/api/comms/intelligence/analyze-text", async (req: any, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text field required" });
    const result = commsIntelligence.analyzeSentiment(text);
    const isUrgent = commsIntelligence.checkUrgency(text);
    const routing = commsIntelligence.getSmartRouting(result.score, text.length, isUrgent);
    res.json({ success: true, ...result, isUrgent, suggestedChannel: routing });
  } catch (error: any) {
    res.json({ success: false, score: 0, confidence: 0, label: "neutral", isUrgent: false, suggestedChannel: "text" });
  }
});

router.get("/api/comms/intelligence/sentiment-history/:userId", async (req: any, res) => {
  try {
    const { userId } = req.params;
    const events = await db.select()
      .from(commsInteractionEvents)
      .where(and(
        eq(commsInteractionEvents.userId, userId),
        sql`${commsInteractionEvents.sentimentScore} IS NOT NULL`
      ))
      .orderBy(desc(commsInteractionEvents.createdAt))
      .limit(50);
    const history = events.map(e => ({
      score: parseFloat(e.sentimentScore || "0"),
      eventType: e.eventType,
      timestamp: e.createdAt?.toISOString(),
    }));
    res.json({ success: true, history });
  } catch (error: any) {
    res.json({ success: true, history: [] });
  }
});

router.get("/api/comms/intelligence/clusters", async (_req: any, res) => {
  try {
    const clusters = await commsIntelligence.clusterUsers();
    res.json({ success: true, clusters });
  } catch (error: any) {
    res.json({ success: true, clusters: [] });
  }
});

router.get("/api/comms/intelligence/ml-status", async (_req: any, res) => {
  try {
    const mlAvailable = commsIntelligence.isMLServiceAvailable();
    const mlStatus = mlAvailable ? await commsIntelligence.getMLServiceStatus() : null;
    res.json({
      success: true,
      mlServiceAvailable: mlAvailable,
      mlStatus,
      fallbackActive: !mlAvailable,
    });
  } catch (error: any) {
    res.json({ success: true, mlServiceAvailable: false, fallbackActive: true });
  }
});

router.post("/api/comms/intelligence/analyze-enhanced", async (req: any, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      res.json({ success: false, error: 'No text provided' });
      return;
    }
    const result = await commsIntelligence.analyzeSentimentEnhanced(text);
    res.json({ success: true, ...result });
  } catch (error: any) {
    const fallback = commsIntelligence.analyzeSentiment(req.body?.text || '');
    res.json({ success: true, ...fallback, method: 'keyword_fallback' });
  }
});

router.post("/api/comms/intelligence/predict-behavior", async (req: any, res) => {
  try {
    const { interactions } = req.body;
    const result = await commsIntelligence.predictBehaviorML(interactions || []);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.json({ success: true, predicted_behavior: 'unknown', confidence: 0 });
  }
});

router.post("/api/comms/intelligence/detect-anomalies-ml", async (req: any, res) => {
  try {
    const { interactions, baseline } = req.body;
    const result = await commsIntelligence.detectAnomaliesML(interactions || [], baseline);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.json({ success: true, is_anomaly: false, anomaly_score: 0 });
  }
});

export function registerCommsRoutes(app: any) {
  app.use(pshareRouter);
  app.use(gwaRouter);
  app.use(groupCallIntelligenceRouter);
  app.use(pushCallRouter);
  app.use(router);
  console.log("[Comms] Registered communication routes (60+ endpoints)");
  console.log("[Comms Intelligence] 12 intelligence API endpoints active (8 core + 4 ML-enhanced)");
  console.log("[Comms GWA] Group Work Assessment routes active (timed team analytics + reports)");
  console.log("[Comms GroupCall] CYRUS Group Call Intelligence routes active");
}
