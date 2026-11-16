import { readFixture } from './feed-fixtures';

export const ETAG = '"v1"';
export const LAST_MODIFIED = 'Tue, 10 Jun 2025 09:00:00 GMT';

/**
 * A local upstream "feed server" for fetch/route tests. Each path exercises one HTTP behaviour.
 * `hits` counts requests per path and `lastHeaders` records what the client sent.
 */
export function startFeedServer() {
    const hits: Record<string, number> = {};
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
            const xml = { 'Content-Type': 'application/rss+xml; charset=utf-8' };

            switch (pathname) {
                case '/feed.xml':
                    return new Response(rss, { headers: xml });
                case '/cached.xml':
                    if (req.headers.get('if-none-match') === ETAG) return new Response(null, { status: 304 });
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
        stop: () => server.stop(true),
    };
}
