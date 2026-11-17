import type { FeedErrorCode } from '@frontpage/shared';
import { AppError } from '../errors';

/** How each feed error is reported. 502/504 mean the feed's own server failed, not our API. */
export const FEED_ERRORS: Record<FeedErrorCode, { httpStatus: number; retryable: boolean }> = {
    invalid_url: { httpStatus: 400, retryable: false },
    blocked_url: { httpStatus: 400, retryable: false },
    not_a_feed: { httpStatus: 422, retryable: false },
    parse_error: { httpStatus: 422, retryable: false },
    too_large: { httpStatus: 413, retryable: false },
    http_4xx: { httpStatus: 502, retryable: false },
    http_5xx: { httpStatus: 502, retryable: true },
    network: { httpStatus: 502, retryable: true },
    timeout: { httpStatus: 504, retryable: true },
};

/** A feed failure: its code, the HTTP status to answer with, and whether a retry might help. */
export class FeedError extends AppError {
    declare readonly code: FeedErrorCode;
    /** The status the feed's own server returned, when there was one (sent to clients as `status`). */
    readonly upstreamStatus: number | undefined;

    constructor(code: FeedErrorCode, message: string, opts: { upstreamStatus?: number; retryable?: boolean } = {}) {
        const { httpStatus, retryable } = FEED_ERRORS[code];
        super(code, message, httpStatus, {
            retryable: opts.retryable ?? retryable,
            ...(opts.upstreamStatus !== undefined && { details: { status: opts.upstreamStatus } }),
        });
        this.upstreamStatus = opts.upstreamStatus;
    }
}
