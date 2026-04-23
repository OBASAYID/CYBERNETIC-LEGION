import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  role: text("role").notNull(), // "user" | "cyrus"
  content: text("content").notNull(),
  hasImage: integer("has_image").default(0), // 0 or 1 as boolean
  imageData: text("image_data"),
  detectedObjects: jsonb("detected_objects"), // Array of detected objects
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const memories = pgTable("memories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  type: text("type").notNull(), // "person" | "place" | "thing" | "conversation"
  description: text("description").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const uploadedFiles = pgTable("uploaded_files", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  originalName: text("original_name").notNull(),
  filename: text("filename").notNull(),
  mimetype: text("mimetype").notNull(),
  size: integer("size").notNull(),
  url: text("url").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const experienceLearning = pgTable("experience_learning", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  taskType: text("task_type").notNull(),
  taskDescription: text("task_description").notNull(),
  inputSignature: text("input_signature").notNull(),
  executionTimeMs: integer("execution_time_ms").notNull(),
  successScore: integer("success_score").notNull(),
  strategyUsed: text("strategy_used"),
  branchesActivated: jsonb("branches_activated"),
  optimizationsApplied: jsonb("optimizations_applied"),
  learnedPatterns: jsonb("learned_patterns"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const knowledgeGraph = pgTable("knowledge_graph", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  concept: text("concept").notNull(),
  domain: text("domain").notNull(),
  relationships: jsonb("relationships"),
  properties: jsonb("properties"),
  confidence: integer("confidence").default(100),
  source: text("source"),
  learnedAt: timestamp("learned_at").defaultNow().notNull(),
  lastAccessed: timestamp("last_accessed").defaultNow().notNull(),
  accessCount: integer("access_count").default(1),
});

export const performanceMetrics = pgTable("performance_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(),
  taskCategory: text("task_category").notNull(),
  averageTimeMs: integer("average_time_ms").notNull(),
  bestTimeMs: integer("best_time_ms"),
  improvementRate: integer("improvement_rate").default(0),
  totalExecutions: integer("total_executions").default(1),
  successRate: integer("success_rate").default(100),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

export const evolutionLog = pgTable("evolution_log", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  evolutionType: text("evolution_type").notNull(),
  description: text("description").notNull(),
  beforeState: jsonb("before_state"),
  afterState: jsonb("after_state"),
  improvementMetrics: jsonb("improvement_metrics"),
  triggeredBy: text("triggered_by"),
  evolvedAt: timestamp("evolved_at").defaultNow().notNull(),
});

export const healthDeviceConnections = pgTable("health_device_connections", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: text("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  scopes: jsonb("scopes"),
  deviceId: text("device_id"),
  deviceName: text("device_name"),
  lastSync: timestamp("last_sync"),
  isActive: integer("is_active").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const healthVitals = pgTable("health_vitals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: text("provider").notNull(),
  heartRate: integer("heart_rate"),
  heartRateVariability: integer("heart_rate_variability"),
  bloodPressureSystolic: integer("blood_pressure_systolic"),
  bloodPressureDiastolic: integer("blood_pressure_diastolic"),
  oxygenSaturation: integer("oxygen_saturation"),
  respiratoryRate: integer("respiratory_rate"),
  bodyTemperature: integer("body_temperature"),
  bloodGlucose: integer("blood_glucose"),
  stressLevel: integer("stress_level"),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthActivity = pgTable("health_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: text("provider").notNull(),
  steps: integer("steps"),
  activeMinutes: integer("active_minutes"),
  caloriesBurned: integer("calories_burned"),
  distance: integer("distance"),
  floors: integer("floors"),
  workoutType: text("workout_type"),
  workoutDuration: integer("workout_duration"),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthSleep = pgTable("health_sleep", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: text("provider").notNull(),
  totalSleepMinutes: integer("total_sleep_minutes"),
  deepSleepMinutes: integer("deep_sleep_minutes"),
  remSleepMinutes: integer("rem_sleep_minutes"),
  lightSleepMinutes: integer("light_sleep_minutes"),
  awakeDuration: integer("awake_duration"),
  sleepEfficiency: integer("sleep_efficiency"),
  sleepScore: integer("sleep_score"),
  bedtimeStart: timestamp("bedtime_start"),
  bedtimeEnd: timestamp("bedtime_end"),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const healthBodyMetrics = pgTable("health_body_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  provider: text("provider").notNull(),
  weight: integer("weight"),
  bodyFat: integer("body_fat"),
  muscleMass: integer("muscle_mass"),
  boneMass: integer("bone_mass"),
  bmi: integer("bmi"),
  hydration: integer("hydration"),
  recordedAt: timestamp("recorded_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export const insertMemorySchema = createInsertSchema(memories).omit({
  id: true,
  createdAt: true,
});

export const insertUploadedFileSchema = createInsertSchema(uploadedFiles).omit({
  id: true,
  uploadedAt: true,
});

export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

export type InsertMemory = z.infer<typeof insertMemorySchema>;
export type Memory = typeof memories.$inferSelect;

export type InsertUploadedFile = z.infer<typeof insertUploadedFileSchema>;
export type UploadedFile = typeof uploadedFiles.$inferSelect;

export const insertExperienceLearningSchema = createInsertSchema(experienceLearning).omit({
  id: true,
  createdAt: true,
});

export const insertKnowledgeGraphSchema = createInsertSchema(knowledgeGraph).omit({
  id: true,
  learnedAt: true,
  lastAccessed: true,
});

export const insertPerformanceMetricsSchema = createInsertSchema(performanceMetrics).omit({
  id: true,
  lastUpdated: true,
});

export const insertEvolutionLogSchema = createInsertSchema(evolutionLog).omit({
  id: true,
  evolvedAt: true,
});

export const insertHealthDeviceConnectionSchema = createInsertSchema(healthDeviceConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHealthVitalsSchema = createInsertSchema(healthVitals).omit({
  id: true,
  createdAt: true,
});

export const insertHealthActivitySchema = createInsertSchema(healthActivity).omit({
  id: true,
  createdAt: true,
});

export const insertHealthSleepSchema = createInsertSchema(healthSleep).omit({
  id: true,
  createdAt: true,
});

export const insertHealthBodyMetricsSchema = createInsertSchema(healthBodyMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertExperienceLearning = z.infer<typeof insertExperienceLearningSchema>;
export type ExperienceLearning = typeof experienceLearning.$inferSelect;

export type InsertKnowledgeGraph = z.infer<typeof insertKnowledgeGraphSchema>;
export type KnowledgeGraph = typeof knowledgeGraph.$inferSelect;

export type InsertPerformanceMetrics = z.infer<typeof insertPerformanceMetricsSchema>;
export type PerformanceMetrics = typeof performanceMetrics.$inferSelect;

export type InsertEvolutionLog = z.infer<typeof insertEvolutionLogSchema>;
export type EvolutionLog = typeof evolutionLog.$inferSelect;

export type InsertHealthDeviceConnection = z.infer<typeof insertHealthDeviceConnectionSchema>;
export type HealthDeviceConnection = typeof healthDeviceConnections.$inferSelect;

export type InsertHealthVitals = z.infer<typeof insertHealthVitalsSchema>;
export type HealthVitals = typeof healthVitals.$inferSelect;

export type InsertHealthActivity = z.infer<typeof insertHealthActivitySchema>;
export type HealthActivity = typeof healthActivity.$inferSelect;

export type InsertHealthSleep = z.infer<typeof insertHealthSleepSchema>;
export type HealthSleep = typeof healthSleep.$inferSelect;

export type InsertHealthBodyMetrics = z.infer<typeof insertHealthBodyMetricsSchema>;
export type HealthBodyMetrics = typeof healthBodyMetrics.$inferSelect;

// Location Tracking & Emergency Response System v1.0
export const locationRecords = pgTable("location_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  accuracy: text("accuracy").default("10"),
  altitude: text("altitude"),
  speed: text("speed"),
  heading: text("heading"),
  address: text("address"),
  locationName: text("location_name"),
  source: text("source").default("manual"),
  status: text("status").default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emergencyAlerts = pgTable("emergency_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").default("Unknown"),
  level: text("level").notNull(),
  message: text("message").notNull(),
  latitude: text("latitude").notNull(),
  longitude: text("longitude").notNull(),
  status: text("status").default("active"),
  respondersAssigned: jsonb("responders_assigned"),
  contactInfo: jsonb("contact_info"),
  resolvedBy: text("resolved_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});

export const locationShares = pgTable("location_shares_v2", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  sharedWithId: text("shared_with_id"),
  sharedWithEmail: text("shared_with_email"),
  permissionLevel: text("permission_level").default("view_only"),
  isActive: integer("is_active").default(1),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const trackedUsers = pgTable("tracked_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(),
  userName: text("user_name").notNull(),
  role: text("role").default("user"),
  lastLat: text("last_lat"),
  lastLon: text("last_lon"),
  lastAccuracy: text("last_accuracy"),
  lastSpeed: text("last_speed"),
  lastHeading: text("last_heading"),
  lastAddress: text("last_address"),
  status: text("status").default("active"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLocationRecordSchema = createInsertSchema(locationRecords).omit({ id: true, createdAt: true });
export const insertEmergencyAlertSchema = createInsertSchema(emergencyAlerts).omit({ id: true, createdAt: true });
export const insertLocationShareSchema = createInsertSchema(locationShares).omit({ id: true, createdAt: true });
export const insertTrackedUserSchema = createInsertSchema(trackedUsers).omit({ id: true, createdAt: true, lastUpdated: true });

export type InsertLocationRecord = z.infer<typeof insertLocationRecordSchema>;
export type LocationRecord = typeof locationRecords.$inferSelect;
export type InsertEmergencyAlert = z.infer<typeof insertEmergencyAlertSchema>;
export type EmergencyAlert = typeof emergencyAlerts.$inferSelect;
export type InsertLocationShare = z.infer<typeof insertLocationShareSchema>;
export type LocationShareRecord = typeof locationShares.$inferSelect;
export type InsertTrackedUser = z.infer<typeof insertTrackedUserSchema>;
export type TrackedUser = typeof trackedUsers.$inferSelect;

export * from "./models/auth";
export * from "./models/comms";
