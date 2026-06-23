/**
 * Intelligent Document Processing API Routes
 * 
 * Provides endpoints for:
 * - Document classification and analysis
 * - Intelligent document generation
 * - Document cloning and response generation
 * - Format compliance validation
 */

import { Router } from "express";
import multer from "multer";
import {
  classifyDocument,
  generateIntelligentDocument,
  cloneDocument,
  validateDocumentCompliance,
  generateTenderResponse,
  type DocumentGenerationOptions,
  type DocumentCloneOptions,
} from "./doc-intelligence-engine.js";
import { extractFile } from "./extract.js";
import { performFullAnalysis } from "./full-analysis.js";
import { resolveDocumentText, extractionFailureMessage } from "./resolve-document-text.js";
import { parseMaxUploadFileBytes } from "../../shared/cyrus-document-limits.js";
import { runFusedProfessionalDraft } from "./fused-document-pipeline.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: parseMaxUploadFileBytes() },
});

function getUserId(req: any): string | null {
  return (
    req.user?.claims?.sub ||
    (typeof req.headers["x-user-id"] === "string" ? req.headers["x-user-id"] : null) ||
    (typeof req.headers["X-User-Id"] === "string" ? req.headers["X-User-Id"] : null) ||
    null
  );
}

// =====================================
// Document Classification
// =====================================

router.post("/api/documents/classify", upload.single("file"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    let text = req.body.text || "";
    let fileName = req.body.fileName;
    let pageCount: number | undefined;

    if (req.file) {
      const extracted = await extractFile(req.file.buffer, req.file.mimetype);
      const resolved = resolveDocumentText(extracted);
      text = resolved?.text || "";
      fileName = req.file.originalname;
      pageCount = extracted.pageCount;
    }

    if (!text.trim()) {
      return res.status(400).json({ error: "No text content to classify" });
    }

    const classification = await classifyDocument(text, { fileName, pageCount });

    res.json({
      success: true,
      classification,
      textLength: text.length,
      metadata: { fileName, pageCount },
    });
  } catch (error) {
    console.error("[Doc Intelligence] Classification error:", error);
    res.status(500).json({
      error: "Document classification failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Intelligent Document Generation
// =====================================

router.post("/api/documents/generate-intelligent", upload.single("sourceFile"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    let sourceDocument: string | undefined;
    if (req.file) {
      const extracted = await extractFile(req.file.buffer, req.file.mimetype);
      sourceDocument = resolveDocumentText(extracted)?.text || "";
    } else if (req.body.sourceDocument) {
      sourceDocument = req.body.sourceDocument;
    }

    const options: DocumentGenerationOptions = {
      sourceDocument,
      documentType: req.body.documentType || "unknown",
      requirements: req.body.requirements ? JSON.parse(req.body.requirements) : undefined,
      format: req.body.format || "formal",
      targetLength: req.body.targetLength || "standard",
      includeAnswers: req.body.includeAnswers === "true" || req.body.includeAnswers === true,
      compliance: req.body.compliance ? JSON.parse(req.body.compliance) : undefined,
      context: req.body.context ? JSON.parse(req.body.context) : undefined,
    };

    const document = await generateIntelligentDocument(options);

    res.json({
      success: true,
      document,
      userId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Doc Intelligence] Generation error:", error);
    res.status(500).json({
      error: "Document generation failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Document Cloning and Response
// =====================================

router.post("/api/documents/clone", upload.single("file"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    if (!req.file) {
      return res.status(400).json({ error: "Source document file required" });
    }

    const extracted = await extractFile(req.file.buffer, req.file.mimetype);
    const resolved = resolveDocumentText(extracted);

    if (!resolved) {
      return res.status(400).json({
        error: extractionFailureMessage(extracted),
        attempted: extracted.attempted,
        warnings: extracted.warnings,
      });
    }

    const options: DocumentCloneOptions = {
      sourceDocument: resolved.text,
      sourceMetadata: {
        fileName: req.file.originalname,
        pageCount: extracted.pageCount,
      },
      cloneType: (req.body.cloneType as any) || "template",
      modifications: req.body.modifications ? JSON.parse(req.body.modifications) : undefined,
    };

    const clonedDocument = await cloneDocument(options);

    res.json({
      success: true,
      document: clonedDocument,
      userId,
      clonedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Doc Intelligence] Cloning error:", error);
    res.status(500).json({
      error: "Document cloning failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Tender Response Generation
// =====================================

router.post("/api/documents/respond-tender", upload.single("file"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    if (!req.file) {
      return res.status(400).json({ error: "Tender document file required" });
    }

    const extracted = await extractFile(req.file.buffer, req.file.mimetype);
    const resolved = resolveDocumentText(extracted);

    if (!resolved) {
      return res.status(400).json({
        error: extractionFailureMessage(extracted),
        attempted: extracted.attempted,
        warnings: extracted.warnings,
      });
    }

    const classification = await classifyDocument(resolved.text, {
      fileName: req.file.originalname,
      pageCount: extracted.pageCount,
    });

    const response = await generateTenderResponse(resolved.text, classification, {
      fileName: req.file.originalname,
      pageCount: extracted.pageCount,
    });

    res.json({
      success: true,
      tenderResponse: response,
      userId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Doc Intelligence] Tender response error:", error);
    res.status(500).json({
      error: "Tender response generation failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Examination Answer Key Generation
// =====================================

router.post("/api/documents/generate-answers", upload.single("file"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    if (!req.file) {
      return res.status(400).json({ error: "Examination document file required" });
    }

    const extracted = await extractFile(req.file.buffer, req.file.mimetype);
    const resolved = resolveDocumentText(extracted);

    if (!resolved) {
      return res.status(400).json({
        error: extractionFailureMessage(extracted),
        attempted: extracted.attempted,
        warnings: extracted.warnings,
      });
    }

    const options: DocumentCloneOptions = {
      sourceDocument: resolved.text,
      sourceMetadata: {
        fileName: req.file.originalname,
        pageCount: extracted.pageCount,
      },
      cloneType: "answer-filled",
      modifications: {
        answers: true,
      },
    };

    const answerKey = await cloneDocument(options);

    res.json({
      success: true,
      answerKey,
      userId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Doc Intelligence] Answer generation error:", error);
    res.status(500).json({
      error: "Answer key generation failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Format Compliance Validation
// =====================================

router.post("/api/documents/validate-compliance", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const content = req.body.content;
    const category = req.body.category || "unknown";

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Document content required" });
    }

    const compliance = await validateDocumentCompliance(content, category);

    res.json({
      success: true,
      compliance,
      userId,
      validatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Doc Intelligence] Compliance validation error:", error);
    res.status(500).json({
      error: "Compliance validation failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Combined Intelligent Analysis
// =====================================

router.post("/api/documents/analyze-intelligent", upload.single("file"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    if (!req.file) {
      return res.status(400).json({ error: "Document file required" });
    }

    // Perform full extraction and analysis
    const fullAnalysis = await performFullAnalysis(req.file.buffer, req.file.mimetype, {
      jurisdiction: req.body.jurisdiction,
      mode: req.body.mode,
      strictLegalReview: req.body.strictLegalReview === "true",
      maxChunks: req.body.maxChunks ? parseInt(req.body.maxChunks, 10) : undefined,
    });

    // Perform intelligent classification
    const text = fullAnalysis.extraction.text;
    const classification = await classifyDocument(text, {
      fileName: req.file.originalname,
      pageCount: fullAnalysis.extraction.metadata.pageCount,
    });

    // Validate compliance
    const compliance = await validateDocumentCompliance(text, classification.category);

    res.json({
      success: true,
      analysis: fullAnalysis.analysis,
      extraction: fullAnalysis.extraction,
      classification,
      compliance,
      intelligence: {
        requiresResponse: classification.requiresResponse,
        responseType: classification.responseType,
        processingRecommendations: generateProcessingRecommendations(classification, compliance),
      },
      userId,
      analyzedAt: new Date().toISOString(),
  });
} catch (error) {
    console.error("[Doc Intelligence] Intelligent analysis error:", error);
    res.status(500).json({
      error: "Intelligent analysis failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Fused Intelligence + Long-Form Draft
// =====================================

router.post("/api/documents/fuse-draft", upload.single("file"), async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    if (!req.file) {
      return res.status(400).json({ error: "Document file required for fused pipeline" });
    }

    const targetPages = req.body.targetPages ? parseInt(String(req.body.targetPages), 10) : undefined;
    const maxChunks = req.body.maxChunks ? parseInt(String(req.body.maxChunks), 10) : undefined;

    const result = await runFusedProfessionalDraft({
      buffer: req.file.buffer,
      mimetype: req.file.mimetype,
      fileName: req.file.originalname,
      docType: req.body.docType,
      audience: req.body.audience,
      purpose: req.body.purpose,
      targetPages: Number.isFinite(targetPages) ? targetPages : undefined,
      includeImages: req.body.includeImages === "true" || req.body.includeImages === true,
      imageStyle: req.body.imageStyle,
      jurisdiction: req.body.jurisdiction,
      mode: req.body.mode,
      strictLegalReview: req.body.strictLegalReview === "true" || req.body.strictLegalReview === true,
      maxChunks: Number.isFinite(maxChunks) ? maxChunks : undefined,
      analysisCommand: req.body.analysisCommand,
      docHint: req.body.docHint,
    });

    res.json({
      success: true,
      ...result,
      userId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Doc Intelligence] Fused draft error:", error);
    res.status(500).json({
      error: "Fused professional draft failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

// =====================================
// Background Task Management
// =====================================

import {
  queueDocIntelligenceTask,
  getDocIntelligenceTask,
  getUserDocIntelligenceTasks,
  type DocIntelligenceTaskType,
} from "./doc-intelligence-tasks.js";

router.post("/api/documents/task/queue", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const { type, input, priority } = req.body;

    if (!type || !input) {
      return res.status(400).json({ error: "Task type and input required" });
    }

    const task = await queueDocIntelligenceTask(type as DocIntelligenceTaskType, input, {
      userId,
      priority: priority || "normal",
    });

    res.json({
      success: true,
      task: {
        id: task.id,
        type: task.type,
        status: task.status,
        priority: task.priority,
        progress: task.progress,
        createdAt: task.createdAt,
      },
    });
  } catch (error) {
    console.error("[Doc Intelligence] Task queue error:", error);
    res.status(500).json({
      error: "Failed to queue task",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/api/documents/task/:taskId", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const task = getDocIntelligenceTask(req.params.taskId);

    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    if (task.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json({
      success: true,
      task,
    });
  } catch (error) {
    console.error("[Doc Intelligence] Task retrieval error:", error);
    res.status(500).json({
      error: "Failed to retrieve task",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

router.get("/api/documents/tasks/my", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Authentication required" });

    const tasks = getUserDocIntelligenceTasks(userId);

    res.json({
      success: true,
      tasks,
      count: tasks.length,
    });
  } catch (error) {
    console.error("[Doc Intelligence] User tasks retrieval error:", error);
    res.status(500).json({
      error: "Failed to retrieve tasks",
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

function generateProcessingRecommendations(
  classification: Awaited<ReturnType<typeof classifyDocument>>,
  compliance: Awaited<ReturnType<typeof validateDocumentCompliance>>
): string[] {
  const recommendations: string[] = [];

  if (classification.requiresResponse) {
    recommendations.push(`This ${classification.category} requires a response. Use the ${classification.responseType} endpoint.`);
  }

  if (compliance.overallScore < 0.7) {
    recommendations.push("Document quality score is low. Consider using the generate-intelligent endpoint for better output.");
  }

  if (classification.confidence < 0.6) {
    recommendations.push("Document classification confidence is low. Manual review recommended.");
  }

  if (compliance.checks.some(c => c.severity === "error" && !c.passed)) {
    recommendations.push("Critical compliance issues detected. Address before processing.");
  }

  return recommendations;
}

export { router as intelligenceRouter };
