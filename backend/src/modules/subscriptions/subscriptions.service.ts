// Subscribing reuses a stored feed whose last fetch succeeded in the last 15 minutes, else runs ingestFeed. Every
// query is scoped by the reader's id, and the (user, feed) unique key turns racing duplicates into 409 `already_subscribed`.

import { and, eq, inArray, sql } from 'drizzle-orm';
import type { SubscribeRequest, Subscription, UpdateSubscriptionRequest } from '@frontpage/shared';
import type { Database } from '../../db';
import { env } from '../../env';
import { feedIconUrl, parseFeedUrl } from '../../lib/feed';
import { ConflictError, NotFoundError } from '../../errors';
import { assertOwnCategory } from '../categories/categories.service';
import { ingestFeed } from '../feeds/feeds.ingest';
import { feeds } from '../feeds/feeds.schema';
import { itemReadStates, items } from '../items/items.schema';
import { deriveRowHealth, FEED_HEALTH_COLUMNS } from './subscriptions.health';
import { subscriptions } from './subscriptions.schema';

type SubscriptionRow = Awaited<ReturnType<typeof selectSubscriptions>>[number];

const FRESH_FETCH_MS = env.FEED_MIN_REFETCH_MINUTES * 60 * 1000;

const SUBSCRIPTION_COLUMNS = {
    id: subscriptions.id,
    feedId: subscriptions.feedId,
    customTitle: subscriptions.customTitle,
    categoryId: subscriptions.categoryId,
    createdAt: subscriptions.createdAt,
    url: feeds.url,
    feedTitle: feeds.title,
    description: feeds.description,
    siteUrl: feeds.siteUrl,
    imageUrl: feeds.imageUrl,
    lastFetchedAt: feeds.lastFetchedAt,
    lastErrorMessage: feeds.lastErrorMessage,
    ...FEED_HEALTH_COLUMNS,
};

const DISPLAY_TITLE_ORDER = sql`lower(coalesce(${subscriptions.customTitle}, ${feeds.title}))`;

// Every subscription of the reader with its feed's health at `now`, sorted by the title they see (ignoring case). One query.
export async function listSubscriptions(db: Database, userId: string, now = new Date()): Promise<Subscription[]> {
    const rows = await selectSubscriptions(db).where(eq(subscriptions.userId, userId)).orderBy(DISPLAY_TITLE_ORDER, subscriptions.id);

    return rows.map((row) => toSubscription(row, now));
}

// Throws the feed's error (e.g. `invalid_url`, `not_a_feed`), `category_not_found` (404) or `already_subscribed` (409).
export async function subscribe(db: Database, userId: string, input: SubscribeRequest, now = new Date()): Promise<Subscription> {
    const url = parseFeedUrl(input.url).href;
    const categoryId = input.categoryId ?? null;

    if (categoryId)
        await assertOwnCategory(db, userId, categoryId);

    // A feed the reader already follows is refused before anything is fetched.
    const [stored] = await db
        .select({ id: feeds.id, lastErrorCode: feeds.lastErrorCode, lastSuccessAt: feeds.lastSuccessAt })
        .from(feeds)
        .where(eq(feeds.url, url));
    const existingId = stored ? await findSubscriptionId(db, userId, stored.id) : undefined;

    if (existingId)
        throw alreadySubscribedError(existingId);

    const feedId = stored && isRecentlySuccessful(stored, now) ? stored.id : (await ingestFeed(db, url, { now })).feedId;

    const [created] = await db
        .insert(subscriptions)
        .values({ userId, feedId, categoryId })
        .onConflictDoNothing({ target: [subscriptions.userId, subscriptions.feedId] })
        .returning({ id: subscriptions.id });

    if (!created)
        throw alreadySubscribedError(await findSubscriptionId(db, userId, feedId));

    return findSubscription(db, userId, created.id, now);
}

// Fields missing from `changes` stay as they are. Throws `category_not_found` or `not_found` (404) for anything not theirs.
export async function updateSubscription(
    db: Database,
    userId: string,
    id: string,
    changes: UpdateSubscriptionRequest,
    now = new Date(),
): Promise<Subscription> {
    if (changes.categoryId)
        await assertOwnCategory(db, userId, changes.categoryId);

    const [updated] = await db
        .update(subscriptions)
        .set(changes)
        .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
        .returning({ id: subscriptions.id });

    if (!updated)
        throw subscriptionNotFound();

    return findSubscription(db, userId, updated.id, now);
}

// Also deletes their read marks on that feed, in one transaction; bookmarks, the feed and its items stay.
export async function unsubscribe(db: Database, userId: string, id: string): Promise<void> {
    await db.transaction(async (tx) => {
        const [deleted] = await tx
            .delete(subscriptions)
            .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
            .returning({ feedId: subscriptions.feedId });

        if (!deleted)
            throw subscriptionNotFound();

        const feedItemIds = tx.select({ id: items.id }).from(items).where(eq(items.feedId, deleted.feedId));

        await tx.delete(itemReadStates).where(and(eq(itemReadStates.userId, userId), inArray(itemReadStates.itemId, feedItemIds)));
    });
}

// Subscriptions joined to their feeds, before filtering: callers add `where` (and `orderBy`).
function selectSubscriptions(db: Database) {
    return db.select(SUBSCRIPTION_COLUMNS).from(subscriptions).innerJoin(feeds, eq(feeds.id, subscriptions.feedId));
}

// A subscription row as the API sends it: ISO dates, the title to show, an icon and the feed's health at `now`.
function toSubscription(row: SubscriptionRow, now: Date): Subscription {
    return {
        id: row.id,
        feedId: row.feedId,
        url: row.url,
        title: row.customTitle ?? row.feedTitle,
        customTitle: row.customTitle,
        feedTitle: row.feedTitle,
        description: row.description,
        siteUrl: row.siteUrl,
        iconUrl: feedIconUrl(row.imageUrl, row.siteUrl),
        categoryId: row.categoryId,
        health: deriveRowHealth(row, now),
        lastSuccessAt: row.lastSuccessAt?.toISOString() ?? null,
        lastFetchedAt: row.lastFetchedAt?.toISOString() ?? null,
        lastError: row.lastErrorCode ? { code: row.lastErrorCode, message: row.lastErrorMessage ?? '' } : null,
        createdAt: row.createdAt.toISOString(),
    };
}

// A stored feed whose last fetch succeeded within FRESH_FETCH_MS is reused instead of fetched again.
function isRecentlySuccessful(feed: { lastErrorCode: string | null; lastSuccessAt: Date | null }, now: Date): boolean {
    if (feed.lastErrorCode || !feed.lastSuccessAt)
        return false;

    return now.getTime() - feed.lastSuccessAt.getTime() < FRESH_FETCH_MS;
}

// One of the reader's subscriptions, read like the list; throws `not_found` (404) if it isn't theirs (or was just deleted).
async function findSubscription(db: Database, userId: string, id: string, now: Date): Promise<Subscription> {
    const [row] = await selectSubscriptions(db).where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));

    if (!row)
        throw subscriptionNotFound();

    return toSubscription(row, now);
}

// Throws `feed_not_found` (404) unless the reader follows the feed, the same answer as for one that doesn't exist.
export async function assertFollowsFeed(db: Database, userId: string, feedId: string): Promise<void> {
    const subscriptionId = await findSubscriptionId(db, userId, feedId);

    if (!subscriptionId)
        throw new NotFoundError('feed_not_found', 'Feed not found');
}

async function findSubscriptionId(db: Database, userId: string, feedId: string): Promise<string | undefined> {
    const [row] = await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, userId), eq(subscriptions.feedId, feedId)));

    return row?.id;
}

function subscriptionNotFound() {
    return new NotFoundError('not_found', 'Subscription not found');
}

// Points at the reader's existing subscription when we know it.
function alreadySubscribedError(subscriptionId: string | undefined) {
    return new ConflictError('already_subscribed', 'You already follow this feed', { subscriptionId });
}
