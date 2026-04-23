# Objective
Build an Intelligent Self-Learning Communication Intelligence engine into CYRUS's existing NEXUS COMMS platform. This system analyzes every user interaction (messages, calls, file sharing), learns user communication patterns, provides real-time sentiment analysis, predicts user needs, suggests contacts, detects anomalies, and improves recommendations over time — all privacy-first with TensorFlow.js edge computing and PostgreSQL persistence.

# Tasks

### T001: Database Schema - Communication Intelligence Tables
- **Blocked By**: []
- **Details**:
  - Add 3 new tables to `shared/models/comms.ts` (after existing table exports, before type exports):
    - `comms_user_profiles` - ML-built user communication profiles: userId (varchar PK), displayName, communicationPatterns (JSONB: avgMsgLength, peakHours array, preferredChannels, responseTimeMs, avgCallDurationSec, messagingFrequency), sentimentProfile (JSONB: avgSentiment float, moodDistribution object, emotionalTrend), interactionEmbeddings (JSONB: array of feature vectors), behaviorCluster (varchar), contactSuggestions (JSONB: array of {contactId, relevanceScore, reason}), preferredLanguage (varchar default 'en'), uiPreferences (JSONB), networkQualityHistory (JSONB), churnRiskScore (varchar default '0'), lastAnalyzedAt (timestamp), totalInteractions (integer default 0), createdAt (timestamp), updatedAt (timestamp)
    - `comms_interaction_events` - Every interaction logged: id (varchar PK uuid), userId (varchar notNull), eventType (varchar notNull - message_sent/message_received/call_started/call_ended/file_shared/location_shared/reaction_sent/stream_started/stream_viewed), targetUserId (varchar), metadata (JSONB: contentLength, sentimentScore, responseTimeMs, callQuality, fileType, channelType), sentimentScore (varchar), featureVector (JSONB), sessionId (varchar), createdAt (timestamp)
    - `comms_ml_models` - Tracks model versions: id (varchar PK uuid), modelType (varchar notNull - sentiment/clustering/anomaly/routing/churn), version (varchar), accuracy (varchar), trainingDataSize (integer), hyperparameters (JSONB), status (varchar default 'active'), trainedAt (timestamp), createdAt (timestamp)
  - Add type exports for all 3 tables
  - Run `npm run db:push` to sync schema
  - IMPORTANT: All existing tables must remain EXACTLY as-is. Use varchar PK with gen_random_uuid() matching existing pattern
  - Files: `shared/models/comms.ts`
  - Acceptance: Tables created, types exported, db:push succeeds

### T002: Server - Communication Intelligence Engine
- **Blocked By**: [T001]
- **Details**:
  - Create `server/comms/comms-intelligence.ts` - the core intelligence engine
  - Class: `CommsIntelligenceEngine`
  - Import db from `../db`, import tables from `../../shared/models/comms` (commsUserProfiles, commsInteractionEvents, commsMlModels, directMessages, callHistory, contacts), import { eq, desc, sql, and, count } from 'drizzle-orm'
  - Constructor: log `[Comms Intelligence] Adaptive Learning Engine initialized`
  - Methods:
    1. `async trackInteraction(userId: string, eventType: string, targetUserId?: string, metadata?: any)`: Insert into comms_interaction_events with auto-generated sentiment if eventType is message_sent. After every 10 interactions, trigger updateUserProfile
    2. `analyzeSentiment(text: string): { score: number, confidence: number, label: string }`: Pure algorithmic approach - use weighted keyword matching with positive/negative word lists (200+ words each), handle negation ("not happy" = negative), amplifiers ("very happy" = stronger), compute score -1 to 1, confidence 0-1, label positive/negative/neutral
    3. `async updateUserProfile(userId: string)`: Query last 100 interaction_events, compute: avgMsgLength, peakHours (histogram), preferredChannels (most used eventTypes), responseTimeMs (avg gap between received and sent), messagingFrequency (msgs per day). Upsert into comms_user_profiles
    4. `async suggestContacts(userId: string, limit?: number)`: Query interaction_events grouped by targetUserId, score by: frequency * 0.4 + recency * 0.3 + diversity * 0.3 (diversity = variety of event types). Return top contacts with relevanceScore and reason
    5. `async predictBestCallTime(userId: string, targetUserId: string)`: Analyze call_started events for both users, find overlapping peak hours, return {bestHour, bestDay, confidence}
    6. `async detectAnomalies(userId: string)`: Compare recent activity (last 1hr) against 7-day baseline. Flag: message volume > 3x baseline, off-hours activity, repeated failed calls, sudden sentiment drops
    7. `getSmartRouting(sentimentScore: number, contentLength: number, urgencyKeywords: boolean): string`: Returns recommended channel - 'video' for negative sentiment or urgent, 'voice' for medium length, 'text' for short
    8. `async getUserInsights(userId: string)`: Return full profile + recent sentiment trend + active anomalies + contact suggestions + recommendations
    9. `async clusterUsers()`: Group all user profiles by behavior similarity using Euclidean distance on normalized feature vectors (messagingFrequency, avgCallDuration, sentimentAvg)
    10. `async calculateChurnRisk(userId: string)`: Compare last 7 days activity to previous 7 days. Declining activity = higher risk. Return score 0-1
    11. `async getNetworkHealth()`: Return aggregate stats: total users, active today, avg sentiment, total messages today, call success rate
  - Export singleton: `export const commsIntelligence = new CommsIntelligenceEngine()`
  - Files: `server/comms/comms-intelligence.ts`
  - Acceptance: Engine initializes without errors, all methods are functional

### T003: Server - Intelligence API Routes & Socket Integration
- **Blocked By**: [T002]
- **Details**:
  - Add these endpoints to `server/comms/comms-routes.ts` (add import for commsIntelligence from './comms-intelligence'):
    - `GET /api/comms/intelligence/profile/:userId` - calls getUserInsights, returns profile
    - `GET /api/comms/intelligence/suggestions/:userId` - calls suggestContacts(userId, 10), returns suggestions
    - `GET /api/comms/intelligence/best-time/:userId/:targetUserId` - calls predictBestCallTime
    - `GET /api/comms/intelligence/anomalies/:userId` - calls detectAnomalies
    - `GET /api/comms/intelligence/network-health` - calls getNetworkHealth
    - `POST /api/comms/intelligence/analyze-text` - body {text}, calls analyzeSentiment, returns result
    - `GET /api/comms/intelligence/sentiment-history/:userId` - queries last 50 interaction_events with sentimentScore for userId
  - Add tracking calls to `server/comms/socket-signaling.ts`:
    - Import commsIntelligence at top
    - In the `send-message` handler (after DB insert ~line 407): add `commsIntelligence.trackInteraction(senderId, 'message_sent', data.targetUserId, { contentLength: data.message?.length, channelType: 'text' })`
    - In the existing call-accept handler: add `commsIntelligence.trackInteraction(userId, 'call_started', callerId, { callType: 'p2p' })`
    - In the existing end-call handler: add `commsIntelligence.trackInteraction(userId, 'call_ended', null, { duration: callDuration })`
    - In the `send-reaction` handler: add `commsIntelligence.trackInteraction(userId, 'reaction_sent', null, { emoji: data.emoji })`
    - Wrap all tracking calls in try/catch to never break existing functionality
  - All endpoints should use try/catch and return 200 with error fallback
  - Files: `server/comms/comms-routes.ts`, `server/comms/socket-signaling.ts`
  - Acceptance: All endpoints return 200, socket events trigger tracking silently

### T004: Frontend - Client-Side Intelligence Hook & Dashboard Component
- **Blocked By**: []
- **Details**:
  - Create `client/src/hooks/useCommsIntelligence.ts`:
    - `useSentimentAnalysis()` hook: Contains a client-side sentiment analyzer using a keyword scoring approach (no TF.js model load needed for MVP, keeps it fast). Export function `analyzeTextSentiment(text: string): { score: number, label: 'positive'|'neutral'|'negative', confidence: number }` using 100+ positive and 100+ negative keywords with negation handling
    - `useUserInsights(userId: string)` hook: Uses TanStack useQuery to fetch `/api/comms/intelligence/profile/${userId}` with 30s refetch interval
    - `useContactSuggestions(userId: string)` hook: useQuery for `/api/comms/intelligence/suggestions/${userId}` with 60s refetch
    - `useAnomalyAlerts(userId: string)` hook: useQuery for `/api/comms/intelligence/anomalies/${userId}` with 30s refetch
    - `useNetworkHealth()` hook: useQuery for `/api/comms/intelligence/network-health` with 15s refetch
  - Create `client/src/components/comms/CommsIntelligence.tsx`:
    - Full intelligence dashboard component
    - Props: { userId: string, darkMode?: boolean }
    - Sections:
      1. **Network Health Overview** - Cards showing: Total Users, Active Today, Avg Sentiment (color-coded), Messages Today, Call Success Rate
      2. **User Insights Panel** - Communication patterns: peak hours displayed as a simple bar chart (24h), preferred channels, messaging frequency
      3. **Sentiment Trend** - Mini sparkline-style visualization of recent sentiment scores using colored dots/bars
      4. **Smart Contact Suggestions** - List of suggested contacts with relevance score bars and reason text
      5. **Anomaly Alerts** - Alert cards with severity (warning/critical), description, timestamp
      6. **Churn Risk Indicator** - Simple gauge: Low/Medium/High with percentage
    - Use CYRUS aerospace dark theme: bg-gray-950, border-gray-800, text-cyan-400 accents, glass-morphism backdrop-blur
    - Use lucide-react icons: Brain, Activity, Users, AlertTriangle, TrendingUp, Shield, Zap, BarChart3
  - Files: `client/src/hooks/useCommsIntelligence.ts`, `client/src/components/comms/CommsIntelligence.tsx`
  - Acceptance: Components render with proper theming, hooks return data, client-side sentiment works

### T005: Frontend - Integration into CommsPage, ChatView & Monitor Tab
- **Blocked By**: [T003, T004]
- **Details**:
  - Update `client/src/pages/CommsPage.tsx`:
    - Import CommsIntelligence from `../components/comms/CommsIntelligence`
    - Import { analyzeTextSentiment } from `../hooks/useCommsIntelligence`
    - Import { useAnomalyAlerts } from `../hooks/useCommsIntelligence`
    - Add CommsIntelligence component to the Monitor tab content area (below or alongside AdminDashboard)
    - Add anomaly alert banner: at the top of the comms page content area, if anomalies exist, show a dismissible alert bar with count
    - Pass the current user ID (myId) to CommsIntelligence
  - Update `client/src/components/comms/ChatView.tsx`:
    - Import { analyzeTextSentiment } from the intelligence hook
    - Add a sentiment indicator dot next to the send button in the message compose area
    - The dot should update in real-time as user types: green for positive, gray for neutral, red for negative
    - Use a local state `currentSentiment` updated on input change with debounce (300ms)
    - Show tooltip on hover with score value
  - Files: `client/src/pages/CommsPage.tsx`, `client/src/components/comms/ChatView.tsx`
  - Acceptance: Intelligence dashboard visible in Monitor tab, sentiment dot works in chat compose, anomaly banner shows when applicable
