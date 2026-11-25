import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 404: the thing asked for doesn't exist.
export class NotFoundError extends HttpError {
    constructor(code: ApiErrorCode, message: string, options?: HttpErrorOptions) {
        super(404, code, message, options);
    }
}
