import "server-only";

/** Base URL of the Express API on Railway (or localhost in development). Server-side only. */
const API_URL = process.env.API_URL ?? "http://localhost:4000";

// Mirrors backend/src/types/api.ts — keep in sync when an endpoint changes.
export type HealthResponse = {
  api: "ok";
  database: "connected" | "skipped" | "error";
  error?: string;
};

export async function getHealth(): Promise<HealthResponse | null> {
  try {
    const res = await fetch(`${API_URL}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as HealthResponse;
  } catch {
    return null;
  }
}
