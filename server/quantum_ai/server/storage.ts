import { 
  conversations, 
  memories, 
  uploadedFiles,
  type Conversation,
  type InsertConversation,
  type Memory,
  type InsertMemory,
  type UploadedFile,
  type InsertUploadedFile 
} from "../shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Conversations
  getConversations(userId?: string, limit?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  clearConversations(userId?: string): Promise<void>;
  
  // Memories
  getMemories(userId?: string): Promise<Memory[]>;
  createMemory(memory: InsertMemory): Promise<Memory>;
  
  // Files
  getUploadedFiles(userId?: string): Promise<UploadedFile[]>;
  createUploadedFile(file: InsertUploadedFile): Promise<UploadedFile>;
}

export class DatabaseStorage implements IStorage {
  async getConversations(userId?: string, limit: number = 50): Promise<Conversation[]> {
    const query = db
      .select()
      .from(conversations)
      .orderBy(desc(conversations.createdAt))
      .limit(limit);
    
    if (userId) {
      return await query.where(eq(conversations.userId, userId));
    }
    
    return await query;
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const [conversation] = await db
      .insert(conversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async clearConversations(userId?: string): Promise<void> {
    if (userId) {
      await db.delete(conversations).where(eq(conversations.userId, userId));
    } else {
      await db.delete(conversations);
    }
  }

  async getMemories(userId?: string): Promise<Memory[]> {
    const query = db
      .select()
      .from(memories)
      .orderBy(desc(memories.createdAt));
    
    if (userId) {
      return await query.where(eq(memories.userId, userId));
    }
    
    return await query;
  }

  async createMemory(insertMemory: InsertMemory): Promise<Memory> {
    const [memory] = await db
      .insert(memories)
      .values(insertMemory)
      .returning();
    return memory;
  }

  async getUploadedFiles(userId?: string): Promise<UploadedFile[]> {
    const query = db
      .select()
      .from(uploadedFiles)
      .orderBy(desc(uploadedFiles.uploadedAt));
    
    if (userId) {
      return await query.where(eq(uploadedFiles.userId, userId));
    }
    
    return await query;
  }

  async createUploadedFile(insertFile: InsertUploadedFile): Promise<UploadedFile> {
    const [file] = await db
      .insert(uploadedFiles)
      .values(insertFile)
      .returning();
    return file;
  }
}

export const storage = new DatabaseStorage();
