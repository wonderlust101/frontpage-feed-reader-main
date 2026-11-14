import { Router } from "express";
import type { HealthResponse } from "../../types";
import { checkDatabase } from "../../db";

export const healthRouter = Router();

// GET /api/health
healthRouter.get("/", async (_req, res) => {
  const database = await checkDatabase();
  const body: HealthResponse = {
    api: "ok",
    database: database.status,
    ...(database.error && { error: database.error }),
  };
  res.json(body);
});
