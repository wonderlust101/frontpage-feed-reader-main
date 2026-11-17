// Errors we report to API clients on purpose. Services throw an AppError (or a subclass), and
// middleware/error-handler.ts sends it as { error: { code, message, retryable } } with status `httpStatus`.

export type AppErrorOptions = {
    retryable?: boolean;
    details?: Record<string, unknown>;
};

// An error that is safe to show API clients: a machine-readable `code`, a message, the HTTP status
// to answer with, and whether retrying might help. Throw it (or a subclass) from services.
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

// Error for a resource that doesn't exist, sent as a 404, e.g. `throw notFound('Feed not found')`.
export const notFound = (message = 'Not found') => new AppError('not_found', message, 404);

// Error for invalid client input, sent as a 400, e.g. `throw badRequest('Title is required')`.
// Pass `code` to use a more specific error code than 'bad_request'.
export const badRequest = (message: string, code = 'bad_request') => new AppError(code, message, 400);
