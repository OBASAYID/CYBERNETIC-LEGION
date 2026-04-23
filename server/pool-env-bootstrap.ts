/**
 * Import this immediately after `dotenv/config` and before `./db.js`.
 * `server/db.ts` reads `PG_POOL_MAX` when the pool is first created.
 */
/** Defaults for one API process; stay well under typical Postgres max_connections (~100). */
if (!String(process.env.PG_POOL_MAX ?? "").trim()) {
  process.env.PG_POOL_MAX =
    process.env.NODE_ENV === "production" ? "40" : "25";
}
