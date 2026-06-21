/**
 * Cyrus Background Task Integration for Document Intelligence
 * 
 * Wires the document intelligence engine with Cyrus task system
 * for background processing, scheduling, and administration
 */

import { EventEmitter } from "events";
import {
  classifyDocument,
  generateIntelligentDocument,
  cloneDocument,
  validateDocumentCompliance,
  type DocumentGenerationOptions,
  type DocumentCloneOptions,
  type GeneratedIntelligentDocument,
} from "./doc-intelligence-engine.js";

// =====================================
// Task Types and Interfaces
// =====================================

export type DocIntelligenceTaskType =
  | "classify"
  | "generate"
  | "clone"
  | "respond_tender"
  | "generate_answers"
  | "validate_compliance"
  | "full_intelligent_analysis";

export interface DocIntelligenceTask {
  id: string;
  type: DocIntelligenceTaskType;
  userId: string;
  status: "queued" | "processing" | "completed" | "failed";
  priority: "low" | "normal" | "high" | "urgent";
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  progress: number;
  progressMessage?: string;
  input: any;
  result?: any;
  error?: string;
  retries: number;
  maxRetries: number;
}

export interface DocIntelligenceTaskOptions {
  priority?: "low" | "normal" | "high" | "urgent";
  userId: string;
  maxRetries?: number;
  timeout?: number;
}

// =====================================
// Task Queue and Processor
// =====================================

class DocIntelligenceTaskProcessor extends EventEmitter {
  private tasks: Map<string, DocIntelligenceTask>;
  private queue: string[];
  private processing: Set<string>;
  private maxConcurrent: number;
  private intervalId?: NodeJS.Timeout;

  constructor(maxConcurrent = 3) {
    super();
    this.tasks = new Map();
    this.queue = [];
    this.processing = new Set();
    this.maxConcurrent = maxConcurrent;
  }

  start() {
    if (this.intervalId) return;
    console.log("[Doc Intelligence] Task processor started");
    this.intervalId = setInterval(() => this.processQueue(), 1000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log("[Doc Intelligence] Task processor stopped");
    }
  }

  createTask(
    type: DocIntelligenceTaskType,
    input: any,
    options: DocIntelligenceTaskOptions
  ): DocIntelligenceTask {
    const task: DocIntelligenceTask = {
      id: `doc-intel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      userId: options.userId,
      status: "queued",
      priority: options.priority || "normal",
      createdAt: new Date(),
      progress: 0,
      input,
      retries: 0,
      maxRetries: options.maxRetries || 3,
    };

    this.tasks.set(task.id, task);
    this.enqueue(task.id);
    this.emit("task:created", task);

    console.log(`[Doc Intelligence] Task created: ${task.id} (${type}) for user ${options.userId}`);

    return task;
  }

  getTask(taskId: string): DocIntelligenceTask | undefined {
    return this.tasks.get(taskId);
  }

  getUserTasks(userId: string): DocIntelligenceTask[] {
    return Array.from(this.tasks.values()).filter(t => t.userId === userId);
  }

  private enqueue(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    // Priority-based insertion
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    const taskPriority = priorityOrder[task.priority];

    let insertIndex = this.queue.length;
    for (let i = 0; i < this.queue.length; i++) {
      const queuedTask = this.tasks.get(this.queue[i]);
      if (queuedTask && priorityOrder[queuedTask.priority] > taskPriority) {
        insertIndex = i;
        break;
      }
    }

    this.queue.splice(insertIndex, 0, taskId);
  }

  private async processQueue() {
    // Start new tasks up to max concurrent limit
    while (this.processing.size < this.maxConcurrent && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) continue;

      const task = this.tasks.get(taskId);
      if (!task) continue;

      this.processing.add(taskId);
      this.processTask(taskId).finally(() => {
        this.processing.delete(taskId);
      });
    }
  }

  private async processTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      task.status = "processing";
      task.startedAt = new Date();
      task.progress = 10;
      this.emit("task:started", task);

      console.log(`[Doc Intelligence] Processing task: ${taskId} (${task.type})`);

      let result: any;

      switch (task.type) {
        case "classify":
          result = await this.processClassify(task);
          break;
        case "generate":
          result = await this.processGenerate(task);
          break;
        case "clone":
          result = await this.processClone(task);
          break;
        case "respond_tender":
          result = await this.processRespondTender(task);
          break;
        case "generate_answers":
          result = await this.processGenerateAnswers(task);
          break;
        case "validate_compliance":
          result = await this.processValidateCompliance(task);
          break;
        case "full_intelligent_analysis":
          result = await this.processFullIntelligentAnalysis(task);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }

      task.result = result;
      task.status = "completed";
      task.completedAt = new Date();
      task.progress = 100;
      this.emit("task:completed", task);

      console.log(`[Doc Intelligence] Task completed: ${taskId}`);
    } catch (error) {
      console.error(`[Doc Intelligence] Task failed: ${taskId}`, error);

      task.error = error instanceof Error ? error.message : String(error);
      task.retries++;

      if (task.retries < task.maxRetries) {
        console.log(`[Doc Intelligence] Retrying task: ${taskId} (attempt ${task.retries + 1}/${task.maxRetries})`);
        task.status = "queued";
        task.progress = 0;
        this.enqueue(taskId);
      } else {
        task.status = "failed";
        task.completedAt = new Date();
        this.emit("task:failed", task);
      }
    }
  }

  private async processClassify(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Classifying document...";
    task.progress = 30;

    const result = await classifyDocument(task.input.text, task.input.metadata);

    task.progress = 90;
    return result;
  }

  private async processGenerate(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Generating intelligent document...";
    task.progress = 20;

    const options: DocumentGenerationOptions = task.input;

    task.progress = 40;
    task.progressMessage = "Analyzing requirements...";

    const result = await generateIntelligentDocument(options);

    task.progress = 90;
    task.progressMessage = "Finalizing document...";

    return result;
  }

  private async processClone(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Cloning document...";
    task.progress = 30;

    const options: DocumentCloneOptions = task.input;

    task.progress = 50;
    task.progressMessage = "Applying modifications...";

    const result = await cloneDocument(options);

    task.progress = 90;
    return result;
  }

  private async processRespondTender(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Analyzing tender requirements...";
    task.progress = 20;

    const options: DocumentCloneOptions = {
      ...task.input,
      cloneType: "answer-filled" as const,
    };

    task.progress = 40;
    task.progressMessage = "Generating compliant response...";

    const result = await cloneDocument(options);

    task.progress = 80;
    task.progressMessage = "Validating compliance...";

    const compliance = await validateDocumentCompliance(result.content, "tender");

    task.progress = 95;

    return {
      ...result,
      compliance,
    };
  }

  private async processGenerateAnswers(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Analyzing examination questions...";
    task.progress = 25;

    const options: DocumentCloneOptions = {
      ...task.input,
      cloneType: "answer-filled" as const,
      modifications: {
        answers: true,
      },
    };

    task.progress = 50;
    task.progressMessage = "Generating comprehensive answers...";

    const result = await cloneDocument(options);

    task.progress = 90;
    return result;
  }

  private async processValidateCompliance(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Validating document compliance...";
    task.progress = 40;

    const result = await validateDocumentCompliance(task.input.content, task.input.category);

    task.progress = 90;
    return result;
  }

  private async processFullIntelligentAnalysis(task: DocIntelligenceTask): Promise<any> {
    task.progressMessage = "Classifying document...";
    task.progress = 15;

    const classification = await classifyDocument(task.input.text, task.input.metadata);

    task.progress = 40;
    task.progressMessage = "Validating compliance...";

    const compliance = await validateDocumentCompliance(task.input.text, classification.category);

    task.progress = 70;
    task.progressMessage = "Generating recommendations...";

    const recommendations = this.generateIntelligenceRecommendations(classification, compliance);

    task.progress = 95;

    return {
      classification,
      compliance,
      recommendations,
      processingTime: Date.now() - task.createdAt.getTime(),
    };
  }

  private generateIntelligenceRecommendations(
    classification: Awaited<ReturnType<typeof classifyDocument>>,
    compliance: Awaited<ReturnType<typeof validateDocumentCompliance>>
  ): string[] {
    const recommendations: string[] = [];

    if (classification.requiresResponse) {
      recommendations.push(
        `This ${classification.category} requires a ${classification.responseType} response. Use the appropriate endpoint.`
      );
    }

    if (compliance.overallScore < 0.7) {
      recommendations.push("Document quality is below optimal. Consider regenerating with AI assistance.");
    }

    if (classification.confidence < 0.6) {
      recommendations.push("Document classification confidence is low. Manual review recommended.");
    }

    const criticalIssues = compliance.checks.filter(c => c.severity === "error" && !c.passed);
    if (criticalIssues.length > 0) {
      recommendations.push(`${criticalIssues.length} critical compliance issues detected. Address before proceeding.`);
    }

    return recommendations;
  }

  // Cleanup old completed tasks (older than 24 hours)
  cleanup(maxAgeHours = 24) {
    const now = Date.now();
    const maxAge = maxAgeHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (
        task.status === "completed" &&
        task.completedAt &&
        now - task.completedAt.getTime() > maxAge
      ) {
        this.tasks.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Doc Intelligence] Cleaned up ${cleaned} old tasks`);
    }

    return cleaned;
  }
}

// =====================================
// Global Processor Instance
// =====================================

export const docIntelligenceProcessor = new DocIntelligenceTaskProcessor(3);

// Auto-start processor
docIntelligenceProcessor.start();

// Periodic cleanup (every 6 hours)
setInterval(() => {
  docIntelligenceProcessor.cleanup(24);
}, 6 * 60 * 60 * 1000);

// =====================================
// Helper Functions
// =====================================

export async function queueDocIntelligenceTask(
  type: DocIntelligenceTaskType,
  input: any,
  options: DocIntelligenceTaskOptions
): Promise<DocIntelligenceTask> {
  return docIntelligenceProcessor.createTask(type, input, options);
}

export function getDocIntelligenceTask(taskId: string): DocIntelligenceTask | undefined {
  return docIntelligenceProcessor.getTask(taskId);
}

export function getUserDocIntelligenceTasks(userId: string): DocIntelligenceTask[] {
  return docIntelligenceProcessor.getUserTasks(userId);
}

// =====================================
// Event Listeners for Logging
// =====================================

docIntelligenceProcessor.on("task:created", (task: DocIntelligenceTask) => {
  console.log(`[Cyrus Task] Document intelligence task created: ${task.id} (${task.type})`);
});

docIntelligenceProcessor.on("task:started", (task: DocIntelligenceTask) => {
  console.log(`[Cyrus Task] Document intelligence task started: ${task.id}`);
});

docIntelligenceProcessor.on("task:completed", (task: DocIntelligenceTask) => {
  const duration = task.completedAt && task.startedAt 
    ? ((task.completedAt.getTime() - task.startedAt.getTime()) / 1000).toFixed(2)
    : "unknown";
  console.log(`[Cyrus Task] Document intelligence task completed: ${task.id} in ${duration}s`);
});

docIntelligenceProcessor.on("task:failed", (task: DocIntelligenceTask) => {
  console.error(`[Cyrus Task] Document intelligence task failed: ${task.id} - ${task.error}`);
});
