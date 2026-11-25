// The base class for every error the API reports on purpose. Throw one of its subclasses (one per HTTP status, in this folder);
// Express 5 forwards it to errorHandler, which sends { error: { code, message, retryable } }.

import type { ApiErrorCode } from '@frontpage/shared';

export type HttpErrorOptions = {
    retryable?: boolean;
    upstreamStatus?: number;
    subscriptionId?: string;
};

// `upstreamStatus` is a feed server's own status (sent as `status`); `subscriptionId` points at an existing subscription.
export class HttpError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly retryable: boolean;
    readonly upstreamStatus: number | undefined;
    readonly subscriptionId: string | undefined;

    constructor(status: number, code: ApiErrorCode, message: string, options: HttpErrorOptions = {}) {
        super(message);
        this.name = new.target.name;
        this.status = status;
        this.code = code;
        this.retryable = options.retryable ?? isRetryableStatus(status);
        this.upstreamStatus = options.upstreamStatus;
        this.subscriptionId = options.subscriptionId;
    }
}

// True for statuses where trying again later might work: server errors (5xx), request timeout (408) and rate limiting (429).
export function isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 408 || status === 429;
}
