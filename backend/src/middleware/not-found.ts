import type { RequestHandler } from 'express';
import { sendError } from './error-handler';

// Answers unknown routes with a JSON 404 in the standard error shape (Express's default is an HTML page).
export const notFound: RequestHandler = (_req, res) => {
    sendError(res, 404, { code: 'not_found', message: 'Not found', retryable: false });
};
