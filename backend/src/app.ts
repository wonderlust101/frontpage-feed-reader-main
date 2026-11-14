import express from "express";
import cors from "cors";
import { env } from "./env";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { healthRouter } from "./modules/health/health.routes";

export const app = express();

// Railway terminates TLS at its proxy; trust it so req.ip / req.protocol are correct.
app.set("trust proxy", 1);
app.use(cors({ origin: env.WEB_ORIGINS }));
app.use(express.json());

// ── Module routes ───────────────────────────────────────────────
app.use("/api/health", healthRouter);

// ── Fallbacks (keep last) ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
