import { randomUUID } from "crypto";
import { generateDocument, type GeneratedDoc } from "./generate.js";
import type { DocGenInput } from "./analyze.js";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

export type DocgenJobStatus = "queued" | "running" | "completed" | "failed";
export type ActiveDocgenJobStatus = DocgenJobStatus | "canceled";

export interface DocgenJob {
  id: string;
  status: ActiveDocgenJobStatus;
  progress: number;
  stage: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  error?: string;
  cancelRequested?: boolean;
  recoveredFromDisk?: boolean;
  resumedFromJobId?: string;
  input: DocGenInput;
  result?: GeneratedDoc;
}

const jobs = new Map<string, DocgenJob>();
const docgenStateDir = path.resolve(process.cwd(), "logs", "docgen");
const docgenStateFile = path.join(docgenStateDir, "jobs.json");
let persistChain: Promise<void> = Promise.resolve();
let initialLoadComplete = false;

function nowIso(): string {
  return new Date().toISOString();
}

function updateJob(id: string, patch: Partial<DocgenJob>) {
  const current = jobs.get(id);
  if (!current) return;
  jobs.set(id, {
    ...current,
    ...patch,
    updatedAt: nowIso(),
  });
  queuePersist();
}

function queuePersist() {
  persistChain = persistChain
    .then(async () => {
      await mkdir(docgenStateDir, { recursive: true });
      const payload = JSON.stringify({
        updatedAt: nowIso(),
        jobs: Array.from(jobs.values()),
      });
      await writeFile(docgenStateFile, payload, "utf-8");
    })
    .catch((error) => {
      console.error("Docgen state persist failed:", error);
    });
}

async function loadPersistedJobs() {
  try {
    const raw = await readFile(docgenStateFile, "utf-8");
    const parsed = JSON.parse(raw);
    const savedJobs = Array.isArray(parsed?.jobs) ? parsed.jobs : [];

    for (const job of savedJobs) {
      if (!job?.id || !job?.input) continue;
      const recovered: DocgenJob = {
        ...job,
        recoveredFromDisk: true,
      };

      if (recovered.status === "running" || recovered.status === "queued") {
        recovered.status = "queued";
        recovered.stage = "Recovered after restart";
        recovered.progress = Math.min(recovered.progress || 0, 80);
      }

      jobs.set(recovered.id, recovered);
    }

    // Resume interrupted jobs automatically.
    for (const [id, job] of jobs.entries()) {
      if (job.status === "queued" && !job.completedAt) {
        void runDocgenJob(id);
      }
    }
  } catch {
    // No prior persisted state.
  } finally {
    initialLoadComplete = true;
  }
}

void loadPersistedJobs();

export function createDocgenJob(input: DocGenInput): DocgenJob {
  const id = randomUUID();
  const job: DocgenJob = {
    id,
    status: "queued",
    progress: 2,
    stage: "Queued",
    createdAt: nowIso(),
    updatedAt: nowIso(),
    input,
  };
  jobs.set(id, job);
  queuePersist();

  void runDocgenJob(id);
  return job;
}

async function runDocgenJob(id: string): Promise<void> {
  const job = jobs.get(id);
  if (!job) return;

  updateJob(id, { status: "running", progress: 8, stage: "Preparing generation" });

  try {
    const result = await generateDocument(job.input);

    const current = jobs.get(id);
    if (current?.cancelRequested) {
      updateJob(id, {
        status: "canceled",
        progress: current.progress,
        stage: "Canceled",
        completedAt: nowIso(),
        error: "Generation canceled by user",
      });
      return;
    }

    updateJob(id, {
      status: "completed",
      progress: 100,
      stage: "Completed",
      completedAt: nowIso(),
      result,
    });
  } catch (error: any) {
    if ((error?.message || String(error)) === "DOCGEN_CANCELED") {
      updateJob(id, {
        status: "canceled",
        stage: "Canceled",
        completedAt: nowIso(),
        error: "Generation canceled by user",
      });
      return;
    }

    updateJob(id, {
      status: "failed",
      progress: 100,
      stage: "Failed",
      completedAt: nowIso(),
      error: error?.message || String(error),
    });
  }
}

export function getDocgenJob(id: string): DocgenJob | null {
  return jobs.get(id) || null;
}

export function listDocgenJobs(limit = 20): DocgenJob[] {
  if (!initialLoadComplete) {
    return [];
  }
  return Array.from(jobs.values())
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit);
}

export function cancelDocgenJob(id: string): DocgenJob | null {
  const job = jobs.get(id);
  if (!job) return null;
  if (["completed", "failed", "canceled"].includes(job.status)) {
    return job;
  }

  updateJob(id, {
    cancelRequested: true,
    stage: "Cancel requested",
  });

  return jobs.get(id) || null;
}

export function resumeDocgenJob(id: string): DocgenJob | null {
  const previous = jobs.get(id);
  if (!previous) return null;

  if (!["failed", "canceled"].includes(previous.status)) {
    return previous;
  }

  const resumed = createDocgenJob(previous.input);
  const merged: DocgenJob = {
    ...resumed,
    resumedFromJobId: previous.id,
    stage: `Resumed from ${previous.id.slice(0, 8)}`,
  };
  jobs.set(merged.id, merged);
  queuePersist();
  return merged;
}
