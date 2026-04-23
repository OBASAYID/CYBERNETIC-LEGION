interface ProsodySettings {
  emotion: string;
  speed: number;
  intensity: number;
  includeBreaths: boolean;
  includeHesitations: boolean;
  includeBackchanneling: boolean;
}

interface ProsodyResult {
  enhancedText: string;
  voiceSettings: {
    stability: number;
    similarity_boost: number;
    style: number;
    use_speaker_boost: boolean;
  };
  suggestedPauses: number[];
  naturalDelay: number;
}

const EMOTION_VOICE_PROFILES: Record<string, { stability: number; similarity_boost: number; style: number }> = {
  neutral:       { stability: 0.42, similarity_boost: 0.95, style: 0.72 },
  happy:         { stability: 0.35, similarity_boost: 0.96, style: 0.90 },
  excited:       { stability: 0.28, similarity_boost: 0.95, style: 1.0  },
  joyful:        { stability: 0.32, similarity_boost: 0.96, style: 0.95 },
  sad:           { stability: 0.55, similarity_boost: 0.94, style: 0.45 },
  melancholic:   { stability: 0.60, similarity_boost: 0.93, style: 0.38 },
  angry:         { stability: 0.50, similarity_boost: 0.94, style: 0.65 },
  frustrated:    { stability: 0.48, similarity_boost: 0.93, style: 0.60 },
  calm:          { stability: 0.55, similarity_boost: 0.95, style: 0.50 },
  peaceful:      { stability: 0.58, similarity_boost: 0.95, style: 0.45 },
  confident:     { stability: 0.40, similarity_boost: 0.96, style: 0.80 },
  assertive:     { stability: 0.38, similarity_boost: 0.95, style: 0.82 },
  uncertain:     { stability: 0.50, similarity_boost: 0.93, style: 0.42 },
  empathetic:    { stability: 0.48, similarity_boost: 0.95, style: 0.55 },
  compassionate: { stability: 0.50, similarity_boost: 0.95, style: 0.50 },
  curious:       { stability: 0.38, similarity_boost: 0.95, style: 0.68 },
  intrigued:     { stability: 0.36, similarity_boost: 0.94, style: 0.72 },
  thoughtful:    { stability: 0.50, similarity_boost: 0.95, style: 0.48 },
  reflective:    { stability: 0.52, similarity_boost: 0.94, style: 0.42 },
  warm:          { stability: 0.42, similarity_boost: 0.96, style: 0.75 },
  tender:        { stability: 0.48, similarity_boost: 0.96, style: 0.62 },
  playful:       { stability: 0.30, similarity_boost: 0.95, style: 0.88 },
  amused:        { stability: 0.33, similarity_boost: 0.95, style: 0.82 },
  concerned:     { stability: 0.52, similarity_boost: 0.95, style: 0.52 },
  worried:       { stability: 0.55, similarity_boost: 0.94, style: 0.48 },
  surprised:     { stability: 0.30, similarity_boost: 0.95, style: 0.92 },
  grateful:      { stability: 0.45, similarity_boost: 0.96, style: 0.70 },
  proud:         { stability: 0.38, similarity_boost: 0.96, style: 0.78 },
  encouraging:   { stability: 0.40, similarity_boost: 0.96, style: 0.75 },
  soothing:      { stability: 0.58, similarity_boost: 0.95, style: 0.40 },
};

const THINKING_FILLERS = [
  "Hmm...",
  "Well...",
  "Let me think about that...",
  "You know...",
  "So...",
  "Actually...",
  "I'd say...",
  "Here's the thing...",
  "That's a great question...",
];

const BREATH_PHRASES = [
  " — ",
  "... ",
  ", well, ",
  ", you see, ",
];

const ACKNOWLEDGMENT_SOUNDS = [
  "Mmhmm.",
  "Yeah, absolutely.",
  "I see what you mean.",
  "Right, I get that.",
  "That makes sense.",
  "Sure, I understand.",
  "Of course.",
  "I hear you.",
  "Totally.",
  "Exactly.",
];

const EMPATHETIC_INTERJECTIONS: Record<string, string[]> = {
  sad: ["I hear you, and I'm here for you.", "That must be really tough.", "I completely understand how you feel.", "I'm sorry you're going through that."],
  happy: ["That's so wonderful to hear!", "I love that for you!", "That genuinely makes me happy!", "How beautiful is that!"],
  angry: ["I completely understand your frustration.", "That's genuinely not okay.", "Your feelings are absolutely valid.", "I hear you, and you have every right to feel that way."],
  confused: ["Let me help you make sense of this.", "I can see why that's confusing.", "Good question — let me break it down.", "That's worth unpacking together."],
  excited: ["Oh, that's incredible!", "I'm getting excited just hearing about it!", "This is genuinely amazing!", "Tell me everything!"],
  worried: ["I understand your concern.", "Let's think through this together.", "It's natural to feel that way.", "We'll figure this out."],
  grateful: ["That means the world.", "I'm so touched you'd say that.", "Thank you, truly.", "That really warms my heart."],
  curious: ["Ooh, now that's interesting!", "I'd love to explore that.", "Great thinking — tell me more.", "That's a fascinating angle."],
  calm: ["I'm right here with you.", "Take your time.", "No rush at all.", "I'm listening."],
  proud: ["You should be so proud!", "That's a real achievement!", "Look at you — amazing!", "I knew you could do it!"],
};

class VoiceProsodyEngine {
  addNaturalProsody(text: string, settings: Partial<ProsodySettings> = {}): ProsodyResult {
    const {
      emotion = 'neutral',
      speed = 1.0,
      intensity = 0.5,
      includeBreaths = true,
      includeHesitations = true,
      includeBackchanneling = false,
    } = settings;

    let enhanced = text;

    enhanced = this.addHumanLikeQualities(enhanced, 'warm');

    if (includeHesitations && text.length > 50 && intensity > 0.3) {
      enhanced = this.insertThinkingPauses(enhanced, intensity);
    }

    enhanced = this.addEmotionalProsodyMarkers(enhanced, emotion, intensity);

    if (includeBreaths && text.length > 80) {
      enhanced = this.insertBreathMarkers(enhanced);
    }

    enhanced = this.adjustPaceForContent(enhanced);

    enhanced = this.addEmotionalEmphasis(enhanced, emotion);

    const voiceProfile = EMOTION_VOICE_PROFILES[emotion] || EMOTION_VOICE_PROFILES.neutral;
    const voiceSettings = {
      stability: voiceProfile.stability,
      similarity_boost: voiceProfile.similarity_boost,
      style: Math.min(1.0, voiceProfile.style * Math.max(0.5, intensity)),
      use_speaker_boost: true,
    };

    const naturalDelay = this.calculateNaturalResponseDelay(text, emotion);

    const suggestedPauses = this.identifyPausePoints(enhanced);

    return {
      enhancedText: enhanced,
      voiceSettings,
      suggestedPauses,
      naturalDelay,
    };
  }

  private insertThinkingPauses(text: string, intensity: number): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 1) return text;

    const result: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
      if (i === 1 && sentences.length > 3 && Math.random() < intensity * 0.4) {
        const filler = THINKING_FILLERS[Math.floor(Math.random() * THINKING_FILLERS.length)];
        result.push(filler);
      }
      result.push(sentences[i]);
    }
    return result.join(' ');
  }

  private addEmotionalProsodyMarkers(text: string, emotion: string, intensity: number): string {
    if (intensity < 0.2) return text;

    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length === 0) return text;

    if (emotion === 'excited' || emotion === 'happy' || emotion === 'joyful') {
      sentences[sentences.length - 1] = sentences[sentences.length - 1]
        .replace(/\.$/, '!')
        .replace(/,\s*$/, '!');
    }

    if (emotion === 'uncertain' || emotion === 'confused') {
      if (!sentences[sentences.length - 1].endsWith('?')) {
        const lastSentence = sentences[sentences.length - 1];
        if (lastSentence.length < 60 && Math.random() < 0.3) {
          sentences[sentences.length - 1] = lastSentence.replace(/[.!]$/, '...');
        }
      }
    }

    if (emotion === 'thoughtful' || emotion === 'reflective') {
      if (sentences.length > 2 && Math.random() < 0.4) {
        sentences.splice(1, 0, '...');
      }
    }

    if (emotion === 'empathetic' || emotion === 'compassionate' || emotion === 'tender') {
      if (sentences.length > 1 && Math.random() < 0.3) {
        sentences.splice(1, 0, '—');
      }
    }

    return sentences.join(' ');
  }

  private insertBreathMarkers(text: string): string {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length <= 2) return text;

    const result: string[] = [];
    for (let i = 0; i < sentences.length; i++) {
      result.push(sentences[i]);
      if (i > 0 && (i + 1) % 2 === 0 && i < sentences.length - 1 && Math.random() < 0.4) {
        const breath = BREATH_PHRASES[Math.floor(Math.random() * BREATH_PHRASES.length)];
        const nextSentence = sentences[i + 1];
        if (nextSentence) {
          sentences[i + 1] = breath.trim() + ' ' + nextSentence.charAt(0).toLowerCase() + nextSentence.slice(1);
        }
      }
    }

    return result.join(' ');
  }

  private addEmotionalEmphasis(text: string, emotion: string): string {
    if (emotion === 'excited' || emotion === 'joyful') {
      return text.replace(/really /gi, 'really ').replace(/so /gi, (m) => Math.random() > 0.7 ? 'sooo ' : m);
    }
    if (emotion === 'empathetic' || emotion === 'compassionate') {
      return text.replace(/I understand/gi, 'I truly understand').replace(/I'm sorry/gi, "I'm so sorry");
    }
    return text;
  }

  private adjustPaceForContent(text: string): string {
    return text
      .replace(/(\d+\.?\d*)\s*(percent|%)/gi, '$1 percent')
      .replace(/(\d{4,})/g, (match) => {
        return match.split('').join(' ');
      });
  }

  private calculateNaturalResponseDelay(userInput: string, emotion: string): number {
    const wordCount = userInput.split(/\s+/).length;
    let baseDelay = 150 + wordCount * 8;

    const emotionDelays: Record<string, number> = {
      thoughtful: 250,
      reflective: 220,
      sad: 200,
      melancholic: 220,
      uncertain: 200,
      calm: 150,
      peaceful: 150,
      empathetic: 180,
      compassionate: 200,
      neutral: 100,
      warm: 100,
      happy: 80,
      joyful: 60,
      excited: 50,
      surprised: 40,
      angry: 80,
      frustrated: 100,
      confident: 80,
      assertive: 60,
      curious: 100,
      intrigued: 120,
    };

    baseDelay += emotionDelays[emotion] || 100;
    baseDelay += (Math.random() - 0.5) * 80;

    return Math.max(50, Math.min(600, baseDelay));
  }

  private identifyPausePoints(text: string): number[] {
    const pausePoints: number[] = [];
    let pos = 0;

    for (const char of text) {
      pos++;
      if (char === '.' || char === '!' || char === '?') {
        pausePoints.push(pos);
      } else if (char === ',') {
        pausePoints.push(pos);
      } else if (char === '—') {
        pausePoints.push(pos);
      }
    }

    return pausePoints;
  }

  generateBackchannel(userEmotion: string): string {
    const key = userEmotion.toLowerCase();
    if (key in EMPATHETIC_INTERJECTIONS) {
      const options = EMPATHETIC_INTERJECTIONS[key];
      return options[Math.floor(Math.random() * options.length)];
    }
    return ACKNOWLEDGMENT_SOUNDS[Math.floor(Math.random() * ACKNOWLEDGMENT_SOUNDS.length)];
  }

  getEmotionFromSentiment(sentimentScore: number, confidence: number): string {
    if (confidence < 0.2) return 'neutral';
    if (sentimentScore > 0.7) return 'joyful';
    if (sentimentScore > 0.5) return 'happy';
    if (sentimentScore > 0.3) return 'warm';
    if (sentimentScore > 0.1) return 'calm';
    if (sentimentScore > -0.1) return 'thoughtful';
    if (sentimentScore > -0.3) return 'concerned';
    if (sentimentScore > -0.5) return 'empathetic';
    return 'compassionate';
  }

  deriveAIEmotion(userEmotion: string): string {
    const empathyMap: Record<string, string> = {
      happy: 'warm',
      excited: 'excited',
      joyful: 'joyful',
      sad: 'compassionate',
      melancholic: 'tender',
      angry: 'calm',
      frustrated: 'empathetic',
      confused: 'encouraging',
      neutral: 'warm',
      calm: 'peaceful',
      uncertain: 'encouraging',
      curious: 'intrigued',
      thoughtful: 'reflective',
      worried: 'soothing',
      grateful: 'warm',
      proud: 'proud',
      surprised: 'curious',
    };

    return empathyMap[userEmotion] || 'warm';
  }

  addHumanLikeQualities(text: string, personality: 'professional' | 'casual' | 'warm' = 'professional'): string {
    let result = text;

    result = result
      .replace(/\bI am\b/g, () => Math.random() > 0.4 ? "I'm" : "I am")
      .replace(/\bdo not\b/g, () => Math.random() > 0.4 ? "don't" : "do not")
      .replace(/\bcan not\b/g, () => Math.random() > 0.4 ? "can't" : "cannot")
      .replace(/\bwill not\b/g, () => Math.random() > 0.4 ? "won't" : "will not")
      .replace(/\bit is\b/g, () => Math.random() > 0.5 ? "it's" : "it is")
      .replace(/\bthat is\b/g, () => Math.random() > 0.5 ? "that's" : "that is")
      .replace(/\bthey are\b/g, () => Math.random() > 0.5 ? "they're" : "they are");

    if (personality === 'warm') {
      const warmOpeners = [
        "You know, ",
        "Honestly, ",
        "I have to say, ",
        "Between us, ",
        "I think ",
        "Here's what I feel — ",
      ];
      if (Math.random() > 0.65 && !result.startsWith("I ") && !result.startsWith("You ") && result.length > 30) {
        const opener = warmOpeners[Math.floor(Math.random() * warmOpeners.length)];
        result = opener + result.charAt(0).toLowerCase() + result.slice(1);
      }
    }

    return result;
  }
}

export const voiceProsody = new VoiceProsodyEngine();
console.log("[Voice Prosody] Natural speech prosody engine initialized");
console.log("[Voice Prosody] Emotion profiles: " + Object.keys(EMOTION_VOICE_PROFILES).length + " modes");
