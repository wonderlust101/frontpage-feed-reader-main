// Server-side client for the Express API (API_URL: Railway in production, localhost in development).

import 'server-only';
import type { HealthResponse } from '@frontpage/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/** The API's health, or null when it can't be reached within 5 seconds. */
export async function getHealth(): Promise<HealthResponse | null> {
    try {
        const res = await fetch(`${API_URL}/api/health`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            return null;
        }
        return (await res.json()) as HealthResponse;
    } catch {
        return null;
    }
}
