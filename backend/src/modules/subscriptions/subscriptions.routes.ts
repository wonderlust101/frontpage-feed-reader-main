// /api/subscriptions: a signed-in reader's feeds. Every route needs a session; subscribing (which fetches a URL the
// reader chose) is also limited to 30 calls per reader per 10 minutes.

import { Router } from 'express';
import { perUserRateLimit } from '../../middleware/rate-limit';
import { requireAuth } from '../../middleware/require-auth';
import { listSubscriptionsController, subscribeController, unsubscribeController, updateSubscriptionController } from './subscriptions.controller';

const subscribeRateLimit = perUserRateLimit({
    limit: 30,
    windowMs: 10 * 60 * 1000,
    message: 'Too many feeds added at once. Try again in a few minutes.',
});

export const subscriptionsRouter = Router();

subscriptionsRouter.use(requireAuth);
subscriptionsRouter.get('/', listSubscriptionsController);
subscriptionsRouter.post('/', subscribeRateLimit, subscribeController);
subscriptionsRouter.patch('/:id', updateSubscriptionController);
subscriptionsRouter.delete('/:id', unsubscribeController);
