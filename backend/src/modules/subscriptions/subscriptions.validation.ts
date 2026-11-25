// Checks the subscriptions routes' ids and bodies and turns them into the shared request types; unknown fields are dropped.
// An id that isn't a UUID is "not found" (404), the same answer as for another reader's id, and never reaches Postgres
// (which would reject it with an error). The feed URL itself is checked by parseFeedUrl in the service.

import { MAX_CUSTOM_TITLE_LENGTH, type SubscribeRequest, type UpdateSubscriptionRequest } from '@frontpage/shared';
import { isUuid } from '../../lib/uuid';
import { BadRequestError, NotFoundError } from '../../errors';

// The subscription id from the URL; throws `not_found` (404) when it isn't a UUID.
export function parseSubscriptionId(value: string): string {
    if (!isUuid(value))
        throw new NotFoundError('not_found', 'Subscription not found');

    return value;
}

// A url that isn't a string becomes "", which parseFeedUrl rejects as `invalid_url`.
export function parseSubscribeRequest(body: unknown): SubscribeRequest {
    const fields = toObject(body);
    const request: SubscribeRequest = { url: typeof fields.url === 'string' ? fields.url : '' };

    if (fields.categoryId !== undefined)
        request.categoryId = parseCategoryId(fields.categoryId);

    return request;
}

// The title is trimmed and "" becomes null, so the feed's own title shows again.
export function parseUpdateSubscriptionRequest(body: unknown): UpdateSubscriptionRequest {
    const fields = toObject(body);
    const changes: UpdateSubscriptionRequest = {};

    if (fields.customTitle !== undefined)
        changes.customTitle = parseCustomTitle(fields.customTitle);

    if (fields.categoryId !== undefined)
        changes.categoryId = parseCategoryId(fields.categoryId);

    if (Object.keys(changes).length === 0)
        throw new BadRequestError('bad_request', 'Send customTitle, categoryId or both');

    return changes;
}

// The body as a plain object; throws `bad_request` for anything else (no body, an array, a string).
function toObject(body: unknown): Record<string, unknown> {
    if (typeof body !== 'object' || body === null || Array.isArray(body))
        throw new BadRequestError('bad_request', 'The request body must be a JSON object');

    return body as Record<string, unknown>;
}

// A category id, or null for Uncategorized; throws `bad_request` for anything else.
function parseCategoryId(value: unknown): string | null {
    if (value === null || isUuid(value))
        return value;

    throw new BadRequestError('bad_request', 'categoryId must be a category id or null');
}

// A custom title, trimmed, with "" as null; throws `bad_request` if it isn't a string or null, or is too long.
function parseCustomTitle(value: unknown): string | null {
    if (value === null)
        return null;

    if (typeof value !== 'string')
        throw new BadRequestError('bad_request', 'customTitle must be a string or null');

    const title = value.trim();

    if (title.length > MAX_CUSTOM_TITLE_LENGTH)
        throw new BadRequestError('bad_request', `customTitle must be at most ${MAX_CUSTOM_TITLE_LENGTH} characters`);

    return title || null;
}
