// Server-side client for the Express API (API_URL: Railway in production, localhost in development).

import 'server-only';
import type { HealthResponse, SessionResponse } from '@frontpage/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

// Asks the API for its health from the server side; null instead of throwing if it's down, answers with an error, or takes over 5 seconds.
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

// Asks Better Auth on the API who is signed in, forwarding the browser's cookie header. Returns null when nobody is
// signed in, the session expired, or the API is down or slower than 5 seconds; never cached, since it is per person.
export async function getSession(cookieHeader: string): Promise<SessionResponse> {
    if (!cookieHeader) {
        return null;
    }
    try {
        const res = await fetch(`${API_URL}/api/auth/get-session`, {
            headers: { cookie: cookieHeader },
            cache: 'no-store',
            signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) {
            return null;
        }
        return (await res.json()) as SessionResponse;
    } catch {
        return null;
    }
}
