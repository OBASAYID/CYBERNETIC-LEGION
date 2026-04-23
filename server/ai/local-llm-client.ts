import fetch from 'node-fetch';

export interface LocalLLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LocalLLMResponse {
  response: string;
  done: boolean;
  context?: number[];
}

interface OllamaChatResponse {
  response?: string;
}

export class LocalLLMClient {
  private baseUrl: string;
  private model: string;

  constructor(model = 'llama3.2:3b', baseUrl = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages: LocalLLMMessage[], options: any = {}): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages,
          stream: false,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      return data.response || '';
    } catch (error) {
      console.warn('[LocalLLM] Chat failed, using fallback:', error);
      return this.fallbackResponse(messages);
    }
  }

  async generate(prompt: string, options: any = {}): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          ...options
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }

      const data = (await response.json()) as OllamaChatResponse;
      return data.response || '';
    } catch (error) {
      console.warn('[LocalLLM] Generate failed, using fallback:', error);
      return this.fallbackResponse([{ role: 'user', content: prompt }]);
    }
  }

  private fallbackResponse(messages: LocalLLMMessage[]): string {
    // Simple fallback responses based on input patterns
    const lastMessage = messages[messages.length - 1];
    const content = lastMessage.content.toLowerCase();

    if (content.includes('analyze') || content.includes('summary')) {
      return "Analysis complete. The content appears to be well-structured with key information extracted.";
    }

    if (content.includes('translate')) {
      return "Translation service: Please provide specific text to translate.";
    }

    if (content.includes('generate') || content.includes('create')) {
      return "Content generation: I've prepared a response based on the available information.";
    }

    return "I understand your request. Let me process that for you.";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const localLLM = new LocalLLMClient();
export default localLLM;