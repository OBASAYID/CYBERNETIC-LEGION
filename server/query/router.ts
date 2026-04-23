import { Router } from "express";
import { z } from "zod";
import { requireAdmin } from "../security/middleware.js";
import { pool } from "../db.js";

const router = Router();

const querySchema = z.object({
  sql: z.string().min(1),
  params: z.array(z.unknown()).optional(),
});

function isReadOnlySql(sql: string) {
  const normalized = sql.trim().replace(/;+$/, "").toLowerCase();
  return normalized.startsWith("select") || normalized.startsWith("with") || normalized.startsWith("explain");
}

router.use(requireAdmin);

router.post("/run", async (req, res) => {
  const parsed = querySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query payload", details: parsed.error.flatten() });
  }

  if (!isReadOnlySql(parsed.data.sql)) {
    return res.status(403).json({ error: "Only read-only queries are allowed" });
  }

  const result = await pool.query(parsed.data.sql, parsed.data.params ?? []);
  res.json({ rowCount: result.rowCount, rows: result.rows });
});

export default router;