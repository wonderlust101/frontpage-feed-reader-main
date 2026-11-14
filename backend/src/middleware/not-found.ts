import type { RequestHandler } from "express";

/** Unknown routes → JSON 404 (Express's default is an HTML page). */
export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};
