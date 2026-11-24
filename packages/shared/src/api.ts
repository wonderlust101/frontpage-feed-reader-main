// API request and response shapes: the contract between backend and frontend, imported from "@frontpage/shared".
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

export type ApiErrorCode =
    | FeedErrorCode
    | 'not_found'
    | 'bad_request'
    | 'invalid_json'
    | 'unauthorized'
    | 'already_subscribed'
    | 'category_not_found'
    | 'feed_not_found'
    | 'rate_limited'
    | 'database_unavailable'
    | 'internal_error';

export type ApiErrorResponse<C extends string = ApiErrorCode> = {
    error: {
        code: C;
        message: string;
        retryable: boolean;
        status?: number;
        subscriptionId?: string;
    };
};

export type FeedErrorResponse = ApiErrorResponse<FeedErrorCode>;

export type SessionUser = {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
};

export type SessionResponse = {
    user: SessionUser;
    session: { id: string; expiresAt: string };
} | null;

export const MAX_CUSTOM_TITLE_LENGTH = 200;

export type FeedHealth = 'active' | 'stale' | 'error' | 'dead';

export type Subscription = {
    id: string;
    feedId: string;
    url: string;
    // The reader's custom title, else the feed's own.
    title: string;
    customTitle: string | null;
    feedTitle: string;
    description: string | null;
    siteUrl: string | null;
    // The feed's image, else the site's /favicon.ico, unchecked: hide it if it fails to load.
    iconUrl: string | null;
    // null means Uncategorized.
    categoryId: string | null;
    health: FeedHealth;
    lastSuccessAt: string | null;
    lastFetchedAt: string | null;
    lastError: { code: FeedErrorCode; message: string } | null;
    createdAt: string;
};

export type SubscriptionResponse = {
    subscription: Subscription;
};

export type SubscriptionListResponse = {
    subscriptions: Subscription[];
};

export type SubscribeRequest = {
    url: string;
    categoryId?: string | null;
};

export type UpdateSubscriptionRequest = {
    customTitle?: string | null;
    categoryId?: string | null;
};

export const ITEM_PAGE_SIZE = 30;
export const MAX_ITEM_PAGE_SIZE = 100;
export const UNCATEGORIZED = 'uncategorized';

export type ItemOrder = 'newest' | 'oldest';

export type ItemListParams = {
    feed?: string;
    category?: string;
    unread?: boolean;
    order?: ItemOrder;
    limit?: number;
    cursor?: string;
};

// Same rules as a Subscription's `title`, `iconUrl` and `categoryId`.
export type ItemFeed = {
    id: string;
    title: string;
    iconUrl: string | null;
    categoryId: string | null;
    health: FeedHealth;
};

export type ItemSummary = {
    id: string;
    feed: ItemFeed;
    title: string;
    url: string | null;
    author: string | null;
    summary: string;
    imageUrl: string | null;
    publishedAt: string | null;
    // What lists sort by: `publishedAt`, else when the article was first seen.
    sortAt: string;
    hasFullContent: boolean;
    isRead: boolean;
};

export type ItemDetail = ItemSummary & {
    contentHtml: string;
    updatedAt: string | null;
};

export type ItemListResponse = {
    items: ItemSummary[];
    // Opaque: send it back as `cursor` for the next page; null means there are no more.
    nextCursor: string | null;
};

export type ItemResponse = {
    item: ItemDetail;
};

export type ItemCount = {
    items: number;
    unread: number;
};

export type ItemCountsResponse = {
    total: ItemCount;
    categories: (ItemCount & { categoryId: string | null })[];
    feeds: (ItemCount & { feedId: string; categoryId: string | null })[];
};
