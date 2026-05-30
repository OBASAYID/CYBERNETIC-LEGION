import { pool } from "../db.js";

const KEY_ADMIN = "auth.admin_access_code";
const KEY_USER = "auth.user_access_code";

async function ensureTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS system_config (
      key VARCHAR(120) PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function dbGet(key: string): Promise<string | null> {
  try {
    const res = await pool.query("SELECT value FROM system_config WHERE key = $1", [key]);
    return res.rows[0]?.value ?? null;
  } catch {
    return null;
  }
}

async function dbSet(key: string, value: string): Promise<void> {
  await ensureTable();
  await pool.query(
    `INSERT INTO system_config (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, value],
  );
}

function envFallback(): { adminCode: string; userCode: string } {
  const isProd = process.env.NODE_ENV === "production";
  return {
    adminCode: String(process.env.ADMIN_ACCESS_CODE || (isProd ? "" : "71580019")).trim(),
    userCode: String(process.env.USER_ACCESS_CODE || (isProd ? "" : "170392")).trim(),
  };
}

export async function getAccessCodes(): Promise<{ adminCode: string; userCode: string }> {
  const fallback = envFallback();
  try {
    const [dbAdmin, dbUser] = await Promise.all([dbGet(KEY_ADMIN), dbGet(KEY_USER)]);
    return {
      adminCode: dbAdmin ?? fallback.adminCode,
      userCode: dbUser ?? fallback.userCode,
    };
  } catch {
    return fallback;
  }
}

export async function setAccessCodes(params: {
  adminCode?: string;
  userCode?: string;
}): Promise<void> {
  await ensureTable();
  const ops: Promise<void>[] = [];
  if (params.adminCode !== undefined) ops.push(dbSet(KEY_ADMIN, params.adminCode));
  if (params.userCode !== undefined) ops.push(dbSet(KEY_USER, params.userCode));
  await Promise.all(ops);
}

export async function getAccessCodeStatus(): Promise<{
  adminCodeSource: "database" | "env" | "default";
  userCodeSource: "database" | "env" | "default";
  adminCodeMask: string;
  userCodeMask: string;
}> {
  const [dbAdmin, dbUser] = await Promise.all([dbGet(KEY_ADMIN), dbGet(KEY_USER)]);
  const envAdmin = String(process.env.ADMIN_ACCESS_CODE || "").trim();
  const envUser = String(process.env.USER_ACCESS_CODE || "").trim();

  function source(dbVal: string | null, envVal: string): "database" | "env" | "default" {
    if (dbVal) return "database";
    if (envVal) return "env";
    return "default";
  }

  function mask(val: string | null, envVal: string, def: string): string {
    const code = val || envVal || def;
    if (!code) return "—";
    if (code.length <= 4) return "*".repeat(code.length);
    return "*".repeat(code.length - 3) + code.slice(-3);
  }

  const isProd = process.env.NODE_ENV === "production";
  const defAdmin = isProd ? "" : "71580019";
  const defUser = isProd ? "" : "170392";

  return {
    adminCodeSource: source(dbAdmin, envAdmin),
    userCodeSource: source(dbUser, envUser),
    adminCodeMask: mask(dbAdmin, envAdmin, defAdmin),
    userCodeMask: mask(dbUser, envUser, defUser),
  };
}
