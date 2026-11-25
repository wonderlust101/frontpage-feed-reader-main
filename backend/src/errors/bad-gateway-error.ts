import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 502: another server we depend on (a feed's server) failed or couldn't be reached.
export class BadGatewayError extends HttpError {
    constructor(code: ApiErrorCode, message: string, options?: HttpErrorOptions) {
        super(502, code, message, options);
    }
}
