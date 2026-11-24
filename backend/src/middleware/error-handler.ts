// Express's last middleware: every error thrown in a route ends up here and is sent as the standard JSON error body.

import type { ErrorRequestHandler } from 'express';
import type { ApiErrorResponse } from '@frontpage/shared';
import { HttpError } from './errors';

// Sends any thrown error as { error: { code, message, retryable } }, so controllers never need try/catch.
// Unexpected errors (bugs) are logged and answered with a generic 500 that hides the details.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    const error = toHttpError(err);

    if (error.code === 'internal_error')
        console.error(err);

    const body: ApiErrorResponse = {
        error: {
            code: error.code,
            message: error.message,
            retryable: error.retryable,
            ...(error.upstreamStatus !== undefined && { status: error.upstreamStatus }),
            ...(error.subscriptionId !== undefined && { subscriptionId: error.subscriptionId }),
        },
    };

    res.status(error.status).json(body);
};

// Any thrown value as an HttpError: ours pass through, Express's own 4xx (e.g. bad JSON) keep their status, anything else becomes a 500.
function toHttpError(err: unknown): HttpError {
    if (err instanceof HttpError)
        return err;

    const expressError = err as { status?: number; type?: string; message?: string } | undefined;
    const status = expressError?.status ?? 500;

    if (status >= 400 && status < 500) {
        return expressError?.type === 'entity.parse.failed'
            ? new HttpError(status, 'invalid_json', 'The request body is not valid JSON')
            : new HttpError(status, 'bad_request', expressError?.message || 'Bad request');
    }

    return new HttpError(500, 'internal_error', 'Internal server error');
}
