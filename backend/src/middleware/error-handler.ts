import type { ErrorRequestHandler } from "express";

/**
 * Errors → JSON. Client errors (e.g. malformed JSON body) keep their status and message;
 * anything else is logged and returned as a generic 500 so internals don't leak.
 * Must be registered last, after all routes.
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const status: number = err?.status ?? err?.statusCode ?? 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status < 500 ? err.message : "Internal server error" });
};
