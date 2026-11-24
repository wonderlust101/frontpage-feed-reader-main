// The page cursor: "order|sortAt|id" in URL-safe base64. `sortAt` keeps Postgres's microseconds, since a JS Date
// would round them and skip items that share a millisecond. A tampered cursor becomes a 400, never a Postgres error.

import { isUuid } from '../../lib/uuid';
import type { ItemCursor } from './items.types';

const SEPARATOR = '|';
const MAX_CURSOR_LENGTH = 200;
const SORT_AT_PATTERN = /^[1-9]\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/;
const MILLISECOND_ISO_LENGTH = 23;

export function encodeCursor(cursor: ItemCursor): string {
    return Buffer.from([cursor.order, cursor.sortAt, cursor.id].join(SEPARATOR)).toString('base64url');
}

// null when it isn't one encodeCursor made: wrong shape, unknown order, an impossible time (Feb 30) or a bad id.
export function decodeCursor(value: string): ItemCursor | null {
    if (value.length > MAX_CURSOR_LENGTH)
        return null;

    const parts = Buffer.from(value, 'base64url').toString('utf8').split(SEPARATOR);
    const [order, sortAt = '', id] = parts;
    // Date rolls impossible dates over (Feb 30 becomes Mar 2), so a real time is one whose millisecond part comes back unchanged.
    const millisecondTime = `${sortAt.slice(0, MILLISECOND_ISO_LENGTH)}Z`;
    const date = new Date(millisecondTime);
    const isRealTime = SORT_AT_PATTERN.test(sortAt) && !Number.isNaN(date.getTime()) && date.toISOString() === millisecondTime;

    if (parts.length !== 3 || (order !== 'newest' && order !== 'oldest') || !isRealTime || !isUuid(id))
        return null;

    return { order, sortAt, id };
}
