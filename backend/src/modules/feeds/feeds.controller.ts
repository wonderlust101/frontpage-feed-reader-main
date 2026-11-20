// HTTP in/out for /api/fetch: read the request, call the service, shape the response.
// No error handling here: thrown errors become JSON in middleware/error-handler.ts.

import type { Request, Response } from 'express';
import type { FeedCacheValidators } from '@frontpage/shared';
import { getFeed } from './feeds.service';

// Browsers may reuse a feed response for 5 minutes before asking again.
const CACHE_CONTROL = 'public, max-age=300';

// GET /api/fetch?url=… fetches and normalizes one feed; any error is thrown to the error handler.
export async function fetchFeedController(req: Request, res: Response) {
    const url = typeof req.query.url === 'string' ? req.query.url : undefined;

    const result = await getFeed(url, {
        etag: req.get('if-none-match'),
        lastModified: req.get('if-modified-since'),
    });

    setCacheHeaders(res, result.cache);
    // When these headers match the request's If-None-Match / If-Modified-Since, Express turns this into a bodiless 304 itself (req.fresh).
    res.json(result);
}

// Passes on the feed's ETag / Last-Modified so the client can ask "has it changed?" next time, plus how long to cache it.
function setCacheHeaders(res: Response, cache: FeedCacheValidators) {
    if (cache.etag) {
        res.set('ETag', cache.etag);
    }
    if (cache.lastModified) {
        res.set('Last-Modified', cache.lastModified);
    }
    res.set('Cache-Control', CACHE_CONTROL);
}
