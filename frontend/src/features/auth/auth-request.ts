// Runs one Better Auth client call and reports a failure in one shape (AuthFailure) that authErrorMessage understands.
// It also reads how long to wait after too many attempts: Better Auth only sends that in a 429's X-Retry-After header,
// which the returned error object doesn't include, so the call gets an onError hook that captures it.

import type { AuthFailure } from './error-messages';

type ErrorHook = { onError: (context: { response: Response }) => void };

type CallResult<T> = { data: T; error: null } | { data: null; error: { code?: string; status: number } };

type RequestResult<T> = { data: T; failure: null } | { data: null; failure: AuthFailure };

// Returns the call's data, or a failure: the error code and status, the wait in seconds for a 429, status 0 when offline.
// Example: authRequest((fetchOptions) => authClient.signIn.email(values, fetchOptions))
export async function authRequest<T>(call: (fetchOptions: ErrorHook) => Promise<CallResult<T>>): Promise<RequestResult<T>> {
    let retryAfterSeconds: number | undefined;
    const fetchOptions: ErrorHook = {
        onError({ response }) {
            const header = response.headers.get('X-Retry-After');
            retryAfterSeconds = header ? Number(header) : undefined;
        },
    };

    try {
        const result = await call(fetchOptions);
        if (result.error) {
            return { data: null, failure: { code: result.error.code, status: result.error.status, retryAfterSeconds } };
        }
        return { data: result.data, failure: null };
    } catch {
        return { data: null, failure: { status: 0 } };
    }
}
