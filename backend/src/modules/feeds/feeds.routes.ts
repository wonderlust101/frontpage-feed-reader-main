// /api/fetch previews any feed URL without storing it. It makes the server fetch a URL the caller chose, so it needs a
// session and is limited to 30 calls per reader per 10 minutes.

import { Router } from 'express';
import { perUserRateLimit } from '../../middleware/rate-limit';
import { requireAuth } from '../../middleware/require-auth';
import { fetchFeedController } from './feeds.controller';

const fetchRateLimit = perUserRateLimit({
    limit: 30,
    windowMs: 10 * 60 * 1000,
    message: 'Too many feed previews. Try again in a few minutes.',
});

export const feedsRouter = Router();

feedsRouter.use(requireAuth);
feedsRouter.get('/', fetchRateLimit, fetchFeedController);
