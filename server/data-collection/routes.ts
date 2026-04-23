import express from "express";
import { DataAggregator, DataSource } from "./aggregator.js";

const router = express.Router();
const aggregator = new DataAggregator();

// Initialize the aggregator
aggregator.initialize().catch(console.error);

router.post('/collect', async (req, res) => {
  try {
    const { sources }: { sources: DataSource[] } = req.body;

    if (!sources || !Array.isArray(sources)) {
      return res.status(400).json({
        error: 'Sources array is required'
      });
    }

    const results = await aggregator.collectFromSources(sources);

    // Process and store the collected data
    const processingResults = [];
    for (const result of results) {
      try {
        const processed = await aggregator.processAndStoreData(result);
        processingResults.push({
          source: result.source,
          collected: result.totalItems,
          processed: processed.processedCount,
          stored: processed.storedCount
        });
      } catch (error) {
        console.error('Failed to process data:', error);
        processingResults.push({
          source: result.source,
          error: String(error)
        });
      }
    }

    res.json({
      success: true,
      results: processingResults,
      knowledgeBaseStats: aggregator.getKnowledgeBaseStats()
    });
  } catch (error) {
    console.error('Data collection error:', error);
    res.status(500).json({
      error: 'Failed to collect data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/collect/web', async (req, res) => {
  try {
    const { urls, categories = ['web'] }: { urls: string[]; categories?: string[] } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        error: 'URLs array is required'
      });
    }

    const sources: DataSource[] = urls.map(url => ({
      type: 'web',
      url
    }));

    const results = await aggregator.collectFromSources(sources);

    // Process and store
    const processingResults = [];
    for (const result of results) {
      const processed = await aggregator.processAndStoreData(result);
      processingResults.push({
        url: result.source.url,
        collected: result.totalItems,
        processed: processed.processedCount,
        stored: processed.storedCount
      });
    }

    res.json({
      success: true,
      results: processingResults
    });
  } catch (error) {
    console.error('Web collection error:', error);
    res.status(500).json({
      error: 'Failed to collect web data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/collect/rss', async (req, res) => {
  try {
    const { urls, categories = ['news'] }: { urls: string[]; categories?: string[] } = req.body;

    if (!urls || !Array.isArray(urls)) {
      return res.status(400).json({
        error: 'RSS URLs array is required'
      });
    }

    const sources: DataSource[] = urls.map(url => ({
      type: 'rss',
      url,
      config: { maxItems: 20 }
    }));

    const results = await aggregator.collectFromSources(sources);

    // Process and store
    const processingResults = [];
    for (const result of results) {
      const processed = await aggregator.processAndStoreData(result);
      processingResults.push({
        feed: result.source.url,
        collected: result.totalItems,
        processed: processed.processedCount,
        stored: processed.storedCount
      });
    }

    res.json({
      success: true,
      results: processingResults
    });
  } catch (error) {
    console.error('RSS collection error:', error);
    res.status(500).json({
      error: 'Failed to collect RSS data',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/search', async (req, res) => {
  try {
    const { q: query, limit = 10 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Query parameter is required'
      });
    }

    const results = await aggregator.searchKnowledgeBase(query, parseInt(String(limit)));

    res.json({
      success: true,
      query,
      results: results.map(result => ({
        id: result.entry.id,
        title: result.entry.metadata.title || 'No title',
        content: result.entry.content.substring(0, 200) + '...',
        source: result.entry.source,
        category: result.entry.category,
        tags: result.entry.tags,
        score: result.score,
        matches: result.matches,
        timestamp: result.entry.timestamp
      }))
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      error: 'Failed to search knowledge base',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/stats', async (req, res) => {
  try {
    const stats = aggregator.getKnowledgeBaseStats();
    const storedData = aggregator.getStoredData();

    res.json({
      success: true,
      knowledgeBase: stats,
      aggregatedData: {
        totalCollections: storedData.length,
        collections: storedData.map(data => ({
          id: data.id,
          source: data.source,
          totalItems: data.totalItems,
          categories: data.categories,
          collectedAt: data.collectedAt
        }))
      }
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/rss/add', (req, res) => {
  try {
    const { url }: { url: string } = req.body;

    if (!url) {
      return res.status(400).json({
        error: 'RSS feed URL is required'
      });
    }

    aggregator.addRSSFeed(url);

    res.json({
      success: true,
      message: 'RSS feed added',
      feeds: aggregator.getRSSFeeds()
    });
  } catch (error) {
    console.error('Add RSS feed error:', error);
    res.status(500).json({
      error: 'Failed to add RSS feed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.delete('/rss/:url', (req, res) => {
  try {
    const url = decodeURIComponent(req.params.url);
    aggregator.removeRSSFeed(url);

    res.json({
      success: true,
      message: 'RSS feed removed',
      feeds: aggregator.getRSSFeeds()
    });
  } catch (error) {
    console.error('Remove RSS feed error:', error);
    res.status(500).json({
      error: 'Failed to remove RSS feed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

router.get('/rss/validate', async (req, res) => {
  try {
    const validationResults = await aggregator.validateRSSFeeds();

    res.json({
      success: true,
      results: validationResults
    });
  } catch (error) {
    console.error('Validate RSS feeds error:', error);
    res.status(500).json({
      error: 'Failed to validate RSS feeds',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;