import { ScrapedData, AggregatedData } from "./aggregator";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export interface KnowledgeEntry {
  id: string;
  content: string;
  metadata: Record<string, any>;
  source: string;
  timestamp: Date;
  category: string;
  tags: string[];
  embeddings?: number[];
}

export interface SearchResult {
  entry: KnowledgeEntry;
  score: number;
  matches: string[];
}

export class KnowledgeBase {
  private entries: Map<string, KnowledgeEntry> = new Map();
  private storagePath: string;

  constructor(storagePath: string = './data/knowledge') {
    this.storagePath = storagePath;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.storagePath, { recursive: true });
    await this.loadExistingEntries();
  }

  private async loadExistingEntries(): Promise<void> {
    try {
      const files = await fs.readdir(this.storagePath);
      const jsonFiles = files.filter(f => f.endsWith('.json'));

      for (const file of jsonFiles) {
        try {
          const content = await fs.readFile(path.join(this.storagePath, file), 'utf-8');
          const entry: KnowledgeEntry = JSON.parse(content);
          this.entries.set(entry.id, entry);
        } catch (error) {
          console.error(`Failed to load knowledge entry ${file}:`, error);
        }
      }
    } catch (error) {
      // Directory doesn't exist yet, that's fine
    }
  }

  async addEntry(entry: Omit<KnowledgeEntry, 'id' | 'timestamp'>): Promise<string> {
    const id = crypto.randomUUID();
    const fullEntry: KnowledgeEntry = {
      ...entry,
      id,
      timestamp: new Date()
    };

    this.entries.set(id, fullEntry);
    await this.saveEntry(fullEntry);

    return id;
  }

  async addFromScrapedData(data: ScrapedData, category: string = 'web'): Promise<string[]> {
    const entries: string[] = [];

    // Add main content entry
    const mainEntryId = await this.addEntry({
      content: data.content,
      metadata: {
        ...data.metadata,
        url: data.url,
        title: data.title,
        scrapedAt: data.timestamp
      },
      source: data.url,
      category,
      tags: this.extractTags(data.content, data.title)
    });
    entries.push(mainEntryId);

    // Add entries for important links (could be expanded)
    if (data.links.length > 0) {
      const linksEntryId = await this.addEntry({
        content: `Related links: ${data.links.slice(0, 10).join(', ')}`,
        metadata: {
          linkCount: data.links.length,
          parentUrl: data.url
        },
        source: data.url,
        category: `${category}-links`,
        tags: ['links', 'references']
      });
      entries.push(linksEntryId);
    }

    return entries;
  }

  async addFromAggregatedData(aggregated: AggregatedData): Promise<string[]> {
    const allEntries: string[] = [];

    for (const data of aggregated.data) {
      const entries = await this.addFromScrapedData(data, aggregated.categories[0] || 'general');
      allEntries.push(...entries);
    }

    return allEntries;
  }

  private extractTags(content: string, title: string): string[] {
    const text = `${title} ${content}`.toLowerCase();
    const tags: string[] = [];

    // Common keywords that indicate categories
    const keywordMap: Record<string, string[]> = {
      technology: ['technology', 'software', 'hardware', 'ai', 'machine learning', 'programming'],
      science: ['science', 'research', 'study', 'experiment', 'discovery'],
      business: ['business', 'company', 'market', 'finance', 'economy'],
      health: ['health', 'medical', 'disease', 'treatment', 'medicine'],
      education: ['education', 'learning', 'school', 'university', 'teaching'],
      politics: ['politics', 'government', 'policy', 'election', 'law'],
      sports: ['sports', 'game', 'team', 'player', 'competition'],
      entertainment: ['entertainment', 'movie', 'music', 'art', 'celebrity']
    };

    for (const [category, keywords] of Object.entries(keywordMap)) {
      if (keywords.some(keyword => text.includes(keyword))) {
        tags.push(category);
      }
    }

    // Extract proper nouns as potential tags
    const words = text.split(/\s+/);
    for (const word of words) {
      if (word.length > 3 && word[0] === word[0].toUpperCase() && !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'has', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word.toLowerCase())) {
        tags.push(word.toLowerCase());
      }
    }

    return [...new Set(tags)].slice(0, 10); // Limit to 10 tags
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    const queryLower = query.toLowerCase();
    const results: SearchResult[] = [];

    for (const entry of this.entries.values()) {
      const contentLower = entry.content.toLowerCase();
      const titleLower = (entry.metadata.title || '').toLowerCase();

      let score = 0;
      const matches: string[] = [];

      // Title matches have higher weight
      if (titleLower.includes(queryLower)) {
        score += 10;
        matches.push('title');
      }

      // Content matches
      if (contentLower.includes(queryLower)) {
        score += 5;
        matches.push('content');
      }

      // Tag matches
      if (entry.tags.some(tag => tag.includes(queryLower))) {
        score += 3;
        matches.push('tags');
      }

      // Category matches
      if (entry.category.includes(queryLower)) {
        score += 2;
        matches.push('category');
      }

      if (score > 0) {
        results.push({ entry, score, matches });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  getEntry(id: string): KnowledgeEntry | undefined {
    return this.entries.get(id);
  }

  getAllEntries(): KnowledgeEntry[] {
    return Array.from(this.entries.values());
  }

  getEntriesByCategory(category: string): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(entry => entry.category === category);
  }

  async saveEntry(entry: KnowledgeEntry): Promise<void> {
    const filename = `${entry.id}.json`;
    const filepath = path.join(this.storagePath, filename);

    await fs.writeFile(filepath, JSON.stringify(entry, null, 2), 'utf-8');
  }

  async deleteEntry(id: string): Promise<boolean> {
    const entry = this.entries.get(id);
    if (!entry) return false;

    this.entries.delete(id);

    const filename = `${id}.json`;
    const filepath = path.join(this.storagePath, filename);

    try {
      await fs.unlink(filepath);
      return true;
    } catch {
      return false;
    }
  }

  getStats(): { totalEntries: number; categories: Record<string, number>; sources: string[] } {
    const categories: Record<string, number> = {};
    const sources = new Set<string>();

    for (const entry of this.entries.values()) {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
      sources.add(entry.source);
    }

    return {
      totalEntries: this.entries.size,
      categories,
      sources: Array.from(sources)
    };
  }
}