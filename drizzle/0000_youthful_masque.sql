CREATE TABLE "api_keys" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"key_name" text NOT NULL,
	"ciphertext" text NOT NULL,
	"iv" text NOT NULL,
	"auth_tag" text NOT NULL,
	"metadata" jsonb,
	"created_by" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"has_image" boolean DEFAULT false,
	"image_data" text,
	"detected_objects" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"source" text NOT NULL,
	"decision_type" text NOT NULL,
	"input" text NOT NULL,
	"output" text NOT NULL,
	"confidence" numeric(5, 2) DEFAULT '0',
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emergency_alerts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text DEFAULT 'Unknown',
	"level" text NOT NULL,
	"message" text NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"status" text DEFAULT 'active',
	"responders_assigned" jsonb,
	"contact_info" jsonb,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "evolution_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evolution_type" text NOT NULL,
	"description" text NOT NULL,
	"before_state" jsonb,
	"after_state" jsonb,
	"improvement_metrics" jsonb,
	"triggered_by" text,
	"evolved_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experience_learning" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_type" text NOT NULL,
	"task_description" text NOT NULL,
	"input_signature" text NOT NULL,
	"execution_time_ms" integer NOT NULL,
	"success_score" integer NOT NULL,
	"strategy_used" text,
	"branches_activated" jsonb,
	"optimizations_applied" jsonb,
	"learned_patterns" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_activity" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"steps" integer,
	"active_minutes" integer,
	"calories_burned" integer,
	"distance" numeric(12, 3),
	"floors" integer,
	"workout_type" text,
	"workout_duration" integer,
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_body_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"weight" numeric(8, 2),
	"body_fat" numeric(5, 2),
	"muscle_mass" numeric(8, 2),
	"bone_mass" numeric(8, 2),
	"bmi" numeric(5, 2),
	"hydration" numeric(5, 2),
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_device_connections" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expiry" timestamp,
	"scopes" jsonb,
	"device_id" text,
	"device_name" text,
	"last_sync" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_sleep" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"total_sleep_minutes" integer,
	"deep_sleep_minutes" integer,
	"rem_sleep_minutes" integer,
	"light_sleep_minutes" integer,
	"awake_duration" integer,
	"sleep_efficiency" integer,
	"sleep_score" integer,
	"bedtime_start" timestamp,
	"bedtime_end" timestamp,
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "health_vitals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"provider" text NOT NULL,
	"heart_rate" integer,
	"heart_rate_variability" integer,
	"blood_pressure_systolic" integer,
	"blood_pressure_diastolic" integer,
	"oxygen_saturation" integer,
	"respiratory_rate" integer,
	"body_temperature" integer,
	"blood_glucose" integer,
	"stress_level" integer,
	"recorded_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_graph" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"concept" text NOT NULL,
	"domain" text NOT NULL,
	"relationships" jsonb,
	"properties" jsonb,
	"confidence" numeric(5, 2) DEFAULT '100',
	"source" text,
	"learned_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed" timestamp DEFAULT now() NOT NULL,
	"access_count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "location_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"latitude" numeric(10, 7) NOT NULL,
	"longitude" numeric(10, 7) NOT NULL,
	"accuracy" numeric(10, 3) DEFAULT '10',
	"altitude" numeric(10, 3),
	"speed" numeric(10, 3),
	"heading" numeric(10, 3),
	"address" text,
	"location_name" text,
	"source" text DEFAULT 'manual',
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "location_shares_v2" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"shared_with_id" text,
	"shared_with_email" text,
	"permission_level" text DEFAULT 'view_only',
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"type" text NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mission_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mission_id" varchar NOT NULL,
	"user_id" varchar,
	"status" text NOT NULL,
	"summary" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance_metrics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"metric_type" text NOT NULL,
	"task_category" text NOT NULL,
	"average_time_ms" numeric(12, 2) NOT NULL,
	"best_time_ms" numeric(12, 2),
	"improvement_rate" numeric(8, 4) DEFAULT '0',
	"total_executions" integer DEFAULT 1,
	"success_rate" numeric(5, 2) DEFAULT '100',
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" text NOT NULL,
	"role" text DEFAULT 'user',
	"last_lat" numeric(10, 7),
	"last_lon" numeric(10, 7),
	"last_accuracy" numeric(10, 3),
	"last_speed" numeric(10, 3),
	"last_heading" numeric(10, 3),
	"last_address" text,
	"status" text DEFAULT 'active',
	"last_updated" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_runs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"initiated_by" varchar,
	"source_type" text NOT NULL,
	"item_count" integer DEFAULT 0 NOT NULL,
	"status" text NOT NULL,
	"summary" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "uploaded_files" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"original_name" text NOT NULL,
	"filename" text NOT NULL,
	"mimetype" text NOT NULL,
	"size" integer NOT NULL,
	"url" text NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "call_history" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller_id" varchar NOT NULL,
	"recipient_id" varchar,
	"room_id" varchar NOT NULL,
	"call_type" varchar NOT NULL,
	"status" varchar NOT NULL,
	"started_at" timestamp DEFAULT now(),
	"ended_at" timestamp,
	"duration" varchar,
	"is_recording" boolean DEFAULT false,
	"recording_url" varchar,
	"call_quality" varchar DEFAULT '1.0',
	"bandwidth_kbps" varchar DEFAULT '0',
	"missed_by" jsonb,
	"declined_by" jsonb
);
--> statement-breakpoint
CREATE TABLE "call_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"user_name" varchar,
	"content" text NOT NULL,
	"media_urls" jsonb DEFAULT '[]'::jsonb,
	"message_type" varchar DEFAULT 'text',
	"is_private" boolean DEFAULT false,
	"private_recipients" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "call_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"call_id" varchar NOT NULL,
	"type" varchar DEFAULT 'p2p' NOT NULL,
	"participants" jsonb DEFAULT '[]'::jsonb,
	"media_config" jsonb DEFAULT '{"audio":true,"video":false,"screen":false}'::jsonb,
	"quality" varchar DEFAULT 'HD',
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"duration_seconds" integer,
	"recording_url" varchar,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "call_sessions_call_id_unique" UNIQUE("call_id")
);
--> statement-breakpoint
CREATE TABLE "comms_interaction_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_type" varchar NOT NULL,
	"target_user_id" varchar,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"sentiment_score" varchar,
	"feature_vector" jsonb,
	"session_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comms_ml_models" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"model_type" varchar NOT NULL,
	"version" varchar,
	"accuracy" varchar,
	"training_data_size" integer,
	"hyperparameters" jsonb DEFAULT '{}'::jsonb,
	"status" varchar DEFAULT 'active',
	"trained_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "comms_user_profiles" (
	"user_id" varchar PRIMARY KEY NOT NULL,
	"display_name" varchar,
	"communication_patterns" jsonb DEFAULT '{"avgMsgLength":0,"peakHours":[],"preferredChannels":[],"responseTimeMs":0,"avgCallDurationSec":0,"messagingFrequency":0}'::jsonb,
	"sentiment_profile" jsonb DEFAULT '{"avgSentiment":0,"moodDistribution":{},"emotionalTrend":"stable"}'::jsonb,
	"interaction_embeddings" jsonb DEFAULT '[]'::jsonb,
	"behavior_cluster" varchar,
	"contact_suggestions" jsonb DEFAULT '[]'::jsonb,
	"preferred_language" varchar DEFAULT 'en',
	"ui_preferences" jsonb DEFAULT '{}'::jsonb,
	"network_quality_history" jsonb DEFAULT '[]'::jsonb,
	"churn_risk_score" varchar DEFAULT '0',
	"last_analyzed_at" timestamp,
	"total_interactions" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"contact_id" varchar NOT NULL,
	"contact_name" varchar NOT NULL,
	"contact_email" varchar,
	"is_favorite" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"recipient_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"message_type" varchar DEFAULT 'text',
	"is_encrypted" boolean DEFAULT false,
	"encryption_level" varchar DEFAULT 'none',
	"file_url" varchar,
	"file_name" varchar,
	"file_size_bytes" integer,
	"read_at" timestamp,
	"reply_to_id" varchar,
	"group_id" varchar,
	"reactions" jsonb
);
--> statement-breakpoint
CREATE TABLE "group_chats" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"members" jsonb DEFAULT '[]'::jsonb,
	"is_encrypted" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "incoming_calls" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"caller_id" varchar NOT NULL,
	"caller_name" varchar,
	"recipient_id" varchar NOT NULL,
	"room_id" varchar NOT NULL,
	"call_type" varchar NOT NULL,
	"status" varchar DEFAULT 'ringing',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"answered_at" timestamp,
	"declined_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "live_streams" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stream_id" varchar NOT NULL,
	"stream_name" varchar NOT NULL,
	"source_type" varchar NOT NULL,
	"source_url" varchar,
	"broadcaster_id" varchar NOT NULL,
	"broadcaster_name" varchar,
	"viewers" jsonb DEFAULT '[]'::jsonb,
	"status" varchar DEFAULT 'active',
	"quality" varchar DEFAULT '720p',
	"call_session_id" varchar,
	"start_time" timestamp DEFAULT now(),
	"end_time" timestamp,
	"recording_url" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_streams_stream_id_unique" UNIQUE("stream_id")
);
--> statement-breakpoint
CREATE TABLE "meeting_rooms" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar NOT NULL,
	"host_id" varchar NOT NULL,
	"room_code" varchar NOT NULL,
	"is_active" boolean DEFAULT true,
	"max_participants" varchar DEFAULT '10',
	"created_at" timestamp DEFAULT now(),
	"participants" jsonb DEFAULT '[]'::jsonb,
	"description" text,
	"is_recording" boolean DEFAULT false,
	"recording_url" varchar,
	"screen_sharing_by" varchar,
	"password" varchar,
	"meeting_link" varchar,
	"ended_at" timestamp,
	"duration" integer,
	CONSTRAINT "meeting_rooms_room_code_unique" UNIQUE("room_code")
);
--> statement-breakpoint
CREATE TABLE "news_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar NOT NULL,
	"summary" text,
	"source" varchar,
	"url" varchar,
	"category" varchar DEFAULT 'general',
	"published_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "online_users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"display_name" varchar,
	"email" varchar,
	"profile_image_url" varchar,
	"last_seen" timestamp DEFAULT now(),
	"is_online" boolean DEFAULT true,
	"socket_id" varchar,
	"status" varchar DEFAULT 'online',
	"current_call_id" varchar,
	"current_conference_id" varchar,
	"device_info" jsonb,
	"network_latency_ms" varchar DEFAULT '0',
	"connection_quality" varchar DEFAULT '1.0'
);
--> statement-breakpoint
CREATE TABLE "reminders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"title" varchar NOT NULL,
	"description" text,
	"due_at" timestamp NOT NULL,
	"completed" boolean DEFAULT false,
	"priority" varchar DEFAULT 'medium',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shared_media" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"media_id" varchar NOT NULL,
	"uploaded_by" varchar NOT NULL,
	"uploader_name" varchar,
	"filename" varchar NOT NULL,
	"media_type" varchar NOT NULL,
	"file_url" varchar,
	"thumbnail_url" varchar,
	"file_size" integer,
	"mime_type" varchar,
	"call_session_id" varchar,
	"shared_with" jsonb DEFAULT '[]'::jsonb,
	"annotations" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shared_media_media_id_unique" UNIQUE("media_id")
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");