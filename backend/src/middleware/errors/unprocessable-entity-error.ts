import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 422: we received something, but it isn't usable, e.g. a web page instead of a feed.
export class UnprocessableEntityError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(422, code, message, opts);
    }
}
