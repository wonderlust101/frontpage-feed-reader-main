// API response shapes: the contract between backend and frontend.
// Both sides import these from "@frontpage/shared", so there is nothing to keep in sync by hand.

export type DbStatus = 'connected' | 'skipped' | 'error';

export type HealthResponse = {
    api: 'ok';
    database: DbStatus;
    error?: string;
};

// ── Feed engine ─────────────────────────────────────────────────

export type FeedFormat = 'rss2' | 'atom' | 'rss1';

/** One feed entry, normalized to the same shape whatever the source format. */
export type NormalizedItem = {
    /** guid/id, falling back to the link, then a hash of title + date. */
    id: string;
    title: string;
    url: string | null;
    author: string | null;
    /** ISO 8601, or null when the feed gives no usable date. */
    publishedAt: string | null;
    updatedAt: string | null;
    /** Plain text, at most 300 characters. */
    summary: string;
    /** Sanitized HTML, safe to render. */
    contentHtml: string;
    /** True when the feed ships the full article rather than an excerpt. */
    hasFullContent: boolean;
    imageUrl: string | null;
    categories: string[];
};

export type NormalizedFeed = {
    /** Final URL after redirects. */
    url: string;
    requestedUrl: string;
    format: FeedFormat;
    title: string;
    description: string | null;
    siteUrl: string;
    imageUrl: string | null;
    language: string | null;
    updatedAt: string | null;
    items: NormalizedItem[];
    /** Non-fatal problems, e.g. a partial parse or items without dates. */
    warnings: string[];
};

export type FeedCacheValidators = {
    etag: string | null;
    lastModified: string | null;
};

export type FeedRedirect = {
    permanent: boolean;
    from: string;
    to: string;
};

export type FetchFeedResponse = {
    feed: NormalizedFeed;
    fetchedAt: string;
    /** True when the upstream answered 304 and the feed came from the server cache. */
    notModified: boolean;
    cache: FeedCacheValidators;
    redirect: FeedRedirect | null;
};

export type FeedErrorCode =
    | 'invalid_url'
    | 'blocked_url'
    | 'timeout'
    | 'network'
    | 'http_4xx'
    | 'http_5xx'
    | 'not_a_feed'
    | 'parse_error'
    | 'too_large';

/** Every error code the API can return. Add new module codes here. */
export type ApiErrorCode = FeedErrorCode | 'not_found' | 'bad_request' | 'invalid_json' | 'internal_error';

/** The one shape every API error uses, whatever the status code. */
export type ApiErrorResponse<C extends string = ApiErrorCode> = {
    error: {
        code: C;
        message: string;
        /** True for temporary failures worth retrying; false for permanent ones (dead feed, bad input). */
        retryable: boolean;
        /** Upstream HTTP status, for errors caused by a third-party server. */
        status?: number;
    };
};

export type FeedErrorResponse = ApiErrorResponse<FeedErrorCode>;
