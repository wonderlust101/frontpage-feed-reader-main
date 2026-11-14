// API response shapes: the contract with the frontend.
// frontend/src/lib/api.ts mirrors these; keep them in sync when you change an endpoint.

export type DbStatus = "connected" | "skipped" | "error";

export type HealthResponse = {
  api: "ok";
  database: DbStatus;
  error?: string;
};
