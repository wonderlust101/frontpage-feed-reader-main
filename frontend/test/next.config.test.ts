// next.config headers: every route gets the Content Security Policy, and outside development it never allows eval
// and keeps everything on this site. bun test runs with NODE_ENV=test, so this reads the production policy.

import { describe, expect, test } from 'bun:test';
import nextConfig from '../next.config';

// Returns the CSP directives sent for every path, keyed by name, e.g. { 'script-src': "'self' 'unsafe-inline'" }.
async function readPolicy(): Promise<Record<string, string>> {
    const rules = (await nextConfig.headers?.()) ?? [];
    const policy = rules.find((rule) => rule.source === '/:path*')?.headers.find((header) => header.key === 'Content-Security-Policy');
    if (!policy) {
        throw new Error('No Content-Security-Policy header on /:path*');
    }
    return Object.fromEntries(
        policy.value.split('; ').map((directive) => {
            const [name = '', ...sources] = directive.split(' ');
            return [name, sources.join(' ')];
        }),
    );
}

describe('Content Security Policy', () => {
    test('is sent on every path', async () => {
        expect(await readPolicy()).toHaveProperty('default-src', "'self'");
    });

    test('never allows eval outside development', async () => {
        expect((await readPolicy())['script-src']).toBe("'self' 'unsafe-inline'");
    });

    test('lets the browser call only this site and the API origin, with no wildcard', async () => {
        const [self, api, ...others] = (await readPolicy())['connect-src']?.split(' ') ?? [];
        expect(self).toBe("'self'");
        expect(api).toMatch(/^https?:\/\/[^/*]+$/);
        expect(others).toEqual([]);
    });

    test.each([
        ['form-action', "'self'"],
        ['base-uri', "'self'"],
        ['object-src', "'none'"],
        ['frame-ancestors', "'none'"],
    ])('limits %s to %s', async (directive, sources) => {
        expect((await readPolicy())[directive]).toBe(sources);
    });
});
