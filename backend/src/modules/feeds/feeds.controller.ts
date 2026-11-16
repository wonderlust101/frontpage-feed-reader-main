import type { Request, Response } from 'express';
import type { FeedCacheValidators, FeedErrorCode, FeedErrorResponse, FetchFeedResponse } from '@frontpage/shared';
import { FeedError } from '../../lib/feed';
import { getFeed } from './feeds.service';

// Controllers translate between HTTP and the service: read the request, call the service,
// shape the response. No business logic here, and no req/res in the service.

/** How long browsers/CDNs may reuse a fetched feed before asking again. */
const CACHE_CONTROL = 'public, max-age=300';

const STATUS_BY_CODE: Record<FeedErrorCode, number> = {
    invalid_url: 400,
    blocked_url: 400,
    not_a_feed: 422,
    parse_error: 422,
    too_large: 413,
    http_4xx: 502,
    http_5xx: 502,
    network: 502,
    timeout: 504,
};

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

function sendFeedError(res: Response, err: FeedError) {
    const body: FeedErrorResponse = {
        error: {
            code: err.code,
            message: err.message,
            ...(err.status !== undefined && { status: err.status }),
            retryable: err.retryable,
        },
    };
    res.status(STATUS_BY_CODE[err.code]).json(body);
}

/** GET /api/fetch?url=… — fetch and normalize one feed. */
export async function fetchFeedController(req: Request, res: Response) {
    try {
        sendFeed(res, await getFeed(readUrl(req), readValidators(req)));
    } catch (err) {
        // Known feed failures get a typed JSON error; anything else is a bug → central error handler (500).
        // Express 5 forwards a rejected async handler to the error middleware, so rethrowing is enough.
        if (err instanceof FeedError) return sendFeedError(res, err);
        throw err;
    }
}
