// Better Auth against a real (in-memory) Postgres built from our migrations: proves the hand-written schema matches what Better Auth expects.

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { createAuth } from '../../../src/modules/auth/auth.service';
import { createTestDb } from '../../helpers/test-db';

const PASSWORD = 'correct horse battery';
const NEW_PASSWORD = 'staple battery horse';

let testDb: Awaited<ReturnType<typeof createTestDb>>;
let auth: ReturnType<typeof createAuth>;
const resetLinks: string[] = [];

beforeAll(async () => {
    testDb = await createTestDb();
    auth = createAuth(testDb.db, async (_user, url) => {
        resetLinks.push(url);
    });
});

afterAll(async () => {
    await testDb.close();
});

// Signs up a new user and returns the Cookie header for their session.
async function signUp(email: string) {
    const { headers } = await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: 'Ada' }, returnHeaders: true });
    return cookieFrom(headers);
}

// Turns Set-Cookie response headers into a Cookie request header ("name=value; name2=value2").
function cookieFrom(headers: Headers) {
    return headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
}

describe('sign up and sign in', () => {
    test('sign-up creates a user and a session cookie that getSession accepts', async () => {
        const cookie = await signUp('ada@example.com');
        const session = await auth.api.getSession({ headers: new Headers({ cookie }) });
        expect(session?.user.email).toBe('ada@example.com');
        expect(session?.user.name).toBe('Ada');
    });

    test('the same email cannot sign up twice', async () => {
        await signUp('twice@example.com');
        await expect(signUp('twice@example.com')).rejects.toThrow();
    });

    test('passwords shorter than 8 characters are rejected', async () => {
        await expect(auth.api.signUpEmail({ body: { email: 'short@example.com', password: 'short', name: 'S' } })).rejects.toThrow();
    });

    test('sign-in works with the right password and fails with a wrong one', async () => {
        await signUp('grace@example.com');
        const ok = await auth.api.signInEmail({ body: { email: 'grace@example.com', password: PASSWORD } });
        expect(ok.user.email).toBe('grace@example.com');
        await expect(auth.api.signInEmail({ body: { email: 'grace@example.com', password: 'wrong password' } })).rejects.toThrow();
    });

    test('sign-out ends the session', async () => {
        const cookie = await signUp('leaving@example.com');
        await auth.api.signOut({ headers: new Headers({ cookie }) });
        expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
    });
});

describe('password reset', () => {
    test('a reset link sets a new password and signs out existing sessions', async () => {
        const cookie = await signUp('forgetful@example.com');
        await auth.api.requestPasswordReset({ body: { email: 'forgetful@example.com', redirectTo: 'http://localhost:3000/reset-password' } });

        const link = resetLinks.at(-1);
        expect(link).toContain('/api/auth/reset-password/');
        const token = new URL(link!).pathname.split('/').at(-1)!;

        await auth.api.resetPassword({ body: { token, newPassword: NEW_PASSWORD } });

        expect(await auth.api.getSession({ headers: new Headers({ cookie }) })).toBeNull();
        await expect(auth.api.signInEmail({ body: { email: 'forgetful@example.com', password: PASSWORD } })).rejects.toThrow();
        const signedIn = await auth.api.signInEmail({ body: { email: 'forgetful@example.com', password: NEW_PASSWORD } });
        expect(signedIn.user.email).toBe('forgetful@example.com');
    });

    test('unknown emails get no link and no error', async () => {
        const before = resetLinks.length;
        await auth.api.requestPasswordReset({ body: { email: 'nobody@example.com', redirectTo: 'http://localhost:3000/reset-password' } });
        expect(resetLinks.length).toBe(before);
    });

    test('a used reset token cannot be used again', async () => {
        await signUp('once@example.com');
        await auth.api.requestPasswordReset({ body: { email: 'once@example.com', redirectTo: 'http://localhost:3000/reset-password' } });
        const token = new URL(resetLinks.at(-1)!).pathname.split('/').at(-1)!;
        await auth.api.resetPassword({ body: { token, newPassword: NEW_PASSWORD } });
        await expect(auth.api.resetPassword({ body: { token, newPassword: 'another new password' } })).rejects.toThrow();
    });
});
