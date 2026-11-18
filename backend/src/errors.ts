// All error handling in one place: the error classes services throw, and the Express handlers that turn them into responses.
// Throw the class for the status you mean, e.g. `throw new NotFoundError('not_found', 'Feed not found')`; Express 5 forwards it to
// errorHandler, which sends { error: { code, message, retryable } }. 5xx, 408 and 429 are retryable unless you say otherwise.

import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { ApiErrorCode, ApiErrorResponse } from '@frontpage/shared';

export type HttpErrorOptions = {
    retryable?: boolean;
    upstreamStatus?: number;
};

// An error that's safe to show API clients: an HTTP status, a machine-readable `code` and a message.
// `upstreamStatus` is a feed server's own error status (e.g. 404), sent to clients as `status`.
export class HttpError extends Error {
    readonly status: number;
    readonly code: ApiErrorCode;
    readonly retryable: boolean;
    readonly upstreamStatus: number | undefined;

    constructor(status: number, code: ApiErrorCode, message: string, opts: HttpErrorOptions = {}) {
        super(message);
        this.name = new.target.name;
        this.status = status;
        this.code = code;
        this.retryable = opts.retryable ?? isRetryableStatus(status);
        this.upstreamStatus = opts.upstreamStatus;
    }
}

// 400: the request itself is wrong, e.g. a missing or invalid feed URL.
export class BadRequestError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(400, code, message, opts);
    }
}

// 404: the thing asked for doesn't exist.
export class NotFoundError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(404, code, message, opts);
    }
}

// 413: the request or the downloaded feed is too big.
export class PayloadTooLargeError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(413, code, message, opts);
    }
}

// 422: we received something, but it isn't usable, e.g. a web page instead of a feed.
export class UnprocessableEntityError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(422, code, message, opts);
    }
}

// 502: another server we depend on (a feed's server) failed or couldn't be reached.
export class BadGatewayError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(502, code, message, opts);
    }
}

// 504: another server we depend on took too long to answer.
export class GatewayTimeoutError extends HttpError {
    constructor(code: ApiErrorCode, message: string, opts?: HttpErrorOptions) {
        super(504, code, message, opts);
    }
}

// Express's last middleware: sends any thrown error as the standard JSON error body, so controllers never need try/catch.
// Unexpected errors (bugs) are logged and answered with a generic 500 that hides the details.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const error = toHttpError(err);
    if (error.code === 'internal_error') {
        console.error(err);
    }

    const body: ApiErrorResponse = {
        error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            ...(error.upstreamStatus !== undefined && { status: error.upstreamStatus }),
        },
    };
    res.status(error.status).json(body);
};

// Passes requests no route matched to errorHandler as a 404, so they get the standard error body instead of Express's HTML page.
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
    next(new NotFoundError('not_found', 'Not found'));
};

// True for statuses where trying again later might work: server errors (5xx), request timeout (408) and rate limiting (429).
export function isRetryableStatus(status: number): boolean {
    return status >= 500 || status === 408 || status === 429;
}

// Any thrown value as an HttpError: ours pass through, Express's own 4xx (e.g. bad JSON) keep their status, anything else becomes a 500.
function toHttpError(err: unknown): HttpError {
    if (err instanceof HttpError) {
        return err;
    }

    const expressError = err as { status?: number; statusCode?: number; type?: string; message?: string } | undefined;
    const status = expressError?.status ?? expressError?.statusCode ?? 500;
    if (status >= 400 && status < 500) {
        const invalidJson = err instanceof SyntaxError || expressError?.type === 'entity.parse.failed';
        return invalidJson
            ? new HttpError(status, 'invalid_json', 'The request body is not valid JSON')
            : new HttpError(status, 'bad_request', String(expressError?.message ?? 'Bad request'));
    }

    return new HttpError(500, 'internal_error', 'Internal server error');
}
