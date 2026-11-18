import type { RequestHandler } from 'express';
import { notFound as notFoundError } from '../lib/errors';

// Passes unknown routes to the error handler as a `not_found` error, so the 404 has the standard error shape.
export const notFound: RequestHandler = (_req, _res, next) => {
    next(notFoundError());
};
