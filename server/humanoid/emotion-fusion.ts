interface EmotionScores {
  happy: number;
  sad: number;
  angry: number;
  calm: number;
  confused: number;
  surprised: number;
  fearful: number;
  disgusted: number;
  neutral: number;
  excited: number;
  empathetic: number;
  curious: number;
}

interface FacialLandmarks {
  eyebrows?: { position: number; furrow: number };
  mouth?: { curvature: number; openness: number };
  eyes?: { openness: number; gazeDirection: string };
  jaw?: { tension: number };
}

interface VoiceFeatures {
  pitchMean: number;
  pitchVariation: number;
  speechRate: number;
  volume: number;
  energy: number;
  pauseFrequency: number;
}

interface EmotionFusionResult {
  dominant: string;
  dominantScore: number;
  scores: Partial<EmotionScores>;
  confidence: number;
  valence: number;
  arousal: number;
  sources: {
    text?: Partial<EmotionScores>;
    voice?: Partial<EmotionScores>;
    facial?: Partial<EmotionScores>;
  };
  suggestedTone: string;
  suggestedApproach: string;
  isCrisis: boolean;
  crisisType?: string;
}

interface UserEmotionalProfile {
  userId: string;
  baselineEmotion: string;
  emotionalHistory: { emotion: string; timestamp: number; score: number }[];
  moodTrend: 'improving' | 'declining' | 'stable';
  empathyNeeded: number;
  engagementLevel: number;
}

const SENSOR_WEIGHTS = {
  text: 0.35,
  voice: 0.40,
  facial: 0.25,
};

const CRISIS_KEYWORDS = [
  'suicide', 'kill myself', 'end it all', 'want to die', 'no reason to live',
  'self-harm', 'hurt myself', 'cutting', 'overdose',
  'violence', 'attack', 'weapon', 'bomb', 'threat',
  'abuse', 'assault', 'trafficking',
];

const EMOTION_KEYWORDS: Record<string, { words: string[]; weight: number }> = {
  happy: { words: ['happy', 'joy', 'glad', 'delighted', 'pleased', 'wonderful', 'fantastic', 'great', 'love', 'amazing', 'awesome', 'excellent', 'perfect', 'beautiful', 'blessed'], weight: 0.7 },
  sad: { words: ['sad', 'depressed', 'lonely', 'heartbroken', 'grief', 'miserable', 'hopeless', 'empty', 'loss', 'mourning', 'crying', 'tears', 'devastated', 'broken'], weight: 0.7 },
  angry: { words: ['angry', 'furious', 'rage', 'hate', 'disgusted', 'outraged', 'frustrated', 'annoyed', 'irritated', 'mad', 'livid', 'hostile'], weight: 0.7 },
  fearful: { words: ['scared', 'afraid', 'terrified', 'anxious', 'panic', 'worried', 'nervous', 'dread', 'phobia', 'horror', 'frightened'], weight: 0.65 },
  surprised: { words: ['surprised', 'shocked', 'amazed', 'astonished', 'stunned', 'unexpected', 'unbelievable', 'wow', 'incredible'], weight: 0.6 },
  confused: { words: ['confused', 'lost', 'puzzled', 'bewildered', 'uncertain', 'unclear', 'misunderstand', 'complicated', "don't understand", "don't get"], weight: 0.6 },
  excited: { words: ['excited', 'thrilled', 'ecstatic', 'pumped', 'hyped', 'eager', 'enthusiastic', 'fired up', "can't wait", 'stoked'], weight: 0.65 },
  calm: { words: ['calm', 'peaceful', 'relaxed', 'serene', 'tranquil', 'composed', 'centered', 'mindful', 'balanced'], weight: 0.5 },
  curious: { words: ['curious', 'wonder', 'interested', 'fascinated', 'intrigued', 'how does', 'why does', 'what if', 'tell me more'], weight: 0.55 },
  empathetic: { words: ['understand', 'feel for', 'relate', 'sympathize', 'compassion', 'empathy', 'support'], weight: 0.5 },
};

const TONE_SUGGESTIONS: Record<string, { tone: string; approach: string }> = {
  happy: { tone: 'warm, enthusiastic, and matching their positive energy', approach: 'Celebrate with them, share in their joy, and maintain upbeat energy' },
  sad: { tone: 'gentle, compassionate, and validating', approach: 'Listen actively, validate feelings without minimizing, offer genuine comfort' },
  angry: { tone: 'calm, measured, and non-defensive', approach: 'Acknowledge their frustration first, then help problem-solve without being dismissive' },
  fearful: { tone: 'reassuring, steady, and grounding', approach: 'Provide stability, factual reassurance, and actionable steps to address concerns' },
  surprised: { tone: 'engaged, curious, and sharing in their reaction', approach: 'Explore the surprise with them, ask follow-up questions' },
  confused: { tone: 'patient, clear, and supportive', approach: 'Break down complexity, use examples, check understanding frequently' },
  excited: { tone: 'energetic, enthusiastic, and encouraging', approach: 'Match their enthusiasm, build on their excitement, offer encouragement' },
  calm: { tone: 'relaxed, thoughtful, and present', approach: 'Maintain steady presence, engage in meaningful dialogue' },
  curious: { tone: 'informative, engaging, and intellectually stimulating', approach: 'Provide rich answers, explore tangents, fuel their curiosity' },
  neutral: { tone: 'professional, attentive, and responsive', approach: 'Be helpful and efficient while remaining warm and personable' },
  empathetic: { tone: 'deeply understanding, validating, and supportive', approach: 'Mirror their emotional state, provide emotional resonance' },
};

class MultimodalEmotionFusionEngine {
  private userProfiles: Map<string, UserEmotionalProfile> = new Map();

  analyzeTextEmotion(text: string): Partial<EmotionScores> {
    if (!text || text.trim().length === 0) {
      return { neutral: 1.0 };
    }

    const lower = text.toLowerCase();
    const scores: Partial<EmotionScores> = {};
    let totalWeight = 0;

    for (const [emotion, config] of Object.entries(EMOTION_KEYWORDS)) {
      let emotionScore = 0;
      for (const word of config.words) {
        if (lower.includes(word)) {
          emotionScore += config.weight;
        }
      }
      if (emotionScore > 0) {
        scores[emotion as keyof EmotionScores] = Math.min(1.0, emotionScore);
        totalWeight += emotionScore;
      }
    }

    if (totalWeight === 0) {
      scores.neutral = 0.8;
    } else {
      for (const key of Object.keys(scores) as (keyof EmotionScores)[]) {
        scores[key] = (scores[key] || 0) / Math.max(totalWeight, 1);
      }
    }

    return scores;
  }

  analyzeVoiceEmotion(features: VoiceFeatures): Partial<EmotionScores> {
    const scores: Partial<EmotionScores> = {};

    scores.happy = Math.min(1, (features.pitchMean * 0.3 + features.energy * 0.4 + features.speechRate * 0.3));
    scores.sad = Math.min(1, ((1 - features.energy) * 0.4 + (1 - features.pitchMean) * 0.3 + features.pauseFrequency * 0.3));
    scores.angry = Math.min(1, (features.energy * 0.5 + features.volume * 0.3 + features.pitchVariation * 0.2));
    scores.calm = Math.min(1, ((1 - features.energy) * 0.3 + (1 - features.pitchVariation) * 0.4 + (1 - features.speechRate) * 0.3));
    scores.excited = Math.min(1, (features.energy * 0.4 + features.speechRate * 0.3 + features.pitchVariation * 0.3));
    scores.confused = Math.min(1, (features.pitchVariation * 0.4 + features.pauseFrequency * 0.4 + (1 - features.speechRate) * 0.2));

    return this.normalizeScores(scores);
  }

  analyzeFacialEmotion(landmarks: FacialLandmarks): Partial<EmotionScores> {
    const scores: Partial<EmotionScores> = {};

    const mouth = landmarks.mouth || { curvature: 0, openness: 0 };
    const eyebrows = landmarks.eyebrows || { position: 0, furrow: 0 };
    const eyes = landmarks.eyes || { openness: 0.5, gazeDirection: 'center' };

    scores.happy = mouth.curvature > 0.2 ? Math.min(1, mouth.curvature * 2) : 0.1;
    scores.sad = (eyebrows.position < -0.1 && mouth.curvature < 0) ? 0.7 : 0.1;
    scores.angry = (eyebrows.furrow > 0.3 && eyes.openness < 0.5) ? 0.7 : 0.1;
    scores.surprised = (eyes.openness > 0.7 && mouth.openness > 0.4) ? 0.8 : 0.1;
    scores.fearful = (eyes.openness > 0.6 && eyebrows.position > 0.2) ? 0.6 : 0.1;
    scores.disgusted = (mouth.curvature < -0.3 && eyebrows.furrow > 0.2) ? 0.6 : 0.1;
    scores.neutral = Math.max(0, 1 - Object.values(scores).reduce((a, b) => a + b, 0) / 3);

    return this.normalizeScores(scores);
  }

  fuseEmotions(
    textEmotion?: Partial<EmotionScores>,
    voiceEmotion?: Partial<EmotionScores>,
    facialEmotion?: Partial<EmotionScores>
  ): EmotionFusionResult {
    const fused: Partial<EmotionScores> = {};
    const allEmotions = new Set<keyof EmotionScores>();

    const sources: EmotionFusionResult['sources'] = {};
    let totalWeight = 0;

    if (textEmotion) {
      sources.text = textEmotion;
      for (const key of Object.keys(textEmotion) as (keyof EmotionScores)[]) {
        allEmotions.add(key);
      }
      totalWeight += SENSOR_WEIGHTS.text;
    }

    if (voiceEmotion) {
      sources.voice = voiceEmotion;
      for (const key of Object.keys(voiceEmotion) as (keyof EmotionScores)[]) {
        allEmotions.add(key);
      }
      totalWeight += SENSOR_WEIGHTS.voice;
    }

    if (facialEmotion) {
      sources.facial = facialEmotion;
      for (const key of Object.keys(facialEmotion) as (keyof EmotionScores)[]) {
        allEmotions.add(key);
      }
      totalWeight += SENSOR_WEIGHTS.facial;
    }

    if (totalWeight === 0) {
      return {
        dominant: 'neutral',
        dominantScore: 1,
        scores: { neutral: 1 },
        confidence: 0,
        valence: 0,
        arousal: 0.5,
        sources: {},
        suggestedTone: TONE_SUGGESTIONS.neutral.tone,
        suggestedApproach: TONE_SUGGESTIONS.neutral.approach,
        isCrisis: false,
      };
    }

    for (const emotion of allEmotions) {
      let weightedSum = 0;
      let appliedWeight = 0;

      if (textEmotion && textEmotion[emotion] !== undefined) {
        weightedSum += (textEmotion[emotion] || 0) * SENSOR_WEIGHTS.text;
        appliedWeight += SENSOR_WEIGHTS.text;
      }
      if (voiceEmotion && voiceEmotion[emotion] !== undefined) {
        weightedSum += (voiceEmotion[emotion] || 0) * SENSOR_WEIGHTS.voice;
        appliedWeight += SENSOR_WEIGHTS.voice;
      }
      if (facialEmotion && facialEmotion[emotion] !== undefined) {
        weightedSum += (facialEmotion[emotion] || 0) * SENSOR_WEIGHTS.facial;
        appliedWeight += SENSOR_WEIGHTS.facial;
      }

      fused[emotion] = appliedWeight > 0 ? weightedSum / appliedWeight : 0;
    }

    const normalizedFused = this.normalizeScores(fused);

    let dominant = 'neutral';
    let dominantScore = 0;
    for (const [emotion, score] of Object.entries(normalizedFused)) {
      if ((score || 0) > dominantScore) {
        dominant = emotion;
        dominantScore = score || 0;
      }
    }

    const sourceCount = [textEmotion, voiceEmotion, facialEmotion].filter(Boolean).length;
    const confidence = Math.min(1, dominantScore * 0.6 + (sourceCount / 3) * 0.4);

    const positiveEmotions = ['happy', 'excited', 'calm', 'curious', 'empathetic'];
    const negativeEmotions = ['sad', 'angry', 'fearful', 'disgusted'];
    let valence = 0;
    for (const e of positiveEmotions) {
      valence += normalizedFused[e as keyof EmotionScores] || 0;
    }
    for (const e of negativeEmotions) {
      valence -= normalizedFused[e as keyof EmotionScores] || 0;
    }
    valence = Math.max(-1, Math.min(1, valence));

    const highArousal = ['excited', 'angry', 'surprised', 'fearful'];
    const lowArousal = ['calm', 'sad'];
    let arousal = 0.5;
    for (const e of highArousal) {
      arousal += (normalizedFused[e as keyof EmotionScores] || 0) * 0.15;
    }
    for (const e of lowArousal) {
      arousal -= (normalizedFused[e as keyof EmotionScores] || 0) * 0.15;
    }
    arousal = Math.max(0, Math.min(1, arousal));

    const toneInfo = TONE_SUGGESTIONS[dominant] || TONE_SUGGESTIONS.neutral;

    return {
      dominant,
      dominantScore,
      scores: normalizedFused,
      confidence,
      valence,
      arousal,
      sources,
      suggestedTone: toneInfo.tone,
      suggestedApproach: toneInfo.approach,
      isCrisis: false,
    };
  }

  detectCrisis(text: string): { isCrisis: boolean; type?: string; severity?: number } {
    if (!text) return { isCrisis: false };

    const lower = text.toLowerCase();
    for (const keyword of CRISIS_KEYWORDS) {
      if (lower.includes(keyword)) {
        const severity = keyword.includes('suicide') || keyword.includes('kill') || keyword.includes('die')
          ? 1.0
          : keyword.includes('harm') || keyword.includes('violence')
          ? 0.8
          : 0.6;

        return {
          isCrisis: true,
          type: keyword.includes('suicide') || keyword.includes('kill') || keyword.includes('die')
            ? 'self_harm'
            : keyword.includes('violence') || keyword.includes('attack') || keyword.includes('weapon')
            ? 'violence'
            : 'abuse',
          severity,
        };
      }
    }

    return { isCrisis: false };
  }

  analyzeFullInput(
    text: string,
    voiceFeatures?: VoiceFeatures,
    facialLandmarks?: FacialLandmarks
  ): EmotionFusionResult {
    const crisisCheck = this.detectCrisis(text);

    const textEmotion = this.analyzeTextEmotion(text);
    const voiceEmotion = voiceFeatures ? this.analyzeVoiceEmotion(voiceFeatures) : undefined;
    const facialEmotion = facialLandmarks ? this.analyzeFacialEmotion(facialLandmarks) : undefined;

    const result = this.fuseEmotions(textEmotion, voiceEmotion, facialEmotion);

    if (crisisCheck.isCrisis) {
      result.isCrisis = true;
      result.crisisType = crisisCheck.type;
      result.suggestedTone = 'extremely gentle, calm, supportive, and non-judgmental';
      result.suggestedApproach = 'Express genuine care, validate their experience, provide crisis resources, and stay present. Do not lecture or minimize.';
    }

    return result;
  }

  updateUserProfile(userId: string, emotionResult: EmotionFusionResult): void {
    let profile = this.userProfiles.get(userId);
    if (!profile) {
      profile = {
        userId,
        baselineEmotion: 'neutral',
        emotionalHistory: [],
        moodTrend: 'stable',
        empathyNeeded: 0.5,
        engagementLevel: 0.5,
      };
    }

    profile.emotionalHistory.push({
      emotion: emotionResult.dominant,
      timestamp: Date.now(),
      score: emotionResult.dominantScore,
    });

    if (profile.emotionalHistory.length > 100) {
      profile.emotionalHistory = profile.emotionalHistory.slice(-100);
    }

    if (profile.emotionalHistory.length >= 5) {
      const recent = profile.emotionalHistory.slice(-5);
      const recentValences = recent.map(h => {
        const positives = ['happy', 'excited', 'calm', 'curious'];
        return positives.includes(h.emotion) ? h.score : -h.score;
      });

      const trend = recentValences[recentValences.length - 1] - recentValences[0];
      profile.moodTrend = trend > 0.1 ? 'improving' : trend < -0.1 ? 'declining' : 'stable';
    }

    const needsEmpathy = ['sad', 'angry', 'fearful', 'confused'];
    profile.empathyNeeded = needsEmpathy.includes(emotionResult.dominant)
      ? Math.min(1, 0.5 + emotionResult.dominantScore * 0.5)
      : Math.max(0, profile.empathyNeeded - 0.1);

    profile.engagementLevel = Math.min(1, emotionResult.arousal * 0.5 + emotionResult.confidence * 0.5);

    this.userProfiles.set(userId, profile);
  }

  getUserProfile(userId: string): UserEmotionalProfile | null {
    return this.userProfiles.get(userId) || null;
  }

  buildEmotionAwareSystemPrompt(emotionResult: EmotionFusionResult, userProfile?: UserEmotionalProfile | null): string {
    const parts: string[] = [];

    parts.push(`EMOTIONAL CONTEXT:`);
    parts.push(`- User's dominant emotion: ${emotionResult.dominant} (${(emotionResult.dominantScore * 100).toFixed(0)}% confidence)`);
    parts.push(`- Emotional valence: ${emotionResult.valence > 0 ? 'Positive' : emotionResult.valence < 0 ? 'Negative' : 'Neutral'} (${emotionResult.valence.toFixed(2)})`);
    parts.push(`- Arousal level: ${emotionResult.arousal > 0.6 ? 'High' : emotionResult.arousal < 0.4 ? 'Low' : 'Moderate'}`);
    parts.push(`- Suggested tone: ${emotionResult.suggestedTone}`);
    parts.push(`- Approach: ${emotionResult.suggestedApproach}`);

    if (userProfile) {
      parts.push(`\nUSER EMOTIONAL PROFILE:`);
      parts.push(`- Mood trend: ${userProfile.moodTrend}`);
      parts.push(`- Empathy needed: ${userProfile.empathyNeeded > 0.6 ? 'High' : userProfile.empathyNeeded > 0.3 ? 'Moderate' : 'Low'}`);
      parts.push(`- Engagement: ${userProfile.engagementLevel > 0.6 ? 'High' : userProfile.engagementLevel > 0.3 ? 'Moderate' : 'Low'}`);

      if (userProfile.moodTrend === 'declining') {
        parts.push(`- IMPORTANT: User mood is declining. Be extra supportive and check in on their wellbeing.`);
      }
    }

    if (emotionResult.isCrisis) {
      parts.push(`\nCRISIS ALERT: ${emotionResult.crisisType} detected.`);
      parts.push(`- Respond with extreme care, validate their experience, suggest professional resources`);
      parts.push(`- Crisis Hotline: 988 Suicide & Crisis Lifeline`);
      parts.push(`- Do NOT minimize, lecture, or provide generic advice`);
    }

    return parts.join('\n');
  }

  private normalizeScores(scores: Partial<EmotionScores>): Partial<EmotionScores> {
    const total = Object.values(scores).reduce((sum, v) => sum + (v || 0), 0);
    if (total === 0) return scores;

    const normalized: Partial<EmotionScores> = {};
    for (const [key, value] of Object.entries(scores)) {
      normalized[key as keyof EmotionScores] = parseFloat(((value || 0) / total).toFixed(4));
    }
    return normalized;
  }
}

export const emotionFusion = new MultimodalEmotionFusionEngine();
console.log("[Emotion Fusion] Multimodal emotion fusion engine initialized");
console.log("[Emotion Fusion] Sensor weights: Text=" + (SENSOR_WEIGHTS.text * 100) + "%, Voice=" + (SENSOR_WEIGHTS.voice * 100) + "%, Facial=" + (SENSOR_WEIGHTS.facial * 100) + "%");
