import { Router } from "express";
import { requireAdmin } from "../security/middleware.js";
import { pool } from "../db.js";

const router = Router();

router.use(requireAdmin);

router.get("/health", async (_req, res) => {
  const result = await pool.query("select now() as now, current_database() as database, version() as version");
  res.json(result.rows[0]);
});

router.get("/tables", async (_req, res) => {
  const result = await pool.query(`
    select table_schema, table_name
    from information_schema.tables
    where table_schema = 'public'
    order by table_name asc
  `);
  res.json({ tables: result.rows });
});

router.get("/stats", async (_req, res) => {
  const [connections, databaseSize] = await Promise.all([
    pool.query("select count(*)::int as total from pg_stat_activity where datname = current_database()"),
    pool.query("select pg_database_size(current_database()) as bytes"),
  ]);

  res.json({
    connections: connections.rows[0]?.total ?? 0,
    databaseSizeBytes: Number(databaseSize.rows[0]?.bytes ?? 0),
  });
});

export default router;