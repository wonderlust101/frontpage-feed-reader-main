// Items: the articles of the feeds a reader follows, for the list pages, the sidebar counts and the reader view.
// Lists use keyset pagination ("the items after this one", not "skip 60"): for each followed feed, a LATERAL subquery reads
// at most limit+1 items in index order (items_feed_id_sort_at_idx), and the outer query keeps the best limit+1 of those. So no
// query sorts all of a reader's items, and page 50 costs the same as page 1. Every query starts from the reader's own
// subscriptions, so nothing they don't follow can appear; that is also why a non-empty page proves its feed or category is
// theirs, and only an empty page needs the ownership check. IS_READ is the one read rule, shared with KAN-25.

import { and, asc, count, desc, eq, isNull, not, sql, type SQL } from 'drizzle-orm';
import type { ItemCount, ItemCountsResponse, ItemDetail, ItemListResponse, ItemSummary } from '@frontpage/shared';
import type { Database } from '../../db';
import { feedIconUrl } from '../../lib/feed';
import { NotFoundError } from '../../middleware/errors';
import { categories } from '../categories/categories.schema';
import { assertOwnCategory } from '../categories/categories.service';
import { feeds } from '../feeds/feeds.schema';
import { deriveHealth } from '../subscriptions/subscriptions.health';
import { subscriptions } from '../subscriptions/subscriptions.schema';
import { encodeCursor } from './items.cursor';
import { itemReadStates, items } from './items.schema';
import type { ItemListQuery, ItemScope } from './items.types';

type PageRow = Awaited<ReturnType<typeof selectPage>>[number];
type SummaryRow = Omit<PageRow, 'cursorSortAt'>;

// An item is read for this reader if they marked it either way; otherwise if it was first seen before their read cutoff.
// A query using it needs `items`, the reader's `subscriptions` row for the item's feed, and `item_read_states` LEFT JOINed
// on (this item, this reader). Never call .mapWith() on it: that would change it for every query (.as() makes a copy).
export const IS_READ = sql<boolean>`coalesce(${itemReadStates.isRead}, ${subscriptions.readCutoff} is not null and ${items.firstSeenAt} < ${subscriptions.readCutoff})`;

// How each order sorts, and which side of the cursor the next page is on.
const KEYSET = {
    newest: { direction: desc, after: sql.raw('<') },
    oldest: { direction: asc, after: sql.raw('>') },
} as const;

// What a list row or the item says about its feed, through the reader's subscription (custom title, category).
const FEED_COLUMNS = {
    feedId: feeds.id,
    feedTitle: feeds.title,
    customTitle: subscriptions.customTitle,
    feedImageUrl: feeds.imageUrl,
    siteUrl: feeds.siteUrl,
    categoryId: subscriptions.categoryId,
    lastErrorCode: feeds.lastErrorCode,
    lastSuccessAt: feeds.lastSuccessAt,
    consecutiveFailures: feeds.consecutiveFailures,
    latestItemAt: feeds.latestItemAt,
    feedCreatedAt: feeds.createdAt,
};

// The item's own columns for a list row. Never content_html: lists don't need it, and leaving it out keeps Postgres from reading it.
const SUMMARY_COLUMNS = {
    id: items.id,
    title: items.title,
    url: items.url,
    author: items.author,
    summary: items.summary,
    imageUrl: items.imageUrl,
    publishedAt: items.publishedAt,
    sortAt: items.sortAt,
    hasFullContent: items.hasFullContent,
};

// One page of the reader's items in the query's scope, order and filters, and the cursor for the next page (null on the last).
// Throws `feed_not_found` or `category_not_found` (404) when the page is empty because the feed or category isn't the reader's.
export async function listItems(db: Database, userId: string, query: ItemListQuery, now = new Date()): Promise<ItemListResponse> {
    const rows = await selectPage(db, userId, query);
    if (rows.length === 0)
        await assertScopeBelongsToReader(db, userId, query.scope);

    // selectPage reads one row more than a page: if it came back, there is a next page, starting after the page's last item.
    const lastShown = rows.length > query.limit ? rows[query.limit - 1] : undefined;
    const nextCursor = lastShown ? encodeCursor({ order: query.order, sortAt: lastShown.cursorSortAt, id: lastShown.id }) : null;
    return { items: rows.slice(0, query.limit).map((row) => toItemSummary(row, now)), nextCursor };
}

// The reader's item and unread counts per feed, per category (every category, zeros included, in sidebar order, then
// Uncategorized when a feed has no category) and in total. Two queries, run together.
export async function countItems(db: Database, userId: string): Promise<ItemCountsResponse> {
    const [feedCounts, readerCategories] = await Promise.all([
        db
            .select({
                feedId: subscriptions.feedId,
                categoryId: subscriptions.categoryId,
                // count(items.id), not count(*): a feed with no items still has one row from the LEFT JOIN, with a null id.
                items: count(items.id),
                unread: sql<number>`count(${items.id}) filter (where not ${IS_READ})`.mapWith(Number),
            })
            .from(subscriptions)
            .leftJoin(items, eq(items.feedId, subscriptions.feedId))
            .leftJoin(itemReadStates, and(eq(itemReadStates.itemId, items.id), eq(itemReadStates.userId, userId)))
            .where(eq(subscriptions.userId, userId))
            .groupBy(subscriptions.id)
            .orderBy(subscriptions.feedId),
        db.select({ id: categories.id }).from(categories).where(eq(categories.userId, userId)).orderBy(categories.position, categories.id),
    ]);

    const total: ItemCount = { items: 0, unread: 0 };
    // A Map keeps insertion order: the categories first, then Uncategorized (null), added only when a feed has no category.
    const byCategory = new Map<string | null, ItemCount>(readerCategories.map((category) => [category.id, { items: 0, unread: 0 }]));
    for (const feed of feedCounts) {
        const sum = byCategory.get(feed.categoryId) ?? { items: 0, unread: 0 };
        byCategory.set(feed.categoryId, { items: sum.items + feed.items, unread: sum.unread + feed.unread });
        total.items += feed.items;
        total.unread += feed.unread;
    }

    return {
        total,
        categories: [...byCategory].map(([categoryId, sum]) => ({ categoryId, ...sum })),
        feeds: feedCounts,
    };
}

// One item with its full (already sanitized) content, for the reader view. Reading it doesn't mark it read.
// Throws `not_found` (404) unless the reader follows the item's feed, the same answer as for an id that doesn't exist.
export async function getItem(db: Database, userId: string, id: string, now = new Date()): Promise<ItemDetail> {
    const [row] = await db
        .select({ ...FEED_COLUMNS, ...SUMMARY_COLUMNS, isRead: IS_READ, contentHtml: items.contentHtml, updatedAt: items.updatedAt })
        .from(items)
        .innerJoin(subscriptions, and(eq(subscriptions.feedId, items.feedId), eq(subscriptions.userId, userId)))
        .innerJoin(feeds, eq(feeds.id, items.feedId))
        .leftJoin(itemReadStates, and(eq(itemReadStates.itemId, items.id), eq(itemReadStates.userId, userId)))
        .where(eq(items.id, id));
    if (!row)
        throw new NotFoundError('not_found', 'Item not found');

    return { ...toItemSummary(row, now), contentHtml: row.contentHtml, updatedAt: row.updatedAt?.toISOString() ?? null };
}

// The page query: for each subscription in scope (LATERAL), that feed's next limit+1 matching items in index order, then the
// best limit+1 of all of them. Each row carries its sort time as microsecond text for the cursor.
function selectPage(db: Database, userId: string, query: ItemListQuery) {
    const { direction, after } = KEYSET[query.order];
    const { cursor } = query;
    const pageSize = query.limit + 1;

    const feedItems = db
        .select({ ...SUMMARY_COLUMNS, isRead: IS_READ.as('is_read') })
        .from(items)
        .leftJoin(itemReadStates, and(eq(itemReadStates.itemId, items.id), eq(itemReadStates.userId, userId)))
        .where(
            and(
                eq(items.feedId, subscriptions.feedId),
                // Compares (sort time, id) as a pair, so items with the same time are split by id. The time stays text: a JS Date would round it.
                cursor ? sql`(${items.sortAt}, ${items.id}) ${after} (${cursor.sortAt}::timestamptz, ${cursor.id}::uuid)` : undefined,
                query.unreadOnly ? not(IS_READ) : undefined,
            ),
        )
        .orderBy(direction(items.sortAt), direction(items.id))
        .limit(pageSize)
        .as('feed_items');

    return db
        .select({
            ...FEED_COLUMNS,
            id: feedItems.id,
            title: feedItems.title,
            url: feedItems.url,
            author: feedItems.author,
            summary: feedItems.summary,
            imageUrl: feedItems.imageUrl,
            publishedAt: feedItems.publishedAt,
            sortAt: feedItems.sortAt,
            hasFullContent: feedItems.hasFullContent,
            isRead: feedItems.isRead,
            cursorSortAt: sql<string>`to_char(${feedItems.sortAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`,
        })
        .from(subscriptions)
        .innerJoin(feeds, eq(feeds.id, subscriptions.feedId))
        .crossJoinLateral(feedItems)
        .where(and(eq(subscriptions.userId, userId), scopeCondition(query.scope)))
        .orderBy(direction(feedItems.sortAt), direction(feedItems.id))
        .limit(pageSize);
}

// The filter on the reader's subscriptions for a scope: one feed, one category, Uncategorized (no category), or none for all.
function scopeCondition(scope: ItemScope): SQL | undefined {
    switch (scope.kind) {
        case 'all':
            return undefined;
        case 'feed':
            return eq(subscriptions.feedId, scope.feedId);
        case 'category':
            return scope.categoryId === null ? isNull(subscriptions.categoryId) : eq(subscriptions.categoryId, scope.categoryId);
    }
}

// Throws `feed_not_found` or `category_not_found` (404) unless the scope's feed is followed by the reader or its category is
// theirs. "All" and Uncategorized always belong to the reader. Only needed for an empty page (see the top of the file).
async function assertScopeBelongsToReader(db: Database, userId: string, scope: ItemScope): Promise<void> {
    if (scope.kind === 'category' && scope.categoryId !== null) {
        await assertOwnCategory(db, userId, scope.categoryId);
        return;
    }
    if (scope.kind !== 'feed')
        return;

    const [subscription] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.feedId, scope.feedId)));
    if (!subscription)
        throw new NotFoundError('feed_not_found', 'Feed not found');
}

// A list or item row as the API sends it: the feed under the reader's title for it, with its icon and health at `now`; ISO dates.
function toItemSummary(row: SummaryRow, now: Date): ItemSummary {
    return {
        id: row.id,
        feed: {
            id: row.feedId,
            title: row.customTitle ?? row.feedTitle,
            iconUrl: feedIconUrl(row.feedImageUrl, row.siteUrl),
            categoryId: row.categoryId,
            health: deriveHealth({ ...row, createdAt: row.feedCreatedAt }, now),
        },
        title: row.title,
        url: row.url,
        author: row.author,
        summary: row.summary,
        imageUrl: row.imageUrl,
        publishedAt: row.publishedAt?.toISOString() ?? null,
        sortAt: row.sortAt.toISOString(),
        hasFullContent: row.hasFullContent,
        isRead: row.isRead,
    };
}
