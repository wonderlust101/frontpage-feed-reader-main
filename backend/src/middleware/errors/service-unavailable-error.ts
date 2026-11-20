import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 503: a part of the API is switched off or down right now (e.g. no database configured).
export class ServiceUnavailableError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(503, code, message, opts);
    }
}
