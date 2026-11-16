import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { FeedError, fetchFeed, isPrivateAddress, parseFeedUrl, type FetchFeedOptions } from '../../../src/lib/feed';
import { ETAG, LAST_MODIFIED, startFeedServer } from '../../helpers/feed-server';

let upstream: ReturnType<typeof startFeedServer>;
const opts: FetchFeedOptions = { allowPrivate: true, timeoutMs: 2_000 };

beforeAll(() => {
    upstream = startFeedServer();
});

afterAll(() => {
    upstream.stop();
});

async function expectError(promise: Promise<unknown>, code: FeedError['code'], retryable?: boolean) {
    const err = await promise.then(
        () => null,
        (e: unknown) => e,
    );
    expect(err).toBeInstanceOf(FeedError);
    expect((err as FeedError).code).toBe(code);
    if (retryable !== undefined) expect((err as FeedError).retryable).toBe(retryable);
    return err as FeedError;
}

describe('fetchFeed', () => {
    test('returns the body, content type and final URL', async () => {
        const res = await fetchFeed(`${upstream.url}/feed.xml`, opts);
        expect(res.notModified).toBe(false);
        if (res.notModified) return;
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
        expect(err.status).toBe(status);
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
        ['127.0.0.1', true],
        ['10.1.2.3', true],
        ['172.16.0.1', true],
        ['172.32.0.1', false],
        ['192.168.1.1', true],
        ['169.254.169.254', true],
        ['100.64.0.1', true],
        ['0.0.0.0', true],
        ['::1', true],
        ['fd00::1', true],
        ['fe80::1', true],
        ['::ffff:127.0.0.1', true],
        ['8.8.8.8', false],
        ['2606:4700::1111', false],
    ])('isPrivateAddress(%s) is %p', (ip, expected) => {
        expect(isPrivateAddress(ip)).toBe(expected);
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
