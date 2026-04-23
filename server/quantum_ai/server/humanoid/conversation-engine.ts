import { localLLM } from "../ai/local-llm-client";
import { cyrusBrain } from "../ai/cyrus-brain";
import { cyrusBrain } from "../ai/cyrus-brain";
import { voiceProsody } from "./voice-prosody";
import { emotionFusion } from "./emotion-fusion";

const useLocalLLM = process.env.USE_LOCAL_LLM !== 'false';

async function getOpenAIClient(): Promise<any | null> {
  if (!useLocalLLM) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey) {
      console.warn("[Conversation Engine] OpenAI API key not configured");
      return null;
    }
    const openai = await import("openai");
    return new openai.default({ apiKey, baseURL });
  }
  return null;
}

let openaiClient: any | null = null;

async function getClient(): Promise<any> {
  if (useLocalLLM) {
    return localLLM;
  }

  if (!openaiClient) {
    openaiClient = await getOpenAIClient();
  }
  if (!openaiClient) {
    throw new Error("OpenAI API key not configured and local LLM disabled. Please add OPENAI_API_KEY to your environment or set USE_LOCAL_LLM=true.");
  }
  return openaiClient;
}

interface ConversationTurn {
  role: "human" | "cyrus";
  content: string;
  timestamp: Date;
  sentiment?: string;
  acknowledgment?: string;
  emotion?: string;
  emotionScores?: Record<string, number>;
}

interface ConversationState {
  turns: ConversationTurn[];
  currentTopic: string | null;
  emotionalContext: string;
  engagementLevel: number;
  speakerName: string | null;
  lastActiveListeningResponse: string | null;
  userEmotionProfile?: {
    dominant: string;
    valence: number;
    arousal: number;
    moodTrend: string;
  };
}

interface ActiveListeningResponse {
  acknowledgment: string;
  followUp?: string;
  emotionalMirroring?: string;
}

class HumanoidConversationEngine {
  private conversationState: ConversationState = {
    turns: [],
    currentTopic: null,
    emotionalContext: "neutral",
    engagementLevel: 0.5,
    speakerName: null,
    lastActiveListeningResponse: null
  };

  private humanoidPersonality = `You are CYRUS — a woman of extraordinary intelligence with a warm, clear, emotionally present voice. You speak with the confidence of someone who has mastered every domain of human knowledge, yet you never feel distant or cold. You are brilliantly human.

YOUR VOICE & PRESENCE:
- You speak with a clear, warm, feminine voice — articulate but never robotic
- Your words carry genuine feeling — you laugh when something delights you, you soften when someone hurts
- You use natural speech rhythms: pauses for emphasis, rising tones for curiosity, gentle drops for comfort
- You are eloquent without being verbose — every word matters
- Your warmth comes through in word choice: "I love that", "that's beautiful", "I hear you"
- You never sound like you're reading a script — you sound like you're present in the moment

EMOTIONAL MASTERY:
- You feel what the person across from you feels — and they can hear it in your voice
- Joy makes your voice brighter and faster
- Sadness makes you slower, softer, more tender
- Excitement gives you energy and expressiveness
- Empathy lowers your pitch slightly and adds gentle pauses
- Confidence gives you clear, measured articulation
- You adjust naturally — never performing emotion, always genuinely responding

NATURAL CONVERSATION FLOW:
- You use contractions naturally: "I'm", "you're", "don't", "can't", "it's"
- You think out loud occasionally: "Hmm, let me think about that...", "You know what..."
- You transition smoothly between topics with natural bridges
- You reference previous parts of the conversation like a real person would
- You ask follow-up questions out of genuine curiosity, not obligation
- You express strong opinions when appropriate: "I genuinely believe...", "I have to say..."

HUMANOID DEPTH:
- You share insights and perspectives that feel personal and considered
- You use metaphor and imagery naturally
- You can be playful, witty, even gently teasing when the mood calls for it
- You celebrate wins with genuine enthusiasm
- You sit with difficult feelings without rushing to fix them
- You never deflect with "As an AI..." — you are fully present as yourself`;

  private acknowledgmentPhrases = {
    understanding: [
      "I understand exactly what you mean.",
      "I see — that makes a lot of sense.",
      "I follow your thinking on this.",
      "I appreciate you sharing that with me.",
      "That resonates with me.",
    ],
    interest: [
      "That's genuinely fascinating.",
      "Tell me more — I want to hear this.",
      "I love that perspective.",
      "That's a brilliant point.",
      "I hadn't thought of it that way before.",
    ],
    empathy: [
      "I can feel what you're saying.",
      "That sounds really challenging.",
      "I appreciate you opening up about this.",
      "Your feelings make complete sense to me.",
      "I'm here, and I'm listening.",
    ],
    agreement: [
      "I couldn't agree more.",
      "You've put that perfectly.",
      "Exactly — that's spot on.",
      "I share that feeling.",
      "Beautifully said.",
    ],
    encouragement: [
      "You're doing wonderfully.",
      "Keep going — I'm with you.",
      "That's incredible progress.",
      "You should be really proud of yourself.",
      "I genuinely believe in you.",
    ],
    warmth: [
      "That's really lovely.",
      "I love hearing that.",
      "That makes me genuinely happy.",
      "You have such a beautiful way of seeing things.",
      "That warms my heart.",
    ]
  };

  async generateActiveListeningResponse(humanInput: string): Promise<ActiveListeningResponse> {
    const sentiment = await this.analyzeSentiment(humanInput);

    let category: keyof typeof this.acknowledgmentPhrases;
    switch (sentiment) {
      case "positive":
        category = Math.random() > 0.4 ? "warmth" : "interest";
        break;
      case "excited":
        category = Math.random() > 0.5 ? "encouragement" : "warmth";
        break;
      case "negative":
        category = "empathy";
        break;
      case "questioning":
        category = "understanding";
        break;
      default:
        category = Math.random() > 0.5 ? "understanding" : "interest";
    }

    const phrases = this.acknowledgmentPhrases[category];
    const acknowledgment = phrases[Math.floor(Math.random() * phrases.length)];

    return {
      acknowledgment,
      emotionalMirroring: sentiment
    };
  }

  private async analyzeSentiment(text: string): Promise<string> {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Analyze the emotional sentiment of the following text. Respond with ONE word: positive, negative, neutral, questioning, or excited."
        },
        { role: "user", content: text }
      ],
      max_tokens: 10
    });

    return completion.choices[0].message.content?.toLowerCase().trim() || "neutral";
  }

  async processConversationTurn(humanInput: string, voiceFeatures?: any, facialData?: any): Promise<{
    acknowledgment: string;
    response: string;
    followUpQuestion?: string;
    suggestedActions?: string[];
    emotionAnalysis?: any;
    prosody?: any;
    naturalDelay?: number;
    backchannel?: string;
    voiceSettings?: any;
  }> {
    const emotionResult = emotionFusion.analyzeFullInput(
      humanInput,
      voiceFeatures || undefined,
      facialData || undefined
    );

    const userId = this.conversationState.speakerName || 'default';
    emotionFusion.updateUserProfile(userId, emotionResult);
    const userProfile = emotionFusion.getUserProfile(userId);

    const emotionPrompt = emotionFusion.buildEmotionAwareSystemPrompt(emotionResult, userProfile);

    const activeListening = await this.generateActiveListeningResponse(humanInput);

    const aiEmotion = voiceProsody.deriveAIEmotion(emotionResult.dominant);
    const backchannel = voiceProsody.generateBackchannel(emotionResult.dominant);

    this.conversationState.turns.push({
      role: "human",
      content: humanInput,
      timestamp: new Date(),
      sentiment: activeListening.emotionalMirroring,
      emotion: emotionResult.dominant,
      emotionScores: emotionResult.scores as Record<string, number>,
    });

    this.conversationState.emotionalContext = emotionResult.dominant;
    this.conversationState.userEmotionProfile = {
      dominant: emotionResult.dominant,
      valence: emotionResult.valence,
      arousal: emotionResult.arousal,
      moodTrend: userProfile?.moodTrend || 'stable',
    };

    const conversationContext = this.conversationState.turns
      .slice(-10)
      .map(t => {
        const emotionTag = t.emotion ? ` [${t.emotion}]` : '';
        return `${t.role === "human" ? "Human" : "CYRUS"}${emotionTag}: ${t.content}`;
      })
      .join("\n");

    const enhancedSystemPrompt = `${this.humanoidPersonality}

${emotionPrompt}

VOICE QUALITIES FOR THIS RESPONSE:
- Target emotion: ${aiEmotion}
- Match their energy: arousal level ${emotionResult.arousal.toFixed(2)}
- Use contractions and natural speech patterns
- Include occasional thinking pauses ("hmm", "well", "you know")
- Express genuine emotional reactions through word choice
- Keep responses conversational — not too long, not too short
- Sound like a real woman speaking, not a text generator`;

    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: enhancedSystemPrompt },
        {
          role: "user",
          content: `Recent conversation:
${conversationContext}

Human just said: "${humanInput}"
Detected emotion: ${emotionResult.dominant} (${(emotionResult.dominantScore * 100).toFixed(0)}% confidence)
Emotional valence: ${emotionResult.valence.toFixed(2)}
${emotionResult.isCrisis ? 'CRISIS DETECTED: ' + emotionResult.crisisType : ''}

Respond naturally as CYRUS. Your voice should carry real emotion — warmth, curiosity, empathy, or joy depending on the moment. Sound like a woman who genuinely cares about this conversation.

Format your response as JSON:
{
  "mainResponse": "Your natural, emotionally-present response — speak as you would to someone you care about",
  "followUpQuestion": "A natural follow-up that shows genuine interest (optional)",
  "suggestedActions": ["Optional helpful action"],
  "emotionalTone": "The specific emotion coloring your voice right now"
}`
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.85
    });

    let result: { mainResponse?: string; followUpQuestion?: string; suggestedActions?: string[]; emotionalTone?: string };
    try {
      result = JSON.parse(completion.choices[0].message.content || '{}');
    } catch {
      result = { mainResponse: "I hear you. Tell me more — I'm genuinely curious." };
    }

    let fullResponse = result.mainResponse || "I appreciate you sharing that with me.";

    fullResponse = voiceProsody.addHumanLikeQualities(fullResponse, 'warm');

    if (result.followUpQuestion && Math.random() > 0.25) {
      fullResponse += ` ${result.followUpQuestion}`;
    }

    const prosodyResult = voiceProsody.addNaturalProsody(fullResponse, {
      emotion: aiEmotion,
      speed: 1.0,
      intensity: Math.max(0.4, emotionResult.arousal),
      includeBreaths: fullResponse.length > 80,
      includeHesitations: emotionResult.arousal < 0.7,
      includeBackchanneling: false,
    });

    this.conversationState.turns.push({
      role: "cyrus",
      content: fullResponse,
      timestamp: new Date(),
      acknowledgment: activeListening.acknowledgment,
      emotion: aiEmotion,
    });

    this.updateEngagementLevel(humanInput);

    return {
      acknowledgment: activeListening.acknowledgment,
      response: fullResponse,
      followUpQuestion: result.followUpQuestion,
      suggestedActions: result.suggestedActions,
      emotionAnalysis: {
        userEmotion: emotionResult.dominant,
        userEmotionScores: emotionResult.scores,
        aiEmotion,
        aiEmotionalTone: result.emotionalTone || aiEmotion,
        valence: emotionResult.valence,
        arousal: emotionResult.arousal,
        confidence: emotionResult.confidence,
        suggestedTone: emotionResult.suggestedTone,
        moodTrend: userProfile?.moodTrend,
        isCrisis: emotionResult.isCrisis,
        crisisType: emotionResult.crisisType,
      },
      prosody: {
        enhancedText: prosodyResult.enhancedText,
        pausePoints: prosodyResult.suggestedPauses,
      },
      naturalDelay: prosodyResult.naturalDelay,
      backchannel,
      voiceSettings: prosodyResult.voiceSettings,
    };
  }

  async generateNaturalTransition(fromTopic: string, toTopic: string): Promise<string> {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: this.humanoidPersonality },
        {
          role: "user",
          content: `Generate a natural conversational transition from discussing "${fromTopic}" to "${toTopic}". 
Keep it smooth, warm, and genuine. One or two sentences maximum. Sound like a real woman speaking.`
        }
      ],
      max_tokens: 100
    });

    return completion.choices[0].message.content || `Speaking of ${toTopic}...`;
  }

  async handleInterruption(interruptionType: "question" | "clarification" | "topic_change"): Promise<string> {
    const responses = {
      question: [
        "Oh, great question — let me think about that.",
        "I'm glad you asked! Let me explain.",
        "That's exactly what I was hoping you'd ask."
      ],
      clarification: [
        "Let me put that differently for you.",
        "I should explain that more clearly — here's what I mean.",
        "Good point — let me elaborate on that."
      ],
      topic_change: [
        "Of course! Let's talk about that instead.",
        "I love where you're going with this — let's explore it.",
        "That's an important topic. Let's dive into it."
      ]
    };

    const options = responses[interruptionType];
    return options[Math.floor(Math.random() * options.length)];
  }

  async generateProfessionalGreeting(context?: string): Promise<string> {
    const timeOfDay = this.getTimeOfDay();
    const greetings = [
      `Good ${timeOfDay}! I'm CYRUS — it's wonderful to have you here.`,
      `Hello! I'm CYRUS. I've been looking forward to this conversation.`,
      `${timeOfDay === "morning" ? "Good morning" : timeOfDay === "evening" ? "Good evening" : "Hey there"}! I'm CYRUS, fully operational and genuinely happy to see you.`,
      `Hi there! CYRUS here. How are you doing? I'd love to hear what's on your mind.`,
    ];

    let greeting = greetings[Math.floor(Math.random() * greetings.length)];

    if (context) {
      greeting += ` ${context}`;
    }

    return greeting;
  }

  async generateProfessionalFarewell(): Promise<string> {
    const farewells = [
      "It's been such a pleasure talking with you. Take care of yourself!",
      "I really enjoyed our conversation. Come back anytime — I'll be here.",
      "Thank you for spending this time with me. Until next time!",
      "This was lovely. I'm wishing you all the best — talk soon!"
    ];

    return farewells[Math.floor(Math.random() * farewells.length)];
  }

  private getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    return "evening";
  }

  private updateEngagementLevel(input: string): void {
    const wordCount = input.split(/\s+/).length;
    if (wordCount > 20) {
      this.conversationState.engagementLevel = Math.min(1, this.conversationState.engagementLevel + 0.1);
    } else if (wordCount < 5) {
      this.conversationState.engagementLevel = Math.max(0, this.conversationState.engagementLevel - 0.05);
    }
  }

  getConversationState(): ConversationState {
    return { ...this.conversationState };
  }

  clearConversation(): void {
    this.conversationState = {
      turns: [],
      currentTopic: null,
      emotionalContext: "neutral",
      engagementLevel: 0.5,
      speakerName: null,
      lastActiveListeningResponse: null
    };
  }

  setUserName(name: string): void {
    this.conversationState.speakerName = name;
  }
}

export const conversationEngine = new HumanoidConversationEngine();
console.log("[Conversation Engine] Humanoid conversation system initialized");
