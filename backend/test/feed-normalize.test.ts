import { describe, expect, test } from 'bun:test';
import type { NormalizedFeed } from '@frontpage/shared';
import { FeedError, decodeFeed, normalizeFeed } from '../src/lib/feed';
import { curatedFixtures, readFixture } from './feed-fixtures';

const NOW = Date.parse('2026-01-01T00:00:00Z');
const FEED_URL = 'https://odd.example/feed.xml';

function load(path: string, contentType?: string, now = NOW): NormalizedFeed {
    return normalizeFeed(decodeFeed(readFixture(path), contentType), { url: FEED_URL, now });
}

function expectFeedError(fn: () => unknown, code: string) {
    try {
        fn();
    } catch (err) {
        expect(err).toBeInstanceOf(FeedError);
        expect((err as FeedError).code).toBe(code as FeedError['code']);
        return;
    }
    throw new Error(`expected FeedError(${code})`);
}

/** Every curated fixture must normalize into a complete, safe, consistently-shaped feed. */
function expectCleanFeed(feed: NormalizedFeed) {
    expect(feed.title.trim()).not.toBe('');
    expect(['rss2', 'atom', 'rss1']).toContain(feed.format);
    expect(() => new URL(feed.siteUrl)).not.toThrow();
    expect(feed.items.length).toBeGreaterThan(0);
    expect(feed.warnings).toEqual([]);

    const ids = new Set<string>();
    for (const item of feed.items) {
        expect(Object.keys(item).sort()).toEqual(
            [
                'author',
                'categories',
                'contentHtml',
                'hasFullContent',
                'id',
                'imageUrl',
                'publishedAt',
                'summary',
                'title',
                'updatedAt',
                'url',
            ].sort(),
        );
        expect(item.id).not.toBe('');
        expect(ids.has(item.id)).toBe(false);
        ids.add(item.id);
        expect(item.title.trim()).not.toBe('');
        expect(item.title).not.toMatch(/<[a-z/][^>]*>|&[a-z]+;|&#\d+;/i);
        expect(item.url).toMatch(/^https?:\/\//);
        expect(item.publishedAt).not.toBeNull();
        expect(new Date(item.publishedAt!).toISOString()).toBe(item.publishedAt!);
        expect(item.summary.length).toBeLessThanOrEqual(300);
        expect(item.summary).not.toMatch(/<[a-z/][^>]*>/i);
        expect(item.contentHtml).not.toMatch(/<script|<style|\son[a-z]+=|javascript:/i);
        expect(Array.isArray(item.categories)).toBe(true);
    }

    // Newest first.
    const dates = feed.items.map((i) => i.publishedAt!);
    expect([...dates].sort().reverse()).toEqual(dates);
}

describe('curated feeds', () => {
    test('all 19 curated feeds have a fixture', () => {
        expect(curatedFixtures).toHaveLength(19);
    });

    test.each(curatedFixtures.map((f) => [f.title, f] as const))('%s normalizes cleanly', (_title, fixture) => {
        const xml = decodeFeed(readFixture(`curated/${fixture.file}`), fixture.contentType);
        const feed = normalizeFeed(xml, { url: fixture.feedUrl });
        expectCleanFeed(feed);
        expect(feed.url).toBe(fixture.feedUrl);
    });

    test('full-content feeds are told apart from excerpt feeds', () => {
        const smashing = curatedFixtures.find((f) => f.slug === 'smashing-magazine')!;
        const hn = curatedFixtures.find((f) => f.slug === 'hacker-news-best')!;
        const full = normalizeFeed(decodeFeed(readFixture(`curated/${smashing.file}`)), { url: smashing.feedUrl });
        const excerpt = normalizeFeed(decodeFeed(readFixture(`curated/${hn.file}`)), { url: hn.feedUrl });
        expect(full.items.every((i) => i.hasFullContent)).toBe(true);
        expect(excerpt.items.some((i) => i.hasFullContent)).toBe(false);
    });

    test('Atom feeds are detected as Atom', () => {
        const simon = curatedFixtures.find((f) => f.slug === 'simon-willison-s-weblog')!;
        expect(normalizeFeed(decodeFeed(readFixture(`curated/${simon.file}`)), { url: simon.feedUrl }).format).toBe(
            'atom',
        );
    });
});

describe('broken and odd feeds', () => {
    test('malformed XML is parsed partially with a warning', () => {
        const feed = load('odd/malformed-unclosed.xml');
        expect(feed.title).toBe('Half a Feed');
        expect(feed.items[0]?.title).toBe('First post survives');
        expect(feed.items[0]?.publishedAt).toBe('2025-06-10T09:00:00.000Z');
        expect(feed.warnings.join(' ')).toContain('parsed partially');
    });

    test('an HTML page is rejected as not_a_feed', () => {
        expectFeedError(() => load('odd/not-a-feed.html'), 'not_a_feed');
    });

    test('non-feed XML is rejected as not_a_feed', () => {
        expectFeedError(() => load('odd/not-a-feed.xml'), 'not_a_feed');
    });

    test('an empty body is rejected as not_a_feed', () => {
        expectFeedError(() => normalizeFeed('   ', { url: FEED_URL }), 'not_a_feed');
    });

    test('an empty channel yields a titled feed with no items', () => {
        const feed = load('odd/empty-channel.xml');
        expect(feed.title).toBe('odd.example');
        expect(feed.siteUrl).toBe('https://odd.example/');
        expect(feed.items).toEqual([]);
        expect(feed.warnings).toContain('The feed has no items');
    });

    test('RSS 1.0 / RDF is supported', () => {
        const feed = load('odd/rss1-rdf.xml');
        expect(feed.format).toBe('rss1');
        expect(feed.language).toBe('en');
        expect(feed.items.map((i) => i.title)).toEqual(['RDF item B', 'RDF item A']);
        expect(feed.items[1]).toMatchObject({ author: 'Ada Lovelace', publishedAt: '2025-03-01T11:00:00.000Z' });
    });

    test('Atom entries without dates keep null dates and a warning', () => {
        const feed = load('odd/atom-no-dates.xml');
        expect(feed.format).toBe('atom');
        expect(feed.title).toBe('Atom & No Dates');
        expect(feed.items.every((i) => i.publishedAt === null)).toBe(true);
        expect(feed.items[1]?.contentHtml).toBe('<p>Escaped <em>HTML</em> content.</p>');
        expect(feed.warnings).toContain('2 item(s) have no usable date');
    });

    test('non-standard dates are normalized; unparseable ones become null', () => {
        const feed = load('odd/weird-dates.xml');
        const byKey = Object.fromEntries(feed.items.map((i) => [i.url!.split('/').pop(), i.publishedAt]));
        for (const key of [
            'rfc822',
            'named-tz',
            'no-seconds',
            'no-dayname',
            'wrong-dayname',
            'two-digit-year',
            'iso-no-zone',
            'iso-offset',
            'month-first',
            'full-month',
        ]) {
            expect(byKey[key]).toBe('2024-10-02T15:00:00.000Z');
        }
        expect(byKey.garbage).toBeNull();
        expect(feed.items.at(-1)?.title).toBe('Date garbage');
    });

    test('missing fields are filled in', () => {
        const feed = load('odd/missing-fields.xml');
        expect(feed.title).toBe('odd.example');
        const [fromDescription, empty, titleOnly] = feed.items;
        expect(fromDescription?.title).toStartWith('An item with only a description');
        expect(fromDescription?.title.length).toBeLessThanOrEqual(80);
        expect(empty?.title).toBe('Untitled');
        expect(titleOnly?.title).toBe('Has a title only');
        for (const item of feed.items) {
            expect(item.id).toStartWith('urn:frontpage:');
            expect(item).toMatchObject({ url: null, publishedAt: null, author: null, categories: [] });
        }
        expect(new Set(feed.items.map((i) => i.id)).size).toBe(3);
    });

    test('hostile HTML is sanitized everywhere', () => {
        const feed = load('odd/xss.xml');
        const item = feed.items[0]!;
        expect(feed.title).toBe('Evil Feed');
        expect(item.title).toBe('Hostile item');
        expect(item.url).toBeNull();
        expect(item.contentHtml).not.toMatch(/<script|<style|onclick|onerror|onload|javascript:|<svg|<form|<object/i);
        expect(item.contentHtml).not.toContain('evil.example');
        expect(item.contentHtml).toContain('https://www.youtube.com/embed/abc123');
        expect(item.contentHtml).toContain('<h2>Kept heading</h2>');
        expect(item.summary).not.toContain('alert');
    });

    test('relative links resolve against the item URL', () => {
        const item = load('odd/relative-links.xml').items[0]!;
        expect(item.url).toBe('https://rel.example/blog/relative-post');
        expect(item.contentHtml).toContain('href="https://rel.example/about"');
        expect(item.imageUrl).toBe('https://rel.example/blog/images/pic.png');
    });

    test('double-encoded entities are decoded in text fields', () => {
        const feed = load('odd/double-encoded-entities.xml');
        expect(feed.title).toBe('Tom & Jerry’s Blog');
        expect(feed.items[0]?.title).toBe('Café & Crème – "quoted"');
        expect(feed.items[0]?.summary).toBe('5 < 6 && © 2025');
    });

    test('CDATA, content:encoded, dc:creator, categories and media are mapped', () => {
        const feed = load('odd/cdata-mixed.xml');
        expect(feed.title).toBe('CDATA & Title');
        expect(feed.items[0]).toMatchObject({
            title: 'Full content item',
            author: 'Grace Hopper',
            summary: 'A short excerpt.',
            hasFullContent: true,
            imageUrl: 'https://cdata.example/hero.jpg',
            categories: ['CSS', 'Layout'],
        });
    });

    test('duplicate guids are removed', () => {
        const feed = load('odd/duplicate-guids.xml');
        expect(feed.items.map((i) => i.title)).toEqual(['Newer', 'Original']);
        expect(feed.warnings).toContain('1 duplicate item(s) were removed');
    });

    test('Windows-1252, header-only Latin-1 and BOM feeds decode correctly', () => {
        expect(load('odd/windows-1252.xml').items[0]?.title).toBe('It’s naïve – €5');
        expect(load('odd/iso-8859-1-header-only.xml', 'text/xml; charset=iso-8859-1').items[0]?.title).toBe(
            'Grüße aus München',
        );
        expect(load('odd/bom-utf8.xml').title).toBe('BOM ✓ Feed');
    });

    test('requestedUrl defaults to url and is kept when given', () => {
        const xml = decodeFeed(readFixture('odd/duplicate-guids.xml'));
        expect(normalizeFeed(xml, { url: FEED_URL }).requestedUrl).toBe(FEED_URL);
        expect(normalizeFeed(xml, { url: FEED_URL, requestedUrl: 'http://old.example/rss' }).requestedUrl).toBe(
            'http://old.example/rss',
        );
    });
});
