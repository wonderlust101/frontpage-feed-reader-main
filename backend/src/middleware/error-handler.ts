import type { ErrorRequestHandler, Response } from 'express';
import type { ApiErrorResponse } from '@frontpage/shared';
import { AppError } from '../lib/errors';

/** Sends the standard API error body. The only place error JSON is built. */
export function sendError(res: Response, status: number, error: ApiErrorResponse<string>['error']) {
    res.status(status).json({ error } satisfies ApiErrorResponse<string>);
}

/**
 * Turns every thrown error into the standard JSON body, so controllers never catch. AppErrors and client
 * errors (e.g. bad JSON) keep their status; anything else is a bug, so it's logged and hidden behind a 500.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof AppError) {
        return sendError(res, err.httpStatus, {
            code: err.code,
            message: err.message,
            retryable: err.retryable,
            ...err.details,
        });
    }

    const status: number = err?.status ?? err?.statusCode ?? 500;
    if (status >= 400 && status < 500) {
        const invalidJson = err instanceof SyntaxError || err?.type === 'entity.parse.failed';
        return sendError(res, status, {
            code: invalidJson ? 'invalid_json' : 'bad_request',
            message: invalidJson ? 'The request body is not valid JSON' : String(err?.message ?? 'Bad request'),
            retryable: false,
        });
    }

    console.error(err);
    sendError(res, 500, { code: 'internal_error', message: 'Internal server error', retryable: true });
};
