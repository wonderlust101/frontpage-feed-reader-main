// HTTP in/out for /api/fetch: read the request, call the service, shape the response.
// No error handling here: thrown errors become JSON in middleware/error-handler.ts.

import type { Request, Response } from 'express';
import type { FeedCacheValidators, FetchFeedResponse } from '@frontpage/shared';
import { getFeed } from './feeds.service';

const CACHE_CONTROL = 'public, max-age=300';

// The `?url=` query value. Anything but a single string (missing, or given twice) becomes undefined,
// which the service rejects as `invalid_url`.
function readUrl(req: Request): string | undefined {
    return typeof req.query.url === 'string' ? req.query.url : undefined;
}

// The client's If-None-Match / If-Modified-Since headers, passed upstream so an unchanged feed
// can be answered with a 304.
function readValidators(req: Request): FeedCacheValidators {
    return {
        etag: req.get('if-none-match') ?? null,
        lastModified: req.get('if-modified-since') ?? null,
    };
}

// Sends the feed as JSON with its ETag / Last-Modified and a 5-minute Cache-Control header.
function sendFeed(res: Response, result: FetchFeedResponse) {
    if (result.cache.etag) {
        res.set('ETag', result.cache.etag);
    }
    if (result.cache.lastModified) {
        res.set('Last-Modified', result.cache.lastModified);
    }
    res.set('Cache-Control', CACHE_CONTROL);
    // Express answers 304 itself when the ETag above matches the request's If-None-Match.
    res.json(result);
}

// GET /api/fetch?url=… fetches and normalizes one feed; any error is thrown to the error handler.
export async function fetchFeedController(req: Request, res: Response) {
    sendFeed(res, await getFeed(readUrl(req), readValidators(req)));
}
