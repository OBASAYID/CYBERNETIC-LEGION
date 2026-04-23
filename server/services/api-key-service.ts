import { and, eq } from "drizzle-orm";
import { db } from "../db.js";
import { apiKeys } from "../../shared/schema";
import { decryptSecret, encryptSecret, maskSecret } from "../utils/encryption.js";

export class ApiKeyService {
  async listKeys() {
    const rows = await db.select().from(apiKeys);
    return rows.map((row) => ({
      id: row.id,
      provider: row.provider,
      keyName: row.keyName,
      metadata: row.metadata,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      maskedValue: maskSecret(this.decrypt(row)),
    }));
  }

  async upsertKey(input: {
    provider: string;
    keyName: string;
    value: string;
    metadata?: Record<string, unknown>;
    createdBy?: string | null;
  }) {
    const encrypted = encryptSecret(input.value);
    const existing = await db.select().from(apiKeys).where(and(
      eq(apiKeys.provider, input.provider),
      eq(apiKeys.keyName, input.keyName),
    )).limit(1);

    if (existing[0]) {
      const [updated] = await db.update(apiKeys).set({
        ...encrypted,
        metadata: input.metadata ?? null,
        createdBy: input.createdBy ?? null,
        updatedAt: new Date(),
      }).where(eq(apiKeys.id, existing[0].id)).returning();
      return updated;
    }

    const [created] = await db.insert(apiKeys).values({
      provider: input.provider,
      keyName: input.keyName,
      ...encrypted,
      metadata: input.metadata ?? null,
      createdBy: input.createdBy ?? null,
    }).returning();

    return created;
  }

  async deleteKey(provider: string, keyName: string) {
    await db.delete(apiKeys).where(and(
      eq(apiKeys.provider, provider),
      eq(apiKeys.keyName, keyName),
    ));
  }

  async getDecryptedKey(provider: string, keyName: string): Promise<string | null> {
    const rows = await db.select().from(apiKeys).where(and(
      eq(apiKeys.provider, provider),
      eq(apiKeys.keyName, keyName),
    )).limit(1);

    return rows[0] ? this.decrypt(rows[0]) : null;
  }

  private decrypt(row: typeof apiKeys.$inferSelect) {
    return decryptSecret({
      ciphertext: row.ciphertext,
      iv: row.iv,
      authTag: row.authTag,
    });
  }
}

export const apiKeyService = new ApiKeyService();