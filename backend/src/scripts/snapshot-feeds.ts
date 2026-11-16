// Downloads the curated feeds from data/sample-feeds.json into test/fixtures/feeds/curated/
// so tests run offline. Large feeds are trimmed to their first 10 items.
// Usage (from backend/): bun src/scripts/snapshot-feeds.ts
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../env';
import { fetchFeed } from '../lib/feed';
import sampleFeeds from '../../data/sample-feeds.json';

type CuratedFixture = { slug: string; title: string; feedUrl: string; file: string; contentType: string | null };

const OUT_DIR = join(import.meta.dir, '../../test/fixtures/feeds/curated');
const MAX_BYTES = 150 * 1024;
const MAX_ITEMS = 10;

function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/** Keeps the first `max` <item>/<entry> elements and closes the document again. Works on a byte-for-byte latin1 string. */
function trim(xml: string, max: number): string {
    const close = /<\/(item|entry)>/gi;
    let match: RegExpExecArray | null = null;
    for (let i = 0; i < max; i++) {
        match = close.exec(xml);
        if (!match) return xml;
    }
    if (!match) return xml;
    const head = xml.slice(0, match.index + match[0].length);
    const tail =
        match[1]!.toLowerCase() === 'entry'
            ? '\n</feed>\n'
            : /<rdf:RDF/i.test(xml)
              ? '\n</rdf:RDF>\n'
              : '\n</channel>\n</rss>\n';
    return head + tail;
}

const feeds = sampleFeeds.categories.flatMap((c) => c.feeds);
await mkdir(OUT_DIR, { recursive: true });
const manifest: CuratedFixture[] = [];

for (const feed of feeds) {
    const slug = slugify(feed.title);
    const file = `${slug}.xml`;
    try {
        const res = await fetchFeed(feed.feedUrl, { timeoutMs: 20_000, userAgent: env.FEED_USER_AGENT });
        if (res.notModified) throw new Error('unexpected 304');
        let bytes = res.bytes;
        if (bytes.byteLength > MAX_BYTES) {
            // Node's latin1 round-trips bytes 1:1 (TextDecoder's "latin1" is really windows-1252 and
            // does not), so trimming never corrupts multibyte characters.
            bytes = new Uint8Array(Buffer.from(trim(Buffer.from(bytes).toString('latin1'), MAX_ITEMS), 'latin1'));
        }
        await writeFile(join(OUT_DIR, file), bytes);
        manifest.push({ slug, title: feed.title, feedUrl: res.finalUrl, file, contentType: res.contentType });
        console.log(`✓ ${feed.title} (${bytes.byteLength} bytes)`);
    } catch (err) {
        console.error(`✗ ${feed.title}: ${(err as Error).message}`);
    }
}

await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 4)}\n`);
console.log(`\nSaved ${manifest.length}/${feeds.length} feeds to ${OUT_DIR}`);
