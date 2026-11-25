import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 401: the request needs a signed-in user and has no valid session.
export class UnauthorizedError extends HttpError {
    constructor(code: ApiErrorCode, message: string, options?: HttpErrorOptions) {
        super(401, code, message, options);
    }
}
