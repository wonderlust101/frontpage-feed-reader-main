// Changes to a reader's read state. Each request is one transaction and answers with fresh counts for the feeds it
// touched. A mark is stored only when it differs from the item's state by cutoff, so item_read_states holds exceptions only.
// Every write first locks the reader's subscriptions it touches (FOR UPDATE, in feed order): writes to a feed take turns
// and can't deadlock.

import { and, eq, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import {
    MAX_UNDO_ENTRIES,
    type ChangedCounts,
    type MarkAllReadResponse,
    type MarkItemsReadRequest,
    type MarkItemsReadResponse,
    type ReadUndo,
    type UndoMarkAllReadResponse,
} from '@frontpage/shared';
import type { Database, Transaction } from '../../db';
import { subscriptions } from '../subscriptions/subscriptions.schema';
import { itemReadStates, items } from './items.schema';
import { assertScopeBelongsToReader, databaseNow, microsecondUtcText, READ_BY_CUTOFF, scopeCondition, selectFeedCounts } from './items.service';
import type { MarkAllReadCommand } from './items.types';

type FollowedItem = Awaited<ReturnType<typeof selectFollowedItems>>[number];

type MarkToWrite = {
    itemId: string;
    readByCutoff: boolean;
    isRead: boolean;
};

// Ids outside the reader's feeds (another reader's, unfollowed, pruned) are skipped and left out of `updated`.
export async function setItemsRead(db: Database, userId: string, { itemIds, isRead }: MarkItemsReadRequest): Promise<MarkItemsReadResponse> {
    const followed = await db.transaction(async (tx) => {
        const rows = await selectFollowedItems(tx, userId, itemIds);

        await writeMarks(
            tx,
            userId,
            rows.map((item) => ({ ...item, isRead })),
        );

        return rows;
    });

    const followedIds = new Set(followed.map((item) => item.itemId));

    return { updated: itemIds.filter((id) => followedIds.has(id)), counts: await countFeeds(db, userId, feedIdsOf(followed)) };
}

// Moves each scoped cutoff up to `asOf` (never back) and drops the marks it covers, "keep unread" ones included.
// `asOf` is capped at Postgres's now. Throws `feed_not_found` / `category_not_found` (404) for a scope that isn't the reader's.
export async function markAllRead(db: Database, userId: string, command: MarkAllReadCommand): Promise<MarkAllReadResponse> {
    const { scope } = command;

    const { asOf, scopedFeedIds, undo } = await db.transaction(async (tx) => {
        const now = await databaseNow(tx);
        const asOf = command.asOf && command.asOf < now ? command.asOf : now;

        // Locked first (see the top of the file), so a second "mark all" can't slip a change past this snapshot.
        const scoped = await tx
            .select({ id: subscriptions.id, feedId: subscriptions.feedId, readCutoff: sql<string | null>`${microsecondUtcText(subscriptions.readCutoff)}` })
            .from(subscriptions)
            .where(and(eq(subscriptions.userId, userId), scopeCondition(scope)))
            .orderBy(subscriptions.feedId)
            .for('update');

        if (scoped.length === 0) {
            await assertScopeBelongsToReader(tx, userId, scope);

            return { asOf, scopedFeedIds: [], undo: { asOf: asOf.toISOString(), cutoffs: [], marks: [] } };
        }

        const scopedFeedIds = scoped.map((subscription) => subscription.feedId);

        const moved = await tx
            .update(subscriptions)
            .set({ readCutoff: asOf })
            .where(
                and(
                    inArray(
                        subscriptions.id,
                        scoped.map((subscription) => subscription.id),
                    ),
                    or(isNull(subscriptions.readCutoff), lt(subscriptions.readCutoff, asOf)),
                ),
            )
            .returning({ feedId: subscriptions.feedId });

        const coveredItemIds = itemsFirstSeenBefore(tx, scopedFeedIds, asOf);
        const deletedMarks = await tx
            .delete(itemReadStates)
            .where(and(eq(itemReadStates.userId, userId), inArray(itemReadStates.itemId, coveredItemIds)))
            .returning({ itemId: itemReadStates.itemId, isRead: itemReadStates.isRead });

        const movedFeedIds = new Set(moved.map((subscription) => subscription.feedId));
        const previousCutoffs = scoped
            .filter((subscription) => movedFeedIds.has(subscription.feedId))
            .map(({ feedId, readCutoff }) => ({ feedId, readCutoff }));
        const tooLargeToUndo = previousCutoffs.length > MAX_UNDO_ENTRIES || deletedMarks.length > MAX_UNDO_ENTRIES;

        return { asOf, scopedFeedIds, undo: tooLargeToUndo ? null : { asOf: asOf.toISOString(), cutoffs: previousCutoffs, marks: deletedMarks } };
    });

    return { asOf: asOf.toISOString(), undo, counts: await countFeeds(db, userId, scopedFeedIds) };
}

// Puts back exactly what a "mark all as read" changed, overwriting later changes to the same feeds and items.
// Feeds and items outside the reader's subscriptions are skipped, so an undo can only touch the reader's own state.
export async function undoMarkAllRead(db: Database, userId: string, undo: ReadUndo): Promise<UndoMarkAllReadResponse> {
    const restoredFeedIds = undo.cutoffs.map((cutoff) => cutoff.feedId);

    const followed = await db.transaction(async (tx) => {
        await lockFeedsOfUndo(tx, userId, undo);

        // Cutoffs first: whether a restored mark is still needed depends on the cutoff it's restored under.
        if (restoredFeedIds.length > 0) {
            await restoreCutoffs(tx, userId, undo.cutoffs);

            // Marks made since on items the mark-all covered would otherwise outlive the cutoff they were made against.
            const coveredItemIds = itemsFirstSeenBefore(tx, restoredFeedIds, new Date(undo.asOf));

            await tx.delete(itemReadStates).where(and(eq(itemReadStates.userId, userId), inArray(itemReadStates.itemId, coveredItemIds)));
        }

        if (undo.marks.length === 0)
            return [];

        const restoredStates = new Map(undo.marks.map((mark) => [mark.itemId, mark.isRead]));
        const rows = await selectFollowedItems(
            tx,
            userId,
            undo.marks.map((mark) => mark.itemId),
        );

        await writeMarks(
            tx,
            userId,
            rows.map((item) => ({ ...item, isRead: restoredStates.get(item.itemId) ?? item.readByCutoff })),
        );

        return rows;
    });

    return { counts: await countFeeds(db, userId, [...restoredFeedIds, ...feedIdsOf(followed)]) };
}

// The restored feeds and the feeds of the restored marks, locked in one go so they're taken in feed order.
async function lockFeedsOfUndo(tx: Transaction, userId: string, undo: ReadUndo): Promise<void> {
    const markedFeedIds = tx
        .select({ feedId: items.feedId })
        .from(items)
        .where(
            inArray(
                items.id,
                undo.marks.map((mark) => mark.itemId),
            ),
        );

    await tx
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(
            and(
                eq(subscriptions.userId, userId),
                or(
                    inArray(
                        subscriptions.feedId,
                        undo.cutoffs.map((cutoff) => cutoff.feedId),
                    ),
                    inArray(subscriptions.feedId, markedFeedIds),
                ),
            ),
        )
        .orderBy(subscriptions.feedId)
        .for('update');
}

// One statement for any number of feeds: unnest pairs the two lists up row by row. Only the reader's own rows match.
async function restoreCutoffs(tx: Transaction, userId: string, cutoffs: ReadUndo['cutoffs']): Promise<void> {
    const feedIds = cutoffs.map((cutoff) => cutoff.feedId);
    const readCutoffs = cutoffs.map((cutoff) => cutoff.readCutoff);

    await tx.execute(sql`
        update ${subscriptions}
        set read_cutoff = restored.read_cutoff, updated_at = now()
        from unnest(${sql.param(feedIds)}::uuid[], ${sql.param(readCutoffs)}::timestamptz[]) as restored(feed_id, read_cutoff)
        where ${subscriptions.userId} = ${userId} and ${subscriptions.feedId} = restored.feed_id
    `);
}

// A subquery, run as part of the statement that uses it: the items a mark-all at `asOf` covers in these feeds.
function itemsFirstSeenBefore(tx: Transaction, feedIds: string[], asOf: Date) {
    return tx
        .select({ id: items.id })
        .from(items)
        .where(and(inArray(items.feedId, feedIds), lt(items.firstSeenAt, asOf)));
}

// The given items that are in a feed the reader follows, with the state each has without a mark.
function selectFollowedItems(tx: Transaction, userId: string, itemIds: string[]) {
    return (
        tx
            .select({ itemId: items.id, feedId: items.feedId, readByCutoff: READ_BY_CUTOFF })
            .from(items)
            .innerJoin(subscriptions, and(eq(subscriptions.feedId, items.feedId), eq(subscriptions.userId, userId)))
            .where(inArray(items.id, itemIds))
            .orderBy(subscriptions.feedId)
            // The lock from the top of the file: waits out any other write to these feeds, so the cutoff read here is current.
            .for('update', { of: subscriptions })
    );
}

// A mark that agrees with the cutoff is deleted rather than stored; the others are upserted (last write wins).
async function writeMarks(tx: Transaction, userId: string, marks: MarkToWrite[]): Promise<void> {
    const redundantIds = marks.filter((mark) => mark.isRead === mark.readByCutoff).map((mark) => mark.itemId);
    const exceptions = marks.filter((mark) => mark.isRead !== mark.readByCutoff);

    if (redundantIds.length > 0)
        await tx.delete(itemReadStates).where(and(eq(itemReadStates.userId, userId), inArray(itemReadStates.itemId, redundantIds)));

    if (exceptions.length > 0) {
        await tx
            .insert(itemReadStates)
            .values(exceptions.map((mark) => ({ userId, itemId: mark.itemId, isRead: mark.isRead })))
            .onConflictDoUpdate({ target: [itemReadStates.userId, itemReadStates.itemId], set: { isRead: sql`excluded.is_read` } });
    }
}

// The counts a write answers with: only the feeds it touched (each once), which keeps a click from recounting everything.
async function countFeeds(db: Database, userId: string, feedIds: string[]): Promise<ChangedCounts> {
    const uniqueFeedIds = [...new Set(feedIds)];

    return { feeds: uniqueFeedIds.length === 0 ? [] : await selectFeedCounts(db, userId, uniqueFeedIds) };
}

function feedIdsOf(followed: FollowedItem[]): string[] {
    return followed.map((item) => item.feedId);
}
