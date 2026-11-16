import type { Request, Response } from 'express';
import type { FeedCacheValidators, FetchFeedResponse } from '@frontpage/shared';
import { getFeed } from './feeds.service';

// Controllers translate between HTTP and the service: read the request, call the service,
// shape the response. No business logic, and no error handling: errors thrown by the service
// (FeedError extends AppError) are turned into JSON by src/middleware/error-handler.ts.

/** How long browsers/CDNs may reuse a fetched feed before asking again. */
const CACHE_CONTROL = 'public, max-age=300';

/** Reads `?url=`; anything but a single string (missing, repeated) becomes undefined → 400 in the service. */
function readUrl(req: Request): string | undefined {
    return typeof req.query.url === 'string' ? req.query.url : undefined;
}

/** The client's conditional-request headers, forwarded upstream. */
function readValidators(req: Request): FeedCacheValidators {
    return {
        etag: req.get('if-none-match') ?? null,
        lastModified: req.get('if-modified-since') ?? null,
    };
}

function sendFeed(res: Response, result: FetchFeedResponse) {
    if (result.cache.etag) res.set('ETag', result.cache.etag);
    if (result.cache.lastModified) res.set('Last-Modified', result.cache.lastModified);
    res.set('Cache-Control', CACHE_CONTROL);
    // Express answers 304 itself when the ETag above matches the request's If-None-Match.
    res.json(result);
}

/** GET /api/fetch?url=… — fetch and normalize one feed. */
export async function fetchFeedController(req: Request, res: Response) {
    sendFeed(res, await getFeed(readUrl(req), readValidators(req)));
}
