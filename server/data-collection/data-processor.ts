import { ScrapedData, AggregatedData } from "./aggregator.js";
import { KnowledgeEntry } from "./knowledge-base.js";

export interface ProcessedData {
  original: ScrapedData;
  cleanedContent: string;
  summary: string;
  keywords: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  readability: {
    wordCount: number;
    sentenceCount: number;
    avgWordsPerSentence: number;
    readingTime: number; // in minutes
  };
  quality: {
    score: number; // 0-100
    reasons: string[];
  };
}

export class DataProcessor {
  private stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
    'i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'shall'
  ]);

  async processScrapedData(data: ScrapedData): Promise<ProcessedData> {
    const cleanedContent = this.cleanText(data.content);
    const keywords = this.extractKeywords(cleanedContent);
    const summary = this.generateSummary(cleanedContent);
    const readability = this.calculateReadability(cleanedContent);
    const quality = this.assessQuality(data, cleanedContent);

    return {
      original: data,
      cleanedContent,
      summary,
      keywords,
      readability,
      quality
    };
  }

  async processAggregatedData(aggregated: AggregatedData): Promise<ProcessedData[]> {
    const processed: ProcessedData[] = [];

    for (const data of aggregated.data) {
      try {
        const processedData = await this.processScrapedData(data);
        processed.push(processedData);
      } catch (error) {
        console.error(`Failed to process data from ${data.url}:`, error);
      }
    }

    return processed;
  }

  private cleanText(text: string): string {
    return text
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove HTML entities
      .replace(/&[a-zA-Z0-9#]+;/g, ' ')
      // Remove URLs
      .replace(/https?:\/\/[^\s]+/g, ' ')
      // Remove email addresses
      .replace(/\S+@\S+\.\S+/g, ' ')
      // Remove phone numbers
      .replace(/\+?\d[\d\s\-\(\)]{8,}\d/g, ' ')
      // Remove special characters but keep basic punctuation
      .replace(/[^\w\s.,!?\-']/g, ' ')
      // Normalize quotes
      .replace(/[""]/g, '"')
      .replace(/['']/, "'")
      // Trim whitespace
      .trim();
  }

  private extractKeywords(text: string, maxKeywords: number = 20): string[] {
    const words = text.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 3 && !this.stopWords.has(word))
      .map(word => word.replace(/[^\w]/g, ''));

    const wordFreq: Record<string, number> = {};
    for (const word of words) {
      if (word) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    }

    return Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, maxKeywords)
      .map(([word]) => word);
  }

  private generateSummary(text: string, maxLength: number = 200): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);

    if (sentences.length === 0) return text.substring(0, maxLength);

    // Simple extractive summarization - take first and last sentences
    const firstSentence = sentences[0].trim();
    const lastSentence = sentences[sentences.length - 1].trim();

    let summary = firstSentence;
    if (lastSentence !== firstSentence && (summary + lastSentence).length < maxLength) {
      summary += '. ' + lastSentence;
    }

    return summary.length > maxLength ? summary.substring(0, maxLength - 3) + '...' : summary;
  }

  private calculateReadability(text: string): ProcessedData['readability'] {
    const words = text.split(/\s+/).filter(word => word.length > 0);
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);

    const wordCount = words.length;
    const sentenceCount = sentences.length;
    const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    // Rough estimate: 200 words per minute
    const readingTime = Math.ceil(wordCount / 200);

    return {
      wordCount,
      sentenceCount,
      avgWordsPerSentence,
      readingTime
    };
  }

  private assessQuality(data: ScrapedData, cleanedContent: string): ProcessedData['quality'] {
    let score = 50; // Base score
    const reasons: string[] = [];

    // Content length assessment
    if (cleanedContent.length < 100) {
      score -= 20;
      reasons.push('Content too short');
    } else if (cleanedContent.length > 1000) {
      score += 10;
      reasons.push('Good content length');
    }

    // Title presence
    if (data.title && data.title.length > 0) {
      score += 10;
      reasons.push('Has title');
    } else {
      score -= 5;
      reasons.push('Missing title');
    }

    // Metadata richness
    const metadataKeys = Object.keys(data.metadata);
    if (metadataKeys.length > 3) {
      score += 5;
      reasons.push('Rich metadata');
    }

    // Links presence (indicates content depth)
    if (data.links.length > 5) {
      score += 5;
      reasons.push('Contains useful links');
    }

    // Images presence (for visual content)
    if (data.images.length > 0) {
      score += 5;
      reasons.push('Contains images');
    }

    // Check for boilerplate content
    const boilerplateIndicators = ['cookie', 'privacy policy', 'terms of service', 'copyright'];
    const hasBoilerplate = boilerplateIndicators.some(indicator =>
      cleanedContent.toLowerCase().includes(indicator)
    );
    if (hasBoilerplate) {
      score -= 10;
      reasons.push('Contains boilerplate content');
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    if (score >= 80) {
      reasons.push('High quality content');
    } else if (score >= 60) {
      reasons.push('Medium quality content');
    } else {
      reasons.push('Low quality content');
    }

    return { score, reasons };
  }

  async deduplicateData(processedData: ProcessedData[]): Promise<ProcessedData[]> {
    const seen = new Set<string>();
    const unique: ProcessedData[] = [];

    for (const data of processedData) {
      // Create a simple hash of the content for deduplication
      const contentHash = this.simpleHash(data.cleanedContent);

      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(data);
      }
    }

    return unique;
  }

  private simpleHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  async filterByQuality(processedData: ProcessedData[], minScore: number = 40): Promise<ProcessedData[]> {
    return processedData.filter(data => data.quality.score >= minScore);
  }

  async convertToKnowledgeEntries(processedData: ProcessedData[], category: string = 'processed'): Promise<KnowledgeEntry[]> {
    return processedData.map(data => ({
      id: '', // Will be set by KnowledgeBase
      content: data.cleanedContent,
      metadata: {
        ...data.original.metadata,
        summary: data.summary,
        keywords: data.keywords,
        readability: data.readability,
        quality: data.quality,
        originalUrl: data.original.url,
        processedAt: new Date().toISOString()
      },
      source: data.original.url,
      timestamp: new Date(),
      category,
      tags: data.keywords.slice(0, 5)
    }));
  }
}