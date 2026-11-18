// Every error the API reports on purpose, in one place. Services throw an AppError with a code from ERRORS, and middleware/error-handler.ts
// sends it as { error: { code, message, retryable } } with that code's HTTP status. 502/504 mean a feed's own server failed, not our API.

import type { ApiErrorCode } from '@frontpage/shared';

export type AppErrorOptions = {
    retryable?: boolean;
    upstreamStatus?: number;
};

export const ERRORS: Record<ApiErrorCode, { httpStatus: number; retryable: boolean }> = {
    bad_request: { httpStatus: 400, retryable: false },
    invalid_json: { httpStatus: 400, retryable: false },
    not_found: { httpStatus: 404, retryable: false },
    internal_error: { httpStatus: 500, retryable: true },
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

// An error that's safe to show API clients; its HTTP status and default retryability come from ERRORS[code].
// `upstreamStatus` is a feed server's own error status (e.g. 404), sent to clients as `status`.
export class AppError extends Error {
    readonly code: ApiErrorCode;
    readonly httpStatus: number;
    readonly retryable: boolean;
    readonly upstreamStatus: number | undefined;

    constructor(code: ApiErrorCode, message: string, opts: AppErrorOptions = {}) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.httpStatus = ERRORS[code].httpStatus;
        this.retryable = opts.retryable ?? ERRORS[code].retryable;
        this.upstreamStatus = opts.upstreamStatus;
    }
}

// Error for a resource that doesn't exist, sent as a 404, e.g. `throw notFound('Feed not found')`.
export function notFound(message = 'Not found'): AppError {
    return new AppError('not_found', message);
}

// Error for invalid client input, sent as a 400, e.g. `throw badRequest('Title is required')`.
export function badRequest(message: string): AppError {
    return new AppError('bad_request', message);
}
