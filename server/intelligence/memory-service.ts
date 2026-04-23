import { ChromaClient } from "chromadb";
import { db } from "../db.js";
import { conversations, decisionLogs, missionLogs } from "../../shared/schema";

function toDbNumeric(value: number): string {
  return value.toString();
}

type MemoryCategory = "conversation" | "decision" | "mission";

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function hashToken(token: string): number {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildEmbedding(text: string, dimensions = 128): number[] {
  const vector = Array<number>(dimensions).fill(0);
  const tokens = tokenize(text);
  for (const token of tokens) {
    const index = hashToken(token) % dimensions;
    vector[index] += 1;
  }

  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / magnitude);
}

export class MemoryService {
  private chroma = new ChromaClient();
  private collectionName = "cyrus_memory";

  async recordConversation(input: {
    userId?: string | null;
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
  }) {
    const [record] = await db.insert(conversations).values({
      userId: input.userId ?? null,
      role: input.role,
      content: input.content,
      hasImage: false,
      detectedObjects: input.metadata ?? null,
    }).returning();

    await this.storeVector(record.id, "conversation", input.content, {
      userId: input.userId ?? null,
      role: input.role,
      ...(input.metadata ?? {}),
    });

    return record;
  }

  async recordDecision(input: {
    userId?: string | null;
    source: string;
    decisionType: string;
    input: string;
    output: string;
    confidence?: number;
    metadata?: Record<string, unknown>;
  }) {
    const [record] = await db.insert(decisionLogs).values({
      userId: input.userId ?? null,
      source: input.source,
      decisionType: input.decisionType,
      input: input.input,
      output: input.output,
      confidence: toDbNumeric(input.confidence ?? 0),
      metadata: input.metadata ?? null,
    }).returning();

    await this.storeVector(record.id, "decision", `${input.input}\n${input.output}`, {
      userId: input.userId ?? null,
      source: input.source,
      decisionType: input.decisionType,
      ...(input.metadata ?? {}),
    });

    return record;
  }

  async recordMissionLog(input: {
    missionId: string;
    userId?: string | null;
    status: string;
    summary: string;
    details?: Record<string, unknown> | null;
  }) {
    const [record] = await db.insert(missionLogs).values({
      missionId: input.missionId,
      userId: input.userId ?? null,
      status: input.status,
      summary: input.summary,
      details: input.details ?? null,
    }).returning();

    await this.storeVector(record.id, "mission", input.summary, {
      missionId: input.missionId,
      status: input.status,
      userId: input.userId ?? null,
    });

    return record;
  }

  async recall(query: string, limit = 5) {
    try {
      const collection = await this.getCollection();
      const results = await collection.query({
        queryEmbeddings: [buildEmbedding(query)],
        nResults: limit,
      });

      return (results.documents?.[0] || []).map((document, index: number) => ({
        content: document ?? "",
        metadata: results.metadatas?.[0]?.[index] ?? {},
        distance: results.distances?.[0]?.[index] ?? null,
      }));
    } catch (error) {
      console.warn("[Memory] Vector recall failed, returning empty result:", error);
      return [];
    }
  }

  private async storeVector(id: string, category: MemoryCategory, document: string, metadata: Record<string, unknown>) {
    try {
      const collection = await this.getCollection();
      await collection.upsert({
        ids: [`${category}:${id}`],
        embeddings: [buildEmbedding(document)],
        documents: [document],
        metadatas: [{ category, ...metadata }],
      });
    } catch (error) {
      console.warn("[Memory] Failed to persist vector memory:", error);
    }
  }

  private async getCollection() {
    return this.chroma.getOrCreateCollection({ name: this.collectionName });
  }
}

export const memoryService = new MemoryService();