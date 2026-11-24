// Checks ids from URLs and request bodies before they reach Postgres, which would reject a malformed uuid with an error (a 500).

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// True when `value` is a string in UUID form, e.g. "0b6f7e7c-3a4d-4f1e-9b8a-2c5d6e7f8a9b" (any case); also tells TypeScript it's a string.
export function isUuid(value: unknown): value is string {
    return typeof value === 'string' && UUID_PATTERN.test(value);
}
