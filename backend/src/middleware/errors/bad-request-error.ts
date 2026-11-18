import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 400: the request itself is wrong, e.g. a missing or invalid feed URL.
export class BadRequestError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(400, code, message, opts);
    }
}
