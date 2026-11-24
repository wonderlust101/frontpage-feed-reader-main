// HTTP in/out for /api/subscriptions: validate the request, call the service as the signed-in reader, send the answer.
// No error handling here: thrown errors become JSON in middleware/error-handler.ts. requireAuth runs first (see the routes).

import type { Request, Response } from 'express';
import type { SubscriptionListResponse, SubscriptionResponse } from '@frontpage/shared';
import { requireDatabase } from '../../db';
import { currentUser } from '../../middleware/require-auth';
import { listSubscriptions, subscribe, unsubscribe, updateSubscription } from './subscriptions.service';
import { parseSubscribeRequest, parseSubscriptionId, parseUpdateSubscriptionRequest } from './subscriptions.validation';

// GET /api/subscriptions: the reader's subscriptions with each feed's health.
export async function listSubscriptionsController(_req: Request, res: Response) {
    const subscriptions = await listSubscriptions(requireDatabase(), currentUser(res).id);

    res.json({ subscriptions } satisfies SubscriptionListResponse);
}

// POST /api/subscriptions { url, categoryId? }: answers 201 with the new subscription and its URL in Location.
export async function subscribeController(req: Request, res: Response) {
    const input = parseSubscribeRequest(req.body);
    const subscription = await subscribe(requireDatabase(), currentUser(res).id, input);

    res.status(201)
        .location(`${req.baseUrl}/${subscription.id}`)
        .json({ subscription } satisfies SubscriptionResponse);
}

// PATCH /api/subscriptions/:id { customTitle?, categoryId? }: answers with the updated subscription.
export async function updateSubscriptionController(req: Request<{ id: string }>, res: Response) {
    const id = parseSubscriptionId(req.params.id);
    const changes = parseUpdateSubscriptionRequest(req.body);
    const subscription = await updateSubscription(requireDatabase(), currentUser(res).id, id, changes);

    res.json({ subscription } satisfies SubscriptionResponse);
}

// DELETE /api/subscriptions/:id: answers 204 with no body.
export async function unsubscribeController(req: Request<{ id: string }>, res: Response) {
    await unsubscribe(requireDatabase(), currentUser(res).id, parseSubscriptionId(req.params.id));
    res.status(204).end();
}
