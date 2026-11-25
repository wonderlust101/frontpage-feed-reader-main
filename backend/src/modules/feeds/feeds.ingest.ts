// Stores fetched feeds: one `feeds` row per URL, one `items` row per (feed, guid). The fetch runs outside any
// transaction, so a slow feed never holds one open; only new or edited items (by content_hash) are written.

import { createHash } from 'node:crypto';
import { and, eq, exists, inArray, notExists, sql } from 'drizzle-orm';
import { alias, type AnyPgColumn } from 'drizzle-orm/pg-core';
import type { FeedCacheValidators, FeedErrorCode, FeedRedirect, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import type { Database, Transaction } from '../../db';
import { parseFeedUrl } from '../../lib/feed';
import { HttpError } from '../../errors';
import { bookmarks } from '../bookmarks/bookmarks.schema';
import { itemReadStates, items } from '../items/items.schema';
import { subscriptions } from '../subscriptions/subscriptions.schema';
import { feeds, starterFeeds } from './feeds.schema';
import { fetchUpstream, keepUnsentValidators, readFetchedFeed, unexpectedNotModified, type FreshResult, type NotModifiedResult } from './feeds.service';
import type { IngestOptions, IngestResult } from './feeds.types';

type StoredFeed = {
    id: string;
    etag: string | null;
    lastModified: string | null;
};

type FetchOutcome =
    | { kind: 'fresh'; result: FreshResult; feed: NormalizedFeed }
    | { kind: 'notModified'; result: NotModifiedResult; stored: StoredFeed };

type StorageTarget = {
    url: string;
    movedFrom: string | null;
    mergedFeedId: string | null;
};

type ItemRow = typeof items.$inferInsert;

type ItemCounts = {
    inserted: number;
    updated: number;
    unchanged: number;
};

const ERROR_MESSAGE_MAX = 500;

// Throws the feed error after recording it on the stored feed; other errors are rethrown with nothing written.
export async function ingestFeed(db: Database, url: string, options: IngestOptions = {}): Promise<IngestResult> {
    const now = options.now ?? new Date();
    const feedUrl = parseFeedUrl(url).href;
    const [storedRow] = await db
        .select({ id: feeds.id, etag: feeds.etag, lastModified: feeds.lastModified })
        .from(feeds)
        .where(eq(feeds.url, feedUrl));
    const stored = storedRow ?? null;

    const outcome = await fetchForIngest(db, feedUrl, stored, now);

    return db.transaction(async (tx) => {
        const target = await applyPermanentRedirect(tx, stored, feedUrl, outcome.result.redirect);

        if (outcome.kind === 'notModified') {
            const feedId = await recordNotModified(tx, target.url, outcome.result.validators, outcome.stored, now);

            return { feedId, ...target, notModified: true, inserted: 0, updated: 0, unchanged: 0, warnings: [] };
        }

        const feedId = await upsertFeed(tx, target.url, outcome.feed, outcome.result.validators, now);
        const counts = await writeItems(tx, feedId, outcome.feed.items, now);

        return { feedId, ...target, notModified: false, ...counts, warnings: outcome.feed.warnings };
    });
}

// Records a failed fetch on the stored feed before rethrowing. A 304 needs a stored copy for it to stand for.
async function fetchForIngest(db: Database, feedUrl: string, stored: StoredFeed | null, now: Date): Promise<FetchOutcome> {
    try {
        const sentValidators = { etag: stored?.etag ?? null, lastModified: stored?.lastModified ?? null };
        const result = await fetchUpstream(new URL(feedUrl), sentValidators);

        if (!result.notModified)
            return { kind: 'fresh', result, feed: readFetchedFeed(result, feedUrl) };

        if (!stored)
            throw unexpectedNotModified('to a request without validators');

        return { kind: 'notModified', result, stored };
    } catch (err) {
        if (stored && err instanceof HttpError)
            await recordFailure(db, stored.id, err, now);

        throw err;
    }
}

// Records a failed fetch on a stored feed in one atomic update, so concurrent failures can't lose a count.
async function recordFailure(db: Database, feedId: string, err: HttpError, now: Date) {
    await db
        .update(feeds)
        .set({
            lastFetchedAt: now,
            // Every error fetchFeed, decodeFeed and normalizeFeed throw carries a feed error code.
            lastErrorCode: err.code as FeedErrorCode,
            lastErrorMessage: err.message.slice(0, ERROR_MESSAGE_MAX),
            lastErrorStatus: err.upstreamStatus ?? null,
            consecutiveFailures: sql`${feeds.consecutiveFailures} + 1`,
        })
        .where(eq(feeds.id, feedId));
}

// Returns the URL to store the result under. Temporary redirects change nothing.
async function applyPermanentRedirect(tx: Transaction, stored: StoredFeed | null, feedUrl: string, redirect: FeedRedirect | null): Promise<StorageTarget> {
    if (!redirect?.permanent)
        return { url: feedUrl, movedFrom: null, mergedFeedId: null };

    // A new feed is simply stored under the new URL; upsertFeed reuses the row if one is already there.
    if (!stored)
        return { url: redirect.to, movedFrom: null, mergedFeedId: null };

    const [existing] = await tx.select({ id: feeds.id }).from(feeds).where(eq(feeds.url, redirect.to));

    if (existing) {
        await mergeFeeds(tx, stored.id, existing.id);

        return { url: redirect.to, movedFrom: feedUrl, mergedFeedId: stored.id };
    }

    await tx.update(feeds).set({ url: redirect.to }).where(eq(feeds.id, stored.id));

    return { url: redirect.to, movedFrom: feedUrl, mergedFeedId: null };
}

// Where both feeds hold the same thing (an item guid, a subscription, a bookmark or read state), `intoId`'s copy wins.
async function mergeFeeds(tx: Transaction, fromId: string, intoId: string) {
    // Lock both rows in a fixed order so two merges of the same pair can't deadlock.
    await tx
        .select({ id: feeds.id })
        .from(feeds)
        .where(inArray(feeds.id, [fromId, intoId]))
        .orderBy(feeds.id)
        .for('update');

    // Each item of the old feed whose guid the kept feed also has, paired with the kept feed's copy.
    const duplicateItem = alias(items, 'duplicate_item');
    const keptItem = alias(items, 'kept_item');
    const duplicates = tx
        .select({ fromItemId: sql<string>`${duplicateItem.id}`.as('from_item_id'), intoItemId: sql<string>`${keptItem.id}`.as('into_item_id') })
        .from(duplicateItem)
        .innerJoin(keptItem, and(eq(keptItem.feedId, intoId), eq(keptItem.guid, duplicateItem.guid)))
        .where(eq(duplicateItem.feedId, fromId))
        .as('duplicates');
    const duplicateItemIds = tx.select({ id: duplicates.fromItemId }).from(duplicates);

    await tx
        .insert(bookmarks)
        .select(
            tx
                .select({ userId: bookmarks.userId, itemId: duplicates.intoItemId, createdAt: bookmarks.createdAt })
                .from(bookmarks)
                .innerJoin(duplicates, eq(duplicates.fromItemId, bookmarks.itemId)),
        )
        .onConflictDoNothing();
    await tx
        .insert(itemReadStates)
        .select(
            tx
                .select({ userId: itemReadStates.userId, itemId: duplicates.intoItemId, isRead: itemReadStates.isRead })
                .from(itemReadStates)
                .innerJoin(duplicates, eq(duplicates.fromItemId, itemReadStates.itemId)),
        )
        .onConflictDoNothing();

    // Bookmarks block deleting their item (RESTRICT), so the duplicates' bookmarks go first; read states cascade.
    await tx.delete(bookmarks).where(inArray(bookmarks.itemId, duplicateItemIds));
    await tx.delete(items).where(inArray(items.id, duplicateItemIds));
    await tx.update(items).set({ feedId: intoId }).where(eq(items.feedId, fromId));

    const keptSubscription = alias(subscriptions, 'kept_subscription');
    const alsoFollowsKeptFeed = tx
        .select({ id: keptSubscription.id })
        .from(keptSubscription)
        .where(and(eq(keptSubscription.feedId, intoId), eq(keptSubscription.userId, subscriptions.userId)));

    await tx.delete(subscriptions).where(and(eq(subscriptions.feedId, fromId), exists(alsoFollowsKeptFeed)));
    await tx.update(subscriptions).set({ feedId: intoId }).where(eq(subscriptions.feedId, fromId));

    const keptStarter = alias(starterFeeds, 'kept_starter');
    const keptFeedIsStarter = tx.select({ feedId: keptStarter.feedId }).from(keptStarter).where(eq(keptStarter.feedId, intoId));

    await tx
        .update(starterFeeds)
        .set({ feedId: intoId })
        .where(and(eq(starterFeeds.feedId, fromId), notExists(keptFeedIsStarter)));
    await tx.delete(feeds).where(eq(feeds.id, fromId));
}

// Records a 304 on the feed stored at `url` as a success. Returns the feed id.
async function recordNotModified(tx: Transaction, url: string, validators: FeedCacheValidators, stored: StoredFeed, now: Date): Promise<string> {
    const [row] = await tx
        .update(feeds)
        .set({ ...successColumns(now), ...keepUnsentValidators(validators, stored) })
        .where(eq(feeds.url, url))
        .returning({ id: feeds.id });

    // A concurrent ingest can rename or merge the row away between the fetch and this transaction.
    if (!row)
        throw new Error(`The feed at ${url} changed while it was being ingested`);

    return row.id;
}

function successColumns(now: Date) {
    return {
        lastFetchedAt: now,
        lastSuccessAt: now,
        consecutiveFailures: 0,
        lastErrorCode: null,
        lastErrorMessage: null,
        lastErrorStatus: null,
    };
}

// Inserts the feed at `url`, or refreshes its metadata, validators and bookkeeping if it exists (race-safe). Returns its id.
async function upsertFeed(tx: Transaction, url: string, feed: NormalizedFeed, validators: FeedCacheValidators, now: Date): Promise<string> {
    const columns = {
        title: feed.title,
        description: feed.description,
        siteUrl: feed.siteUrl,
        imageUrl: feed.imageUrl,
        format: feed.format,
        language: feed.language,
        etag: validators.etag,
        lastModified: validators.lastModified,
        ...successColumns(now),
    };

    const [row] = await tx
        .insert(feeds)
        .values({ url, ...columns })
        .onConflictDoUpdate({ target: feeds.url, set: { ...columns, updatedAt: now } })
        .returning({ id: feeds.id });

    if (!row)
        throw new Error(`Storing the feed at ${url} returned no row`);

    return row.id;
}

// Skips items whose stored hash already matches; items missing from the fetch are kept.
async function writeItems(tx: Transaction, feedId: string, fetched: NormalizedItem[], now: Date): Promise<ItemCounts> {
    if (fetched.length === 0)
        return { inserted: 0, updated: 0, unchanged: 0 };

    const fetchedGuids = fetched.map((item) => item.id);
    const stored = await tx
        .select({ guid: items.guid, contentHash: items.contentHash })
        .from(items)
        .where(and(eq(items.feedId, feedId), inArray(items.guid, fetchedGuids)));
    const storedHashes = new Map(stored.map((row) => [row.guid, row.contentHash]));

    const rows: ItemRow[] = [];
    let inserted = 0;

    for (const item of fetched) {
        const contentHash = itemHash(item);
        const storedHash = storedHashes.get(item.id);

        if (storedHash === contentHash)
            continue;

        if (storedHash === undefined)
            inserted++;

        rows.push(toItemRow(feedId, item, contentHash, now));
    }

    if (rows.length > 0) {
        // first_seen_at is left out of the update, so an edited article keeps the date it first appeared.
        await tx
            .insert(items)
            .values(rows)
            .onConflictDoUpdate({
                target: [items.feedId, items.guid],
                set: {
                    url: excluded(items.url),
                    title: excluded(items.title),
                    author: excluded(items.author),
                    summary: excluded(items.summary),
                    contentHtml: excluded(items.contentHtml),
                    hasFullContent: excluded(items.hasFullContent),
                    imageUrl: excluded(items.imageUrl),
                    publishedAt: excluded(items.publishedAt),
                    updatedAt: excluded(items.updatedAt),
                    contentHash: excluded(items.contentHash),
                },
                setWhere: sql`${items.contentHash} is distinct from ${excluded(items.contentHash)}`,
            });
        await tx
            .update(feeds)
            .set({ latestItemAt: sql`(select max(${items.sortAt}) from ${items} where ${items.feedId} = ${feedId})` })
            .where(eq(feeds.id, feedId));
    }

    return { inserted, updated: rows.length - inserted, unchanged: fetched.length - rows.length };
}

function toItemRow(feedId: string, item: NormalizedItem, contentHash: string, now: Date): ItemRow {
    return {
        feedId,
        guid: item.id,
        url: item.url,
        title: item.title,
        author: item.author,
        summary: item.summary,
        contentHtml: item.contentHtml,
        hasFullContent: item.hasFullContent,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : null,
        firstSeenAt: now,
        contentHash,
    };
}

// The value an upsert tried to insert for `column`, typed so a column rename can't silently break the SQL.
function excluded(column: AnyPgColumn) {
    return sql`excluded.${sql.identifier(column.name)}`;
}

// A SHA-256 of every stored field of an item: equal hashes mean the stored row is already up to date.
function itemHash(item: NormalizedItem): string {
    const fields = [item.title, item.url, item.author, item.summary, item.contentHtml, item.hasFullContent, item.imageUrl, item.publishedAt, item.updatedAt];

    return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
