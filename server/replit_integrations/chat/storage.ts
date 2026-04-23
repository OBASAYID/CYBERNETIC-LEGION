export interface ChatConversation {
  id: number;
  title: string;
  createdAt: Date;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: string;
  content: string;
  createdAt: Date;
}

export interface IChatStorage {
  getConversation(id: number): Promise<ChatConversation | undefined>;
  getAllConversations(): Promise<ChatConversation[]>;
  createConversation(title: string): Promise<ChatConversation>;
  deleteConversation(id: number): Promise<void>;
  getMessagesByConversation(conversationId: number): Promise<ChatMessage[]>;
  createMessage(conversationId: number, role: string, content: string): Promise<ChatMessage>;
}

class MemoryChatStorage implements IChatStorage {
  private conversations: Map<number, ChatConversation> = new Map();
  private messages: Map<number, ChatMessage[]> = new Map();
  private conversationIdCounter = 1;
  private messageIdCounter = 1;

  async getConversation(id: number): Promise<ChatConversation | undefined> {
    return this.conversations.get(id);
  }

  async getAllConversations(): Promise<ChatConversation[]> {
    return Array.from(this.conversations.values()).sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async createConversation(title: string): Promise<ChatConversation> {
    const conversation: ChatConversation = {
      id: this.conversationIdCounter++,
      title,
      createdAt: new Date(),
    };
    this.conversations.set(conversation.id, conversation);
    this.messages.set(conversation.id, []);
    return conversation;
  }

  async deleteConversation(id: number): Promise<void> {
    this.conversations.delete(id);
    this.messages.delete(id);
  }

  async getMessagesByConversation(conversationId: number): Promise<ChatMessage[]> {
    return this.messages.get(conversationId) || [];
  }

  async createMessage(conversationId: number, role: string, content: string): Promise<ChatMessage> {
    const message: ChatMessage = {
      id: this.messageIdCounter++,
      conversationId,
      role,
      content,
      createdAt: new Date(),
    };
    const msgs = this.messages.get(conversationId) || [];
    msgs.push(message);
    this.messages.set(conversationId, msgs);
    return message;
  }
}

export const chatStorage: IChatStorage = new MemoryChatStorage();
