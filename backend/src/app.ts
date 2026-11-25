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
import { itemsRouter } from './modules/items/items.routes';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.routes';

const CORS_PREFLIGHT_CACHE_SECONDS = 2 * 60 * 60;

export const app = express();

app.set('trust proxy', 1);

// The site calls the API from another origin, so browsers may cache the CORS preflight for 2 hours (Chrome's cap).
// Cross-origin pages can only read exposed headers, and X-Retry-After is how long a rate-limited form must wait.
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
app.use('/api/items', itemsRouter);

app.use(notFoundHandler);
app.use(errorHandler);
