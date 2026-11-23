// Server-side client for the Express API (API_URL: Railway in production, localhost in development).

import 'server-only';
import type { HealthResponse, SessionResponse } from '@frontpage/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// Asks the API for its health from the server side; null instead of throwing if it's down, answers with an error, or takes over 5 seconds.
export async function getHealth(): Promise<HealthResponse | null> {
    try {
        const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) {
            return null;
        }
        return (await res.json()) as HealthResponse;
    } catch {
        return null;
    }
}

// Asks Better Auth on the API who is signed in, forwarding the browser's cookie header. Returns null when nobody is
// signed in (no cookie, a 401, or no session in the answer). Throws when the API can't say (down, slower than 5
// seconds, or a server error), so the page shows its error boundary instead of treating the reader as signed out.
// Never cached: with Cache Components, fetch is uncached by default, and the answer is per person anyway.
export async function getSession(cookieHeader: string): Promise<SessionResponse> {
    if (!cookieHeader) {
        return null;
    }
    const res = await fetch(`${API_URL}/api/auth/get-session`, {
        headers: { cookie: cookieHeader },
        signal: AbortSignal.timeout(5000),
    });
    if (res.status === 401) {
        return null;
    }
    if (!res.ok) {
        throw new Error(`Session check failed with status ${res.status}`);
    }
    return (await res.json()) as SessionResponse;
}
