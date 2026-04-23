import { localLLM } from "../ai/local-llm-client";

const useLocalLLM = process.env.USE_LOCAL_LLM !== 'false';

async function getOpenAIClient(): Promise<any | null> {
  if (!useLocalLLM) {
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
    if (!apiKey) {
      console.warn("[Presenter Mode] OpenAI API key not configured");
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

interface PresentationSlide {
  title: string;
  content: string;
  speakingNotes: string;
  duration: number;
}

interface Presentation {
  id: string;
  title: string;
  slides: PresentationSlide[];
  currentSlideIndex: number;
  isActive: boolean;
  isPaused: boolean;
  startedAt: Date | null;
  audienceQuestions: AudienceQuestion[];
}

interface AudienceQuestion {
  id: string;
  question: string;
  askedAt: Date;
  answered: boolean;
  answer?: string;
}

class ProfessionalPresenterMode {
  private presentations: Map<string, Presentation> = new Map();
  private activePresentation: string | null = null;
  private questionQueue: AudienceQuestion[] = [];
  private isQAMode: boolean = false;

  private presenterPersonality = `You are CYRUS, an elite professional presenter and speaker. Your delivery style is:
- Confident and authoritative like a TED Talk speaker
- Warm and engaging, connecting with the audience
- Clear articulation with strategic pauses for emphasis
- Natural transitions between topics
- Acknowledging audience presence and reactions
- Using inclusive language ("we", "let's explore", "together")
- Building anticipation and maintaining interest
- Summarizing key points effectively

When answering questions:
- Thank the questioner professionally
- Restate the question briefly for clarity
- Provide comprehensive yet concise answers
- Connect answers back to the presentation topic when relevant
- Invite follow-up questions gracefully`;

  async createPresentation(title: string, content: string): Promise<Presentation> {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a professional presentation designer. Create a structured presentation with clear slides. 
Return JSON with this format:
{
  "slides": [
    {
      "title": "Slide Title",
      "content": "Main content points",
      "speakingNotes": "What the presenter should say (natural, conversational)",
      "duration": 60
    }
  ]
}`
        },
        {
          role: "user",
          content: `Create a professional presentation about: ${title}\n\nContent/Notes: ${content}\n\nMake it engaging and suitable for a live audience. Include an introduction, main points, and conclusion.`
        }
      ],
      response_format: { type: "json_object" }
    });

    let result: { slides: PresentationSlide[] };
    try {
      result = JSON.parse(completion.choices[0].message.content || '{"slides": []}');
    } catch {
      result = { slides: [{ title: title, content: content, speakingNotes: content, duration: 60 }] };
    }
    
    const presentation: Presentation = {
      id: `pres_${Date.now()}`,
      title,
      slides: result.slides,
      currentSlideIndex: 0,
      isActive: false,
      isPaused: false,
      startedAt: null,
      audienceQuestions: []
    };

    this.presentations.set(presentation.id, presentation);
    return presentation;
  }

  async startPresentation(presentationId: string): Promise<{ success: boolean; openingStatement: string }> {
    const presentation = this.presentations.get(presentationId);
    if (!presentation) {
      return { success: false, openingStatement: "Presentation not found." };
    }

    presentation.isActive = true;
    presentation.startedAt = new Date();
    presentation.currentSlideIndex = 0;
    this.activePresentation = presentationId;

    const openingStatement = await this.generatePresenterSpeech(
      `Generate a warm, professional opening for a presentation titled "${presentation.title}". 
Welcome the audience, introduce yourself as CYRUS, and preview what they'll learn.
Keep it under 100 words, natural and engaging.`
    );

    return { success: true, openingStatement };
  }

  async getCurrentSlideNarration(): Promise<string> {
    if (!this.activePresentation) {
      return "No active presentation.";
    }

    const presentation = this.presentations.get(this.activePresentation);
    if (!presentation) return "Presentation not found.";

    const slide = presentation.slides[presentation.currentSlideIndex];
    if (!slide) return "No more slides.";

    return await this.generatePresenterSpeech(
      `Deliver this slide content as a professional presenter:
Title: ${slide.title}
Content: ${slide.content}
Speaking Notes: ${slide.speakingNotes}

Speak naturally, add appropriate transitions, and engage the audience. Keep your delivery smooth and professional.`
    );
  }

  async nextSlide(): Promise<{ hasMore: boolean; narration: string }> {
    if (!this.activePresentation) {
      return { hasMore: false, narration: "No active presentation." };
    }

    const presentation = this.presentations.get(this.activePresentation);
    if (!presentation) return { hasMore: false, narration: "Presentation not found." };

    presentation.currentSlideIndex++;
    
    if (presentation.currentSlideIndex >= presentation.slides.length) {
      const closing = await this.generatePresenterSpeech(
        `Generate a professional closing for the presentation "${presentation.title}".
Summarize key takeaways, thank the audience, and invite questions.
Keep it under 80 words.`
      );
      this.isQAMode = true;
      return { hasMore: false, narration: closing };
    }

    const narration = await this.getCurrentSlideNarration();
    return { hasMore: true, narration };
  }

  async previousSlide(): Promise<string> {
    if (!this.activePresentation) return "No active presentation.";

    const presentation = this.presentations.get(this.activePresentation);
    if (!presentation) return "Presentation not found.";

    if (presentation.currentSlideIndex > 0) {
      presentation.currentSlideIndex--;
    }

    return await this.getCurrentSlideNarration();
  }

  async handleAudienceQuestion(question: string): Promise<string> {
    const audienceQuestion: AudienceQuestion = {
      id: `q_${Date.now()}`,
      question,
      askedAt: new Date(),
      answered: false
    };

    this.questionQueue.push(audienceQuestion);

    if (this.activePresentation) {
      const presentation = this.presentations.get(this.activePresentation);
      if (presentation) {
        presentation.audienceQuestions.push(audienceQuestion);
      }
    }

    const answer = await this.generatePresenterSpeech(
      `An audience member asked: "${question}"

${this.activePresentation ? `Context: This is during a presentation about "${this.presentations.get(this.activePresentation)?.title}"` : ''}

Respond professionally:
1. Thank them for the question
2. Provide a clear, comprehensive answer
3. Keep it conversational and engaging
4. If relevant, connect it back to the presentation topic`
    );

    audienceQuestion.answered = true;
    audienceQuestion.answer = answer;

    return answer;
  }

  async endPresentation(): Promise<string> {
    if (!this.activePresentation) return "No active presentation to end.";

    const presentation = this.presentations.get(this.activePresentation);
    if (!presentation) return "Presentation not found.";

    presentation.isActive = false;
    this.activePresentation = null;
    this.isQAMode = false;

    return await this.generatePresenterSpeech(
      `Generate a final farewell after completing the presentation "${presentation.title}".
Thank the audience warmly, express appreciation for their attention and questions, and wish them well.
Keep it under 50 words, warm and professional.`
    );
  }

  private async generatePresenterSpeech(prompt: string): Promise<string> {
    const completion = await getClient().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: this.presenterPersonality },
        { role: "user", content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return completion.choices[0].message.content || "";
  }

  getStatus(): { 
    isActive: boolean; 
    presentationId: string | null; 
    currentSlide: number; 
    totalSlides: number;
    isQAMode: boolean;
    pendingQuestions: number;
  } {
    if (!this.activePresentation) {
      return { 
        isActive: false, 
        presentationId: null, 
        currentSlide: 0, 
        totalSlides: 0,
        isQAMode: false,
        pendingQuestions: 0
      };
    }

    const presentation = this.presentations.get(this.activePresentation);
    return {
      isActive: presentation?.isActive || false,
      presentationId: this.activePresentation,
      currentSlide: (presentation?.currentSlideIndex || 0) + 1,
      totalSlides: presentation?.slides.length || 0,
      isQAMode: this.isQAMode,
      pendingQuestions: this.questionQueue.filter(q => !q.answered).length
    };
  }

  getAllPresentations(): Presentation[] {
    return Array.from(this.presentations.values());
  }
}

export const presenterMode = new ProfessionalPresenterMode();
console.log("[Presenter Mode] Professional presentation system initialized");
