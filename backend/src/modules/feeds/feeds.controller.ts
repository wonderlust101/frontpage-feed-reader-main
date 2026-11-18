// HTTP in/out for /api/fetch: read the request, call the service, shape the response.
// No error handling here: thrown errors become JSON in src/errors.ts.

import type { Request, Response } from 'express';
import { getFeed } from './feeds.service';

const CACHE_CONTROL = 'public, max-age=300';

// GET /api/fetch?url=… fetches and normalizes one feed; any error is thrown to the error handler.
export async function fetchFeedController(req: Request, res: Response) {
    const url = typeof req.query.url === 'string' ? req.query.url : undefined;

    const result = await getFeed(url, {
        etag: req.get('if-none-match') ?? null,
        lastModified: req.get('if-modified-since') ?? null,
    });

    if (result.cache.etag) {
        res.set('ETag', result.cache.etag);
    }
    if (result.cache.lastModified) {
        res.set('Last-Modified', result.cache.lastModified);
    }
    res.set('Cache-Control', CACHE_CONTROL);

    res.json(result);
}
