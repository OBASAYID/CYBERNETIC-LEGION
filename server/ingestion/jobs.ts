import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { performFullAnalysis, type FullAnalysisResponse } from "./full-analysis.js";
import type { AnalysisOptions } from "./analyze.js";

export type FileAnalysisJobStatus =
  | "queued"
  | "reading"
  | "extracting"
  | "analyzing"
  | "synthesizing"
  | "completed"
  | "failed";

export interface FileAnalysisJob {
  id: string;
  userId?: string | null;
  fileId?: string | null;
  originalName: string;
  mimetype: string;
  size: number;
  status: FileAnalysisJobStatus;
  progress: number;
  stageLabel: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  options?: AnalysisOptions;
  result?: FullAnalysisResponse;
}

interface CreateJobInput {
  userId?: string | null;
  fileId?: string | null;
  originalName: string;
  mimetype: string;
  size: number;
  filePath: string;
  options?: AnalysisOptions;
}

const jobCache = new Map<string, FileAnalysisJob>();
const jobDir = path.join(process.cwd(), "logs", "file-analysis-jobs");

async function ensureJobDir() {
  await fs.mkdir(jobDir, { recursive: true });
}

async function persistJob(job: FileAnalysisJob) {
  await ensureJobDir();
  jobCache.set(job.id, job);
  await fs.writeFile(path.join(jobDir, `${job.id}.json`), JSON.stringify(job, null, 2), "utf-8");
}

async function loadJob(jobId: string): Promise<FileAnalysisJob | null> {
  const cached = jobCache.get(jobId);
  if (cached) return cached;

  try {
    const raw = await fs.readFile(path.join(jobDir, `${jobId}.json`), "utf-8");
    const parsed = JSON.parse(raw) as FileAnalysisJob;
    jobCache.set(jobId, parsed);
    return parsed;
  } catch {
    return null;
  }
}

async function updateJob(job: FileAnalysisJob, patch: Partial<FileAnalysisJob>) {
  const updated: FileAnalysisJob = {
    ...job,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await persistJob(updated);
  return updated;
}

export async function createAnalysisJob(input: CreateJobInput): Promise<FileAnalysisJob> {
  const createdAt = new Date().toISOString();
  const job: FileAnalysisJob = {
    id: crypto.randomUUID(),
    userId: input.userId ?? null,
    fileId: input.fileId ?? null,
    originalName: input.originalName,
    mimetype: input.mimetype,
    size: input.size,
    status: "queued",
    progress: 0,
    stageLabel: "Queued for analysis",
    createdAt,
    updatedAt: createdAt,
    options: input.options || {},
  };

  await persistJob(job);

  void runAnalysisJob(job.id, input.filePath);

  return job;
}

async function runAnalysisJob(jobId: string, filePath: string) {
  const existing = await loadJob(jobId);
  if (!existing) return;

  let job = await updateJob(existing, {
    status: "reading",
    progress: 10,
    stageLabel: "Reading uploaded file",
  });

  try {
    const buffer = await fs.readFile(filePath);

    job = await updateJob(job, {
      status: "extracting",
      progress: 30,
      stageLabel: "Extracting document content",
    });

    const result = await performFullAnalysis(buffer, job.mimetype, job.options || {});
    const chunksAnalyzed = result.analysis.chunksAnalyzed || 1;

    job = await updateJob(job, {
      status: chunksAnalyzed > 1 ? "synthesizing" : "analyzing",
      progress: chunksAnalyzed > 1 ? 85 : 75,
      stageLabel: chunksAnalyzed > 1 ? `Synthesizing ${chunksAnalyzed} analysis chunks` : "Analyzing extracted content",
    });

    await updateJob(job, {
      status: "completed",
      progress: 100,
      stageLabel: "Analysis complete",
      completedAt: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    await updateJob(job, {
      status: "failed",
      progress: 100,
      stageLabel: "Analysis failed",
      completedAt: new Date().toISOString(),
      error: error?.message || String(error),
    });
  }
}

export async function getAnalysisJob(jobId: string): Promise<FileAnalysisJob | null> {
  return loadJob(jobId);
}

export async function listAnalysisReports(userId?: string): Promise<FileAnalysisJob[]> {
  await ensureJobDir();
  const files = await fs.readdir(jobDir);
  const jobs = await Promise.all(
    files
      .filter((name) => name.endsWith(".json"))
      .map(async (name) => {
        try {
          const raw = await fs.readFile(path.join(jobDir, name), "utf-8");
          return JSON.parse(raw) as FileAnalysisJob;
        } catch {
          return null;
        }
      }),
  );

  return jobs
    .filter((job): job is FileAnalysisJob => Boolean(job))
    .filter((job) => job.status === "completed")
    .filter((job) => !userId || job.userId === userId)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}