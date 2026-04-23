import { dataIngestionPipeline } from './data-ingestion-pipeline';
import { localLLM } from './local-llm-client.js';
import { advancedIntelligenceIntegration, type IntegratedIntelligenceRequest } from './advanced-intelligence-integration';
import { AdvancedVisionProcessor } from './advanced-vision-module';

export class CyrusBrain {
  private brain: any;
  private isInitialized: boolean = false;
  private useAdvancedIntelligence: boolean = true;
  private visionProcessor: AdvancedVisionProcessor | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      console.log('🧠 Initializing CYRUS Brain with Advanced Intelligence and Vision...');

      // Start knowledge ingestion in background
      dataIngestionPipeline.startIngestion().catch(error => {
        console.error('Failed to start knowledge ingestion:', error);
      });

      // Initialize advanced intelligence components
      console.log('🔬 Initializing Advanced Intelligence Integration...');
      // Components are initialized as singletons when imported

      // Initialize advanced vision processor
      console.log('👁️ Initializing Advanced Vision Processor...');
      try {
        this.visionProcessor = new AdvancedVisionProcessor({
          mission_mode: 'standard',
          enable_live_processing: true,
          anomaly_detection: true,
          threat_assessment: true,
          behavioral_analysis: true
        });
        console.log('✅ Advanced Vision Processor initialized');
      } catch (visionError) {
        console.warn('Failed to initialize vision processor:', visionError);
        this.visionProcessor = null;
      }

      this.isInitialized = true;
      console.log('✅ CYRUS Brain initialized with Advanced Intelligence, Vision, and learning');
    } catch (error) {
      console.error('Failed to initialize CYRUS Brain:', error);
      // Fallback to basic functionality
      this.useAdvancedIntelligence = false;
      this.isInitialized = true;
    }
  }

  async processQuery(query: string, context?: any): Promise<string> {
    if (!this.isInitialized) {
      return "My brain is still initializing. Please try again in a moment.";
    }

    try {
      // Use advanced intelligence integration if available
      if (this.useAdvancedIntelligence) {
        const intelligenceRequest: IntegratedIntelligenceRequest = {
          userId: context?.userId || 'anonymous',
          sessionId: context?.sessionId || 'default',
          message: query,
          context: {
            previousMessages: context?.conversationHistory,
            userProfile: context?.userProfile,
            domain: context?.domain
          }
        };

        const intelligenceResponse = await advancedIntelligenceIntegration.processRequest(intelligenceRequest);

        // Record the interaction for learning
        await this.recordAdvancedInteraction(intelligenceRequest, intelligenceResponse);

        console.log(`🧠 Advanced Intelligence Response (Confidence: ${(intelligenceResponse.confidence * 100).toFixed(1)}%)`);
        return intelligenceResponse.response;
      }

      // Fallback to original implementation
      return await this.processBasicQuery(query, context);

    } catch (error) {
      console.error('Advanced Brain processing error:', error);
      console.log('🔄 Falling back to basic processing...');

      // Fallback to basic processing
      try {
        return await this.processBasicQuery(query, context);
      } catch (fallbackError) {
        console.error('Basic processing also failed:', fallbackError);
        return "I'm experiencing some difficulty processing your request right now. Let me try a different approach.";
      }
    }
  }

  private async processBasicQuery(query: string, context?: any): Promise<string> {
    // First, check for learned responses
    const learnedResponse = await dataIngestionPipeline.getLearnedResponse(query);
    if (learnedResponse) {
      console.log('🧠 Using learned response');
      return learnedResponse;
    }

    // Search knowledge base for relevant information
    const knowledgeResults = await dataIngestionPipeline.searchKnowledge(query);

    if (knowledgeResults.length > 0) {
      // Use local LLM to synthesize response from knowledge
      const knowledgeContext = knowledgeResults
        .map(result => result.content.substring(0, 500))
        .join('\n\n');

      const prompt = `You are CYRUS, an advanced AI with deep knowledge across multiple domains. Using the following relevant knowledge, provide a comprehensive and helpful response to: "${query}"

Knowledge Context:
${knowledgeContext}

Response:`;

      const response = await localLLM.chat([
        { role: 'system', content: 'You are CYRUS, a knowledgeable and helpful AI. Use the provided knowledge context to give accurate, comprehensive answers.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7, max_tokens: 1000 });

      return response;
    }

    // Fallback to general local LLM response
    return await localLLM.chat([
      { role: 'system', content: 'You are CYRUS, an advanced AI assistant with expertise in engineering, psychology, and technology.' },
      { role: 'user', content: query }
    ]);
  }

  private async recordAdvancedInteraction(
    request: IntegratedIntelligenceRequest,
    response: any
  ): Promise<void> {
    try {
      // Add the interaction to the knowledge base for learning
      const interactionContent = `User: ${request.message}\nCYRUS: ${response.response}\nConfidence: ${(response.confidence * 100).toFixed(1)}%`;

      await advancedIntelligenceIntegration.addKnowledge(interactionContent, {
        type: 'conversation',
        userId: request.userId,
        sessionId: request.sessionId,
        timestamp: new Date(),
        quality: response.metadata?.qualityAssessment
      });

      // Also record in basic ingestion pipeline for compatibility
      await dataIngestionPipeline.ingestFromInteraction(
        request.message,
        response.response,
        { confidence: response.confidence, advanced: true }
      );
    } catch (error) {
      console.warn('Failed to record advanced interaction:', error);
    }
  }

  async learnFromInteraction(userInput: string, cyrusResponse: string, feedback?: any): Promise<void> {
    if (this.isInitialized) {
      await dataIngestionPipeline.ingestFromInteraction(userInput, cyrusResponse, feedback);

      // Also add to advanced intelligence knowledge base
      if (this.useAdvancedIntelligence) {
        try {
          const interactionContent = `User: ${userInput}\nCYRUS: ${cyrusResponse}`;
          await advancedIntelligenceIntegration.addKnowledge(interactionContent, {
            type: 'conversation',
            feedback: feedback,
            timestamp: new Date()
          });
        } catch (error) {
          console.warn('Failed to add interaction to advanced knowledge base:', error);
        }
      }
    }
  }

  async addKnowledge(content: string, metadata: any = {}): Promise<void> {
    if (this.isInitialized) {
      console.log('📚 Adding new knowledge to CYRUS brain...');

      // Add to both systems
      await dataIngestionPipeline.ingestContent(content, metadata);

      if (this.useAdvancedIntelligence) {
        try {
          await advancedIntelligenceIntegration.addKnowledge(content, metadata);
        } catch (error) {
          console.warn('Failed to add knowledge to advanced system:', error);
        }
      }
    }
  }

  getStatus(): any {
    const basicStatus = {
      initialized: this.isInitialized,
      advancedIntelligence: this.useAdvancedIntelligence,
      visionProcessor: this.visionProcessor !== null,
      ingestionStatus: dataIngestionPipeline.getStatus(),
      knowledgeStats: {
        totalDocuments: 0,
        totalConcepts: 0,
        lastUpdated: new Date().toISOString()
      }
    };

    if (this.useAdvancedIntelligence) {
      try {
        const advancedStatus = advancedIntelligenceIntegration.getSystemStatus();
        basicStatus.advancedStatus = advancedStatus;
      } catch (error) {
        console.warn('Failed to get advanced status:', error);
      }
    }

    if (this.visionProcessor) {
      basicStatus.visionStatus = this.getVisionStatus();
    }

    return basicStatus;
  }

  async shutdown(): Promise<void> {
    console.log('🧠 Shutting down CYRUS Brain...');
    dataIngestionPipeline.stopIngestion();
    this.stopVisionProcessing();
    this.isInitialized = false;
  }

  // Advanced intelligence specific methods
  async getUserProfile(userId: string): Promise<any> {
    if (this.useAdvancedIntelligence) {
      try {
        return await advancedIntelligenceIntegration.getUserProfile(userId);
      } catch (error) {
        console.warn('Failed to get user profile from advanced system:', error);
        return null;
      }
    }
    return null;
  }

  async searchAdvancedKnowledge(query: string, domain?: string): Promise<any[]> {
    if (this.useAdvancedIntelligence) {
      try {
        return await advancedIntelligenceIntegration.searchKnowledge(query, domain);
      } catch (error) {
        console.warn('Failed to search advanced knowledge:', error);
        return [];
      }
    }
    return [];
  }

  // Vision processing methods
  async processImage(image: any, analysisType: string = 'comprehensive'): Promise<any> {
    if (!this.visionProcessor) {
      throw new Error('Vision processor not available');
    }

    try {
      console.log(`👁️ Processing image with ${analysisType} analysis...`);
      const result = await this.visionProcessor.processImage(image, analysisType);

      // Integrate vision results with intelligence system
      if (this.useAdvancedIntelligence && result.object_detection?.objects?.length > 0) {
        const visionContext = `Visual analysis detected: ${result.object_detection.objects.map((obj: any) => obj.label).join(', ')}`;
        await this.addKnowledge(visionContext, {
          type: 'vision_analysis',
          timestamp: new Date(),
          analysis_type: analysisType
        });
      }

      return result;
    } catch (error) {
      console.error('Vision processing failed:', error);
      throw error;
    }
  }

  async processLiveFeed(videoSource: any, duration?: number, callback?: Function): Promise<any> {
    if (!this.visionProcessor) {
      throw new Error('Vision processor not available');
    }

    try {
      console.log('🎥 Starting live feed processing...');
      const result = await this.visionProcessor.processLiveFeed(videoSource, duration, callback);

      // Record live feed session in knowledge base
      const sessionSummary = `Live feed session: ${result.total_frames} frames processed, ${result.objects_detected} objects detected, ${result.processing_fps.toFixed(1)} FPS`;
      await this.addKnowledge(sessionSummary, {
        type: 'live_feed_session',
        timestamp: new Date(),
        duration: result.duration,
        stats: result
      });

      return result;
    } catch (error) {
      console.error('Live feed processing failed:', error);
      throw error;
    }
  }

  async analyzeScene(image: any): Promise<any> {
    return await this.processImage(image, 'comprehensive');
  }

  async detectThreats(image: any): Promise<any> {
    if (!this.visionProcessor) {
      throw new Error('Vision processor not available');
    }

    const result = await this.processImage(image, 'mission_critical');
    return result.mission_analysis?.threat_assessment || { threats: [], overall_threat_level: 0 };
  }

  async assessSituationalAwareness(image: any): Promise<any> {
    if (!this.visionProcessor) {
      throw new Error('Vision processor not available');
    }

    const result = await this.processImage(image, 'mission_critical');
    return result.mission_analysis?.situational_awareness || {};
  }

  getVisionStatus(): any {
    if (!this.visionProcessor) {
      return { available: false, error: 'Vision processor not initialized' };
    }

    return {
      available: true,
      processing_stats: this.visionProcessor.getProcessingStats(),
      config: this.visionProcessor.config
    };
  }

  stopVisionProcessing(): void {
    if (this.visionProcessor) {
      this.visionProcessor.stopProcessing();
    }
  }
}

export const cyrusBrain = new CyrusBrain();
export { dataIngestionPipeline };
export default cyrusBrain;