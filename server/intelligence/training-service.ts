import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { trainingRuns } from "../../shared/schema";
import { cyrusBrain } from "../ai/cyrus-brain.js";
import { learningSystem } from "../ai/learning-system.js";
import { memoryService } from "./memory-service.js";

export class TrainingService {
  async train(input: {
    initiatedBy?: string | null;
    sourceType: "dataset" | "document" | "mission_replay" | "interaction_batch";
    items: Array<{ content: string; metadata?: Record<string, unknown> }>;
  }) {
    const [run] = await db.insert(trainingRuns).values({
      initiatedBy: input.initiatedBy ?? null,
      sourceType: input.sourceType,
      itemCount: input.items.length,
      status: "running",
      summary: `Training ${input.items.length} items from ${input.sourceType}`,
      metadata: null,
    }).returning();

    let processed = 0;

    try {
      for (const item of input.items) {
        await cyrusBrain.addKnowledge(item.content, {
          sourceType: input.sourceType,
          ...(item.metadata ?? {}),
        });
        await learningSystem.learnFromDocument(item.content, item.metadata ?? {});
        await memoryService.recordDecision({
          userId: input.initiatedBy ?? null,
          source: "training",
          decisionType: input.sourceType,
          input: item.content,
          output: "knowledge_ingested",
          confidence: 100,
          metadata: item.metadata ?? {},
        });
        processed += 1;
      }

      const [updated] = await db.update(trainingRuns).set({
        status: "completed",
        summary: `Processed ${processed} training items`,
        metadata: { processed },
      }).where(eq(trainingRuns.id, run.id)).returning();

      return updated;
    } catch (error) {
      const [failed] = await db.update(trainingRuns).set({
        status: "failed",
        summary: error instanceof Error ? error.message : String(error),
        metadata: { processed },
      }).where(eq(trainingRuns.id, run.id)).returning();
      throw Object.assign(error instanceof Error ? error : new Error(String(error)), { run: failed });
    }
  }
}

export const trainingService = new TrainingService();