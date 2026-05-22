/**
 * db-init.ts — Auto-heal missing comms database tables on server startup.
 *
 * Uses raw DDL (CREATE TABLE IF NOT EXISTS) so it is idempotent and safe to
 * run on every boot without a full Drizzle migration workflow.
 */

import { pool } from "../db.js";

const DDL_STATEMENTS = [
  // ── online_users ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS online_users (
    id                    VARCHAR PRIMARY KEY,
    display_name          VARCHAR,
    email                 VARCHAR,
    profile_image_url     VARCHAR,
    last_seen             TIMESTAMP DEFAULT NOW(),
    is_online             BOOLEAN DEFAULT TRUE,
    socket_id             VARCHAR,
    status                VARCHAR DEFAULT 'online',
    current_call_id       VARCHAR,
    current_conference_id VARCHAR,
    device_info           JSONB,
    network_latency_ms    VARCHAR DEFAULT '0',
    connection_quality    VARCHAR DEFAULT '1.0'
  )`,

  // ── direct_messages ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS direct_messages (
    id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id        VARCHAR NOT NULL,
    recipient_id     VARCHAR NOT NULL,
    content          TEXT NOT NULL,
    is_read          BOOLEAN DEFAULT FALSE,
    created_at       TIMESTAMP DEFAULT NOW() NOT NULL,
    message_type     VARCHAR DEFAULT 'text',
    is_encrypted     BOOLEAN DEFAULT FALSE,
    encryption_level VARCHAR DEFAULT 'none',
    file_url         VARCHAR,
    file_name        VARCHAR,
    file_mime_type   VARCHAR,
    file_size_bytes  INTEGER,
    read_at          TIMESTAMP,
    reply_to_id      VARCHAR,
    group_id         VARCHAR,
    reactions        JSONB
  )`,

  // ── call_history ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS call_history (
    id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id     VARCHAR NOT NULL,
    recipient_id  VARCHAR,
    room_id       VARCHAR NOT NULL,
    call_type     VARCHAR NOT NULL,
    status        VARCHAR NOT NULL,
    started_at    TIMESTAMP DEFAULT NOW(),
    ended_at      TIMESTAMP,
    duration      VARCHAR,
    is_recording  BOOLEAN DEFAULT FALSE,
    recording_url VARCHAR,
    call_quality  VARCHAR DEFAULT '1.0',
    bandwidth_kbps VARCHAR DEFAULT '0',
    missed_by     JSONB,
    declined_by   JSONB
  )`,

  // ── call_sessions ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS call_sessions (
    id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    call_id          VARCHAR UNIQUE NOT NULL,
    type             VARCHAR NOT NULL DEFAULT 'p2p',
    participants     JSONB DEFAULT '[]',
    media_config     JSONB DEFAULT '{"audio":true,"video":false,"screen":false}',
    quality          VARCHAR DEFAULT 'HD',
    start_time       TIMESTAMP DEFAULT NOW(),
    end_time         TIMESTAMP,
    duration_seconds INTEGER,
    recording_url    VARCHAR,
    metadata         JSONB,
    created_at       TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── call_messages ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS call_messages (
    id                VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    call_session_id   VARCHAR NOT NULL,
    user_id           VARCHAR NOT NULL,
    user_name         VARCHAR,
    content           TEXT NOT NULL,
    media_urls        JSONB DEFAULT '[]',
    message_type      VARCHAR DEFAULT 'text',
    is_private        BOOLEAN DEFAULT FALSE,
    private_recipients JSONB DEFAULT '[]',
    created_at        TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── comms_interaction_events ──────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS comms_interaction_events (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         VARCHAR NOT NULL,
    event_type      VARCHAR NOT NULL,
    target_user_id  VARCHAR,
    metadata        JSONB DEFAULT '{}',
    sentiment_score VARCHAR,
    feature_vector  JSONB,
    session_id      VARCHAR,
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── comms_user_profiles ───────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS comms_user_profiles (
    user_id                  VARCHAR PRIMARY KEY,
    display_name             VARCHAR,
    communication_patterns   JSONB DEFAULT '{"avgMsgLength":0,"peakHours":[],"preferredChannels":[],"responseTimeMs":0,"avgCallDurationSec":0,"messagingFrequency":0}',
    sentiment_profile        JSONB DEFAULT '{"avgSentiment":0,"moodDistribution":{},"emotionalTrend":"stable"}',
    interaction_embeddings   JSONB DEFAULT '[]',
    behavior_cluster         VARCHAR,
    contact_suggestions      JSONB DEFAULT '[]',
    preferred_language       VARCHAR DEFAULT 'en',
    ui_preferences           JSONB DEFAULT '{}',
    network_quality_history  JSONB DEFAULT '[]',
    churn_risk_score         VARCHAR DEFAULT '0',
    last_analyzed_at         TIMESTAMP,
    total_interactions       INTEGER DEFAULT 0,
    created_at               TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at               TIMESTAMP DEFAULT NOW()
  )`,

  // ── comms_ml_models ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS comms_ml_models (
    id                 VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    model_type         VARCHAR NOT NULL,
    version            VARCHAR,
    accuracy           VARCHAR,
    training_data_size INTEGER,
    hyperparameters    JSONB DEFAULT '{}',
    status             VARCHAR DEFAULT 'active',
    trained_at         TIMESTAMP,
    created_at         TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── meeting_rooms ─────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS meeting_rooms (
    id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name             VARCHAR NOT NULL,
    host_id          VARCHAR NOT NULL,
    room_code        VARCHAR UNIQUE NOT NULL,
    is_active        BOOLEAN DEFAULT TRUE,
    max_participants VARCHAR DEFAULT '10',
    created_at       TIMESTAMP DEFAULT NOW(),
    participants     JSONB DEFAULT '[]',
    description      TEXT,
    is_recording     BOOLEAN DEFAULT FALSE,
    recording_url    VARCHAR,
    screen_sharing_by VARCHAR,
    password         VARCHAR,
    meeting_link     VARCHAR,
    ended_at         TIMESTAMP,
    duration         INTEGER
  )`,

  // ── reminders ─────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS reminders (
    id          VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     VARCHAR NOT NULL,
    title       VARCHAR NOT NULL,
    description TEXT,
    due_at      TIMESTAMP NOT NULL,
    completed   BOOLEAN DEFAULT FALSE,
    priority    VARCHAR DEFAULT 'medium',
    created_at  TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── news_items ────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS news_items (
    id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    title        VARCHAR NOT NULL,
    summary      TEXT,
    source       VARCHAR,
    url          VARCHAR,
    category     VARCHAR DEFAULT 'general',
    published_at TIMESTAMP DEFAULT NOW(),
    created_at   TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── contacts ──────────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS contacts (
    id            VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       VARCHAR NOT NULL,
    contact_id    VARCHAR NOT NULL,
    contact_name  VARCHAR NOT NULL,
    contact_email VARCHAR,
    is_favorite   BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── incoming_calls ────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS incoming_calls (
    id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    caller_id    VARCHAR NOT NULL,
    caller_name  VARCHAR,
    recipient_id VARCHAR NOT NULL,
    room_id      VARCHAR NOT NULL,
    call_type    VARCHAR NOT NULL,
    status       VARCHAR DEFAULT 'ringing',
    created_at   TIMESTAMP DEFAULT NOW() NOT NULL,
    answered_at  TIMESTAMP,
    declined_at  TIMESTAMP
  )`,

  // ── group_chats ───────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS group_chats (
    id           VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    name         VARCHAR NOT NULL,
    created_by   VARCHAR NOT NULL,
    members      JSONB DEFAULT '[]',
    is_encrypted BOOLEAN DEFAULT TRUE,
    created_at   TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── live_streams ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS live_streams (
    id               VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    stream_id        VARCHAR UNIQUE NOT NULL,
    stream_name      VARCHAR NOT NULL,
    source_type      VARCHAR NOT NULL,
    source_url       VARCHAR,
    broadcaster_id   VARCHAR NOT NULL,
    broadcaster_name VARCHAR,
    viewers          JSONB DEFAULT '[]',
    status           VARCHAR DEFAULT 'active',
    quality          VARCHAR DEFAULT '720p',
    call_session_id  VARCHAR,
    start_time       TIMESTAMP DEFAULT NOW(),
    end_time         TIMESTAMP,
    recording_url    VARCHAR,
    created_at       TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── shared_media ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS shared_media (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    media_id        VARCHAR UNIQUE NOT NULL,
    uploaded_by     VARCHAR NOT NULL,
    uploader_name   VARCHAR,
    filename        VARCHAR NOT NULL,
    media_type      VARCHAR NOT NULL,
    file_url        VARCHAR,
    thumbnail_url   VARCHAR,
    file_size       INTEGER,
    mime_type       VARCHAR,
    call_session_id VARCHAR,
    shared_with     JSONB DEFAULT '[]',
    annotations     JSONB DEFAULT '[]',
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── pshare_posts ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pshare_posts (
    id              VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id       VARCHAR NOT NULL,
    body            TEXT NOT NULL DEFAULT '',
    link_url        VARCHAR,
    file_url        VARCHAR,
    file_name       VARCHAR,
    file_mime_type  VARCHAR,
    post_kind       VARCHAR NOT NULL DEFAULT 'general',
    listing_title   VARCHAR,
    listing_price   VARCHAR,
    listing_currency VARCHAR,
    visibility      VARCHAR NOT NULL DEFAULT 'all',
    allow_comments  BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_user_ids JSONB NOT NULL DEFAULT '[]',
    created_at      TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── pshare_comments ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pshare_comments (
    id         VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    VARCHAR NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
    author_id  VARCHAR NOT NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
  )`,

  // ── pshare_likes ──────────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS pshare_likes (
    post_id    VARCHAR NOT NULL REFERENCES pshare_posts(id) ON DELETE CASCADE,
    user_id    VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    PRIMARY KEY (post_id, user_id)
  )`,
];

// Column additions for tables that may already exist without these columns
const ALTER_STATEMENTS = [
  `ALTER TABLE online_users ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'online'`,
  `ALTER TABLE online_users ADD COLUMN IF NOT EXISTS current_call_id VARCHAR`,
  `ALTER TABLE online_users ADD COLUMN IF NOT EXISTS current_conference_id VARCHAR`,
  `ALTER TABLE online_users ADD COLUMN IF NOT EXISTS device_info JSONB`,
  `ALTER TABLE online_users ADD COLUMN IF NOT EXISTS network_latency_ms VARCHAR DEFAULT '0'`,
  `ALTER TABLE online_users ADD COLUMN IF NOT EXISTS connection_quality VARCHAR DEFAULT '1.0'`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS file_mime_type VARCHAR`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS reply_to_id VARCHAR`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS group_id VARCHAR`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS reactions JSONB`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_encrypted BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS encryption_level VARCHAR DEFAULT 'none'`,
  `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS post_kind VARCHAR NOT NULL DEFAULT 'general'`,
  `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_title VARCHAR`,
  `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_price VARCHAR`,
  `ALTER TABLE pshare_posts ADD COLUMN IF NOT EXISTS listing_currency VARCHAR`,
];

export async function initCommsDatabase(): Promise<void> {
  const client = await pool.connect();
  try {
    console.log("[DB-Init] Running comms table auto-heal DDL...");

    for (const ddl of DDL_STATEMENTS) {
      try {
        await client.query(ddl);
      } catch (err: any) {
        // Log but continue — partial failures shouldn't block startup
        console.warn(`[DB-Init] DDL warning (non-fatal): ${err?.message}`);
      }
    }

    for (const alter of ALTER_STATEMENTS) {
      try {
        await client.query(alter);
      } catch (err: any) {
        // ALTER IF NOT EXISTS is idempotent; log only unexpected errors
        if (!err?.message?.includes("already exists")) {
          console.warn(`[DB-Init] ALTER warning (non-fatal): ${err?.message}`);
        }
      }
    }

    console.log("[DB-Init] Comms database tables verified/created successfully.");
  } catch (err) {
    console.error("[DB-Init] Critical error during comms DB init:", err);
    // Non-fatal — server continues without comms persistence
  } finally {
    client.release();
  }
}
