// Stores fetched feeds: one `feeds` row per URL, one `items` row per (feed, guid). Callers: the scheduler, subscribe and retry.
// The fetch runs outside any transaction, so a slow feed never holds one open. Items are compared with their stored
// content_hash first and only new or edited ones are written, so an unchanged feed sends no item rows to the database.
// A 304 counts as a success. Feed errors are recorded on feeds we already store; an unknown URL that fails stores nothing.

import { createHash } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { FeedCacheValidators, FeedErrorCode, FeedRedirect, NormalizedFeed, NormalizedItem } from '@frontpage/shared';
import type { Database } from '../../db';
import { decodeFeed, normalizeFeed, parseFeedUrl, type FetchFeedResult } from '../../lib/feed';
import { BadGatewayError, HttpError } from '../../middleware/errors';
import { bookmarks } from '../bookmarks/bookmarks.schema';
import { itemReadStates, items } from '../items/items.schema';
import { subscriptions } from '../subscriptions/subscriptions.schema';
import { feeds, starterFeeds } from './feeds.schema';
import { fetchUpstream } from './feeds.service';
import type { IngestOptions, IngestResult } from './feeds.types';

type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

type StoredFeed = {
    id: string;
    etag: string | null;
    lastModified: string | null;
};

type Target = {
    url: string;
    movedFrom: string | null;
    mergedFeedId: string | null;
};

type ItemCounts = {
    inserted: number;
    updated: number;
    unchanged: number;
};

const ERROR_MESSAGE_MAX = 500;

// Fetches one feed and stores it: feed metadata, new and edited items, and how the fetch went. Returns what changed.
// Throws the feed error (e.g. `http_4xx`, `timeout`, `not_a_feed`) after recording it on the stored feed; other errors are rethrown with nothing written.
export async function ingestFeed(db: Database, url: string, opts: IngestOptions = {}): Promise<IngestResult> {
    const now = opts.now ?? new Date();
    const key = parseFeedUrl(url).href;
    const [stored] = await db.select({ id: feeds.id, etag: feeds.etag, lastModified: feeds.lastModified }).from(feeds).where(eq(feeds.url, key));

    let result: FetchFeedResult;
    let feed: NormalizedFeed | null = null;
    try {
        result = await fetchUpstream(new URL(key), { etag: stored?.etag ?? null, lastModified: stored?.lastModified ?? null });
        if (!result.notModified) {
            feed = normalizeFeed(decodeFeed(result.bytes, result.contentType), { url: result.finalUrl, requestedUrl: key });
        } else if (!stored) {
            throw new BadGatewayError('http_5xx', 'The feed server answered 304 to a request without validators', { upstreamStatus: 304 });
        }
    } catch (err) {
        if (stored && err instanceof HttpError)
            await recordFailure(db, stored.id, err, now);

        throw err;
    }

    return db.transaction(async (tx) => {
        const target = await resolveTarget(tx, stored ?? null, key, result.redirect);

        if (!feed) {
            const feedId = await recordNotModified(tx, target.url, result.validators, stored!, now);
            return { feedId, ...target, notModified: true, inserted: 0, updated: 0, unchanged: 0, warnings: [] };
        }

        const feedId = await upsertFeed(tx, target.url, feed, result.validators, now);
        const counts = await writeItems(tx, feedId, feed.items, now);
        return { feedId, ...target, notModified: false, ...counts, warnings: feed.warnings };
    });
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

// Applies a permanent redirect: renames the stored feed to the new URL, or merges it into the feed already stored there.
// Returns the URL to store the result under. Temporary redirects change nothing.
async function resolveTarget(tx: Transaction, stored: StoredFeed | null, key: string, redirect: FeedRedirect | null): Promise<Target> {
    if (!redirect?.permanent)
        return { url: key, movedFrom: null, mergedFeedId: null };

    // A new feed is simply stored under the new URL; upsertFeed reuses the row if one is already there.
    if (!stored)
        return { url: redirect.to, movedFrom: null, mergedFeedId: null };

    const [existing] = await tx.select({ id: feeds.id }).from(feeds).where(eq(feeds.url, redirect.to));
    if (existing) {
        await mergeFeeds(tx, stored.id, existing.id);
        return { url: redirect.to, movedFrom: key, mergedFeedId: stored.id };
    }

    await tx.update(feeds).set({ url: redirect.to }).where(eq(feeds.id, stored.id));
    return { url: redirect.to, movedFrom: key, mergedFeedId: null };
}

// Moves everything that points at feed `fromId` onto feed `intoId`, then deletes `fromId`. Where both hold the same thing
// (an item guid, a user's subscription, a bookmark or read state), the copy on `intoId` wins.
async function mergeFeeds(tx: Transaction, fromId: string, intoId: string) {
    // Lock both rows in a fixed order so two merges of the same pair can't deadlock.
    await tx.execute(sql`select id from ${feeds} where id in (${fromId}, ${intoId}) order by id for update`);

    const duplicateItems = sql`
        select dup.id as from_item, keep.id as into_item
        from ${items} dup join ${items} keep on keep.feed_id = ${intoId} and keep.guid = dup.guid
        where dup.feed_id = ${fromId}`;
    await tx.execute(sql`
        insert into ${bookmarks} (user_id, item_id, created_at)
        select b.user_id, d.into_item, b.created_at from ${bookmarks} b join (${duplicateItems}) d on d.from_item = b.item_id
        on conflict do nothing`);
    await tx.execute(sql`
        insert into ${itemReadStates} (user_id, item_id, is_read)
        select r.user_id, d.into_item, r.is_read from ${itemReadStates} r join (${duplicateItems}) d on d.from_item = r.item_id
        on conflict do nothing`);
    await tx.execute(sql`delete from ${bookmarks} where item_id in (select from_item from (${duplicateItems}) d)`);
    await tx.execute(sql`delete from ${items} where id in (select from_item from (${duplicateItems}) d)`);
    await tx.update(items).set({ feedId: intoId }).where(eq(items.feedId, fromId));

    await tx.execute(sql`
        delete from ${subscriptions} s where s.feed_id = ${fromId}
        and exists (select 1 from ${subscriptions} t where t.feed_id = ${intoId} and t.user_id = s.user_id)`);
    await tx.update(subscriptions).set({ feedId: intoId }).where(eq(subscriptions.feedId, fromId));

    await tx.execute(sql`
        update ${starterFeeds} set feed_id = ${intoId}
        where feed_id = ${fromId} and not exists (select 1 from ${starterFeeds} where feed_id = ${intoId})`);
    await tx.delete(feeds).where(eq(feeds.id, fromId));
}

// Records a 304 on the feed stored at `url` as a success, keeping each stored validator the server didn't resend. Returns the feed id.
async function recordNotModified(tx: Transaction, url: string, validators: FeedCacheValidators, stored: StoredFeed, now: Date): Promise<string> {
    const [row] = await tx
        .update(feeds)
        .set({
            ...successColumns(now),
            etag: validators.etag ?? stored.etag,
            lastModified: validators.lastModified ?? stored.lastModified,
        })
        .where(eq(feeds.url, url))
        .returning({ id: feeds.id });
    return row!.id;
}

// The bookkeeping columns every successful fetch sets: fetched and succeeded now, failure count and last error cleared.
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
    return row!.id;
}

// Writes the new and edited items of one fetch in a single statement, skipping those whose stored hash already matches,
// then refreshes the feed's latest_item_at. Items missing from the fetch are kept. Returns how many were inserted, updated or unchanged.
async function writeItems(tx: Transaction, feedId: string, fetched: NormalizedItem[], now: Date): Promise<ItemCounts> {
    if (fetched.length === 0)
        return { inserted: 0, updated: 0, unchanged: 0 };

    const stored = await tx
        .select({ guid: items.guid, contentHash: items.contentHash })
        .from(items)
        .where(
            and(
                eq(items.feedId, feedId),
                inArray(
                    items.guid,
                    fetched.map((item) => item.id),
                ),
            ),
        );
    const storedHashes = new Map(stored.map((row) => [row.guid, row.contentHash]));

    const rows: (typeof items.$inferInsert)[] = [];
    let inserted = 0;
    for (const item of fetched) {
        const contentHash = itemHash(item);
        const storedHash = storedHashes.get(item.id);
        if (storedHash === contentHash)
            continue;

        if (storedHash === undefined)
            inserted++;

        rows.push({
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
        });
    }

    if (rows.length > 0) {
        // first_seen_at is left out of the update, so an edited article keeps the date it first appeared.
        await tx
            .insert(items)
            .values(rows)
            .onConflictDoUpdate({
                target: [items.feedId, items.guid],
                set: {
                    url: sql`excluded.url`,
                    title: sql`excluded.title`,
                    author: sql`excluded.author`,
                    summary: sql`excluded.summary`,
                    contentHtml: sql`excluded.content_html`,
                    hasFullContent: sql`excluded.has_full_content`,
                    imageUrl: sql`excluded.image_url`,
                    publishedAt: sql`excluded.published_at`,
                    updatedAt: sql`excluded.updated_at`,
                    contentHash: sql`excluded.content_hash`,
                },
                setWhere: sql`${items.contentHash} is distinct from excluded.content_hash`,
            });
        await tx
            .update(feeds)
            .set({ latestItemAt: sql`(select max(sort_at) from ${items} where feed_id = ${feedId})` })
            .where(eq(feeds.id, feedId));
    }

    return { inserted, updated: rows.length - inserted, unchanged: fetched.length - rows.length };
}

// A SHA-256 of every stored field of an item: equal hashes mean the stored row is already up to date.
function itemHash(item: NormalizedItem): string {
    const fields = [item.title, item.url, item.author, item.summary, item.contentHtml, item.hasFullContent, item.imageUrl, item.publishedAt, item.updatedAt];
    return createHash('sha256').update(JSON.stringify(fields)).digest('hex');
}
