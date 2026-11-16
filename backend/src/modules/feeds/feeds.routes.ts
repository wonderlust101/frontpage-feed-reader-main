import { Router } from 'express';
import type { FeedErrorCode, FeedErrorResponse, FetchFeedResponse } from '@frontpage/shared';
import { FeedError } from '../../lib/feed';
import { getFeed } from './feeds.service';

export const fetchRouter = Router();

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

// GET /api/fetch?url=https://example.com/feed.xml
// Optional If-None-Match / If-Modified-Since are forwarded upstream.
fetchRouter.get('/', async (req, res, next) => {
    const url = typeof req.query.url === 'string' ? req.query.url : undefined;
    try {
        const result: FetchFeedResponse = await getFeed(url, {
            etag: req.get('if-none-match') ?? null,
            lastModified: req.get('if-modified-since') ?? null,
        });
        if (result.cache.etag) res.set('ETag', result.cache.etag);
        if (result.cache.lastModified) res.set('Last-Modified', result.cache.lastModified);
        res.set('Cache-Control', 'public, max-age=300');
        res.json(result);
    } catch (err) {
        if (!(err instanceof FeedError)) return next(err);
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
});
