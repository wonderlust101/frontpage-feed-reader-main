import type { RequestHandler } from 'express';
import { NotFoundError } from '../errors';

// Passes requests no route matched to errorHandler as a 404, so they get the standard error body instead of Express's HTML page.
export const notFoundHandler: RequestHandler = (_req, _res, next) => {
    next(new NotFoundError('not_found', 'Not found'));
};
