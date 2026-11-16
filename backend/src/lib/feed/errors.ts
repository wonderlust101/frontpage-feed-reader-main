import type { FeedErrorCode } from '@frontpage/shared';

/** A feed failure with a machine-readable code and whether retrying might help. */
export class FeedError extends Error {
    readonly code: FeedErrorCode;
    readonly status: number | undefined;
    readonly retryable: boolean;

    constructor(code: FeedErrorCode, message: string, opts: { status?: number; retryable?: boolean } = {}) {
        super(message);
        this.name = 'FeedError';
        this.code = code;
        this.status = opts.status;
        this.retryable = opts.retryable ?? DEFAULT_RETRYABLE[code];
    }
}

const DEFAULT_RETRYABLE: Record<FeedErrorCode, boolean> = {
    invalid_url: false,
    blocked_url: false,
    timeout: true,
    network: true,
    http_4xx: false,
    http_5xx: true,
    not_a_feed: false,
    parse_error: false,
    too_large: false,
};
