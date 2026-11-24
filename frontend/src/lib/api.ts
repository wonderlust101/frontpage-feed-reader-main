// Server-side client for the Express API; next.config.ts sets API_URL for each deployment.

import 'server-only';
import type { HealthResponse, SessionResponse } from '@frontpage/shared';

const API_URL = process.env.API_URL;

// null instead of throwing when the API is down, answers with an error or takes over 5 seconds.
export async function getHealth(): Promise<HealthResponse | null> {
    try {
        const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(5000) });

        if (!res.ok)
            return null;

        return (await res.json()) as HealthResponse;
    } catch {
        return null;
    }
}

// null when nobody is signed in; throws when the API can't say, so the page shows its error boundary.
export async function getSession(cookieHeader: string): Promise<SessionResponse> {
    if (!cookieHeader)
        return null;

    const res = await fetch(`${API_URL}/api/auth/get-session`, {
        headers: { cookie: cookieHeader },
        signal: AbortSignal.timeout(5000),
    });

    if (res.status === 401)
        return null;

    if (!res.ok)
        throw new Error(`Session check failed with status ${res.status}`);

    return (await res.json()) as SessionResponse;
}
