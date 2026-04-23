import { Router } from 'express';
import { cyrusBrain, dataIngestionPipeline } from '../ai/cyrus-brain.js';

const router = Router();

// Get brain status
router.get('/status', (req, res) => {
  try {
    const status = cyrusBrain.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Manually trigger knowledge ingestion
router.post('/ingest', async (req, res) => {
  try {
    const { source, data } = req.body;

    if (source === 'web' && data.url) {
      const knowledge = await dataIngestionPipeline.searchKnowledge(''); // Would need proper implementation
      res.json({ message: 'Web ingestion triggered', knowledge });
    } else if (source === 'text' && data.content) {
      await cyrusBrain.addKnowledge(data.content, data.metadata || {});
      res.json({ message: 'Knowledge added successfully' });
    } else {
      res.status(400).json({ error: 'Invalid ingestion request' });
    }
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Search knowledge base
router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5 } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await dataIngestionPipeline.searchKnowledge(query);
    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Add learning feedback
router.post('/learn', async (req, res) => {
  try {
    const { userInput, cyrusResponse, feedback } = req.body;

    await cyrusBrain.learnFromInteraction(userInput, cyrusResponse, feedback);
    res.json({ message: 'Learning recorded successfully' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get learning statistics
router.get('/stats', (req, res) => {
  try {
    const status = cyrusBrain.getStatus();
    res.json({
      knowledgeBase: status.knowledgeStats,
      ingestion: status.ingestionStatus,
      learning: {
        totalInteractions: 0, // Would be calculated from stored data
        adaptationRate: 0.01,
        lastLearning: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Vision processing endpoints
router.post('/vision/analyze', async (req, res) => {
  try {
    const { image, analysisType = 'comprehensive' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const result = await cyrusBrain.processImage(image, analysisType);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/vision/threats', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const result = await cyrusBrain.detectThreats(image);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/vision/situation', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const result = await cyrusBrain.assessSituationalAwareness(image);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/vision/live-feed', async (req, res) => {
  try {
    const { videoSource, duration } = req.body;

    if (!videoSource) {
      return res.status(400).json({ error: 'Video source is required' });
    }

    // Start live feed processing (this will run asynchronously)
    const result = await cyrusBrain.processLiveFeed(videoSource, duration);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.get('/vision/status', (req, res) => {
  try {
    const status = cyrusBrain.getVisionStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

router.post('/vision/stop', (req, res) => {
  try {
    cyrusBrain.stopVisionProcessing();
    res.json({ message: 'Vision processing stopped' });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;