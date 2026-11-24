// The base class for every error the API reports on purpose. Throw one of its subclasses (one per HTTP status, in this folder);
// Express 5 forwards it to errorHandler, which sends { error: { code, message, retryable } }.

import type { ApiErrorCode } from '@frontpage/shared';

export type HttpErrorOptions = {
    retryable?: boolean;
    upstreamStatus?: number;
    subscriptionId?: string;
};

// An error that's safe to show API clients: an HTTP status, a machine-readable `code` and a message.
// `upstreamStatus` is a feed server's own error status (e.g. 404), sent to clients as `status`;
// `subscriptionId` points an `already_subscribed` client at the subscription that already exists.
export class HttpError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly retryable: boolean;
    readonly upstreamStatus: number | undefined;
    readonly subscriptionId: string | undefined;

    constructor(status: number, code: ApiErrorCode, message: string, opts: HttpErrorOptions = {}) {
        super(message);
        this.name = new.target.name;
        this.status = status;
        this.code = code;
        this.retryable = opts.retryable ?? isRetryableStatus(status);
        this.upstreamStatus = opts.upstreamStatus;
        this.subscriptionId = opts.subscriptionId;
    }
}

// True for statuses where trying again later might work: server errors (5xx), request timeout (408) and rate limiting (429).
export function isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 408 || status === 429;
}
