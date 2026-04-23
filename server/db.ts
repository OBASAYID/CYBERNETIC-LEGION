import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema.js";

function resolvePoolMax(): number {
  const parsed = Number.parseInt(process.env.PG_POOL_MAX ?? "", 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  // Safe headroom for parallel HTTP + background jobs when bootstrap did not run.
  return process.env.NODE_ENV === "production" ? 40 : 25;
}

/** One pool per process — avoids exhausting Postgres on dev HMR / duplicate db modules. */
const POOL_GLOBAL_KEY = "__cyrus_shared_pg_pool__" as const;

type GlobalWithPool = typeof globalThis & {
  [POOL_GLOBAL_KEY]?: InstanceType<typeof Pool>;
};

function getOrCreatePool(): InstanceType<typeof Pool> {
  const g = globalThis as GlobalWithPool;
  const existing = g[POOL_GLOBAL_KEY];
  if (existing) {
    return existing;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }

  const created = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: resolvePoolMax(),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
  });
  g[POOL_GLOBAL_KEY] = created;
  return created;
}

export const pool = getOrCreatePool();
export const db = drizzle(pool, { schema });
