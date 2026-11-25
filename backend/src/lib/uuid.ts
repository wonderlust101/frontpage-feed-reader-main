// Checks ids from URLs and request bodies before they reach Postgres, which would reject a malformed uuid with an error (a 500).

import type { ApiErrorCode } from '@frontpage/shared';
import { NotFoundError } from '../errors';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Any case, e.g. "0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b".
export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function requireUuid(value: string, code: ApiErrorCode, message: string): string {
    if (!isUuid(value))
        throw new NotFoundError(code, message);

    return value;
}
