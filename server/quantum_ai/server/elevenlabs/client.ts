import fetch from "node-fetch";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = "https://api.elevenlabs.io/v1";

export const ELEVENLABS_VOICES = {
  // CYRUS Primary Voice - Sweet, warm, natural feminine
  cyrus: "21m00Tcm4TlvDq8ikWAM", // Rachel - optimized for CYRUS personality
  rachel: "21m00Tcm4TlvDq8ikWAM",

  // Alternative feminine voices for variety
  nova: "21m00Tcm4TlvDq8ikWAM", // High-quality feminine voice
  bella: "EXAVITQu4vr4xnSDxMaL",
  emily: "LcfcDJNUP1GQjkzn1xUU",
  charlotte: "XB0fDUnXU5powFXDhCwa",

  // Additional voices for different contexts
  domi: "AZnzlk1XvdvUeBnXmlld",
  elli: "MF3mGyEYCl7XYWbV9V6O",
  sarah: "EXAVITQu4vr4xnSDxMaL",
} as const;

export type ElevenLabsVoice = keyof typeof ELEVENLABS_VOICES;

export function getEmotionVoiceSettings(emotion: string): Partial<VoiceSettings> {
  const emotionKey = emotion.toLowerCase();
  return EMOTION_VOICE_PRESETS[emotionKey] || EMOTION_VOICE_PRESETS.neutral;
}

export function analyzeTextForEmotion(text: string): string {
  const lowerText = text.toLowerCase();

  // Positive emotions
  if (lowerText.includes("happy") || lowerText.includes("great") || lowerText.includes("wonderful") ||
      lowerText.includes("excellent") || lowerText.includes("fantastic") || lowerText.includes("amazing")) {
    return "happy";
  }

  if (lowerText.includes("excited") || lowerText.includes("thrilled") || lowerText.includes("pumped")) {
    return "excited";
  }

  if (lowerText.includes("joy") || lowerText.includes("delight") || lowerText.includes("pleasure")) {
    return "joyful";
  }

  if (lowerText.includes("fun") || lowerText.includes("playful") || lowerText.includes("joke")) {
    return "playful";
  }

  // Empathetic emotions
  if (lowerText.includes("sorry") || lowerText.includes("apologize") || lowerText.includes("regret")) {
    return "empathetic";
  }

  if (lowerText.includes("understand") || lowerText.includes("feel for") || lowerText.includes("sympathize")) {
    return "compassionate";
  }

  if (lowerText.includes("worried") || lowerText.includes("concerned") || lowerText.includes("troubled")) {
    return "concerned";
  }

  if (lowerText.includes("comfort") || lowerText.includes("soothe") || lowerText.includes("calm")) {
    return "soothing";
  }

  // Professional emotions
  if (lowerText.includes("analyze") || lowerText.includes("examine") || lowerText.includes("study")) {
    return "analytical";
  }

  if (lowerText.includes("explain") || lowerText.includes("teach") || lowerText.includes("guide")) {
    return "mentoring";
  }

  if (lowerText.includes("create") || lowerText.includes("design") || lowerText.includes("build")) {
    return "creative";
  }

  if (lowerText.includes("help") || lowerText.includes("assist") || lowerText.includes("support")) {
    return "helpful";
  }

  // Conversational default
  return "conversational";
}

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.48,        // Slightly more stable for natural flow
  similarity_boost: 0.97, // Higher similarity for consistent feminine voice
  style: 0.68,           // Balanced style for warmth and approachability
  use_speaker_boost: true, // Enhanced speaker boost for clarity
};

export async function textToSpeechElevenLabs(
  text: string,
  voice: ElevenLabsVoice = "rachel",
  settings: Partial<VoiceSettings> = {}
): Promise<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES.rachel;
  const voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...settings };

  const processedText = preprocessTextForSpeech(text);

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: processedText,
        model_id: "eleven_turbo_v2_5",
        voice_settings: voiceSettings,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ElevenLabs] TTS Error:", response.status, errorText);
    throw new Error(`ElevenLabs TTS failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function textToSpeechWithEmotion(
  text: string,
  voice: ElevenLabsVoice = "rachel",
  emotion?: string
): Promise<Buffer> {
  const detectedEmotion = emotion || analyzeTextForEmotion(text);
  const emotionSettings = getEmotionVoiceSettings(detectedEmotion);

  console.log(`[ElevenLabs] Detected emotion: ${detectedEmotion}, applying voice settings:`, emotionSettings);

  return textToSpeechElevenLabs(text, voice, emotionSettings);
}

export async function* textToSpeechStreamWithEmotion(
  text: string,
  voice: ElevenLabsVoice = "rachel",
  emotion?: string
): AsyncGenerator<Buffer> {
  const detectedEmotion = emotion || analyzeTextForEmotion(text);
  const emotionSettings = getEmotionVoiceSettings(detectedEmotion);

  console.log(`[ElevenLabs] Stream - Detected emotion: ${detectedEmotion}, applying voice settings:`, emotionSettings);

  yield* textToSpeechStreamElevenLabs(text, voice, emotionSettings);
}

export async function* textToSpeechStreamElevenLabs(
  text: string,
  voice: ElevenLabsVoice = "rachel",
  settings?: any
): AsyncGenerator<Buffer> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const voiceId = ELEVENLABS_VOICES[voice] || ELEVENLABS_VOICES.rachel;
  const voiceSettings = { ...DEFAULT_VOICE_SETTINGS, ...settings };

  const processedText = preprocessTextForSpeech(text);

  const response = await fetch(
    `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: processedText,
        model_id: "eleven_turbo_v2_5",
        voice_settings: voiceSettings,
        optimize_streaming_latency: 4,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[ElevenLabs] Stream Error:", response.status, errorText);
    throw new Error(`ElevenLabs streaming TTS failed: ${response.status}`);
  }

  const reader = response.body;
  if (!reader) {
    throw new Error("No response body");
  }

  for await (const chunk of reader as AsyncIterable<Buffer>) {
    yield chunk;
  }
}

function preprocessTextForSpeech(text: string): string {
  if (!text || text.trim().length === 0) {
    return "I processed your request.";
  }

  let processed = text
    // Handle common abbreviations and acronyms
    .replace(/\bI'm\b/gi, "I am")
    .replace(/\bI've\b/gi, "I have")
    .replace(/\bI'll\b/gi, "I will")
    .replace(/\bI'd\b/gi, "I would")
    .replace(/\bcan't\b/gi, "cannot")
    .replace(/\bwon't\b/gi, "will not")
    .replace(/\bdon't\b/gi, "do not")
    .replace(/\bdoesn't\b/gi, "does not")
    .replace(/\bisn't\b/gi, "is not")
    .replace(/\baren't\b/gi, "are not")
    .replace(/\bwasn't\b/gi, "was not")
    .replace(/\bweren't\b/gi, "were not")
    .replace(/\bhasn't\b/gi, "has not")
    .replace(/\bhaven't\b/gi, "have not")
    .replace(/\bhadn't\b/gi, "had not")
    .replace(/\bshouldn't\b/gi, "should not")
    .replace(/\bcouldn't\b/gi, "could not")
    .replace(/\bwouldn't\b/gi, "would not")
    .replace(/\bthat's\b/gi, "that is")
    .replace(/\bthere's\b/gi, "there is")
    .replace(/\bhere's\b/gi, "here is")
    .replace(/\bwhat's\b/gi, "what is")
    .replace(/\bwhere's\b/gi, "where is")
    .replace(/\bwho's\b/gi, "who is")
    .replace(/\bhow's\b/gi, "how is")
    .replace(/\bwhen's\b/gi, "when is")
    .replace(/\bwhy's\b/gi, "why is")
    .replace(/\bit's\b/gi, "it is")
    .replace(/\bhe's\b/gi, "he is")
    .replace(/\bshe's\b/gi, "she is")
    .replace(/\bwe're\b/gi, "we are")
    .replace(/\bthey're\b/gi, "they are")
    .replace(/\byou're\b/gi, "you are")
    .replace(/\byou've\b/gi, "you have")
    .replace(/\byou'll\b/gi, "you will")
    .replace(/\byou'd\b/gi, "you would")
    .replace(/\bwe've\b/gi, "we have")
    .replace(/\bwe'll\b/gi, "we will")
    .replace(/\bwe'd\b/gi, "we would")
    .replace(/\bthey've\b/gi, "they have")
    .replace(/\bthey'll\b/gi, "they will")
    .replace(/\bthey'd\b/gi, "they would")
    .replace(/\bit'll\b/gi, "it will")
    .replace(/\bit'd\b/gi, "it would")
    .replace(/\blet's\b/gi, "let us")
    .replace(/\bthat's\b/gi, "that is")
    .replace(/\bthere're\b/gi, "there are")
    .replace(/\bhere're\b/gi, "here are")

    // Handle special characters and symbols
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/=/g, " equals ")
    .replace(/@/g, " at ")
    .replace(/%/g, " percent ")
    .replace(/\$/g, " dollars ")
    .replace(/€/g, " euros ")
    .replace(/£/g, " pounds ")
    .replace(/¥/g, " yen ")
    .replace(/°/g, " degrees ")
    .replace(/™/g, " trademark ")
    .replace(/®/g, " registered ")
    .replace(/©/g, " copyright ")
    .replace(/§/g, " section ")
    .replace(/¶/g, " paragraph ")
    .replace(/†/g, " dagger ")
    .replace(/‡/g, " double dagger ")
    .replace(/•/g, " bullet ")
    .replace(/◦/g, " white bullet ")
    .replace(/‣/g, " triangular bullet ")
    .replace(/⁃/g, " hyphen bullet ")
    .replace(/⁎/g, " low asterisk ")
    .replace(/⁏/g, " reversed pilcrow ")
    .replace(/⁑/g, " two asterisks aligned vertically ")
    .replace(/⁓/g, " swung dash ")
    .replace(/⁕/g, " flower punctuation mark ")
    .replace(/⁖/g, " three dot punctuation ")
    .replace(/⁗/g, " quadruple prime ")
    .replace(/⁘/g, " four dot punctuation ")
    .replace(/⁙/g, " five dot punctuation ")
    .replace(/⁚/g, " two dot punctuation ")
    .replace(/⁛/g, " four dot mark ")
    .replace(/⁜/g, " daggers ")
    .replace(/⁝/g, " tridents ")
    .replace(/⁞/g, " dotted cross ")
    .replace(/ /g, " space ")
    .replace(/⁠/g, " word joiner ")
    .replace(/⁡/g, " function application ")
    .replace(/⁢/g, " invisible times ")
    .replace(/⁣/g, " invisible separator ")
    .replace(/⁤/g, " invisible plus ")
    .replace(/⁪/g, " invisible separator ")
    .replace(/⁫/g, " invisible separator ")
    .replace(/⁬/g, " invisible separator ")
    .replace(/⁭/g, " invisible separator ")
    .replace(/⁮/g, " invisible separator ")
    .replace(/⁯/g, " invisible separator ")

    // Handle numbers and dates
    .replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g, "$1 $2 $3") // dates
    .replace(/(\d{1,2}):(\d{2})(?::(\d{2}))?/g, "$1 $2 $3") // times
    .replace(/(\d+)\.(\d+)/g, "$1 point $2") // decimals
    .replace(/(\d+),(\d+)/g, "$1 $2") // commas in numbers
    .replace(/#(\d+)/g, "number $1") // hashtags with numbers
    .replace(/(\d+)(st|nd|rd|th)/gi, "$1$2") // ordinals

    // Handle URLs and emails (simplify for speech)
    .replace(/https?:\/\/[^\s]+/g, "link")
    .replace(/www\.[^\s]+/g, "website")
    .replace(/[^\s]+@[^\s]+\.[^\s]+/g, "email")

    // Handle punctuation for better speech flow
    .replace(/([.!?])\s*([A-Z])/g, "$1 $2") // Ensure space after sentence endings
    .replace(/([,:;])\s*/g, "$1 ") // Ensure space after commas and semicolons
    .replace(/\s*([.!?;:,])\s*/g, " $1 ") // Add spaces around punctuation
    .replace(/\s+/g, " ") // Normalize whitespace
    .replace(/^\s+|\s+$/g, "") // Trim whitespace

    // Handle quotes and parentheses
    .replace(/[""]/g, '"')
    .replace(/['']{2,}/g, '"')
    .replace(/['']([^']*)['']/g, '"$1"')
    .replace(/\(([^)]*)\)/g, " $1 ")
    .replace(/\s+/g, " ")

    // Final cleanup
    .replace(/\s{2,}/g, " ")
    .trim();

  // Ensure we have valid text
  if (!processed || processed.length === 0) {
    processed = text.replace(/[^\w\s.,!?'-]/g, " ").replace(/\s+/g, " ").trim();
  }

  if (!processed || processed.length === 0) {
    processed = "I processed your request.";
  }

  return processed;
}

const EMOTION_VOICE_PRESETS: Record<string, Partial<VoiceSettings>> = {
  // CYRUS Core Personality - Warm, natural, feminine
  neutral:     { stability: 0.48, similarity_boost: 0.97, style: 0.68, use_speaker_boost: true },
  friendly:    { stability: 0.45, similarity_boost: 0.98, style: 0.72, use_speaker_boost: true },
  warm:        { stability: 0.46, similarity_boost: 0.98, style: 0.70, use_speaker_boost: true },
  caring:      { stability: 0.50, similarity_boost: 0.97, style: 0.65, use_speaker_boost: true },

  // Positive Emotions - Expressive but natural
  happy:       { stability: 0.38, similarity_boost: 0.96, style: 0.85, use_speaker_boost: true },
  excited:     { stability: 0.32, similarity_boost: 0.95, style: 0.92, use_speaker_boost: true },
  joyful:      { stability: 0.35, similarity_boost: 0.96, style: 0.88, use_speaker_boost: true },
  playful:     { stability: 0.30, similarity_boost: 0.95, style: 0.90, use_speaker_boost: true },
  amused:      { stability: 0.33, similarity_boost: 0.95, style: 0.86, use_speaker_boost: true },

  // Empathetic Emotions - Soothing and understanding
  empathetic:  { stability: 0.52, similarity_boost: 0.97, style: 0.58, use_speaker_boost: true },
  compassionate: { stability: 0.54, similarity_boost: 0.97, style: 0.55, use_speaker_boost: true },
  concerned:   { stability: 0.55, similarity_boost: 0.96, style: 0.52, use_speaker_boost: true },
  soothing:    { stability: 0.60, similarity_boost: 0.96, style: 0.45, use_speaker_boost: true },

  // Professional Emotions - Confident but approachable
  confident:   { stability: 0.42, similarity_boost: 0.97, style: 0.78, use_speaker_boost: true },
  assertive:   { stability: 0.40, similarity_boost: 0.96, style: 0.80, use_speaker_boost: true },
  encouraging: { stability: 0.44, similarity_boost: 0.97, style: 0.75, use_speaker_boost: true },

  // Thoughtful Emotions - Reflective and intelligent
  thoughtful:  { stability: 0.52, similarity_boost: 0.96, style: 0.50, use_speaker_boost: true },
  curious:     { stability: 0.40, similarity_boost: 0.96, style: 0.70, use_speaker_boost: true },
  intrigued:   { stability: 0.38, similarity_boost: 0.95, style: 0.74, use_speaker_boost: true },

  // Challenging Emotions - Controlled and mature
  sad:         { stability: 0.58, similarity_boost: 0.95, style: 0.48, use_speaker_boost: true },
  worried:     { stability: 0.57, similarity_boost: 0.95, style: 0.50, use_speaker_boost: true },
  frustrated:  { stability: 0.50, similarity_boost: 0.94, style: 0.62, use_speaker_boost: true },
  angry:       { stability: 0.52, similarity_boost: 0.94, style: 0.65, use_speaker_boost: true },

  // Calm Emotions - Peaceful and centered
  calm:        { stability: 0.57, similarity_boost: 0.96, style: 0.52, use_speaker_boost: true },
  peaceful:    { stability: 0.60, similarity_boost: 0.96, style: 0.47, use_speaker_boost: true },
  grateful:    { stability: 0.47, similarity_boost: 0.97, style: 0.72, use_speaker_boost: true },
  proud:       { stability: 0.42, similarity_boost: 0.97, style: 0.76, use_speaker_boost: true },
  surprised:   { stability: 0.32, similarity_boost: 0.95, style: 0.88, use_speaker_boost: true },

  // Specialized CYRUS emotions
  conversational: { stability: 0.45, similarity_boost: 0.97, style: 0.70, use_speaker_boost: true },
  mentoring:   { stability: 0.48, similarity_boost: 0.97, style: 0.68, use_speaker_boost: true },
  analytical:  { stability: 0.50, similarity_boost: 0.96, style: 0.60, use_speaker_boost: true },
  creative:    { stability: 0.38, similarity_boost: 0.96, style: 0.78, use_speaker_boost: true },

  // Legacy emotions for compatibility
  melancholic: { stability: 0.60, similarity_boost: 0.93, style: 0.38, use_speaker_boost: true },
  reflective:  { stability: 0.52, similarity_boost: 0.94, style: 0.42, use_speaker_boost: true },
  tender:      { stability: 0.48, similarity_boost: 0.96, style: 0.62, use_speaker_boost: true },
};

export async function getAvailableVoices(): Promise<any[]> {
  if (!ELEVENLABS_API_KEY) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const response = await fetch(`${ELEVENLABS_BASE_URL}/voices`, {
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get voices: ${response.status}`);
  }

  const data = await response.json() as { voices: any[] };
  return data.voices;
}

console.log("[ElevenLabs] Voice synthesis module initialized");
console.log("[ElevenLabs] Emotion presets: " + Object.keys(EMOTION_VOICE_PRESETS).length + " profiles");
console.log("[ElevenLabs] Voice: Rachel (sweet feminine) | Model: eleven_turbo_v2_5 | Low-latency mode");
