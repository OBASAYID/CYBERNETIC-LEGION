import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, jsonb, integer } from "drizzle-orm/pg-core";

export const onlineUsers = pgTable("online_users", {
  id: varchar("id").primaryKey(),
  displayName: varchar("display_name"),
  email: varchar("email"),
  profileImageUrl: varchar("profile_image_url"),
  lastSeen: timestamp("last_seen").defaultNow(),
  isOnline: boolean("is_online").default(true),
  socketId: varchar("socket_id"),
  status: varchar("status").default("online"),
  currentCallId: varchar("current_call_id"),
  currentConferenceId: varchar("current_conference_id"),
  deviceInfo: jsonb("device_info"),
  networkLatencyMs: varchar("network_latency_ms").default("0"),
  connectionQuality: varchar("connection_quality").default("1.0"),
});

export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  senderId: varchar("sender_id").notNull(),
  recipientId: varchar("recipient_id").notNull(),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  messageType: varchar("message_type").default("text"),
  isEncrypted: boolean("is_encrypted").default(false),
  encryptionLevel: varchar("encryption_level").default("none"),
  fileUrl: varchar("file_url"),
  fileName: varchar("file_name"),
  fileSizeBytes: integer("file_size_bytes"),
  readAt: timestamp("read_at"),
  replyToId: varchar("reply_to_id"),
  groupId: varchar("group_id"),
  reactions: jsonb("reactions"),
});

export const callHistory = pgTable("call_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callerId: varchar("caller_id").notNull(),
  recipientId: varchar("recipient_id"),
  roomId: varchar("room_id").notNull(),
  callType: varchar("call_type").notNull(),
  status: varchar("status").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  endedAt: timestamp("ended_at"),
  duration: varchar("duration"),
  isRecording: boolean("is_recording").default(false),
  recordingUrl: varchar("recording_url"),
  callQuality: varchar("call_quality").default("1.0"),
  bandwidthKbps: varchar("bandwidth_kbps").default("0"),
  missedBy: jsonb("missed_by"),
  declinedBy: jsonb("declined_by"),
});

export const meetingRooms = pgTable("meeting_rooms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  hostId: varchar("host_id").notNull(),
  roomCode: varchar("room_code").unique().notNull(),
  isActive: boolean("is_active").default(true),
  maxParticipants: varchar("max_participants").default("10"),
  createdAt: timestamp("created_at").defaultNow(),
  participants: jsonb("participants").default([]),
  description: text("description"),
  isRecording: boolean("is_recording").default(false),
  recordingUrl: varchar("recording_url"),
  screenSharingBy: varchar("screen_sharing_by"),
  password: varchar("password"),
  meetingLink: varchar("meeting_link"),
  endedAt: timestamp("ended_at"),
  duration: integer("duration"),
});

export const reminders = pgTable("reminders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  title: varchar("title").notNull(),
  description: text("description"),
  dueAt: timestamp("due_at").notNull(),
  completed: boolean("completed").default(false),
  priority: varchar("priority").default("medium"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const newsItems = pgTable("news_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title").notNull(),
  summary: text("summary"),
  source: varchar("source"),
  url: varchar("url"),
  category: varchar("category").default("general"),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  contactId: varchar("contact_id").notNull(),
  contactName: varchar("contact_name").notNull(),
  contactEmail: varchar("contact_email"),
  isFavorite: boolean("is_favorite").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const incomingCalls = pgTable("incoming_calls", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callerId: varchar("caller_id").notNull(),
  callerName: varchar("caller_name"),
  recipientId: varchar("recipient_id").notNull(),
  roomId: varchar("room_id").notNull(),
  callType: varchar("call_type").notNull(),
  status: varchar("status").default("ringing"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  answeredAt: timestamp("answered_at"),
  declinedAt: timestamp("declined_at"),
});

export const groupChats = pgTable("group_chats", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  createdBy: varchar("created_by").notNull(),
  members: jsonb("members").default([]),
  isEncrypted: boolean("is_encrypted").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callSessions = pgTable("call_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callId: varchar("call_id").unique().notNull(),
  type: varchar("type").notNull().default("p2p"),
  participants: jsonb("participants").default([]),
  mediaConfig: jsonb("media_config").default({ audio: true, video: false, screen: false }),
  quality: varchar("quality").default("HD"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  durationSeconds: integer("duration_seconds"),
  recordingUrl: varchar("recording_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const callMessages = pgTable("call_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  callSessionId: varchar("call_session_id").notNull(),
  userId: varchar("user_id").notNull(),
  userName: varchar("user_name"),
  content: text("content").notNull(),
  mediaUrls: jsonb("media_urls").default([]),
  messageType: varchar("message_type").default("text"),
  isPrivate: boolean("is_private").default(false),
  privateRecipients: jsonb("private_recipients").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const liveStreams = pgTable("live_streams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  streamId: varchar("stream_id").unique().notNull(),
  streamName: varchar("stream_name").notNull(),
  sourceType: varchar("source_type").notNull(),
  sourceUrl: varchar("source_url"),
  broadcasterId: varchar("broadcaster_id").notNull(),
  broadcasterName: varchar("broadcaster_name"),
  viewers: jsonb("viewers").default([]),
  status: varchar("status").default("active"),
  quality: varchar("quality").default("720p"),
  callSessionId: varchar("call_session_id"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  recordingUrl: varchar("recording_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sharedMedia = pgTable("shared_media", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mediaId: varchar("media_id").unique().notNull(),
  uploadedBy: varchar("uploaded_by").notNull(),
  uploaderName: varchar("uploader_name"),
  filename: varchar("filename").notNull(),
  mediaType: varchar("media_type").notNull(),
  fileUrl: varchar("file_url"),
  thumbnailUrl: varchar("thumbnail_url"),
  fileSize: integer("file_size"),
  mimeType: varchar("mime_type"),
  callSessionId: varchar("call_session_id"),
  sharedWith: jsonb("shared_with").default([]),
  annotations: jsonb("annotations").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commsUserProfiles = pgTable("comms_user_profiles", {
  userId: varchar("user_id").primaryKey(),
  displayName: varchar("display_name"),
  communicationPatterns: jsonb("communication_patterns").default({
    avgMsgLength: 0,
    peakHours: [],
    preferredChannels: [],
    responseTimeMs: 0,
    avgCallDurationSec: 0,
    messagingFrequency: 0,
  }),
  sentimentProfile: jsonb("sentiment_profile").default({
    avgSentiment: 0,
    moodDistribution: {},
    emotionalTrend: "stable",
  }),
  interactionEmbeddings: jsonb("interaction_embeddings").default([]),
  behaviorCluster: varchar("behavior_cluster"),
  contactSuggestions: jsonb("contact_suggestions").default([]),
  preferredLanguage: varchar("preferred_language").default("en"),
  uiPreferences: jsonb("ui_preferences").default({}),
  networkQualityHistory: jsonb("network_quality_history").default([]),
  churnRiskScore: varchar("churn_risk_score").default("0"),
  lastAnalyzedAt: timestamp("last_analyzed_at"),
  totalInteractions: integer("total_interactions").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const commsInteractionEvents = pgTable("comms_interaction_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  eventType: varchar("event_type").notNull(),
  targetUserId: varchar("target_user_id"),
  metadata: jsonb("metadata").default({}),
  sentimentScore: varchar("sentiment_score"),
  featureVector: jsonb("feature_vector"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const commsMlModels = pgTable("comms_ml_models", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  modelType: varchar("model_type").notNull(),
  version: varchar("version"),
  accuracy: varchar("accuracy"),
  trainingDataSize: integer("training_data_size"),
  hyperparameters: jsonb("hyperparameters").default({}),
  status: varchar("status").default("active"),
  trainedAt: timestamp("trained_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type OnlineUser = typeof onlineUsers.$inferSelect;
export type DirectMessage = typeof directMessages.$inferSelect;
export type CallHistory = typeof callHistory.$inferSelect;
export type MeetingRoom = typeof meetingRooms.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;
export type NewsItem = typeof newsItems.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type IncomingCall = typeof incomingCalls.$inferSelect;
export type GroupChat = typeof groupChats.$inferSelect;
export type CallSession = typeof callSessions.$inferSelect;
export type CallMessage = typeof callMessages.$inferSelect;
export type LiveStream = typeof liveStreams.$inferSelect;
export type SharedMedia = typeof sharedMedia.$inferSelect;
export type CommsUserProfile = typeof commsUserProfiles.$inferSelect;
export type CommsInteractionEvent = typeof commsInteractionEvents.$inferSelect;
export type CommsMlModel = typeof commsMlModels.$inferSelect;
