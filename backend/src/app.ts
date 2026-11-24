// The Express app: global middleware, then module routes, then the 404 and error handlers (these must stay last).
// Auth goes before express.json(): Better Auth parses its own request bodies.

import express from 'express';
import cors from 'cors';
import { env } from './env';
import { errorHandler } from './middleware/error-handler';
import { notFoundHandler } from './middleware/not-found-handler';
import { authRouter } from './modules/auth/auth.routes';
import { healthRouter } from './modules/health/health.routes';
import { feedsRouter } from './modules/feeds/feeds.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';

const CORS_PREFLIGHT_CACHE_SECONDS = 2 * 60 * 60;

export const app = express();

app.set('trust proxy', 1);

// The site calls the API from another origin (www. → api.), so each auth POST is preceded by a CORS preflight; browsers
// may cache its answer for up to 2 hours (Chrome's cap), which saves that extra round trip on later requests.
// Cross-origin pages can only read response headers listed in exposedHeaders: X-Retry-After is how long a rate-limited
// form tells the reader to wait.
app.use(
    cors({
        origin: env.WEB_ORIGINS,
        credentials: true,
        maxAge: CORS_PREFLIGHT_CACHE_SECONDS,
        exposedHeaders: ['X-Retry-After'],
    }),
);
app.use(authRouter);
app.use(express.json());

app.use('/api/health', healthRouter);
app.use('/api/fetch', feedsRouter);
app.use('/api/subscriptions', subscriptionsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
