import express from 'express';
import cors from 'cors';
import { env } from './env';
import { errorHandler } from './middleware/error-handler';
import { notFound } from './middleware/not-found';
import { healthRouter } from './modules/health/health.routes';
import { fetchRouter } from './modules/feeds/feeds.routes';

export const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: env.WEB_ORIGINS }));
app.use(express.json());

// ── Module routes ───────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/fetch', fetchRouter);

// ── Fallbacks (keep last) ───────────────────────────────────────
app.use(notFound);
app.use(errorHandler);
