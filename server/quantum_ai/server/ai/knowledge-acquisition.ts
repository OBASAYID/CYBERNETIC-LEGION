import { ChromaClient } from 'chromadb';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

export class KnowledgeAcquisition {
  private vectorDb: any;
  private config: any;

  constructor(configPath = './server/ai/knowledge-brain-config.json') {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.initializeVectorDb();
  }

  private async initializeVectorDb() {
    if (this.config.vectorDb.type === 'chromadb') {
      try {
        this.vectorDb = new ChromaClient();
        await this.vectorDb.heartbeat(); // Test connection
        console.log('[Knowledge Acquisition] ChromaDB connected successfully');
      } catch (error) {
        console.warn('[Knowledge Acquisition] ChromaDB connection failed, falling back to file-based storage:', error.message);
        this.vectorDb = null; // Fallback to file-based
      }
    }
  }

  async acquireFromWeb(url: string, depth = 1): Promise<any[]> {
    console.log(`🌐 Acquiring knowledge from: ${url}`);

    try {
      const response = await fetch(url);
      const html = await response.text();
      const $ = cheerio.load(html);

      // Extract text content
      const title = $('title').text().trim();
      const content = $('body').text().replace(/s+/g, ' ').trim();
      const links = $('a[href]').map((_, el) => $(el).attr('href')).get();

      const knowledge = {
        url,
        title,
        content,
        timestamp: new Date().toISOString(),
        source: 'web',
        relevance: await this.calculateRelevance(content)
      };

      // Store in vector database
      await this.storeKnowledge(knowledge);

      // Recursively crawl if depth > 1
      const newKnowledge = [knowledge];
      if (depth > 1) {
        for (const link of links.slice(0, 5)) { // Limit to 5 links per page
          if (this.isRelevantUrl(link)) {
            try {
              const subKnowledge = await this.acquireFromWeb(link, depth - 1);
              newKnowledge.push(...subKnowledge);
            } catch (error) {
              console.warn(`Failed to crawl ${link}:`, error.message);
            }
          }
        }
      }

      return newKnowledge;
    } catch (error) {
      console.error(`Failed to acquire from ${url}:`, error);
      return [];
    }
  }

  async acquireFromYouTube(videoId: string): Promise<any> {
    console.log(`📺 Acquiring knowledge from YouTube: ${videoId}`);

    return new Promise((resolve, reject) => {
      const python = spawn('python3', [
        '-c',
        `
import sys
import json
from youtube_transcript_api import YouTubeTranscriptApi

try:
    transcript = YouTubeTranscriptApi.get_transcript('${videoId}')
    text = ' '.join([entry['text'] for entry in transcript])

    result = {
        'videoId': '${videoId}',
        'content': text,
        'source': 'youtube',
        'timestamp': '${new Date().toISOString()}'
    }

    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
        `
      ]);

      let output = '';
      python.stdout.on('data', (data) => output += data.toString());
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            this.storeKnowledge(result).then(() => resolve(result));
          } catch {
            resolve(null);
          }
        } else {
          reject(new Error(`Python script failed: ${output}`));
        }
      });
    });
  }

  async acquireFromWikipedia(topic: string): Promise<any> {
    console.log(`📖 Acquiring knowledge from Wikipedia: ${topic}`);

    return new Promise((resolve, reject) => {
      const python = spawn('python3', [
        '-c',
        `
import sys
import json
import wikipedia

try:
    page = wikipedia.page('${topic}')
    content = page.content[:10000]  # Limit content length

    result = {
        'title': page.title,
        'content': content,
        'url': page.url,
        'source': 'wikipedia',
        'timestamp': '${new Date().toISOString()}'
    }

    print(json.dumps(result))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
        `
      ]);

      let output = '';
      python.stdout.on('data', (data) => output += data.toString());
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output.trim());
            this.storeKnowledge(result).then(() => resolve(result));
          } catch {
            resolve(null);
          }
        } else {
          reject(new Error(`Python script failed: ${output}`));
        }
      });
    });
  }

  private async calculateRelevance(content: string): Promise<number> {
    // Calculate relevance score based on CYRUS's domains
    const domains = this.config.relevanceFilter.domains;
    const lowerContent = content.toLowerCase();

    let score = 0;
    let matches = 0;

    for (const domain of domains) {
      if (lowerContent.includes(domain.toLowerCase())) {
        score += 1;
        matches += 1;
      }
    }

    // Normalize score
    return matches > 0 ? Math.min(score / domains.length, 1) : 0;
  }

  private isRelevantUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    // Check if URL is from allowed domains
    const allowedDomains = this.config.dataSources.web.domains;
    return allowedDomains.some((domain: string) => url.includes(domain));
  }

  private async storeKnowledge(knowledge: any): Promise<void> {
    if (knowledge.relevance < this.config.relevanceFilter.minRelevanceScore) {
      return; // Skip irrelevant knowledge
    }

    try {
      // Generate embedding
      const embedding = await this.generateEmbedding(knowledge.content);

      // Store in vector database
      await this.vectorDb.add({
        ids: [Date.now().toString()],
        embeddings: [embedding],
        metadatas: [{
          source: knowledge.source,
          url: knowledge.url,
          title: knowledge.title,
          timestamp: knowledge.timestamp,
          relevance: knowledge.relevance
        }],
        documents: [knowledge.content]
      });

      console.log(`✅ Stored knowledge: ${knowledge.title || 'Untitled'} (relevance: ${knowledge.relevance.toFixed(2)})`);
    } catch (error) {
      console.error('Failed to store knowledge:', error);
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [
        '-c',
        `
import sys
import json
from sentence_transformers import SentenceTransformer

try:
    model = SentenceTransformer('${this.config.learning.embeddingModel}')
    embedding = model.encode('${text.replace(/'/g, "\'")}').tolist()
    print(json.dumps(embedding))
except Exception as e:
    print(json.dumps({'error': str(e)}))
    sys.exit(1)
        `
      ]);

      let output = '';
      python.stdout.on('data', (data) => output += data.toString());
      python.on('close', (code) => {
        if (code === 0) {
          try {
            const embedding = JSON.parse(output.trim());
            resolve(embedding);
          } catch {
            reject(new Error('Failed to parse embedding'));
          }
        } else {
          reject(new Error(`Embedding generation failed: ${output}`));
        }
      });
    });
  }

  async searchKnowledge(query: string, limit = 5): Promise<any[]> {
    const queryEmbedding = await this.generateEmbedding(query);

    const results = await this.vectorDb.query({
      queryEmbeddings: [queryEmbedding],
      nResults: limit
    });

    return results.documents[0].map((doc: string, i: number) => ({
      content: doc,
      metadata: results.metadatas[0][i],
      score: results.distances[0][i]
    }));
  }
}

export const knowledgeAcquisition = new KnowledgeAcquisition();
export default knowledgeAcquisition;