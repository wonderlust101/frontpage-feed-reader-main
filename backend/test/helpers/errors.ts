import { expect } from 'bun:test';
import { HttpError } from '../../src/errors';

// Awaits a call that must fail and returns its HttpError, so the test can check the status and code.
export async function httpErrorFrom(call: Promise<unknown>): Promise<HttpError> {
    const err = await call.then(
        () => null,
        (e: unknown) => e,
    );

    expect(err).toBeInstanceOf(HttpError);

    return err as HttpError;
}

// Runs a call that must throw and returns its HttpError, so the test can check the status and code.
export function httpErrorThrownBy(call: () => unknown): HttpError {
    try {
        call();
    } catch (err) {
        if (err instanceof HttpError)
            return err;

        throw err;
    }

    throw new Error('expected the call to throw');
}
