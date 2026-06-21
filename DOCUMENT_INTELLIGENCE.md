# Document Intelligence Module - Enhanced with AI/ML Capabilities

## Overview

The Document Intelligence module has been completely redesigned and enhanced with advanced AI, machine learning, and deep learning capabilities to provide:

- **Intelligent Document Classification**: ML-powered document type detection
- **Automated Response Generation**: Generate compliant tender responses, exam answers, and job applications
- **Document Cloning**: Create templates, clones, or answer-filled versions of documents
- **Format Compliance**: Validate professional standards, grammar, and structure
- **LLM-Powered Generation**: Create high-quality documents with proper format and context
- **Cyrus Background Tasks**: Queue and process large document operations in the background

## Architecture

### Frontend Components

#### 1. **Redesigned UI** (`cyrus-ui/src/pages/documents-intelligence.tsx`)
- **Side-by-side console layout**: Analysis input on the left, generated documents on the right
- **Intelligent Processing Section**: New controls for AI-powered document operations
- **Real-time Classification**: Display document type, confidence, and characteristics
- **Professional Output Console**: Enhanced display with compliance checks and quality scores

#### 2. **Enhanced Hook** (`cyrus-ui/src/hooks/useDocumentsIntelligence.ts`)
New intelligent functions:
- `classifyDocument(file)`: ML-based document classification
- `generateIntelligentDocument(options)`: LLM-powered document generation
- `cloneDocument(file, cloneType)`: Create document clones with modifications
- `respondToTender(file)`: Generate compliant tender responses
- `generateAnswerKey(file)`: Create comprehensive exam answer keys
- `validateCompliance(content, category)`: Check format and professional standards

### Backend Components

#### 1. **Document Intelligence Engine** (`server/ingestion/doc-intelligence-engine.ts`)

**Core Capabilities:**

##### Document Classification (ML)
```typescript
classifyDocument(text, metadata) → {
  category: DocumentCategory,
  confidence: number,
  requiresResponse: boolean,
  responseType: "comply" | "answer" | "clone" | "analyze"
}
```

Supported categories:
- Tender documents
- Examinations & quizzes
- Job requirements
- Administrative documents
- Legal contracts
- Technical specifications
- Proposals & reports
- Policy documents
- Research papers

##### Intelligent Document Generation
```typescript
generateIntelligentDocument(options) → {
  content: string,
  htmlContent: string,
  title: string,
  sections: Array<{ title, content, type }>,
  metadata: {
    wordCount, pageCount, confidence,
    complianceChecks, qualityScore
  }
}
```

**Features:**
- Context-aware content generation
- Professional format compliance
- Structured section generation
- Quality scoring
- Compliance validation

##### Document Cloning & Response Engine
```typescript
cloneDocument(options) → GeneratedIntelligentDocument
```

**Clone Types:**
1. **Exact**: Perfect copy preserving all structure
2. **Template**: Extract structure for reuse
3. **Answer-filled**: Generate answers/responses

**Special Processors:**
- **Tender Response**: Analyzes requirements, generates compliant response with pricing, qualifications
- **Exam Answers**: Generates comprehensive answers with explanations
- **Job Application**: Creates tailored applications addressing requirements

##### Format Compliance Engine
```typescript
validateDocumentCompliance(content, category) → {
  overallScore: number,
  grammarScore: number,
  professionalismScore: number,
  structureScore: number,
  checks: Array<ComplianceCheck>,
  recommendations: string[]
}
```

**Validation Rules:**
- Grammar & spelling
- Professional language
- Document structure (category-specific)
- Format consistency
- Required sections

#### 2. **API Routes** (`server/ingestion/doc-intelligence-routes.ts`)

**Endpoints:**

- `POST /api/documents/classify`: Classify document type
- `POST /api/documents/generate-intelligent`: Generate intelligent documents
- `POST /api/documents/clone`: Clone documents with modifications
- `POST /api/documents/respond-tender`: Generate tender responses
- `POST /api/documents/generate-answers`: Create exam answer keys
- `POST /api/documents/validate-compliance`: Validate format & compliance
- `POST /api/documents/analyze-intelligent`: Combined classification + compliance
- `POST /api/documents/task/queue`: Queue background task
- `GET /api/documents/task/:taskId`: Get task status
- `GET /api/documents/tasks/my`: List user's tasks

#### 3. **Cyrus Background Task Integration** (`server/ingestion/doc-intelligence-tasks.ts`)

**Features:**
- Priority-based task queue (urgent, high, normal, low)
- Concurrent processing (configurable, default: 3)
- Automatic retry on failure (configurable, default: 3 retries)
- Progress tracking with status messages
- Event emission for monitoring
- Automatic cleanup of old tasks

**Task Types:**
- `classify`: Document classification
- `generate`: Intelligent document generation
- `clone`: Document cloning
- `respond_tender`: Tender response generation
- `generate_answers`: Exam answer generation
- `validate_compliance`: Compliance validation
- `full_intelligent_analysis`: Combined analysis pipeline

**Task Structure:**
```typescript
{
  id: string,
  type: DocIntelligenceTaskType,
  userId: string,
  status: "queued" | "processing" | "completed" | "failed",
  priority: "low" | "normal" | "high" | "urgent",
  progress: number,
  progressMessage: string,
  result?: any,
  error?: string
}
```

## Usage Examples

### Frontend Usage

#### 1. Classify a Document
```typescript
const classification = await classifyDocument(file);
console.log(`Type: ${classification.category}`);
console.log(`Confidence: ${(classification.confidence * 100).toFixed(0)}%`);
if (classification.requiresResponse) {
  console.log(`Requires: ${classification.responseType}`);
}
```

#### 2. Generate Tender Response
```typescript
const response = await respondToTender(tenderFile);
// Download the compliant response
downloadText("tender-response.md", response.content);
```

#### 3. Generate Exam Answer Key
```typescript
const answerKey = await generateAnswerKey(examFile);
console.log(`Generated answers for ${answerKey.sections.length} questions`);
```

#### 4. Generate Custom Document
```typescript
const document = await generateIntelligentDocument({
  sourceText: "Project requirements...",
  documentType: "proposal",
  format: "formal",
  targetLength: "comprehensive",
  requirements: [
    "Executive summary",
    "Technical approach",
    "Timeline and deliverables"
  ]
});
```

### Backend API Usage

#### Classify Document
```bash
curl -X POST http://localhost:3020/api/documents/classify \
  -H "x-user-id: user123" \
  -F "file=@document.pdf"
```

#### Generate Tender Response
```bash
curl -X POST http://localhost:3020/api/documents/respond-tender \
  -H "x-user-id: user123" \
  -F "file=@tender.pdf"
```

#### Queue Background Task
```bash
curl -X POST http://localhost:3020/api/documents/task/queue \
  -H "Content-Type: application/json" \
  -H "x-user-id: user123" \
  -d '{
    "type": "generate",
    "priority": "high",
    "input": {
      "sourceDocument": "...",
      "documentType": "report",
      "format": "formal"
    }
  }'
```

## Configuration

### Environment Variables

```bash
# OpenAI API for LLM capabilities
OPENAI_API_KEY=sk-...
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1  # Optional

# Document processing limits
CYRUS_DOCGEN_MAX_PAGES=2000
CYRUS_MAX_ANALYSIS_CHUNKS=1024
CYRUS_MAX_UPLOAD_FILE_BYTES=104857600  # 100MB
```

### Task Processor Configuration

Edit `server/ingestion/doc-intelligence-tasks.ts`:

```typescript
// Max concurrent tasks
const processor = new DocIntelligenceTaskProcessor(3);  // Default: 3

// Cleanup interval (hours)
setInterval(() => processor.cleanup(24), 6 * 60 * 60 * 1000);  // Every 6 hours
```

## Key Features

### 1. **ML-Powered Classification**
- Pattern recognition for document types
- Confidence scoring
- Characteristic extraction (time-sensitive, requires-answers, etc.)
- Automatic response type determination

### 2. **Intelligent Document Generation**
- LLM-based content creation (GPT-4o)
- Professional format compliance
- Context-aware generation
- Quality scoring & validation
- Section-based structure
- HTML and Markdown output

### 3. **Document Cloning & Templates**
- Exact document replication
- Structure extraction for templates
- Answer-filled variants
- Smart modifications (replacements, additions)

### 4. **Tender Response Generation**
- Requirement analysis
- Compliance checking
- Pricing structure inclusion
- Qualifications section
- Professional business language
- Download-ready format

### 5. **Exam Answer Generation**
- Question detection
- Comprehensive answer generation
- Explanations and workings
- Marking scheme support
- Academic rigor

### 6. **Format Compliance Validation**
- Grammar checking
- Professional language analysis
- Structure validation (category-specific)
- Required section detection
- Compliance scoring
- Actionable recommendations

### 7. **Background Task Processing**
- Priority queue system
- Progress tracking
- Automatic retry on failure
- Concurrent processing
- Event-driven monitoring
- Wired with Cyrus task administration

## Performance & Scalability

- **Concurrent Processing**: Up to 3 tasks simultaneously (configurable)
- **Retry Logic**: 3 automatic retries on failure
- **Progress Tracking**: Real-time progress updates
- **Cleanup**: Automatic removal of old completed tasks
- **Event System**: Monitor task lifecycle events
- **Priority Queue**: Urgent tasks processed first

## Security & Authentication

All endpoints require user authentication via:
- `req.user.claims.sub` (session-based)
- `x-user-id` or `X-User-Id` headers

Tasks are scoped per user - users can only access their own tasks.

## Error Handling

The system includes comprehensive error handling:
- Validation errors (400)
- Authentication errors (401)
- Access denied errors (403)
- Not found errors (404)
- Server errors (500)

All errors include descriptive messages and are logged for debugging.

## Monitoring & Logging

Task lifecycle events are logged:
```
[Doc Intelligence] Task created: doc-intel-123 (generate) for user user123
[Cyrus Task] Document intelligence task started: doc-intel-123
[Cyrus Task] Document intelligence task completed: doc-intel-123 in 2.45s
```

Failed tasks include error details:
```
[Cyrus Task] Document intelligence task failed: doc-intel-123 - LLM API rate limit
```

## Future Enhancements

Potential areas for expansion:
1. **More Document Types**: Add support for contracts, invoices, resumes
2. **Multi-language Support**: Process documents in multiple languages
3. **Advanced ML Models**: Fine-tune custom models for specific domains
4. **Batch Processing**: Process multiple documents simultaneously
5. **Template Library**: Pre-built templates for common document types
6. **Collaboration**: Multi-user document review and editing
7. **Version Control**: Track document revisions and changes
8. **Export Formats**: Add PDF, DOCX, HTML export options

## Summary

The enhanced Document Intelligence module transforms CYRUS into a powerful document processing platform with:

✅ **AI-powered classification** - Automatically detect document types
✅ **Intelligent generation** - Create professional documents with LLM assistance
✅ **Automated responses** - Generate tender responses, exam answers, applications
✅ **Format compliance** - Ensure professional standards and structure
✅ **Background processing** - Queue and process large operations efficiently
✅ **Cyrus integration** - Fully wired with Cyrus task administration system
✅ **Side-by-side UI** - Modern layout with analysis input and generated output consoles

The system is production-ready, scalable, and provides a foundation for advanced document intelligence capabilities.
