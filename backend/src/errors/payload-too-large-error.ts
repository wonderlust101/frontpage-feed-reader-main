import type { ApiErrorCode } from '@frontpage/shared';
import { HttpError, type HttpErrorOptions } from './http-error';

// 413: the request or the downloaded feed is too big.
export class PayloadTooLargeError extends HttpError {
    constructor(code: ApiErrorCode, message: string, options?: HttpErrorOptions) {
        super(413, code, message, options);
    }
}
