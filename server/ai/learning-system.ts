import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export class LearningSystem {
  private config: any;
  private knowledgeGraph: any;

  constructor(configPath = './server/ai/knowledge-brain-config.json') {
    this.config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    this.initializeKnowledgeGraph();
  }

  private async initializeKnowledgeGraph() {
    // Initialize Neo4j or NetworkX based knowledge graph
    if (this.config.knowledgeGraph.type === 'neo4j') {
      // Neo4j implementation would go here
      console.log('Initializing Neo4j knowledge graph...');
    } else {
      // Fallback to NetworkX
      console.log('Initializing NetworkX knowledge graph...');
    }
  }

  async learnFromInteraction(userInput: string, cyrusResponse: string, feedback?: any): Promise<void> {
    console.log('🧠 Learning from interaction...');

    const learningData = {
      input: userInput,
      response: cyrusResponse,
      feedback: feedback || {},
      timestamp: new Date().toISOString(),
      context: this.extractContext(userInput)
    };

    // Store interaction in learning database
    await this.storeInteraction(learningData);

    // Update knowledge graph with new relationships
    await this.updateKnowledgeGraph(learningData);

    // Adapt response patterns based on feedback
    if (feedback) {
      await this.adaptFromFeedback(learningData);
    }
  }

  async learnFromDocument(content: string, metadata: any): Promise<void> {
    console.log('📚 Learning from document...');

    // Extract key concepts and relationships
    const concepts = await this.extractConcepts(content);
    const relationships = await this.extractRelationships(content);

    // Update knowledge graph
    for (const concept of concepts) {
      await this.addConceptToGraph(concept);
    }

    for (const relationship of relationships) {
      await this.addRelationshipToGraph(relationship);
    }

    // Generate embeddings for semantic search
    await this.generateDocumentEmbeddings(content, metadata);
  }

  private async extractConcepts(content: string): Promise<string[]> {
    return new Promise((resolve, reject) => {
      const python = spawn('python3', [
        '-c',
        `
import sys
import json
import spacy
import nltk
from nltk.corpus import stopwords

try:
    # Load NLP models
    nlp = spacy.load('en_core_web_sm')
    stop_words = set(stopwords.words('english'))

    # Process text
    doc = nlp('${content.replace(/'/g, "\'").substring(0, 5000)}')

    # Extract noun phrases and entities
    concepts = []
    for chunk in doc.noun_chunks:
        concept = chunk.text.lower().strip()
        if len(concept) > 3 and concept not in stop_words:
            concepts.append(concept)

    for ent in doc.ents:
        if ent.label_ in ['PERSON', 'ORG', 'GPE', 'PRODUCT', 'EVENT', 'WORK_OF_ART']:
            concepts.append(ent.text.lower().strip())

    # Remove duplicates and limit
    unique_concepts = list(set(concepts))[:20]
    print(json.dumps(unique_concepts))

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
            resolve(JSON.parse(output.trim()));
          } catch {
            resolve([]);
          }
        } else {
          reject(new Error(`Concept extraction failed: ${output}`));
        }
      });
    });
  }

  private async extractRelationships(content: string): Promise<any[]> {
    // Extract relationships between concepts
    // This would use more advanced NLP for relationship extraction
    return [];
  }

  private async addConceptToGraph(concept: string): Promise<void> {
    // Add concept node to knowledge graph
    console.log(`Adding concept to graph: ${concept}`);
  }

  private async addRelationshipToGraph(relationship: any): Promise<void> {
    // Add relationship edge to knowledge graph
    console.log('Adding relationship to graph:', relationship);
  }

  private async generateDocumentEmbeddings(content: string, metadata: any): Promise<void> {
    // Generate and store document embeddings for semantic search
    console.log('Generating document embeddings...');
  }

  private extractContext(input: string): any {
    // Extract context from user input (domain, intent, etc.)
    return {
      domain: this.detectDomain(input),
      intent: this.detectIntent(input),
      sentiment: this.detectSentiment(input)
    };
  }

  private detectDomain(input: string): string {
    const domains = this.config.relevanceFilter.domains;
    const lowerInput = input.toLowerCase();

    for (const domain of domains) {
      if (lowerInput.includes(domain.toLowerCase())) {
        return domain;
      }
    }

    return 'general';
  }

  private detectIntent(input: string): string {
    // Simple intent detection
    const lowerInput = input.toLowerCase();

    if (lowerInput.includes('what') || lowerInput.includes('how') || lowerInput.includes('why')) {
      return 'question';
    }
    if (lowerInput.includes('tell me') || lowerInput.includes('explain')) {
      return 'explanation_request';
    }
    if (lowerInput.includes('help') || lowerInput.includes('assist')) {
      return 'help_request';
    }

    return 'conversation';
  }

  private detectSentiment(input: string): string {
    // Simple sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'happy'];
    const negativeWords = ['bad', 'terrible', 'awful', 'sad', 'angry', 'frustrated'];

    const lowerInput = input.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerInput.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerInput.includes(word)).length;

    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private async storeInteraction(interaction: any): Promise<void> {
    // Store interaction in learning database
    const interactionsPath = path.join(process.cwd(), 'data', 'learning', 'interactions.jsonl');

    // Ensure directory exists
    const dir = path.dirname(interactionsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Append to interactions file
    fs.appendFileSync(interactionsPath, JSON.stringify(interaction) + '\n');
  }

  private async updateKnowledgeGraph(interaction: any): Promise<void> {
    // Update knowledge graph with new interaction data
    console.log('Updating knowledge graph with interaction data...');
  }

  private async adaptFromFeedback(interaction: any): Promise<void> {
    // Adapt response patterns based on user feedback
    console.log('Adapting from feedback...');
  }

  async getLearnedResponse(query: string): Promise<string | null> {
    // Retrieve learned response for similar queries
    const similarInteractions = await this.findSimilarInteractions(query);

    if (similarInteractions.length > 0) {
      // Return the best learned response
      return similarInteractions[0].response;
    }

    return null;
  }

  private async findSimilarInteractions(query: string): Promise<any[]> {
    // Find similar past interactions
    const interactionsPath = path.join(process.cwd(), 'data', 'learning', 'interactions.jsonl');

    if (!fs.existsSync(interactionsPath)) {
      return [];
    }

    const interactions = fs.readFileSync(interactionsPath, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    // Simple similarity matching (could be improved with embeddings)
    return interactions
      .filter(interaction => this.calculateSimilarity(query, interaction.input) > 0.7)
      .sort((a, b) => this.calculateSimilarity(query, b.input) - this.calculateSimilarity(query, a.input))
      .slice(0, 5);
  }

  private calculateSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }
}

export const learningSystem = new LearningSystem();
export default learningSystem;