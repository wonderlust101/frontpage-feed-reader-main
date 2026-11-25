import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 409: the request clashes with what already exists, e.g. subscribing to a feed the reader already follows.
export class ConflictError extends HttpError {
    constructor(code: ApiErrorCode, message: string, options?: HttpErrorOptions) {
        super(409, code, message, options);
    }
}
