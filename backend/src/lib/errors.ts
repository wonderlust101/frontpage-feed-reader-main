// Errors we report to API clients on purpose. Services throw an AppError (or a subclass), and
// middleware/error-handler.ts sends it as { error: { code, message, retryable } } with status `httpStatus`.

export type AppErrorOptions = {
    retryable?: boolean;
    /** Extra fields merged into the JSON `error` object (must be JSON-safe). */
    details?: Record<string, unknown>;
};

export class AppError extends Error {
    readonly code: string;
    readonly httpStatus: number;
    readonly retryable: boolean;
    readonly details: Record<string, unknown> | undefined;

    constructor(code: string, message: string, httpStatus: number, opts: AppErrorOptions = {}) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.httpStatus = httpStatus;
        this.retryable = opts.retryable ?? false;
        this.details = opts.details;
    }
}

/** 404 for a resource that doesn't exist, e.g. `throw notFound('Feed not found')`. */
export const notFound = (message = 'Not found') => new AppError('not_found', message, 404);

/** 400 for invalid input, e.g. `throw badRequest('Title is required')`. */
export const badRequest = (message: string, code = 'bad_request') => new AppError(code, message, 400);
