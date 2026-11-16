import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Shape of test/fixtures/feeds/curated/manifest.json, written by src/scripts/snapshot-feeds.ts. */
export type CuratedFixture = { slug: string; title: string; feedUrl: string; file: string; contentType: string | null };

export const FIXTURES_DIR = join(import.meta.dir, 'fixtures/feeds');

export function readFixture(path: string): Uint8Array {
    return new Uint8Array(readFileSync(join(FIXTURES_DIR, path)));
}

export const curatedFixtures: CuratedFixture[] = JSON.parse(
    readFileSync(join(FIXTURES_DIR, 'curated/manifest.json'), 'utf8'),
);
