// HTTP in/out for /api/fetch: read the request, call the service, shape the response.
// No error handling here: thrown errors become JSON in middleware/error-handler.ts.

import type { Request, Response } from 'express';
import { getFeed } from './feeds.service';
import { parseFetchUrl } from './feeds.validation';

// The reader's browser may reuse a feed response for 5 minutes. `private`: the route needs a session, so shared caches must not keep it.
const CACHE_CONTROL = 'private, max-age=300';

// GET /api/fetch?url=… fetches and normalizes one feed.
export async function fetchFeedController(req: Request, res: Response) {
    const url = parseFetchUrl(req.query);

    const result = await getFeed(url, {
        etag: req.get('if-none-match'),
        lastModified: req.get('if-modified-since'),
    });

    // Pass on the feed's ETag / Last-Modified so the client can ask "has it changed?" next time.
    if (result.cache.etag)
        res.set('ETag', result.cache.etag);

    if (result.cache.lastModified)
        res.set('Last-Modified', result.cache.lastModified);

    res.set('Cache-Control', CACHE_CONTROL);

    // When those headers match the request's If-None-Match / If-Modified-Since, Express turns this into a bodiless 304 itself (req.fresh).
    res.json(result);
}
