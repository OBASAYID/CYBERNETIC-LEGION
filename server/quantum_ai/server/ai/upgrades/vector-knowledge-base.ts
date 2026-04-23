import OpenAI from 'openai';
import { db } from '../../db';
import { knowledgeGraph } from '../../../shared/schema';
import { eq, sql, desc, and } from 'drizzle-orm';
import crypto from 'crypto';

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    source: string;
    domain: string;
    timestamp: Date;
    importance: number;
    tags: string[];
  };
}

export interface SemanticSearchResult {
  document: VectorDocument;
  similarity: number;
  relevanceScore: number;
}

export interface RAGContext {
  query: string;
  retrievedDocuments: SemanticSearchResult[];
  synthesizedContext: string;
  confidence: number;
}

export class VectorKnowledgeBase {
  private vectorStore: Map<string, VectorDocument> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private indexReady: boolean = false;
  private embeddingDimension: number = 1536;

  constructor() {
    console.log('[Vector Knowledge Base] Initializing semantic memory system');
    // Delay initialization to prevent blocking server startup
    // and skip if embeddings are not supported
    setTimeout(() => {
      this.initializeFromDatabase().catch(err => {
        console.warn('[Vector Knowledge Base] Initialization skipped - embeddings not available');
        this.indexReady = true; // Mark as ready anyway so other features work
      });
    }, 5000);
  }

  private async initializeFromDatabase(): Promise<void> {
    try {
      // Skip embedding initialization if Replit OpenAI integration doesn't support embeddings
      const supportsEmbeddings = !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      if (!supportsEmbeddings) {
        console.log('[Vector Knowledge Base] Skipping embedding init - using Replit AI integration');
        this.indexReady = true;
        return;
      }
      
      const knowledge = await db.select().from(knowledgeGraph).limit(1000);
      
      for (const item of knowledge) {
        const docId = `kg-${item.id}`;
        const content = `${item.concept}: ${JSON.stringify(item.properties || {})}`;
        
        const embedding = await this.getEmbedding(content);
        
        this.vectorStore.set(docId, {
          id: docId,
          content,
          embedding,
          metadata: {
            source: item.source || 'knowledge_graph',
            domain: item.domain,
            timestamp: item.learnedAt,
            importance: (item.confidence || 50) / 100,
            tags: [item.domain, 'knowledge']
          }
        });
      }
      
      this.indexReady = true;
      console.log(`[Vector Knowledge Base] Loaded ${this.vectorStore.size} documents into semantic memory`);
    } catch (error) {
      console.log('[Vector Knowledge Base] Starting with empty vector store');
      this.indexReady = true;
    }
  }

  private get supportsEmbeddings(): boolean {
    return !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  }

  async getEmbedding(text: string): Promise<number[]> {
    if (!this.supportsEmbeddings) {
      return this.generateSimpleEmbedding(text);
    }

    const cacheKey = crypto.createHash('md5').update(text).digest('hex');
    
    if (this.embeddingCache.has(cacheKey)) {
      return this.embeddingCache.get(cacheKey)!;
    }

    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });

      const embedding = response.data[0].embedding;
      this.embeddingCache.set(cacheKey, embedding);
      
      if (this.embeddingCache.size > 10000) {
        const firstKey = this.embeddingCache.keys().next().value;
        if (firstKey) this.embeddingCache.delete(firstKey);
      }

      return embedding;
    } catch (error) {
      return this.generateSimpleEmbedding(text);
    }
  }

  private generateSimpleEmbedding(text: string): number[] {
    const embedding = new Array(this.embeddingDimension).fill(0);
    const words = text.toLowerCase().split(/\s+/);
    for (let i = 0; i < words.length && i < this.embeddingDimension; i++) {
      const word = words[i];
      let hash = 0;
      for (let j = 0; j < word.length; j++) {
        hash = ((hash << 5) - hash) + word.charCodeAt(j);
        hash |= 0;
      }
      embedding[i % this.embeddingDimension] = (hash % 1000) / 1000;
    }
    return embedding;
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  async addDocument(content: string, metadata: Partial<VectorDocument['metadata']>): Promise<string> {
    const id = crypto.randomUUID();
    const embedding = await this.getEmbedding(content);
    
    const doc: VectorDocument = {
      id,
      content,
      embedding,
      metadata: {
        source: metadata.source || 'user_input',
        domain: metadata.domain || 'general',
        timestamp: new Date(),
        importance: metadata.importance || 0.5,
        tags: metadata.tags || []
      }
    };
    
    this.vectorStore.set(id, doc);
    
    try {
      await db.insert(knowledgeGraph).values({
        concept: content.slice(0, 100),
        domain: doc.metadata.domain,
        properties: { fullContent: content, embedding: id },
        confidence: Math.round(doc.metadata.importance * 100),
        source: doc.metadata.source,
      });
    } catch (error) {
      console.error('[Vector Knowledge Base] Failed to persist document:', error);
    }
    
    console.log(`[Vector Knowledge Base] Added document: ${id}`);
    return id;
  }

  async addBulkDocuments(documents: Array<{ content: string; metadata?: Partial<VectorDocument['metadata']> }>): Promise<string[]> {
    const ids: string[] = [];
    
    for (const doc of documents) {
      const id = await this.addDocument(doc.content, doc.metadata || {});
      ids.push(id);
    }
    
    return ids;
  }

  async semanticSearch(query: string, topK: number = 5, filters?: { domain?: string; minImportance?: number }): Promise<SemanticSearchResult[]> {
    if (!this.indexReady) {
      console.log('[Vector Knowledge Base] Index not ready, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    const queryEmbedding = await this.getEmbedding(query);
    const results: SemanticSearchResult[] = [];

    for (const [id, doc] of this.vectorStore) {
      if (filters?.domain && doc.metadata.domain !== filters.domain) continue;
      if (filters?.minImportance && doc.metadata.importance < filters.minImportance) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, doc.embedding);
      const relevanceScore = similarity * doc.metadata.importance;

      if (similarity > 0.3) {
        results.push({
          document: doc,
          similarity,
          relevanceScore
        });
      }
    }

    results.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return results.slice(0, topK);
  }

  async retrieveContext(query: string, options?: { topK?: number; minSimilarity?: number }): Promise<RAGContext> {
    const topK = options?.topK || 5;
    const minSimilarity = options?.minSimilarity || 0.3;

    const searchResults = await this.semanticSearch(query, topK);
    const filteredResults = searchResults.filter(r => r.similarity >= minSimilarity);

    const synthesizedContext = filteredResults
      .map((r, i) => `[Source ${i + 1}]: ${r.document.content}`)
      .join('\n\n');

    const avgConfidence = filteredResults.length > 0
      ? filteredResults.reduce((sum, r) => sum + r.similarity, 0) / filteredResults.length
      : 0;

    return {
      query,
      retrievedDocuments: filteredResults,
      synthesizedContext,
      confidence: avgConfidence
    };
  }

  async augmentPrompt(userQuery: string, systemPrompt: string): Promise<string> {
    const context = await this.retrieveContext(userQuery);
    
    if (context.retrievedDocuments.length === 0) {
      return systemPrompt;
    }

    const augmentedPrompt = `${systemPrompt}

RETRIEVED KNOWLEDGE CONTEXT (confidence: ${(context.confidence * 100).toFixed(1)}%):
${context.synthesizedContext}

Use this retrieved knowledge to inform your response when relevant.`;

    return augmentedPrompt;
  }

  async learnFromConversation(userMessage: string, aiResponse: string, metadata?: { domain?: string; importance?: number }): Promise<void> {
    const conversationContent = `Q: ${userMessage}\nA: ${aiResponse}`;
    
    await this.addDocument(conversationContent, {
      source: 'conversation_learning',
      domain: metadata?.domain || 'conversation',
      importance: metadata?.importance || 0.6,
      tags: ['learned', 'conversation']
    });
  }

  getStats(): {
    totalDocuments: number;
    domains: string[];
    averageImportance: number;
    cacheSize: number;
  } {
    const domains = new Set<string>();
    let totalImportance = 0;

    for (const doc of this.vectorStore.values()) {
      domains.add(doc.metadata.domain);
      totalImportance += doc.metadata.importance;
    }

    return {
      totalDocuments: this.vectorStore.size,
      domains: Array.from(domains),
      averageImportance: this.vectorStore.size > 0 ? totalImportance / this.vectorStore.size : 0,
      cacheSize: this.embeddingCache.size
    };
  }

  async findSimilarDocuments(documentId: string, topK: number = 5): Promise<SemanticSearchResult[]> {
    const doc = this.vectorStore.get(documentId);
    if (!doc) return [];

    const results: SemanticSearchResult[] = [];

    for (const [id, otherDoc] of this.vectorStore) {
      if (id === documentId) continue;

      const similarity = this.cosineSimilarity(doc.embedding, otherDoc.embedding);
      if (similarity > 0.5) {
        results.push({
          document: otherDoc,
          similarity,
          relevanceScore: similarity * otherDoc.metadata.importance
        });
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, topK);
  }

  async clusterByDomain(): Promise<Map<string, VectorDocument[]>> {
    const clusters = new Map<string, VectorDocument[]>();

    for (const doc of this.vectorStore.values()) {
      const domain = doc.metadata.domain;
      if (!clusters.has(domain)) {
        clusters.set(domain, []);
      }
      clusters.get(domain)!.push(doc);
    }

    return clusters;
  }
}

export const vectorKnowledgeBase = new VectorKnowledgeBase();
