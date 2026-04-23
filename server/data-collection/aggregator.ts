import { WebScraper, ScrapedData } from "./web-scraper.js";
export type { ScrapedData } from "./web-scraper.js";
import { RSSAggregator, RSSItem } from "./rss-parser.js";
import { KnowledgeBase } from "./knowledge-base.js";
import { DataProcessor } from "./data-processor.js";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export interface DataSource {
  type: 'web' | 'api' | 'file' | 'database' | 'rss';
  url?: string;
  query?: string;
  path?: string;
  config?: Record<string, any>;
}

export interface AggregatedData {
  id: string;
  source: DataSource;
  data: ScrapedData[];
  collectedAt: Date;
  totalItems: number;
  categories: string[];
}

export class DataAggregator {
  private scraper: WebScraper;
  private rssAggregator: RSSAggregator;
  private knowledgeBase: KnowledgeBase;
  private dataProcessor: DataProcessor;
  private dataStore: Map<string, AggregatedData> = new Map();

  constructor() {
    this.scraper = new WebScraper();
    this.rssAggregator = new RSSAggregator();
    this.knowledgeBase = new KnowledgeBase();
    this.dataProcessor = new DataProcessor();
  }

  async initialize(): Promise<void> {
    await this.knowledgeBase.initialize();
  }

  async collectFromSources(sources: DataSource[]): Promise<AggregatedData[]> {
    const results: AggregatedData[] = [];

    for (const source of sources) {
      try {
        const data = await this.collectFromSource(source);
        if (data) {
          results.push(data);
          this.dataStore.set(data.id, data);
        }
      } catch (error) {
        console.error(`Failed to collect from source ${source.type}:`, error);
      }
    }

    return results;
  }

  private async collectFromSource(source: DataSource): Promise<AggregatedData | null> {
    switch (source.type) {
      case 'web':
        return await this.collectWebData(source);
      case 'file':
        return await this.collectFileData(source);
      case 'api':
        return await this.collectApiData(source);
      case 'rss':
        return await this.collectRSSData(source);
      default:
        return null;
    }
  }

  private async collectWebData(source: DataSource): Promise<AggregatedData> {
    if (!source.url) throw new Error('URL required for web source');

    const result = await this.scraper.scrapeUrl(source.url);

    const data: ScrapedData[] = result.success && result.data ? [result.data] : [];

    return {
      id: crypto.randomUUID(),
      source,
      data,
      collectedAt: new Date(),
      totalItems: data.length,
      categories: this.categorizeData(data)
    };
  }

  private async collectFileData(source: DataSource): Promise<AggregatedData> {
    if (!source.path) throw new Error('Path required for file source');

    const content = await fs.readFile(source.path, 'utf-8');
    const data: ScrapedData[] = [{
      url: source.path,
      title: path.basename(source.path),
      content,
      links: [],
      images: [],
      metadata: {
        fileSize: content.length,
        fileType: path.extname(source.path)
      },
      timestamp: new Date(),
      hash: crypto.createHash('sha256').update(content).digest('hex')
    }];

    return {
      id: crypto.randomUUID(),
      source,
      data,
      collectedAt: new Date(),
      totalItems: 1,
      categories: ['file']
    };
  }

  private async collectApiData(source: DataSource): Promise<AggregatedData> {
    // For API independence, we'll implement local data collection
    // This could be RSS feeds, public APIs, or local data sources
    if (!source.url) throw new Error('URL required for API source');

    // For now, treat as web source (could be extended for specific APIs)
    return await this.collectWebData(source);
  }

  private async collectRSSData(source: DataSource): Promise<AggregatedData> {
    if (!source.url) throw new Error('URL required for RSS source');

    this.rssAggregator.addFeed(source.url);
    const feeds = await this.rssAggregator.collectFromAllFeeds();

    const data: ScrapedData[] = [];
    for (const feed of feeds) {
      for (const item of feed.items.slice(0, source.config?.maxItems || 10)) {
        data.push(this.convertRSSItemToScrapedData(item, feed.title));
      }
    }

    return {
      id: crypto.randomUUID(),
      source,
      data,
      collectedAt: new Date(),
      totalItems: data.length,
      categories: ['news', 'rss']
    };
  }

  private convertRSSItemToScrapedData(item: RSSItem, feedTitle: string): ScrapedData {
    return {
      url: item.link,
      title: item.title,
      content: item.content || item.description,
      links: [], // RSS items typically don't have internal links
      images: item.enclosure?.type?.startsWith('image/') ? [item.enclosure.url] : [],
      metadata: {
        pubDate: item.pubDate,
        author: item.author,
        guid: item.guid,
        feedTitle,
        categories: item.category,
        enclosure: item.enclosure
      },
      timestamp: new Date(item.pubDate || Date.now()),
      hash: crypto.createHash('sha256').update(item.title + item.description).digest('hex')
    };
  }

  private categorizeData(data: ScrapedData[]): string[] {
    const categories: string[] = [];

    for (const item of data) {
      // Simple categorization based on content
      const content = item.content.toLowerCase();

      if (content.includes('news') || content.includes('article')) {
        categories.push('news');
      }
      if (content.includes('research') || content.includes('study')) {
        categories.push('research');
      }
      if (content.includes('technology') || content.includes('tech')) {
        categories.push('technology');
      }
      if (content.includes('science')) {
        categories.push('science');
      }
      if (content.includes('business') || content.includes('finance')) {
        categories.push('business');
      }
    }

    return [...new Set(categories)]; // Remove duplicates
  }

  async saveAggregatedData(data: AggregatedData, outputDir: string = './data/aggregated'): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });

    const filename = `${data.id}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    return filepath;
  }

  getStoredData(): AggregatedData[] {
    return Array.from(this.dataStore.values());
  }

  searchData(query: string): ScrapedData[] {
    const results: ScrapedData[] = [];
    const queryLower = query.toLowerCase();

    for (const aggregated of this.dataStore.values()) {
      for (const item of aggregated.data) {
        if (item.title.toLowerCase().includes(queryLower) ||
            item.content.toLowerCase().includes(queryLower)) {
          results.push(item);
        }
      }
    }

    return results;
  }

  async processAndStoreData(aggregatedData: AggregatedData): Promise<{
    processedCount: number;
    storedCount: number;
    knowledgeBaseStats: any;
  }> {
    // Convert AggregatedData to the format expected by DataProcessor
    const scrapedData = aggregatedData.data;

    // Process the data
    const processedData = await Promise.all(
      scrapedData.map(data => this.dataProcessor.processScrapedData(data))
    );

    // Filter by quality and deduplicate
    const filteredData = await this.dataProcessor.filterByQuality(processedData, 30);
    const uniqueData = await this.dataProcessor.deduplicateData(filteredData);

    // Convert to knowledge entries
    const knowledgeEntries = await this.dataProcessor.convertToKnowledgeEntries(
      uniqueData,
      aggregatedData.categories[0] || 'general'
    );

    // Store in knowledge base
    const storedIds: string[] = [];
    for (const entry of knowledgeEntries) {
      try {
        const id = await this.knowledgeBase.addEntry(entry);
        storedIds.push(id);
      } catch (error) {
        console.error('Failed to store knowledge entry:', error);
      }
    }

    return {
      processedCount: processedData.length,
      storedCount: storedIds.length,
      knowledgeBaseStats: this.knowledgeBase.getStats()
    };
  }

  async searchKnowledgeBase(query: string, limit: number = 10) {
    return await this.knowledgeBase.search(query, limit);
  }

  getKnowledgeBaseStats() {
    return this.knowledgeBase.getStats();
  }

  // RSS feed management
  addRSSFeed(url: string): void {
    this.rssAggregator.addFeed(url);
  }

  removeRSSFeed(url: string): void {
    this.rssAggregator.removeFeed(url);
  }

  getRSSFeeds(): string[] {
    return this.rssAggregator.getFeedUrls();
  }

  async validateRSSFeeds() {
    return await this.rssAggregator.validateAllFeeds();
  }
}