import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { FeedError, fetchFeed, parseFeedUrl, type FetchFeedOptions } from '../../../src/lib/feed';
import { ETAG, LAST_MODIFIED, startFeedServer } from '../../helpers/feed-server';

let upstream: ReturnType<typeof startFeedServer>;
const opts: FetchFeedOptions = { allowLoopback: true, timeoutMs: 2_000 };

beforeAll(() => {
    upstream = startFeedServer();
});

afterAll(() => {
    upstream.stop();
});

// Asserts the promise rejects with a FeedError of this `code` (and `retryable`, if given) and returns the error for further checks.
async function expectError(promise: Promise<unknown>, code: FeedError['code'], retryable?: boolean) {
    const err = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe(code);
    if (retryable !== undefined) {
        expect((err as FeedError).retryable).toBe(retryable);
    }
    return err as FeedError;
}

describe('fetchFeed', () => {
    test('returns the body, content type and final URL', async () => {
        const res = await fetchFeed(`${upstream.url}/feed.xml`, opts);
        expect(res.notModified).toBe(false);
        if (res.notModified) {
            return;
        }
        expect(new TextDecoder().decode(res.bytes)).toContain('<rss');
        expect(res.contentType).toContain('application/rss+xml');
        expect(res.finalUrl).toBe(`${upstream.url}/feed.xml`);
        expect(res.redirect).toBeNull();
    });

    test('sends a User-Agent and a feed-friendly Accept header', async () => {
        await fetchFeed(`${upstream.url}/feed.xml`, { ...opts, userAgent: 'TestAgent/1.0' });
        const headers = upstream.lastHeaders['/feed.xml']!;
        expect(headers.get('user-agent')).toBe('TestAgent/1.0');
        expect(headers.get('accept')).toContain('application/rss+xml');
    });

    test('follows a chain of permanent redirects and reports it as permanent', async () => {
        const res = await fetchFeed(`${upstream.url}/moved-permanently`, opts);
        expect(res.finalUrl).toBe(`${upstream.url}/feed.xml`);
        expect(res.redirect).toEqual({
            permanent: true,
            from: `${upstream.url}/moved-permanently`,
            to: `${upstream.url}/feed.xml`,
        });
    });

    test('a temporary hop makes the whole redirect temporary', async () => {
        const res = await fetchFeed(`${upstream.url}/moved-temporarily`, opts);
        expect(res.finalUrl).toBe(`${upstream.url}/feed.xml`);
        expect(res.redirect?.permanent).toBe(false);
    });

    test('gives up on redirect loops', async () => {
        await expectError(fetchFeed(`${upstream.url}/loop`, opts), 'network', false);
    });

    test('refuses redirects to URLs with credentials', async () => {
        await expectError(fetchFeed(`${upstream.url}/redirect-with-credentials`, opts), 'blocked_url', false);
    });

    test('refuses redirects to non-http protocols', async () => {
        await expectError(fetchFeed(`${upstream.url}/redirect-to-file`, opts), 'blocked_url');
    });

    test('sends If-None-Match / If-Modified-Since and reports 304s', async () => {
        const first = await fetchFeed(`${upstream.url}/cached.xml`, opts);
        expect(first.validators).toEqual({ etag: ETAG, lastModified: LAST_MODIFIED });

        const second = await fetchFeed(`${upstream.url}/cached.xml`, { ...opts, ...first.validators });
        expect(second.notModified).toBe(true);
        const headers = upstream.lastHeaders['/cached.xml']!;
        expect(headers.get('if-none-match')).toBe(ETAG);
        expect(headers.get('if-modified-since')).toBe(LAST_MODIFIED);
    });

    test('times out slow responses', async () => {
        const started = Date.now();
        await expectError(fetchFeed(`${upstream.url}/slow`, { ...opts, timeoutMs: 200 }), 'timeout', true);
        expect(Date.now() - started).toBeLessThan(900);
    });

    test('the timeout also covers a slow body', async () => {
        await expectError(fetchFeed(`${upstream.url}/slow-body`, { ...opts, timeoutMs: 200 }), 'timeout', true);
    });

    test.each([
        ['/missing', 'http_4xx', 404, false],
        ['/gone', 'http_4xx', 410, false],
        ['/rate-limited', 'http_4xx', 429, true],
        ['/error', 'http_5xx', 500, true],
    ] as const)('maps %s to %s', async (path, code, status, retryable) => {
        const err = await expectError(fetchFeed(`${upstream.url}${path}`, opts), code, retryable);
        expect(err.upstreamStatus).toBe(status);
    });

    test.each(['/gzip', '/deflate', '/brotli'])('decompresses %s responses', async (path) => {
        const res = await fetchFeed(`${upstream.url}${path}`, opts);
        if (res.notModified) {
            throw new Error('unexpected 304');
        }
        expect(new TextDecoder().decode(res.bytes)).toStartWith('<?xml');
        expect(upstream.lastHeaders[path]?.get('accept-encoding')).toContain('gzip');
    });

    test('caps the decompressed size (zip bombs)', async () => {
        await expectError(fetchFeed(`${upstream.url}/zip-bomb`, opts), 'too_large');
    });

    test('caps the body size', async () => {
        await expectError(fetchFeed(`${upstream.url}/huge`, { ...opts, maxBytes: 1_024 }), 'too_large');
    });

    test('reports unreachable hosts as network errors', async () => {
        await expectError(fetchFeed('http://127.0.0.1:1/feed.xml', opts), 'network', true);
    });
});

describe('SSRF protection', () => {
    test('blocks localhost and private addresses by default', async () => {
        await expectError(fetchFeed(`${upstream.url}/feed.xml`), 'blocked_url', false);
        await expectError(fetchFeed('http://localhost/feed.xml'), 'blocked_url');
        await expectError(fetchFeed('http://[::1]/feed.xml'), 'blocked_url');
        await expectError(fetchFeed('http://169.254.169.254/latest/meta-data'), 'blocked_url');
    });

    test.each([
        ['loopback', '127.0.0.1'],
        ['private 10.x', '10.1.2.3'],
        ['private 172.16.x', '172.16.0.1'],
        ['private 192.168.x', '192.168.1.1'],
        ['cloud metadata', '169.254.169.254'],
        ['carrier-grade NAT', '100.64.0.1'],
        ['unspecified', '0.0.0.0'],
        ['multicast', '224.0.0.1'],
        ['documentation range 1', '192.0.2.1'],
        ['documentation range 2', '198.51.100.1'],
        ['IPv6 loopback', '[::1]'],
        ['IPv6 private', '[fd00::1]'],
        ['IPv6 link-local', '[fe80::1]'],
        ['IPv4-mapped loopback', '[::ffff:127.0.0.1]'],
        ['IPv4-mapped private', '[::ffff:10.0.0.1]'],
        ['IPv6 documentation range', '[2001:db8::1]'],
        ['NAT64 form of 127.0.0.1', '[64:ff9b::7f00:1]'],
    ])('blocks %s (%s)', async (_label, host) => {
        await expectError(fetchFeed(`http://${host}/feed.xml`, { timeoutMs: 2_000 }), 'blocked_url', false);
    });

    test('checks every redirect hop, not just the first URL', async () => {
        await expectError(fetchFeed(`${upstream.url}/redirect-to-private`, opts), 'blocked_url', false);
    });

    test('allowLoopback only opens loopback, not other private ranges', async () => {
        await expectError(fetchFeed('http://10.1.2.3/feed.xml', opts), 'blocked_url');
        await expectError(fetchFeed('http://169.254.169.254/latest/meta-data', opts), 'blocked_url');
    });
});

describe('parseFeedUrl', () => {
    test('adds https:// to bare hosts and drops fragments', () => {
        expect(parseFeedUrl('example.com/feed#top').href).toBe('https://example.com/feed');
    });

    test.each([[''], ['   '], [undefined], ['ftp://example.com/feed'], ['http://user:pw@example.com/'], ['http://']])(
        'rejects %p',
        (input) => {
            expect(() => parseFeedUrl(input)).toThrow(FeedError);
        },
    );
});
