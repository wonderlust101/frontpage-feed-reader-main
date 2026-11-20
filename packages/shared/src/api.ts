// API response shapes: the contract between backend and frontend, imported from "@frontpage/shared".
// Dates are ISO 8601 UTC strings (or null); only `contentHtml` is HTML (sanitized), all other text is plain.

export type DbStatus = 'connected' | 'skipped' | 'error';

export type HealthResponse = {
    api: 'ok';
    database: DbStatus;
    error?: string;
};

export type FeedFormat = 'rss2' | 'atom' | 'rss1';

export type NormalizedItem = {
    id: string;
    title: string;
    url: string | null;
    author: string | null;
    publishedAt: string | null;
    updatedAt: string | null;
    summary: string;
    contentHtml: string;
    hasFullContent: boolean;
    imageUrl: string | null;
    categories: string[];
};

export type NormalizedFeed = {
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
    notModified: boolean;
    cache: FeedCacheValidators;
    redirect: FeedRedirect | null;
};

export type FeedErrorCode = 'invalid_url' | 'blocked_url' | 'timeout' | 'network' | 'http_4xx' | 'http_5xx' | 'not_a_feed' | 'parse_error' | 'too_large';

export type ApiErrorCode = FeedErrorCode | 'not_found' | 'bad_request' | 'invalid_json' | 'unauthorized' | 'database_unavailable' | 'internal_error';

export type ApiErrorResponse<C extends string = ApiErrorCode> = {
    error: {
        code: C;
        message: string;
        retryable: boolean;
        status?: number;
    };
};

export type FeedErrorResponse = ApiErrorResponse<FeedErrorCode>;
