// Better Auth only sends the wait after too many attempts in a 429's X-Retry-After header, which its error object
// leaves out, so each call gets an onError hook that captures it.

// `status` is 0 when the request never reached the server; `offline` says whether the browser was offline then.
export type AuthFailure = {
    code?: string;
    status: number;
    offline?: boolean;
    retryAfterSeconds?: number;
};

type ErrorHook = { onError: (context: { response: Response }) => void };

type CallResult<T> = { data: T; error: null } | { data: null; error: { code?: string; status: number } };

type RequestResult<T> = { data: T; failure: null } | { data: null; failure: AuthFailure };

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

        if (result.error)
            return { data: null, failure: { code: result.error.code, status: result.error.status, retryAfterSeconds } };

        return { data: result.data, failure: null };
    } catch {
        return { data: null, failure: { status: 0, offline: typeof navigator !== 'undefined' && navigator.onLine === false } };
    }
}
