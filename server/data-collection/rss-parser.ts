import axios from "axios";
import { XMLParser } from "fast-xml-parser";

export interface RSSItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid?: string;
  author?: string;
  category?: string[];
  content?: string;
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
  hash?: string;
}

export interface RSSFeed {
  title: string;
  description: string;
  link: string;
  language?: string;
  lastBuildDate?: string;
  items: RSSItem[];
}

export class RSSParser {
  private xmlParser: XMLParser;

  constructor() {
    this.xmlParser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text"
    });
  }

  async parseFeed(url: string): Promise<RSSFeed> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'CYRUS-Data-Collection/1.0'
        }
      });

      const parsed = this.xmlParser.parse(response.data);

      // Handle different RSS formats
      const channel = parsed.rss?.channel || parsed.feed || parsed;

      if (!channel) {
        throw new Error('Invalid RSS feed format');
      }

      const items = this.extractItems(channel);

      return {
        title: this.extractText(channel.title),
        description: this.extractText(channel.description || channel.subtitle),
        link: this.extractText(channel.link),
        language: this.extractText(channel.language),
        lastBuildDate: this.extractText(channel.lastBuildDate || channel.updated),
        items
      };
    } catch (error) {
      throw new Error(`Failed to parse RSS feed from ${url}: ${error}`);
    }
  }

  private extractItems(channel: any): RSSItem[] {
    const items = channel.item || channel.entry || [];

    if (!Array.isArray(items)) {
      return [this.parseItem(items)];
    }

    return items.map(item => this.parseItem(item));
  }

  private parseItem(item: any): RSSItem {
    return {
      title: this.extractText(item.title),
      description: this.extractText(item.description || item.summary || item.content),
      link: this.extractText(item.link),
      pubDate: this.extractText(item.pubDate || item.published || item.updated),
      guid: this.extractText(item.guid || item.id),
      author: this.extractText(item.author || item.creator || item['dc:creator']),
      category: this.extractCategories(item.category),
      content: this.extractText(item.content || item['content:encoded']),
      enclosure: this.extractEnclosure(item.enclosure)
    };
  }

  private extractText(field: any): string {
    if (!field) return '';

    if (typeof field === 'string') return field;

    if (typeof field === 'object' && field['#text']) {
      return field['#text'];
    }

    if (typeof field === 'object' && field['@_href']) {
      return field['@_href'];
    }

    return String(field);
  }

  private extractCategories(categories: any): string[] | undefined {
    if (!categories) return undefined;

    if (Array.isArray(categories)) {
      return categories.map(cat => this.extractText(cat));
    }

    if (typeof categories === 'string') {
      return [categories];
    }

    if (typeof categories === 'object' && categories['#text']) {
      return [categories['#text']];
    }

    return [String(categories)];
  }

  private extractEnclosure(enclosure: any): RSSItem['enclosure'] | undefined {
    if (!enclosure) return undefined;

    if (Array.isArray(enclosure)) {
      enclosure = enclosure[0];
    }

    if (typeof enclosure === 'object' && enclosure['@_url']) {
      return {
        url: enclosure['@_url'],
        type: enclosure['@_type'] || '',
        length: enclosure['@_length'] ? parseInt(enclosure['@_length']) : undefined
      };
    }

    return undefined;
  }

  async validateFeed(url: string): Promise<boolean> {
    try {
      const feed = await this.parseFeed(url);
      return feed.items.length > 0;
    } catch {
      return false;
    }
  }

  async getFeedInfo(url: string): Promise<{ title: string; itemCount: number; lastUpdated?: string }> {
    const feed = await this.parseFeed(url);

    return {
      title: feed.title,
      itemCount: feed.items.length,
      lastUpdated: feed.lastBuildDate
    };
  }
}

export class RSSAggregator {
  private parser: RSSParser;
  private feedUrls: string[] = [];

  constructor(feedUrls: string[] = []) {
    this.parser = new RSSParser();
    this.feedUrls = feedUrls;
  }

  addFeed(url: string): void {
    if (!this.feedUrls.includes(url)) {
      this.feedUrls.push(url);
    }
  }

  removeFeed(url: string): void {
    this.feedUrls = this.feedUrls.filter(feed => feed !== url);
  }

  async collectFromAllFeeds(): Promise<RSSFeed[]> {
    const feeds: RSSFeed[] = [];

    for (const url of this.feedUrls) {
      try {
        const feed = await this.parser.parseFeed(url);
        feeds.push(feed);
      } catch (error) {
        console.error(`Failed to collect from RSS feed ${url}:`, error);
      }
    }

    return feeds;
  }

  async collectLatestItems(limit: number = 50): Promise<RSSItem[]> {
    const allItems: RSSItem[] = [];

    for (const url of this.feedUrls) {
      try {
        const feed = await this.parser.parseFeed(url);
        allItems.push(...feed.items);
      } catch (error) {
        console.error(`Failed to collect from RSS feed ${url}:`, error);
      }
    }

    // Sort by publication date (newest first)
    allItems.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    return allItems.slice(0, limit);
  }

  async searchFeeds(query: string, limit: number = 20): Promise<RSSItem[]> {
    const allItems = await this.collectLatestItems(200); // Get more items to search through

    const queryLower = query.toLowerCase();
    const matchingItems = allItems.filter(item => {
      const titleMatch = item.title.toLowerCase().includes(queryLower);
      const descMatch = item.description.toLowerCase().includes(queryLower);
      return titleMatch || descMatch;
    });

    return matchingItems.slice(0, limit);
  }

  getFeedUrls(): string[] {
    return [...this.feedUrls];
  }

  async validateAllFeeds(): Promise<{ url: string; valid: boolean; error?: string }[]> {
    const results = await Promise.allSettled(
      this.feedUrls.map(async (url) => {
        try {
          const valid = await this.parser.validateFeed(url);
          return { url, valid };
        } catch (error) {
          return { url, valid: false, error: String(error) };
        }
      })
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { url: '', valid: false, error: result.reason };
      }
    });
  }
}