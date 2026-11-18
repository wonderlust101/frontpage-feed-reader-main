import type { ErrorRequestHandler, Response } from 'express';
import type { ApiErrorCode, ApiErrorResponse } from '@frontpage/shared';
import { AppError, ERRORS } from '../lib/errors';

// Express's last middleware: turns any error thrown in a route into the standard JSON error body, so controllers never need try/catch.
// AppErrors and client errors (e.g. bad JSON) keep their status; anything else is a bug, logged and hidden behind a generic 500.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        return sendError(res, err.httpStatus, {
            code: err.code,
            message: err.message,
            retryable: err.retryable,
            ...(err.upstreamStatus !== undefined && { status: err.upstreamStatus }),
        });
    }

    const status: number = err?.status ?? err?.statusCode ?? 500;
    if (status >= 400 && status < 500) {
        const invalidJson = err instanceof SyntaxError || err?.type === 'entity.parse.failed';
        const code: ApiErrorCode = invalidJson ? 'invalid_json' : 'bad_request';
        return sendError(res, status, {
            code,
            message: invalidJson ? 'The request body is not valid JSON' : String(err?.message ?? 'Bad request'),
            retryable: ERRORS[code].retryable,
        });
    }

    console.error(err);
    const { httpStatus, retryable } = ERRORS.internal_error;
    sendError(res, httpStatus, { code: 'internal_error', message: 'Internal server error', retryable });
};

// Sends the standard error body `{ error: { code, message, retryable } }`; every error response in the API goes through here.
export function sendError(res: Response, status: number, error: ApiErrorResponse['error']) {
    res.status(status).json({ error } satisfies ApiErrorResponse);
}
