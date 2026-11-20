// The Express app: global middleware, then module routes, then the 404 and error handlers (these must stay last).
// Auth goes before express.json(): Better Auth parses its own request bodies.

import express from 'express';
import cors from 'cors';
import { env } from './env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { fetchRouter } from './modules/feeds/feeds.routes';

export const app = express();

app.set('trust proxy', 1);

app.use(cors({ origin: env.WEB_ORIGINS, credentials: true }));
app.use(authRouter);
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/fetch', fetchRouter);

app.use(notFoundHandler);
app.use(errorHandler);
