// Test access to the feed fixtures in test/fixtures/feeds/. `curatedFixtures` is the manifest that
// src/scripts/snapshot-feeds.ts writes for the saved copies of the 19 curated feeds.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type CuratedFixture = { slug: string; title: string; feedUrl: string; file: string; contentType: string | null };

export const FIXTURES_DIR = join(import.meta.dir, '../fixtures/feeds');

export const curatedFixtures: CuratedFixture[] = JSON.parse(readFileSync(join(FIXTURES_DIR, 'curated/manifest.json'), 'utf8'));

// The raw bytes of a fixture file, e.g. readFixture('odd/xss.xml').
export function readFixture(path: string): Uint8Array {
    return new Uint8Array(readFileSync(join(FIXTURES_DIR, path)));
}
