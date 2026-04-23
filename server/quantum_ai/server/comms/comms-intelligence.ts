import { db } from '../db';
import { commsUserProfiles, commsInteractionEvents, commsMlModels, directMessages, callHistory, contacts } from '../../shared/models/comms';
import { eq, desc, sql, and, count, gte } from 'drizzle-orm';
import { commsMLClient } from './comms-ml-client';

const POSITIVE_WORDS = [
  'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'awesome', 'love', 'happy',
  'perfect', 'beautiful', 'brilliant', 'outstanding', 'superb', 'magnificent', 'terrific', 'fabulous',
  'incredible', 'marvelous', 'splendid', 'delightful', 'pleasant', 'enjoyable', 'nice', 'fine',
  'best', 'better', 'improved', 'impressive', 'remarkable', 'exceptional', 'superior', 'favorable',
  'positive', 'optimistic', 'cheerful', 'glad', 'pleased', 'satisfied', 'grateful', 'thankful',
  'excited', 'thrilled', 'enthusiastic', 'passionate', 'inspired', 'motivated', 'confident',
  'helpful', 'kind', 'generous', 'friendly', 'warm', 'caring', 'supportive', 'encouraging',
  'successful', 'accomplished', 'achieved', 'progress', 'growth', 'advance', 'breakthrough',
  'innovative', 'creative', 'elegant', 'efficient', 'effective', 'productive', 'valuable',
  'agree', 'yes', 'correct', 'right', 'true', 'absolutely', 'definitely', 'certainly',
  'welcome', 'thanks', 'appreciate', 'congratulations', 'bravo', 'cheers', 'well done',
  'smooth', 'clean', 'clear', 'sharp', 'strong', 'solid', 'reliable', 'stable', 'secure',
  'fun', 'interesting', 'fascinating', 'engaging', 'captivating', 'compelling', 'exciting',
  'calm', 'peaceful', 'relaxed', 'comfortable', 'safe', 'trusted', 'loyal', 'honest',
  'smart', 'clever', 'genius', 'wise', 'insightful', 'thoughtful', 'considerate',
];

const NEGATIVE_WORDS = [
  'bad', 'terrible', 'horrible', 'awful', 'dreadful', 'disgusting', 'hate', 'angry', 'sad',
  'worst', 'worse', 'poor', 'weak', 'pathetic', 'miserable', 'depressing', 'frustrating',
  'annoying', 'irritating', 'boring', 'tedious', 'ugly', 'stupid', 'dumb', 'idiotic',
  'wrong', 'incorrect', 'false', 'failure', 'failed', 'broken', 'damaged', 'ruined',
  'useless', 'worthless', 'pointless', 'meaningless', 'hopeless', 'helpless', 'desperate',
  'confused', 'lost', 'stuck', 'trapped', 'overwhelmed', 'stressed', 'anxious', 'worried',
  'disappointed', 'upset', 'hurt', 'pain', 'suffering', 'struggling', 'difficult', 'hard',
  'impossible', 'never', 'nothing', 'nobody', 'nowhere', 'cannot', 'refuse', 'reject',
  'deny', 'decline', 'cancel', 'delete', 'remove', 'destroy', 'crash', 'error', 'bug',
  'problem', 'issue', 'trouble', 'concern', 'risk', 'danger', 'threat', 'warning',
  'slow', 'lag', 'delay', 'timeout', 'disconnect', 'offline', 'unavailable', 'down',
  'spam', 'scam', 'fake', 'fraud', 'malicious', 'suspicious', 'unsafe', 'insecure',
  'rude', 'mean', 'cruel', 'harsh', 'aggressive', 'hostile', 'toxic', 'abusive',
  'fear', 'scared', 'terrified', 'panic', 'nervous', 'uncomfortable', 'embarrassed',
  'lonely', 'isolated', 'abandoned', 'neglected', 'ignored', 'forgotten', 'excluded',
];

const NEGATION_WORDS = ['not', "don't", "doesn't", "didn't", "won't", "wouldn't", "can't", "cannot", "isn't", "aren't", "wasn't", "weren't", 'no', 'never', 'neither', 'nor', 'hardly', 'barely', 'scarcely'];
const AMPLIFIER_WORDS = ['very', 'extremely', 'incredibly', 'absolutely', 'totally', 'completely', 'really', 'truly', 'highly', 'super', 'ultra', 'enormously', 'immensely', 'deeply', 'strongly'];
const URGENCY_KEYWORDS = ['urgent', 'emergency', 'asap', 'immediately', 'critical', 'important', 'now', 'help', 'sos', 'hurry', 'deadline', 'priority'];

export class CommsIntelligenceEngine {
  private interactionCounters: Map<string, number> = new Map();

  constructor() {
    console.log('[Comms Intelligence] Adaptive Learning Engine initialized');
    console.log('[Comms Intelligence] Sentiment analysis: 200+ keywords, negation & amplifier support');
    console.log('[Comms Intelligence] Anomaly detection: real-time behavioral baseline comparison');
  }

  analyzeSentiment(text: string): { score: number; confidence: number; label: string } {
    if (!text || text.trim().length === 0) {
      return { score: 0, confidence: 0.5, label: 'neutral' };
    }

    const words = text.toLowerCase().replace(/[^\w\s'-]/g, '').split(/\s+/);
    let score = 0;
    let matchedWords = 0;
    let isNegated = false;
    let amplifierActive = false;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];

      if (NEGATION_WORDS.includes(word)) {
        isNegated = true;
        continue;
      }

      if (AMPLIFIER_WORDS.includes(word)) {
        amplifierActive = true;
        continue;
      }

      let wordScore = 0;
      if (POSITIVE_WORDS.includes(word)) {
        wordScore = 1;
        matchedWords++;
      } else if (NEGATIVE_WORDS.includes(word)) {
        wordScore = -1;
        matchedWords++;
      }

      if (wordScore !== 0) {
        if (isNegated) wordScore *= -0.8;
        if (amplifierActive) wordScore *= 1.5;
        score += wordScore;
      }

      if (i > 0 && !NEGATION_WORDS.includes(word) && !AMPLIFIER_WORDS.includes(word)) {
        isNegated = false;
        amplifierActive = false;
      }
    }

    const normalizedScore = words.length > 0 ? Math.max(-1, Math.min(1, score / Math.max(words.length * 0.3, 1))) : 0;
    const confidence = matchedWords > 0 ? Math.min(1, 0.5 + (matchedWords / words.length) * 0.5) : 0.3;
    const label = normalizedScore > 0.1 ? 'positive' : normalizedScore < -0.1 ? 'negative' : 'neutral';

    return { score: parseFloat(normalizedScore.toFixed(3)), confidence: parseFloat(confidence.toFixed(3)), label };
  }

  async analyzeSentimentEnhanced(text: string): Promise<{ score: number; confidence: number; label: string; method: string; toxicity?: number }> {
    if (commsMLClient.isAvailable()) {
      try {
        const mlResult = await commsMLClient.analyzeSentiment(text);
        if (mlResult) {
          return {
            score: mlResult.score,
            confidence: mlResult.confidence,
            label: mlResult.label,
            method: mlResult.method,
            toxicity: mlResult.toxicity,
          };
        }
      } catch {}
    }
    const fallback = this.analyzeSentiment(text);
    return { ...fallback, method: 'keyword_ts' };
  }

  async predictBehaviorML(interactions: any[]): Promise<any> {
    if (commsMLClient.isAvailable()) {
      try {
        const result = await commsMLClient.predictBehavior(interactions);
        if (result) return result;
      } catch {}
    }
    return { predicted_behavior: 'unknown', confidence: 0, probabilities: {} };
  }

  async detectAnomaliesML(interactions: any[], baseline?: any[]): Promise<any> {
    if (commsMLClient.isAvailable()) {
      try {
        const result = await commsMLClient.detectAnomalies(interactions, baseline);
        if (result) return result;
      } catch {}
    }
    return { is_anomaly: false, anomaly_score: 0, reasons: [], alert_level: 'normal' };
  }

  async clusterUsersML(profiles: any[]): Promise<any> {
    if (commsMLClient.isAvailable()) {
      try {
        const result = await commsMLClient.clusterUsers(profiles);
        if (result) return result;
      } catch {}
    }
    return this.clusterUsers();
  }

  async getMLServiceStatus(): Promise<any> {
    return commsMLClient.getStatus();
  }

  isMLServiceAvailable(): boolean {
    return commsMLClient.isAvailable();
  }

  async trackInteraction(userId: string, eventType: string, targetUserId?: string, metadata?: any): Promise<void> {
    try {
      let sentimentScore: string | null = null;
      if (eventType === 'message_sent' && metadata?.content) {
        const enhanced = await this.analyzeSentimentEnhanced(metadata.content);
        sentimentScore = enhanced.score.toString();
        metadata = { ...metadata, sentimentLabel: enhanced.label, sentimentConfidence: enhanced.confidence, sentimentMethod: enhanced.method, toxicity: enhanced.toxicity };
      }

      const featureVector = this.buildFeatureVector(eventType, metadata);

      await db.insert(commsInteractionEvents).values({
        userId,
        eventType,
      });

      const currentCount = (this.interactionCounters.get(userId) || 0) + 1;
      this.interactionCounters.set(userId, currentCount);

      if (currentCount % 10 === 0) {
        this.updateUserProfile(userId).catch(err =>
          console.error('[Comms Intelligence] Profile update error:', err.message)
        );
      }
    } catch (err: any) {
      console.error('[Comms Intelligence] Track interaction error:', err.message);
    }
  }

  private buildFeatureVector(eventType: string, metadata?: any): number[] {
    const typeMap: Record<string, number> = {
      message_sent: 1, message_received: 2, call_started: 3, call_ended: 4,
      file_shared: 5, location_shared: 6, reaction_sent: 7, stream_started: 8, stream_viewed: 9,
    };
    const hour = new Date().getHours();
    const dayOfWeek = new Date().getDay();

    return [
      typeMap[eventType] || 0,
      hour / 24,
      dayOfWeek / 7,
      (metadata?.contentLength || 0) / 1000,
      parseFloat(metadata?.sentimentScore || '0'),
      (metadata?.responseTimeMs || 0) / 60000,
      (metadata?.callQuality === 'HD' ? 1 : metadata?.callQuality === 'SD' ? 0.5 : 0),
    ];
  }

  async updateUserProfile(userId: string): Promise<void> {
    try {
      const events = await db.select()
        .from(commsInteractionEvents)
        .where(eq(commsInteractionEvents.userId, userId))
        .orderBy(desc(commsInteractionEvents.createdAt))
        .limit(100);

      if (events.length === 0) return;

      const messageEvents = events.filter(e => e.eventType === 'message_sent');
      const callEvents = events.filter(e => e.eventType === 'call_started' || e.eventType === 'call_ended');

      const avgMsgLength = messageEvents.length > 0
        ? messageEvents.reduce((sum, e) => sum + ((e.metadata as any)?.contentLength || 0), 0) / messageEvents.length
        : 0;

      const hourCounts = new Array(24).fill(0);
      events.forEach(e => {
        if (e.createdAt) hourCounts[new Date(e.createdAt).getHours()]++;
      });
      const peakHours = hourCounts
        .map((count, hour) => ({ hour, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map(h => h.hour);

      const channelCounts: Record<string, number> = {};
      events.forEach(e => {
        channelCounts[e.eventType] = (channelCounts[e.eventType] || 0) + 1;
      });
      const preferredChannels = Object.entries(channelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([channel]) => channel);

      const sentimentScores = events
        .filter(e => e.sentimentScore)
        .map(e => parseFloat(e.sentimentScore!));
      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      const moodDistribution: Record<string, number> = { positive: 0, neutral: 0, negative: 0 };
      sentimentScores.forEach(s => {
        if (s > 0.1) moodDistribution.positive++;
        else if (s < -0.1) moodDistribution.negative++;
        else moodDistribution.neutral++;
      });

      const emotionalTrend = (() => {
        if (sentimentScores.length < 4) return 'stable';
        const recentAvg = sentimentScores.slice(0, Math.floor(sentimentScores.length / 2))
          .reduce((a, b) => a + b, 0) / Math.floor(sentimentScores.length / 2);
        const olderAvg = sentimentScores.slice(Math.floor(sentimentScores.length / 2))
          .reduce((a, b) => a + b, 0) / (sentimentScores.length - Math.floor(sentimentScores.length / 2));
        if (recentAvg - olderAvg > 0.1) return 'improving';
        if (olderAvg - recentAvg > 0.1) return 'declining';
        return 'stable';
      })();

      const firstEvent = events[events.length - 1];
      const lastEvent = events[0];
      const daySpan = firstEvent?.createdAt && lastEvent?.createdAt
        ? Math.max(1, (new Date(lastEvent.createdAt).getTime() - new Date(firstEvent.createdAt).getTime()) / 86400000)
        : 1;
      const messagingFrequency = messageEvents.length / daySpan;

      const avgCallDurationSec = callEvents.length > 0
        ? callEvents.reduce((sum, e) => sum + ((e.metadata as any)?.duration || 0), 0) / Math.max(1, callEvents.filter(e => e.eventType === 'call_ended').length)
        : 0;

      const embeddings = events.slice(0, 20).map(e => e.featureVector).filter(Boolean);

      const existing = await db.select().from(commsUserProfiles).where(eq(commsUserProfiles.userId, userId)).limit(1);

      const profileData = {
        displayName: userId,
        communicationPatterns: {
          avgMsgLength: Math.round(avgMsgLength),
          peakHours,
          preferredChannels,
          responseTimeMs: 0,
          avgCallDurationSec: Math.round(avgCallDurationSec),
          messagingFrequency: parseFloat(messagingFrequency.toFixed(2)),
        },
        sentimentProfile: {
          avgSentiment: parseFloat(avgSentiment.toFixed(3)),
          moodDistribution,
          emotionalTrend,
        },
        interactionEmbeddings: embeddings,
        totalInteractions: events.length,
        lastAnalyzedAt: new Date(),
        updatedAt: new Date(),
      };

      if (existing.length > 0) {
        await db.update(commsUserProfiles)
          .set({
            communicationPatterns: profileData.communicationPatterns,
            sentimentProfile: profileData.sentimentProfile,
            interactionEmbeddings: profileData.interactionEmbeddings,
            totalInteractions: profileData.totalInteractions,
            lastAnalyzedAt: profileData.lastAnalyzedAt,
            updatedAt: profileData.updatedAt,
          })
          .where(eq(commsUserProfiles.userId, userId));
      } else {
        await db.insert(commsUserProfiles).values({
          userId,
          ...profileData,
        });
      }
    } catch (err: any) {
      console.error('[Comms Intelligence] Update profile error:', err.message);
    }
  }

  async suggestContacts(userId: string, limit: number = 10): Promise<Array<{ contactId: string; relevanceScore: number; reason: string }>> {
    try {
      const events = await db.select()
        .from(commsInteractionEvents)
        .where(eq(commsInteractionEvents.userId, userId))
        .orderBy(desc(commsInteractionEvents.createdAt))
        .limit(500);

      const contactStats: Map<string, { frequency: number; lastInteraction: Date; eventTypes: Set<string> }> = new Map();

      for (const event of events) {
        if (!event.targetUserId || event.targetUserId === userId) continue;
        const stats = contactStats.get(event.targetUserId) || {
          frequency: 0,
          lastInteraction: new Date(0),
          eventTypes: new Set<string>(),
        };
        stats.frequency++;
        const eventTime = event.createdAt ? new Date(event.createdAt) : new Date();
        if (eventTime > stats.lastInteraction) stats.lastInteraction = eventTime;
        stats.eventTypes.add(event.eventType);
        contactStats.set(event.targetUserId, stats);
      }

      const now = Date.now();
      const maxFreq = Math.max(1, ...Array.from(contactStats.values()).map(s => s.frequency));

      const suggestions = Array.from(contactStats.entries()).map(([contactId, stats]) => {
        const frequencyScore = stats.frequency / maxFreq;
        const recencyDays = (now - stats.lastInteraction.getTime()) / 86400000;
        const recencyScore = Math.max(0, 1 - recencyDays / 30);
        const diversityScore = stats.eventTypes.size / 5;

        const relevanceScore = parseFloat((frequencyScore * 0.4 + recencyScore * 0.3 + diversityScore * 0.3).toFixed(3));

        const reasons: string[] = [];
        if (frequencyScore > 0.5) reasons.push('frequent contact');
        if (recencyScore > 0.7) reasons.push('recently active');
        if (diversityScore > 0.4) reasons.push('diverse interactions');
        if (reasons.length === 0) reasons.push('interaction history');

        return { contactId, relevanceScore, reason: reasons.join(', ') };
      });

      return suggestions.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, limit);
    } catch (err: any) {
      console.error('[Comms Intelligence] Suggest contacts error:', err.message);
      return [];
    }
  }

  async predictBestCallTime(userId: string, targetUserId: string): Promise<{ bestHour: number; bestDay: string; confidence: number }> {
    try {
      const userEvents = await db.select()
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, userId),
          eq(commsInteractionEvents.eventType, 'call_started')
        ))
        .orderBy(desc(commsInteractionEvents.createdAt))
        .limit(50);

      const targetEvents = await db.select()
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, targetUserId),
          eq(commsInteractionEvents.eventType, 'call_started')
        ))
        .orderBy(desc(commsInteractionEvents.createdAt))
        .limit(50);

      const allEvents = [...userEvents, ...targetEvents];

      if (allEvents.length === 0) {
        return { bestHour: 10, bestDay: 'Monday', confidence: 0.2 };
      }

      const hourCounts = new Array(24).fill(0);
      const dayCounts = new Array(7).fill(0);
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

      allEvents.forEach(e => {
        if (e.createdAt) {
          const d = new Date(e.createdAt);
          hourCounts[d.getHours()]++;
          dayCounts[d.getDay()]++;
        }
      });

      const bestHour = hourCounts.indexOf(Math.max(...hourCounts));
      const bestDayIdx = dayCounts.indexOf(Math.max(...dayCounts));
      const confidence = Math.min(1, allEvents.length / 20);

      return { bestHour, bestDay: dayNames[bestDayIdx], confidence: parseFloat(confidence.toFixed(2)) };
    } catch (err: any) {
      console.error('[Comms Intelligence] Predict call time error:', err.message);
      return { bestHour: 10, bestDay: 'Monday', confidence: 0.1 };
    }
  }

  async detectAnomalies(userId: string): Promise<Array<{ type: string; severity: string; description: string; timestamp: string }>> {
    try {
      const oneHourAgo = new Date(Date.now() - 3600000);
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);

      const recentEvents = await db.select()
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, userId),
          gte(commsInteractionEvents.createdAt, oneHourAgo)
        ));

      const baselineEvents = await db.select()
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, userId),
          gte(commsInteractionEvents.createdAt, sevenDaysAgo)
        ));

      const anomalies: Array<{ type: string; severity: string; description: string; timestamp: string }> = [];

      const baselineHourlyRate = baselineEvents.length / (7 * 24);
      if (recentEvents.length > baselineHourlyRate * 3 && recentEvents.length > 5) {
        anomalies.push({
          type: 'activity_spike',
          severity: recentEvents.length > baselineHourlyRate * 5 ? 'critical' : 'warning',
          description: `Unusual activity spike: ${recentEvents.length} events in last hour (baseline: ${baselineHourlyRate.toFixed(1)}/hr)`,
          timestamp: new Date().toISOString(),
        });
      }

      const currentHour = new Date().getHours();
      if ((currentHour < 6 || currentHour > 23) && recentEvents.length > 2) {
        anomalies.push({
          type: 'off_hours',
          severity: 'warning',
          description: `Off-hours activity detected at ${currentHour}:00 with ${recentEvents.length} events`,
          timestamp: new Date().toISOString(),
        });
      }

      const recentSentiments = recentEvents
        .filter(e => e.sentimentScore)
        .map(e => parseFloat(e.sentimentScore!));
      if (recentSentiments.length >= 3) {
        const avgRecent = recentSentiments.reduce((a, b) => a + b, 0) / recentSentiments.length;
        if (avgRecent < -0.3) {
          anomalies.push({
            type: 'sentiment_drop',
            severity: avgRecent < -0.6 ? 'critical' : 'warning',
            description: `Significant negative sentiment detected (avg: ${avgRecent.toFixed(2)})`,
            timestamp: new Date().toISOString(),
          });
        }
      }

      return anomalies;
    } catch (err: any) {
      console.error('[Comms Intelligence] Anomaly detection error:', err.message);
      return [];
    }
  }

  getSmartRouting(sentimentScore: number, contentLength: number, hasUrgencyKeywords: boolean): string {
    if (hasUrgencyKeywords || sentimentScore < -0.3) return 'video';
    if (contentLength > 500 || Math.abs(sentimentScore) > 0.5) return 'voice';
    return 'text';
  }

  checkUrgency(text: string): boolean {
    const lower = text.toLowerCase();
    return URGENCY_KEYWORDS.some(kw => lower.includes(kw));
  }

  async getUserInsights(userId: string): Promise<any> {
    try {
      const profile = await db.select()
        .from(commsUserProfiles)
        .where(eq(commsUserProfiles.userId, userId))
        .limit(1);

      const recentSentiments = await db.select()
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, userId),
          sql`${commsInteractionEvents.sentimentScore} IS NOT NULL`
        ))
        .orderBy(desc(commsInteractionEvents.createdAt))
        .limit(20);

      const anomalies = await this.detectAnomalies(userId);
      const suggestions = await this.suggestContacts(userId, 5);
      const churnRisk = await this.calculateChurnRisk(userId);

      const sentimentTrend = recentSentiments.map(e => ({
        score: parseFloat(e.sentimentScore || '0'),
        timestamp: e.createdAt?.toISOString(),
      }));

      return {
        profile: profile[0] || null,
        sentimentTrend,
        anomalies,
        contactSuggestions: suggestions,
        churnRisk,
        recommendations: this.generateRecommendations(profile[0] || null, anomalies, churnRisk),
      };
    } catch (err: any) {
      console.error('[Comms Intelligence] Get insights error:', err.message);
      return { profile: null, sentimentTrend: [], anomalies: [], contactSuggestions: [], churnRisk: 0, recommendations: [] };
    }
  }

  private generateRecommendations(profile: any, anomalies: any[], churnRisk: number): string[] {
    const recs: string[] = [];

    if (!profile) {
      recs.push('Send more messages to build your communication profile');
      return recs;
    }

    const patterns = profile.communicationPatterns as any;
    const sentiment = profile.sentimentProfile as any;

    if (sentiment?.avgSentiment < -0.1) {
      recs.push('Your recent communication tone has been negative — consider positive engagement');
    }
    if (patterns?.messagingFrequency > 50) {
      recs.push('High messaging frequency detected — consider consolidating messages');
    }
    if (patterns?.avgCallDurationSec > 1800) {
      recs.push('Long call durations — consider agenda-based calls for efficiency');
    }
    if (churnRisk > 0.6) {
      recs.push('Engagement declining — reconnect with key contacts');
    }
    if (anomalies.length > 0) {
      recs.push(`${anomalies.length} behavioral anomaly(s) detected — review security`);
    }
    if (patterns?.peakHours?.includes(0) || patterns?.peakHours?.includes(1) || patterns?.peakHours?.includes(2)) {
      recs.push('Late-night communication detected — consider adjusting schedule');
    }

    if (recs.length === 0) {
      recs.push('Communication patterns are healthy — keep it up');
    }

    return recs;
  }

  async clusterUsers(): Promise<Array<{ userId: string; cluster: string; features: number[] }>> {
    try {
      const profiles = await db.select().from(commsUserProfiles);

      if (profiles.length === 0) return [];

      const featureVectors = profiles.map(p => {
        const patterns = p.communicationPatterns as any;
        const sentiment = p.sentimentProfile as any;
        return {
          userId: p.userId,
          features: [
            patterns?.messagingFrequency || 0,
            patterns?.avgCallDurationSec || 0,
            sentiment?.avgSentiment || 0,
            p.totalInteractions || 0,
          ],
        };
      });

      const maxVals = [0, 0, 0, 0];
      featureVectors.forEach(fv => {
        fv.features.forEach((val, i) => {
          maxVals[i] = Math.max(maxVals[i], Math.abs(val));
        });
      });

      const normalized = featureVectors.map(fv => ({
        userId: fv.userId,
        features: fv.features.map((val, i) => maxVals[i] > 0 ? val / maxVals[i] : 0),
      }));

      return normalized.map(user => {
        const [msgFreq, callDur, sentiment] = user.features;
        let cluster = 'observer';
        if (msgFreq > 0.7 && callDur > 0.5) cluster = 'power_communicator';
        else if (msgFreq > 0.5) cluster = 'active_messenger';
        else if (callDur > 0.5) cluster = 'call_preferred';
        else if (sentiment > 0.3) cluster = 'positive_engager';
        else if (sentiment < -0.3) cluster = 'needs_attention';

        return { userId: user.userId, cluster, features: user.features };
      });
    } catch (err: any) {
      console.error('[Comms Intelligence] Cluster users error:', err.message);
      return [];
    }
  }

  async calculateChurnRisk(userId: string): Promise<number> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000);
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000);

      const recentEvents = await db.select({ count: count() })
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, userId),
          gte(commsInteractionEvents.createdAt, sevenDaysAgo)
        ));

      const olderEvents = await db.select({ count: count() })
        .from(commsInteractionEvents)
        .where(and(
          eq(commsInteractionEvents.userId, userId),
          gte(commsInteractionEvents.createdAt, fourteenDaysAgo),
          sql`${commsInteractionEvents.createdAt} < ${sevenDaysAgo}`
        ));

      const recent = recentEvents[0]?.count || 0;
      const older = olderEvents[0]?.count || 0;

      if (older === 0 && recent === 0) return 0.5;
      if (older === 0) return 0.1;
      if (recent === 0) return 0.9;

      const ratio = recent / older;
      if (ratio >= 1) return Math.max(0, 0.2 - (ratio - 1) * 0.1);
      return Math.min(1, 1 - ratio);
    } catch (err: any) {
      console.error('[Comms Intelligence] Churn risk error:', err.message);
      return 0.5;
    }
  }

  async getNetworkHealth(): Promise<any> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const totalProfiles = await db.select({ count: count() }).from(commsUserProfiles);
      const activeToday = await db.select({ count: count() })
        .from(commsInteractionEvents)
        .where(gte(commsInteractionEvents.createdAt, today));

      const messagesToday = await db.select({ count: count() })
        .from(commsInteractionEvents)
        .where(and(
          gte(commsInteractionEvents.createdAt, today),
          eq(commsInteractionEvents.eventType, 'message_sent')
        ));

      const recentSentiments = await db.select()
        .from(commsInteractionEvents)
        .where(and(
          gte(commsInteractionEvents.createdAt, today),
          sql`${commsInteractionEvents.sentimentScore} IS NOT NULL`
        ));

      const sentimentScores = recentSentiments.map(e => parseFloat(e.sentimentScore || '0'));
      const avgSentiment = sentimentScores.length > 0
        ? sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length
        : 0;

      const callsToday = await db.select({ count: count() })
        .from(commsInteractionEvents)
        .where(and(
          gte(commsInteractionEvents.createdAt, today),
          eq(commsInteractionEvents.eventType, 'call_started')
        ));

      const callEndsToday = await db.select({ count: count() })
        .from(commsInteractionEvents)
        .where(and(
          gte(commsInteractionEvents.createdAt, today),
          eq(commsInteractionEvents.eventType, 'call_ended')
        ));

      const callSuccessRate = (callsToday[0]?.count || 0) > 0
        ? ((callEndsToday[0]?.count || 0) / (callsToday[0]?.count || 1)) * 100
        : 100;

      return {
        totalUsers: totalProfiles[0]?.count || 0,
        activeToday: activeToday[0]?.count || 0,
        messagesToday: messagesToday[0]?.count || 0,
        avgSentiment: parseFloat(avgSentiment.toFixed(3)),
        sentimentLabel: avgSentiment > 0.1 ? 'positive' : avgSentiment < -0.1 ? 'negative' : 'neutral',
        callSuccessRate: parseFloat(callSuccessRate.toFixed(1)),
        callsToday: callsToday[0]?.count || 0,
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error('[Comms Intelligence] Network health error:', err.message);
      return {
        totalUsers: 0, activeToday: 0, messagesToday: 0,
        avgSentiment: 0, sentimentLabel: 'neutral',
        callSuccessRate: 100, callsToday: 0,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

export const commsIntelligence = new CommsIntelligenceEngine();
