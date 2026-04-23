import axios from "axios";
import * as cheerio from "cheerio";
import { URL } from "url";
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export interface ScrapedData {
  url: string;
  title: string;
  content: string;
  links: string[];
  images: string[];
  metadata: Record<string, any>;
  timestamp: Date;
  hash?: string;
}

export interface DataCollectionResult {
  success: boolean;
  data?: ScrapedData;
  error?: string;
  sources: string[];
}

export class WebScraper {
  private userAgent = "CYRUS-Data-Collector/1.0 (Independent AI Research)";

  async scrapeUrl(url: string): Promise<DataCollectionResult> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
        maxRedirects: 5
      });

      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || $('h1').first().text().trim() || 'Untitled';

      // Extract main content
      const contentSelectors = ['article', 'main', '.content', '#content', '.post', '.entry'];
      let content = '';

      for (const selector of contentSelectors) {
        const element = $(selector).first();
        if (element.length > 0) {
          content = element.text().trim();
          break;
        }
      }

      if (!content) {
        // Fallback: get all paragraph text
        content = $('p').map((_, el) => $(el).text().trim()).get().join('\n\n');
      }

      // Extract links
      const links = $('a[href]').map((_, el) => {
        try {
          return new URL($(el).attr('href')!, url).href;
        } catch {
          return null;
        }
      }).get().filter(Boolean) as string[];

      // Extract images
      const images = $('img[src]').map((_, el) => {
        try {
          return new URL($(el).attr('src')!, url).href;
        } catch {
          return null;
        }
      }).get().filter(Boolean) as string[];

      // Extract metadata
      const metadata: Record<string, any> = {
        description: $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content'),
        keywords: $('meta[name="keywords"]').attr('content'),
        author: $('meta[name="author"]').attr('content'),
        published: $('meta[property="article:published_time"]').attr('content') || $('time').attr('datetime'),
        language: $('html').attr('lang') || 'en',
        wordCount: content.split(/\s+/).length,
        readingTime: Math.ceil(content.split(/\s+/).length / 200) // ~200 words per minute
      };

      const data: ScrapedData = {
        url,
        title,
        content,
        links: [...new Set(links)], // Remove duplicates
        images: [...new Set(images)], // Remove duplicates
        metadata,
        timestamp: new Date(),
        hash: crypto.createHash('sha256').update(content).digest('hex')
      };

      return {
        success: true,
        data,
        sources: [url]
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        sources: [url]
      };
    }
  }

  async scrapeMultiple(urls: string[]): Promise<DataCollectionResult[]> {
    const results = await Promise.allSettled(
      urls.map(url => this.scrapeUrl(url))
    );

    return results.map(result =>
      result.status === 'fulfilled' ? result.value : {
        success: false,
        error: 'Request failed',
        sources: []
      }
    );
  }

  async saveToFile(data: ScrapedData, outputDir: string = './data'): Promise<string> {
    await fs.mkdir(outputDir, { recursive: true });

    const hash = data.hash || crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    const filename = `${hash.substring(0, 8)}_${Date.now()}.json`;
    const filepath = path.join(outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    return filepath;
  }
}