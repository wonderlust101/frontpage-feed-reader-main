import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 504: another server we depend on took too long to answer.
export class GatewayTimeoutError extends HttpError {
    constructor(code: ApiErrorCode, message: string, options?: HttpErrorOptions) {
        super(504, code, message, options);
    }
}
