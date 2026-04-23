import { Router } from "express";

import { getAlgorithmCatalog } from "../config/algorithm-catalog.js";

const router = Router();

router.get("/algorithms/catalog", (_req, res) => {
  res.json({ success: true, catalog: getAlgorithmCatalog(), ts: Date.now() });
});

export default router;
