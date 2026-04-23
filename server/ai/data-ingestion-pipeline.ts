import { knowledgeAcquisition } from './knowledge-acquisition.js';
import { learningSystem } from './learning-system.js';
import fs from 'fs';
import path from 'path';

export class DataIngestionPipeline {
  private config: any;
  private isRunning: boolean = false;

  constructor(configPath = './server/ai/knowledge-brain-config.json') {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  async startIngestion(): Promise<void> {
    if (this.isRunning) {
      console.log('📥 Data ingestion already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting CYRUS knowledge ingestion pipeline...');

    try {
      // Start multiple ingestion processes
      await Promise.all([
        this.ingestFromWeb(),
        this.ingestFromYouTube(),
        this.ingestFromWikipedia(),
        this.ingestFromAcademicSources(),
        this.ingestFromNewsSources()
      ]);
    } catch (error) {
      console.error('Ingestion pipeline error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async ingestFromWeb(): Promise<void> {
    if (!this.config.dataSources.web.enabled) return;

    console.log('🌐 Starting web ingestion...');

    const seedUrls = [
      'https://en.wikipedia.org/wiki/Artificial_intelligence',
      'https://en.wikipedia.org/wiki/Machine_learning',
      'https://en.wikipedia.org/wiki/Neural_network',
      'https://en.wikipedia.org/wiki/Cognitive_science',
      'https://en.wikipedia.org/wiki/Psychology',
      'https://en.wikipedia.org/wiki/Engineering',
      'https://en.wikipedia.org/wiki/Aerospace_engineering',
      'https://en.wikipedia.org/wiki/Robotics'
    ];

    for (const url of seedUrls) {
      try {
        await knowledgeAcquisition.acquireFromWeb(url, this.config.dataSources.web.crawlDepth);

        // Rate limiting
        await this.delay(1000 / this.config.dataSources.web.rateLimit);
      } catch (error) {
        console.warn(`Failed to ingest from ${url}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async ingestFromYouTube(): Promise<void> {
    if (!this.config.dataSources.youtube.enabled) return;

    console.log('📺 Starting YouTube ingestion...');

    // This would require YouTube API integration
    // For now, we'll use some known educational video IDs
    const videoIds = [
      'aircAruvnKk', // 3Blue1Brown - Neural Networks
      'IHZwWFHWa-w', // Vsauce - AI
      'nM3rTU927io', // Kurzgesagt - AI
      't3T5GqkKdO4', // TED-Ed - Machine Learning
      'HcqpanDadyQ'  // SciShow - Neural Networks
    ];

    for (const videoId of videoIds) {
      try {
        await knowledgeAcquisition.acquireFromYouTube(videoId);
        await this.delay(2000); // Rate limiting
      } catch (error) {
        console.warn(`Failed to ingest YouTube video ${videoId}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async ingestFromWikipedia(): Promise<void> {
    console.log('📖 Starting Wikipedia ingestion...');

    const topics = [
      'Artificial intelligence',
      'Machine learning',
      'Deep learning',
      'Neural network',
      'Cognitive science',
      'Psychology',
      'Engineering',
      'Aerospace engineering',
      'Robotics',
      'Human-computer interaction',
      'Natural language processing',
      'Computer vision',
      'Quantum computing',
      'Biotechnology'
    ];

    for (const topic of topics) {
      try {
        await knowledgeAcquisition.acquireFromWikipedia(topic);
        await this.delay(1000);
      } catch (error) {
        console.warn(`Failed to ingest Wikipedia topic ${topic}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async ingestFromAcademicSources(): Promise<void> {
    if (!this.config.dataSources.academic.enabled) return;

    console.log('🎓 Starting academic source ingestion...');

    // This would integrate with arXiv, PubMed, Google Scholar APIs
    // For now, we'll simulate with some key paper URLs
    const academicUrls = [
      'https://arxiv.org/abs/1706.03762', // Attention Is All You Need
      'https://arxiv.org/abs/1409.1556',  // Generative Adversarial Nets
      'https://arxiv.org/abs/1312.6114',  // Adam: A Method for Stochastic Optimization
      'https://arxiv.org/abs/1502.03167'   // Batch Normalization
    ];

    for (const url of academicUrls) {
      try {
        await knowledgeAcquisition.acquireFromWeb(url, 1);
        await this.delay(2000);
      } catch (error) {
        console.warn(`Failed to ingest academic paper ${url}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  private async ingestFromNewsSources(): Promise<void> {
    if (!this.config.dataSources.news.enabled) return;

    console.log('📰 Starting news source ingestion...');

    // This would integrate with RSS feeds and news APIs
    const newsUrls = [
      'https://www.bbc.com/news/science_and_environment',
      'https://www.nature.com/news/',
      'https://www.sciencemag.org/news/',
      'https://www.reuters.com/technology/ai/'
    ];

    for (const url of newsUrls) {
      try {
        await knowledgeAcquisition.acquireFromWeb(url, 2);
        await this.delay(3000);
      } catch (error) {
        console.warn(`Failed to ingest news from ${url}:`, error instanceof Error ? error.message : String(error));
      }
    }
  }

  async ingestFromInteraction(userInput: string, cyrusResponse: string, feedback?: any): Promise<void> {
    // Learn from user interactions
    await learningSystem.learnFromInteraction(userInput, cyrusResponse, feedback);
  }

  async searchKnowledge(query: string): Promise<any[]> {
    return await knowledgeAcquisition.searchKnowledge(query);
  }

  async ingestContent(content: string, metadata: Record<string, any> = {}): Promise<void> {
    await knowledgeAcquisition.storeKnowledge({
      source: "direct_input",
      content,
      metadata,
      timestamp: new Date().toISOString(),
    });
  }

  async getLearnedResponse(query: string): Promise<string | null> {
    return await learningSystem.getLearnedResponse(query);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  stopIngestion(): void {
    this.isRunning = false;
    console.log('🛑 Data ingestion stopped');
  }

  getStatus(): any {
    return {
      isRunning: this.isRunning,
      config: this.config
    };
  }
}

export const dataIngestionPipeline = new DataIngestionPipeline();
export default dataIngestionPipeline;