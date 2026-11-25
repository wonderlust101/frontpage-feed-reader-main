import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 429: the caller hit a rate limit; trying again later works (retryable).
export class TooManyRequestsError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(429, code, message, opts);
    }
}
