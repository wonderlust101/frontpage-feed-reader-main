// Backend-only: what a checked GET /api/items request means. A scope is everything, one feed, or one category
// (`categoryId: null` = Uncategorized); a cursor's `sortAt` is Postgres text with microseconds, never a JS Date.

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
