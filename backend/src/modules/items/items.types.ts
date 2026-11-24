// Backend-only shapes for the items routes: what a checked GET /api/items request means. The frontend never sees these;
// it sends the plain query parameters described by `ItemListParams` in @frontpage/shared.
// A scope is everything the reader follows, one feed, or one category (`categoryId: null` = Uncategorized).
// A cursor's `sortAt` is Postgres text with microseconds (e.g. "2026-03-01T10:00:00.123456Z"), never a JS Date.

import type { ItemOrder } from '@frontpage/shared';

export type ItemScope = { kind: 'all' } | { kind: 'feed'; feedId: string } | { kind: 'category'; categoryId: string | null };

export type ItemCursor = {
    order: ItemOrder;
    sortAt: string;
    id: string;
};

export type ItemListQuery = {
    scope: ItemScope;
    unreadOnly: boolean;
    order: ItemOrder;
    limit: number;
    cursor: ItemCursor | null;
};
