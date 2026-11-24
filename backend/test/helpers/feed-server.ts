import zlib from 'node:zlib';
import { readFixture } from './fixtures';

export const ETAG = '"v1"';
export const LAST_MODIFIED = 'Tue, 10 Jun 2025 09:00:00 GMT';

// A fake feed server where each path acts out one HTTP behaviour (redirect, 304, timeout, 500…); `hits` and `lastHeaders` record requests.
// `serve(path, body, init)` makes a path answer with that body instead (replacing any earlier serve), so a test can change a feed between fetches.
export function startFeedServer() {
    const hits: Record<string, number> = {};
    const served = new Map<string, { body: Uint8Array | string; init: ResponseInit }>();
    const lastHeaders: Record<string, Headers> = {};
    const rss = readFixture('odd/cdata-mixed.xml');
    const latin1 = readFixture('odd/iso-8859-1-header-only.xml');

    const server = Bun.serve({
        port: 0,
        hostname: '127.0.0.1',
        async fetch(req) {
            const { pathname } = new URL(req.url);
            hits[pathname] = (hits[pathname] ?? 0) + 1;
            lastHeaders[pathname] = req.headers;
            const override = served.get(pathname);
            if (override)
                return new Response(override.body, override.init);

            const xml = { 'Content-Type': 'application/rss+xml; charset=utf-8' };

            switch (pathname) {
                case '/feed.xml':
                    return new Response(rss, { headers: xml });
                case '/cached.xml':
                    if (req.headers.get('if-none-match') === ETAG)
                        return new Response(null, { status: 304 });

                    return new Response(rss, { headers: { ...xml, ETag: ETAG, 'Last-Modified': LAST_MODIFIED } });
                case '/latin1.xml':
                    return new Response(latin1, { headers: { 'Content-Type': 'text/xml; charset=ISO-8859-1' } });
                case '/moved-permanently':
                    return Response.redirect('/moved-again', 301);
                case '/moved-again':
                    return Response.redirect('/feed.xml', 308);
                case '/moved-temporarily':
                    return Response.redirect('/moved-again', 302);
                case '/loop':
                    return Response.redirect('/loop', 302);
                case '/redirect-to-file':
                    return new Response(null, { status: 302, headers: { Location: 'file:///etc/passwd' } });
                case '/slow':
                    await Bun.sleep(1_000);
                    return new Response(rss, { headers: xml });
                case '/slow-body':
                    return new Response(
                        new ReadableStream({
                            async start(controller) {
                                controller.enqueue(new TextEncoder().encode('<rss><channel>'));
                                await Bun.sleep(1_000);
                                controller.close();
                            },
                        }),
                        { headers: xml },
                    );
                case '/html':
                    return new Response('<!doctype html><html><body>Hi</body></html>', {
                        headers: { 'Content-Type': 'text/html' },
                    });
                case '/gzip':
                    return new Response(zlib.gzipSync(rss), { headers: { ...xml, 'Content-Encoding': 'gzip' } });
                case '/deflate':
                    return new Response(zlib.deflateSync(rss), { headers: { ...xml, 'Content-Encoding': 'deflate' } });
                case '/brotli':
                    return new Response(zlib.brotliCompressSync(rss), {
                        headers: { ...xml, 'Content-Encoding': 'br' },
                    });
                case '/zip-bomb':
                    return new Response(zlib.gzipSync(new Uint8Array(8 * 1024 * 1024).fill(32)), {
                        headers: { ...xml, 'Content-Encoding': 'gzip' },
                    });
                case '/redirect-with-credentials':
                    return new Response(null, {
                        status: 302,
                        headers: { Location: 'http://user:pw@127.0.0.1/feed.xml' },
                    });
                case '/redirect-to-private':
                    return Response.redirect('http://10.0.0.1/feed.xml', 302);
                case '/huge':
                    return new Response(new Uint8Array(2_048).fill(32), { headers: xml });
                case '/gone':
                    return new Response('gone', { status: 410 });
                case '/error':
                    return new Response('boom', { status: 500 });
                case '/rate-limited':
                    return new Response('slow down', { status: 429 });
                default:
                    return new Response('not found', { status: 404 });
            }
        },
    });

    return {
        url: `http://127.0.0.1:${server.port}`,
        hits,
        lastHeaders,
        serve: (path: string, body: Uint8Array | string, init: ResponseInit = { headers: { 'Content-Type': 'application/rss+xml' } }) => {
            served.set(path, { body, init });
        },
        stop: () => server.stop(true),
    };
}
