// Downloads the curated feeds from data/sample-feeds.json into test/fixtures/feeds/curated/
// so tests run offline. Large feeds are trimmed to their first 10 items.
// Usage: bun run fixtures:feeds

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { env } from '../env';
import { errorMessage } from '../lib/error-code';
import { fetchFeed, limitItems } from '../lib/feed';
import sampleFeeds from '../../data/sample-feeds.json';

export type CuratedFixture = { slug: string; title: string; feedUrl: string; file: string; contentType: string | null };

const OUT_DIR = join(import.meta.dir, '../../test/fixtures/feeds/curated');
const MAX_BYTES = 150 * 1024;
const FIXTURE_MAX_ITEMS = 10;
const FETCH_TIMEOUT_MS = 20_000;

const feeds = sampleFeeds.categories.flatMap((category) => category.feeds);

await mkdir(OUT_DIR, { recursive: true });

const manifest: CuratedFixture[] = [];

for (const feed of feeds) {
    const slug = slugify(feed.title);
    const file = `${slug}.xml`;

    try {
        const result = await fetchFeed(feed.feedUrl, { timeoutMs: FETCH_TIMEOUT_MS, userAgent: env.FEED_USER_AGENT });

        if (result.notModified)
            throw new Error('unexpected 304');

        let bytes = result.bytes;

        if (bytes.byteLength > MAX_BYTES) {
            // Node's latin1 maps bytes 1:1 (TextDecoder's "latin1" doesn't), so trimming can't corrupt characters.
            const latin1 = Buffer.from(bytes).toString('latin1');

            bytes = new Uint8Array(Buffer.from(limitItems(latin1, FIXTURE_MAX_ITEMS).xml, 'latin1'));
        }

        await writeFile(join(OUT_DIR, file), bytes);
        manifest.push({ slug, title: feed.title, feedUrl: result.finalUrl, file, contentType: result.contentType });
        console.log(`✓ ${feed.title} (${bytes.byteLength} bytes)`);
    } catch (err) {
        console.error(`✗ ${feed.title}: ${errorMessage(err)}`);
    }
}

await writeFile(join(OUT_DIR, 'manifest.json'), `${JSON.stringify(manifest, null, 4)}\n`);
console.log(`\nSaved ${manifest.length}/${feeds.length} feeds to ${OUT_DIR}`);

// Turns a feed title into a file-safe name: "Simon Willison's Weblog" → "simon-willison-s-weblog".
function slugify(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}
